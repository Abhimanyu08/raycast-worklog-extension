import { showHUD, showToast, Toast } from "@raycast/api";
import { pauseTimer, TimerStateError } from "./lib/state";

export default async function Command() {
  try {
    await pauseTimer();
    await showHUD("⏸ Timer paused");
  } catch (err) {
    const message =
      err instanceof TimerStateError ? err.message : "Could not pause timer";
    await showToast({ style: Toast.Style.Failure, title: message });
  }
}
