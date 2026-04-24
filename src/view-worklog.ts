import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { promises as fs } from "node:fs";
import { expandHome, writeHtml } from "./lib/journal";

type Preferences = {
  worklogFile: string;
};

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const markdownPath = expandHome(
    preferences.worklogFile?.trim() || "~/worklog/worklog.md",
  );

  try {
    await fs.access(markdownPath);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No worklog yet",
      message: `Log an entry first — ${markdownPath} doesn't exist`,
    });
    return;
  }

  try {
    const htmlPath = await writeHtml(markdownPath);
    await open(htmlPath);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not render worklog";
    await showToast({
      style: Toast.Style.Failure,
      title: "Render failed",
      message,
    });
  }
}
