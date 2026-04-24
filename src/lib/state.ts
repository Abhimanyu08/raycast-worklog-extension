import { LocalStorage } from "@raycast/api";

export type SegmentType = "work" | "pause";

export type Segment = {
  type: SegmentType;
  startedAt: number;
  endedAt: number | null;
};

export type TimerStatus = "idle" | "running" | "paused";

export type TimerState = {
  status: TimerStatus;
  sessionStartedAt: number | null;
  segments: Segment[];
};

const STATE_KEY = "timerState";

const IDLE_STATE: TimerState = {
  status: "idle",
  sessionStartedAt: null,
  segments: [],
};

export async function getState(): Promise<TimerState> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (!raw) return IDLE_STATE;
  try {
    const parsed = JSON.parse(raw) as TimerState;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.status === "idle" ||
        parsed.status === "running" ||
        parsed.status === "paused") &&
      Array.isArray(parsed.segments)
    ) {
      return parsed;
    }
    return IDLE_STATE;
  } catch {
    return IDLE_STATE;
  }
}

async function setState(state: TimerState): Promise<void> {
  await LocalStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export async function clearState(): Promise<void> {
  await LocalStorage.removeItem(STATE_KEY);
}

export class TimerStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimerStateError";
  }
}

export async function startTimer(
  now: number = Date.now(),
): Promise<TimerState> {
  const state = await getState();
  if (state.status === "running") {
    throw new TimerStateError("Timer is already running");
  }
  if (state.status === "paused") {
    return resumeTimer(now);
  }
  const next: TimerState = {
    status: "running",
    sessionStartedAt: now,
    segments: [{ type: "work", startedAt: now, endedAt: null }],
  };
  await setState(next);
  return next;
}

export async function pauseTimer(
  now: number = Date.now(),
): Promise<TimerState> {
  const state = await getState();
  if (state.status !== "running") {
    throw new TimerStateError("Timer is not running");
  }
  const segments = closeOpenSegment(state.segments, now);
  segments.push({ type: "pause", startedAt: now, endedAt: null });
  const next: TimerState = { ...state, status: "paused", segments };
  await setState(next);
  return next;
}

export async function resumeTimer(
  now: number = Date.now(),
): Promise<TimerState> {
  const state = await getState();
  if (state.status !== "paused") {
    throw new TimerStateError("Timer is not paused");
  }
  const segments = closeOpenSegment(state.segments, now);
  segments.push({ type: "work", startedAt: now, endedAt: null });
  const next: TimerState = { ...state, status: "running", segments };
  await setState(next);
  return next;
}

export type StoppedSession = {
  sessionStartedAt: number;
  sessionEndedAt: number;
  segments: Segment[];
};

export async function stopTimer(
  now: number = Date.now(),
): Promise<StoppedSession> {
  const state = await getState();
  if (state.status === "idle" || state.sessionStartedAt === null) {
    throw new TimerStateError("No session to stop");
  }
  const segments = closeOpenSegment(state.segments, now);
  const finalized: TimerState = { ...state, status: "paused", segments };
  await setState(finalized);
  return {
    sessionStartedAt: state.sessionStartedAt,
    sessionEndedAt: now,
    segments,
  };
}

function closeOpenSegment(segments: Segment[], now: number): Segment[] {
  return segments.map((s) => (s.endedAt === null ? { ...s, endedAt: now } : s));
}

export function activeMsSoFar(
  state: TimerState,
  now: number = Date.now(),
): number {
  let total = 0;
  for (const seg of state.segments) {
    if (seg.type !== "work") continue;
    const end = seg.endedAt ?? now;
    total += Math.max(0, end - seg.startedAt);
  }
  return total;
}
