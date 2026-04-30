import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { marked } from "marked";
import {
  formatDateTime,
  formatDurationLong,
  renderTimelineHtml,
  sumWorkMs,
} from "./format";
import type { Segment } from "./state";

export type JournalEntry = {
  sessionStartedAt: number;
  sessionEndedAt: number;
  segments: Segment[];
  details: string;
};

export type WorklogFile = {
  version: 1;
  entries: JournalEntry[];
};

const EMPTY_WORKLOG: WorklogFile = { version: 1, entries: [] };

export function expandHome(filePath: string): string {
  if (filePath.startsWith("~/"))
    return path.join(os.homedir(), filePath.slice(2));
  if (filePath === "~") return os.homedir();
  return filePath;
}

export async function readJournal(jsonPath: string): Promise<WorklogFile> {
  let raw: string;
  try {
    raw = await fs.readFile(jsonPath, "utf8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return EMPTY_WORKLOG;
    throw err;
  }
  if (raw.trim().length === 0) return EMPTY_WORKLOG;
  const parsed = JSON.parse(raw) as WorklogFile;
  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error(`Worklog file at ${jsonPath} is not a valid worklog`);
  }
  return parsed;
}

export async function appendEntry(
  rawFilePath: string,
  entry: JournalEntry,
): Promise<string> {
  const filePath = expandHome(rawFilePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const journal = await readJournal(filePath);
  journal.entries.push(entry);

  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(journal, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);

  try {
    await writeHtml(filePath);
  } catch (err) {
    console.warn("Failed to write worklog html:", err);
  }

  return filePath;
}

export async function writeHtml(jsonPath: string): Promise<string> {
  const journal = await readJournal(jsonPath);
  const sections = [...journal.entries]
    .reverse()
    .map((entry) => renderEntryHtml(entry))
    .join("\n");
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Worklog</title></head>
<body>
<h1>Worklog</h1>
${sections}
</body>
</html>
`;
  const htmlPath = path.join(path.dirname(jsonPath), "index.html");
  await fs.writeFile(htmlPath, html, "utf8");
  return htmlPath;
}

function renderEntryHtml(entry: JournalEntry): string {
  const { sessionStartedAt, sessionEndedAt, segments, details } = entry;
  const totalMs = sessionEndedAt - sessionStartedAt;
  const activeMs = sumWorkMs(segments, sessionEndedAt);
  const heading = `${formatDateTime(sessionStartedAt)} — ${formatDateTime(
    sessionEndedAt,
  )} (${formatDurationLong(activeMs)} active over ${formatDurationLong(totalMs)})`;
  const timeline = renderTimelineHtml(segments, sessionEndedAt);
  const body = marked.parse(details.trim(), { async: false }) as string;
  return `<section>
<h2>${heading}</h2>
<h3>Timeline</h3>
${timeline}
<h3>Entry</h3>
${body}
</section>
<hr>`;
}
