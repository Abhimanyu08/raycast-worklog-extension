import { showHUD, showToast, Toast } from "@raycast/api";
import { resumeTimer, TimerStateError } from "./lib/state";

export default async function Command() {
  try {
    await resumeTimer();
    await showHUD("▶ Timer resumed");
  } catch (err) {
    const message =
      err instanceof TimerStateError ? err.message : "Could not resume timer";
    await showToast({ style: Toast.Style.Failure, title: message });
  }
}
