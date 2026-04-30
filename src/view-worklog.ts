import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { promises as fs } from "node:fs";
import { expandHome, writeHtml } from "./lib/journal";

type Preferences = {
  worklogPath: string;
};

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const jsonPath = expandHome(
    preferences.worklogPath?.trim() || "~/worklog/worklog.json",
  );

  try {
    await fs.access(jsonPath);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No worklog yet",
      message: `Log an entry first — ${jsonPath} doesn't exist`,
    });
    return;
  }

  try {
    const htmlPath = await writeHtml(jsonPath);
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
