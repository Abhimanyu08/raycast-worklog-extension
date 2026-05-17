import { launchCommand, LaunchType } from "@raycast/api";
import { StoppedSession } from "./state";

/** Opens the Log Entry form prefilled with a finished/abandoned session. */
export async function launchLogEntry(session: StoppedSession): Promise<void> {
  await launchCommand({
    name: "log-entry",
    type: LaunchType.UserInitiated,
    context: {
      sessionStartedAt: session.sessionStartedAt,
      sessionEndedAt: session.sessionEndedAt,
      segments: session.segments,
    },
  });
}
