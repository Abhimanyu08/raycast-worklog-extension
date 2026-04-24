import { showHUD, showToast, Toast } from "@raycast/api";
import { getState, startTimer, TimerStateError } from "./lib/state";

export default async function Command() {
  try {
    const wasPaused = (await getState()).status === "paused";
    await startTimer();
    await showHUD(wasPaused ? "▶ Timer resumed" : "⏱ Timer started");
  } catch (err) {
    const message =
      err instanceof TimerStateError ? err.message : "Could not start timer";
    await showToast({ style: Toast.Style.Failure, title: message });
  }
}
