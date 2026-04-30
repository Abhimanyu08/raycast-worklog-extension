import type { Segment } from "./state";

export function formatDurationLong(ms: number): string {
  if (ms < 1000) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatDateTime(epochMs: number): string {
  const d = new Date(epochMs);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function renderTimelineHtml(
  segments: Segment[],
  sessionEndedAt: number,
): string {
  const items = segments
    .map((s) => {
      const end = s.endedAt ?? sessionEndedAt;
      const duration = formatDurationLong(end - s.startedAt);
      return `  <li>${formatTime(s.startedAt)} – ${formatTime(end)} · ${s.type} (${duration})</li>`;
    })
    .join("\n");
  return `<ul>\n${items}\n</ul>`;
}

export function renderTimelinePlain(
  segments: Segment[],
  sessionEndedAt: number,
): string {
  return segments
    .map((s) => {
      const end = s.endedAt ?? sessionEndedAt;
      const duration = formatDurationLong(end - s.startedAt);
      return `  • ${formatTime(s.startedAt)} – ${formatTime(end)}  ${s.type} (${duration})`;
    })
    .join("\n");
}

export function sumWorkMs(segments: Segment[], fallbackEnd: number): number {
  let total = 0;
  for (const seg of segments) {
    if (seg.type !== "work") continue;
    const end = seg.endedAt ?? fallbackEnd;
    total += Math.max(0, end - seg.startedAt);
  }
  return total;
}
