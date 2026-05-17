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

/**
 * A pause is meant to be short — a bathroom break, a quick chat. If the timer
 * sits paused for longer than this, the session was effectively abandoned at
 * the moment the pause started, and should be finalized rather than resumed.
 */
export const STALE_PAUSE_MS = 60 * 60 * 1000;

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

/**
 * Thrown when an action would resume a session that has been paused longer
 * than {@link STALE_PAUSE_MS}. The carried session is the abandoned one,
 * already finalized (trailing stale pause dropped, ended at pause start).
 */
export class StalePausedSessionError extends TimerStateError {
  readonly session: StoppedSession;
  constructor(session: StoppedSession) {
    super("Previous session was abandoned while paused");
    this.name = "StalePausedSessionError";
    this.session = session;
  }
}

/**
 * If the state is paused with an open pause segment that started more than
 * {@link STALE_PAUSE_MS} ago, returns that pause segment. Otherwise null.
 */
export function findStalePause(
  state: TimerState,
  now: number = Date.now(),
): Segment | null {
  if (state.status !== "paused") return null;
  const last = state.segments[state.segments.length - 1];
  if (!last || last.type !== "pause" || last.endedAt !== null) return null;
  if (now - last.startedAt <= STALE_PAUSE_MS) return null;
  return last;
}

/**
 * Finalizes an abandoned paused session: drops the trailing stale pause and
 * ends the session at that pause's start time. Clears persisted state.
 * Throws if there is no stale paused session.
 */
export async function finalizeStaleSession(
  now: number = Date.now(),
): Promise<StoppedSession> {
  const state = await getState();
  const stalePause = findStalePause(state, now);
  if (stalePause === null || state.sessionStartedAt === null) {
    throw new TimerStateError("No stale session to finalize");
  }
  const segments = state.segments.slice(0, -1);
  await clearState();
  return {
    sessionStartedAt: state.sessionStartedAt,
    sessionEndedAt: stalePause.startedAt,
    segments,
  };
}

export async function startTimer(
  now: number = Date.now(),
): Promise<TimerState> {
  const state = await getState();
  if (state.status === "running") {
    throw new TimerStateError("Timer is already running");
  }
  if (state.status === "paused") {
    if (findStalePause(state, now) !== null) {
      throw new StalePausedSessionError(await finalizeStaleSession(now));
    }
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
  if (findStalePause(state, now) !== null) {
    throw new StalePausedSessionError(await finalizeStaleSession(now));
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
  const closed = closeOpenSegment(state.segments, now);
  const { segments, sessionEndedAt } = trimTrailingPause(closed, now);
  const finalized: TimerState = { ...state, status: "paused", segments };
  await setState(finalized);
  return {
    sessionStartedAt: state.sessionStartedAt,
    sessionEndedAt,
    segments,
  };
}

function trimTrailingPause(
  segments: Segment[],
  fallbackEnd: number,
): { segments: Segment[]; sessionEndedAt: number } {
  const last = segments[segments.length - 1];
  if (!last || last.type !== "pause") {
    return { segments, sessionEndedAt: fallbackEnd };
  }
  const hasWork = segments.some((s) => s.type === "work");
  if (!hasWork) {
    return { segments, sessionEndedAt: fallbackEnd };
  }
  const trimmed = segments.slice(0, -1);
  const prior = trimmed[trimmed.length - 1];
  return {
    segments: trimmed,
    sessionEndedAt: prior.endedAt ?? fallbackEnd,
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
