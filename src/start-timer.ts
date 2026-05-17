import { showHUD, showToast, Toast } from "@raycast/api";
import { launchLogEntry } from "./lib/launch";
import {
  getState,
  StalePausedSessionError,
  startTimer,
  TimerStateError,
} from "./lib/state";

export default async function Command() {
  try {
    const wasPaused = (await getState()).status === "paused";
    await startTimer();
    await showHUD(wasPaused ? "▶ Timer resumed" : "⏱ Timer started");
  } catch (err) {
    if (err instanceof StalePausedSessionError) {
      // The previous session was abandoned while paused. Finalizing already
      // cleared state; send the old session to the log form so it can be
      // written up before a new session is started.
      await showToast({
        style: Toast.Style.Failure,
        title: "Previous session was abandoned — log it first",
      });
      await launchLogEntry(err.session);
      return;
    }
    const message =
      err instanceof TimerStateError ? err.message : "Could not start timer";
    await showToast({ style: Toast.Style.Failure, title: message });
  }
}
