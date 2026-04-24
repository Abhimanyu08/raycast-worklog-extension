import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { marked } from "marked";
import {
  formatDateTime,
  formatDurationLong,
  renderTimelineMarkdown,
  sumWorkMs,
} from "./format";
import type { Segment } from "./state";

const WORKLOG_HEADER = "# Worklog\n\n";

export type JournalEntry = {
  sessionStartedAt: number;
  sessionEndedAt: number;
  segments: Segment[];
  details: string;
};

export function expandHome(filePath: string): string {
  if (filePath.startsWith("~/"))
    return path.join(os.homedir(), filePath.slice(2));
  if (filePath === "~") return os.homedir();
  return filePath;
}

export function renderEntry(entry: JournalEntry): string {
  const { sessionStartedAt, sessionEndedAt, segments, details } = entry;
  const totalMs = sessionEndedAt - sessionStartedAt;
  const activeMs = sumWorkMs(segments, sessionEndedAt);
  const heading = `## ${formatDateTime(sessionStartedAt)} — ${formatDateTime(
    sessionEndedAt,
  )} (${formatDurationLong(activeMs)} active over ${formatDurationLong(totalMs)})`;
  const timeline = renderTimelineMarkdown(segments, sessionEndedAt);
  const trimmedDetails = details.trim();
  return [
    heading,
    "",
    "### Timeline",
    timeline,
    "",
    "### Entry",
    "",
    trimmedDetails,
    "",
    "---",
    "",
  ].join("\n");
}

export async function appendEntry(
  rawFilePath: string,
  entry: JournalEntry,
): Promise<string> {
  const filePath = expandHome(rawFilePath);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const body = renderEntry(entry);
  const exists = await fileExists(filePath);

  if (!exists) {
    await fs.writeFile(filePath, WORKLOG_HEADER + body, "utf8");
  } else {
    const current = await fs.readFile(filePath, "utf8");
    const separator = current.endsWith("\n") ? "" : "\n";
    await fs.appendFile(filePath, separator + body, "utf8");
  }

  try {
    await writeHtml(filePath);
  } catch (err) {
    console.warn("Failed to write worklog html:", err);
  }

  return filePath;
}

export async function writeHtml(markdownPath: string): Promise<string> {
  const markdown = await fs.readFile(markdownPath, "utf8");
  const body = marked.parse(markdown, { async: false }) as string;
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Worklog</title></head>
<body>
${body}
</body>
</html>
`;
  const htmlPath = path.join(path.dirname(markdownPath), "index.html");
  await fs.writeFile(htmlPath, html, "utf8");
  return htmlPath;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
