import { showToast, Toast } from "@raycast/api";
import { launchLogEntry } from "./lib/launch";
import { stopTimer, TimerStateError } from "./lib/state";

export default async function Command() {
  try {
    const session = await stopTimer();
    await launchLogEntry(session);
  } catch (err) {
    const message =
      err instanceof TimerStateError ? err.message : "Could not stop timer";
    await showToast({ style: Toast.Style.Failure, title: message });
  }
}
