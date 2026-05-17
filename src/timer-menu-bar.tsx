import { Icon, MenuBarExtra, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatClock } from "./lib/format";
import { launchLogEntry } from "./lib/launch";
import {
  activeMsSoFar,
  getState,
  pauseTimer,
  resumeTimer,
  StalePausedSessionError,
  startTimer,
  stopTimer,
  TimerState,
  TimerStateError,
} from "./lib/state";

export default function Command() {
  const [state, setState] = useState<TimerState | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    let mounted = true;
    getState().then((s) => {
      if (mounted) setState(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (state?.status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state?.status]);

  const isLoading = state === null;
  const status = state?.status ?? "idle";
  const activeMs = state ? activeMsSoFar(state, now) : 0;

  const title = renderTitle(status, activeMs);
  const tooltip = renderTooltip(status, activeMs);
  const icon = renderIcon(status);

  async function handle(action: () => Promise<void>, errorFallback: string) {
    try {
      await action();
      setState(await getState());
    } catch (err) {
      if (err instanceof StalePausedSessionError) {
        // Start/Resume hit a session abandoned while paused. State is already
        // finalized; reflect that and send the old session to the log form.
        setState(await getState());
        await showToast({
          style: Toast.Style.Failure,
          title: "Previous session was abandoned — log it first",
        });
        await launchLogEntry(err.session);
        return;
      }
      const message =
        err instanceof TimerStateError ? err.message : errorFallback;
      await showToast({ style: Toast.Style.Failure, title: message });
    }
  }

  async function handleStop() {
    try {
      const session = await stopTimer();
      await launchLogEntry(session);
    } catch (err) {
      const message =
        err instanceof TimerStateError ? err.message : "Could not stop timer";
      await showToast({ style: Toast.Style.Failure, title: message });
    }
  }

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {status === "idle" && (
        <MenuBarExtra.Item
          title="Start"
          icon={Icon.Play}
          onAction={() =>
            handle(
              () => startTimer().then(() => undefined),
              "Could not start timer",
            )
          }
        />
      )}
      {status === "running" && (
        <>
          <MenuBarExtra.Item
            title="Pause"
            icon={Icon.Pause}
            onAction={() =>
              handle(
                () => pauseTimer().then(() => undefined),
                "Could not pause timer",
              )
            }
          />
          <MenuBarExtra.Item
            title="Stop & Log"
            icon={Icon.Stop}
            onAction={handleStop}
          />
        </>
      )}
      {status === "paused" && (
        <>
          <MenuBarExtra.Item
            title="Resume"
            icon={Icon.Play}
            onAction={() =>
              handle(
                () => resumeTimer().then(() => undefined),
                "Could not resume timer",
              )
            }
          />
          <MenuBarExtra.Item
            title="Stop & Log"
            icon={Icon.Stop}
            onAction={handleStop}
          />
        </>
      )}
    </MenuBarExtra>
  );
}

function renderTitle(status: string, activeMs: number): string | undefined {
  if (status === "idle") return undefined;
  const clock = formatClock(activeMs);
  if (status === "paused") return `⏸ ${clock}`;
  return clock;
}

function renderTooltip(status: string, activeMs: number): string {
  if (status === "idle") return "Worklog Timer — idle";
  if (status === "paused")
    return `Worklog Timer — paused at ${formatClock(activeMs)}`;
  return `Worklog Timer — running (${formatClock(activeMs)})`;
}

function renderIcon(status: string) {
  if (status === "running") return Icon.Play;
  if (status === "paused") return Icon.Pause;
  return Icon.Clock;
}
