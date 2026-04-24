import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { stopTimer, TimerStateError } from "./lib/state";

export default async function Command() {
  try {
    const session = await stopTimer();
    await launchCommand({
      name: "log-entry",
      type: LaunchType.UserInitiated,
      context: {
        sessionStartedAt: session.sessionStartedAt,
        sessionEndedAt: session.sessionEndedAt,
        segments: session.segments,
      },
    });
  } catch (err) {
    const message =
      err instanceof TimerStateError ? err.message : "Could not stop timer";
    await showToast({ style: Toast.Style.Failure, title: message });
  }
}
