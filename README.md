# Worklog Timer

A personal Raycast extension for timing work sessions and journaling what you did. Start a timer, pause/resume as needed, and when you stop it you're prompted to write a markdown entry that gets appended to a single worklog file.

The full session timeline is preserved — every start, pause, resume, and stop timestamp — so when you look back you see exactly how the session played out (e.g. "30m work, 10m pause, 20m work"), not just a total.

## Features

- **Menu bar timer** — always visible, shows live elapsed active time.
- **Raycast root-search commands** — `Start Timer`, `Pause Timer`, `Resume Timer`, `Stop Timer` all work without opening the menu bar.
- **Pause-aware** — pauses don't count toward active time, but they're recorded in the timeline.
- **Single markdown worklog** — every session appends to one file (default `~/worklog.md`), with date-stamped entries.
- **Drafts** — if you close the journal form accidentally, your text survives.

## Install

This is a local/unpublished extension. Each user installs it from source.

Prereqs: [Raycast](https://raycast.com/) and Node.js (v20+).

```bash
git clone https://github.com/Abhimanyu08/raycast-worklog-extension.git
cd raycast-worklog-extension
npm install
npm run dev
```

`npm run dev` registers the extension with Raycast and starts the dev server. Once you see "Built extension successfully" in the terminal, the commands are available in Raycast and the menu-bar icon appears.

You can stop `npm run dev` after the first build — Raycast keeps the extension installed. Re-run it whenever you pull changes.

## Usage

### From the menu bar

Click the clock icon in your macOS menu bar:

- **Idle** → `Start`
- **Running** → `Pause`, `Stop & Log`
- **Paused** → `Resume`, `Stop & Log`

### From Raycast root search

Open Raycast and type any of:

- `Start Timer` — starts a new session, or resumes a paused one.
- `Pause Timer` — pauses the running timer.
- `Resume Timer` — resumes the paused timer.
- `Stop Timer` — stops the timer and opens the journal form.

Both surfaces share state, so you can start from the menu bar and stop from Raycast (or vice versa).

### The journal form

On stop, a form opens showing the session timeline and a freeform markdown text area. Write what you did, hit Cmd+Enter to submit. The entry gets appended to your worklog file.

If you close the form without submitting, the timer stays in a stopped-but-unlogged state. Open `Stop Timer` again to get the form back — your draft text will be preserved too.

## Worklog file format

Default path: `~/worklog.md`. Change it in the extension's preferences in Raycast.

Each entry looks like:

```markdown
## 2026-04-24 14:00 — 14:50 (50m active over 50m)

### Timeline
- 14:00:00 – 14:30:00 · work (30m)
- 14:30:00 – 14:40:00 · pause (10m)
- 14:40:00 – 14:50:00 · work (10m)

### Entry

Debugged the webhook retry logic. Found that exponential backoff was resetting on
every restart — fixed by persisting retry count to the queue.

---
```

If the file doesn't exist, it's created with a `# Worklog` header. If the parent directory doesn't exist, it's created too.

## Notes

- Menu-bar title refresh is capped at **1 minute** while the menu is closed (Raycast platform limit). The title ticks live every second while the menu is open.
- State persists across Raycast restarts via `LocalStorage`.
- Times are recorded and displayed in your local timezone.

## License

MIT
