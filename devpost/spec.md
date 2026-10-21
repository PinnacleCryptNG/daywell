---
doc: spec
status: approved
---

# Daywell — Technical Spec

## How This Works, In Plain Language
Daywell is a single web page that runs entirely in your browser. There is no server and no account.
- **The desk signal** asks Chrome "is someone using this computer, and is the screen locked?" using the browser's built-in Idle Detection feature. If that isn't available, a pair of buttons ("I'm at my desk" / "I'm stepping away") gives the same information manually.
- **The desk-time engine** is a small piece of logic that receives those signals ("active", "away") and the clock ticking, and decides: how long you've been sitting, whether an away period counts as a break, and whether it's time to suggest one. It knows nothing about the screen, which makes it easy to test.
- **The store** saves everything to the browser's local storage so a reload doesn't lose today.
- **The interface** draws the Today screen from the engine's state and sends your button presses back to it.

Why this shape: the interesting part is the engine, so it is kept pure and tested; everything else is thin. No framework or build step is needed for one page, which keeps the repo easy for judges to read.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. You open `index.html` → `app.js` loads settings and today's record from the store → no record yet, so the Welcome card renders.
2. You press **Start my day** → `sources/idle.js` calls `IdleDetector.requestPermission()` (needs that click) → granted: it starts the detector with a 60 s window; denied/unsupported: `sources/manual.js` is used and the chip reads *Manual*.
3. The source emits `active` → engine opens a desk segment; every second `tick` updates sitting time → UI redraws the ring and "Sitting for…".
4. Sitting time crosses the threshold, inside work hours, not snoozed/paused, under cap → engine sets `prompt` → UI shows the break banner (and tab title / optional notification).
5. You walk away; after 60 s of no input (or a screen lock) the detector reports `idle`/`locked` → source emits `away` with the time input actually stopped → engine closes the desk segment and opens an away segment.
6. You return → source emits `active` → engine measures the away length; ≥ minimum break → logs a *Measured* break, resets sitting, sets a "Welcome back" notice → UI shows "Break logged — 6 min away".
7. Water button → `water.js` adds an entry → store saves → UI updates, Undo toast.
8. Wrap up → `reflection.js` summarises the day's record → Reflection card.
9. Reload → store returns today's record; the gap since the last saved tick becomes a *not tracked* segment.

## Stack
- **HTML, CSS, vanilla JavaScript (ES modules), no build step.** Agent recommendation for a one-page POC; tradeoff accepted: no component framework, so UI rendering is hand-written.
- **Idle Detection API** (Chrome/Edge 94+, secure context; `localhost` counts). Docs: https://developer.mozilla.org/en-US/docs/Web/API/Idle_Detection_API. Minimum detection window is 60 s. **Unverified on this machine — check in slice 2.**
- **Web Storage (localStorage)**. Docs: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- **Notifications API** (optional, background tab only). Docs: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
- **Manrope** via Google Fonts with system sans fallback. https://fonts.google.com/specimen/Manrope
- **Node.js 18+** only for tooling: `node --test` for engine tests and a ~30-line static server (`scripts/serve.mjs`). No npm dependencies.

## Where It Runs and How Someone Tries It
- Runs in desktop Chrome or Edge. Idle Detection needs `http://localhost` or HTTPS, so opening the file directly won't enable Measured mode.
- Start: `npm start` (runs `node scripts/serve.mjs`) → open `http://localhost:5173`.
- Tests: `npm test`.
- Demo recording: open `http://localhost:5173/?speed=60` — the labelled **Demo speed ×60** banner shows; a 50-minute threshold becomes 50 seconds. The idle window stays a real 60 s (browser minimum), so the auto-logged break is genuine.
- Optional deploy: GitHub Pages (static) so judges can try it; not a substitute for the video.

## Look and Feel
From `prd.md > Look and Feel`. CSS custom properties: `--navy #0B1020`, `--blue #3157FF`, `--cyan #22D3EE`, `--surface #F8FAFC`, `--ink #0F172A`, `--muted #64748B`, `--line #E2E8F0`. Page background warm white, cards white with 1 px line border and soft shadow, 16–20 px radius, navy header bar. Manrope 400/600/700/800; large numeric display for sitting time. Spacious, calm density. Transitions ≤ 200 ms, disabled under `prefers-reduced-motion`. Copy concise and non-judgmental.

## Components

### Desk-time engine (`src/engine.js`)
Pure functions: `createDay(dateKey)`, `reduce(state, event, settings)` → new state. Events: `start`, `active(t)`, `away(t, since)`, `tick(t)`, `done(t)`, `snooze(t, minutes)`, `pause(t)`, `resume(t)`, `wrapUp(t)`. Owns segments, breaks, prompt rules, cap, and Done→Measured upgrade.
PRD ref: `prd.md > Measured desk time`, `prd.md > Automatic break credit`, `prd.md > Break prompt`.

### Desk signal sources (`src/sources/idle.js`, `src/sources/manual.js`)
Same interface: `start(emit)`, `stop()`, `kind` (`measured`|`manual`). Idle source maps `userState`/`screenState` changes to `active`/`away`; `away.since = now − 60 s` for idle (input actually stopped then) and `now` for lock. Manual source emits from the two buttons.
PRD ref: `prd.md > Measured desk time`, `prd.md > Manual mode`.

### Store (`src/store.js`)
Load/save settings and day records in localStorage under `daywell:v1`; daily key `YYYY-MM-DD` local; save throttled to every 5 s and on `visibilitychange`/`pagehide`; export JSON; delete all.
PRD ref: `prd.md > States and Boundaries`, `prd.md > Settings and data`.

### Water (`src/water.js`)
Pure `add`, `remove`, `edit`, `total`. PRD ref: `prd.md > Water logging`.

### Habits (`src/habits.js`)
Pure ops for manual steps (`setSteps`, `latestSteps`) and the optional calorie log (`addCalories`, `removeCalories`, `caloriesTotal`). PRD ref: `prd.md > Steps (manual)`, `prd.md > Calories (optional)`.

### Water reminders (`src/water.js > waterReminderDue`)
Pure check of interval since the last glass/reminder, work hours, cap, and that no break prompt is showing. PRD ref: `prd.md > Water reminders`.

### Reflection (`src/reflection.js`)
Pure summary of a day record → counts and copy strings; "No data" for empty metrics. PRD ref: `prd.md > Daily reflection`.

### Interface (`index.html`, `styles.css`, `src/app.js`, `src/ui/*.js`)
Renders Welcome, hero ring, timeline, breaks, water, reflection, prompt banner, toasts, settings drawer. One `render(state)` driven by a 1 s tick plus events. Tab title and optional Notification when hidden.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Today's timeline`.

## Data Model
```js
settings = { thresholdMin: 50, minBreakMin: 2, workStart: "09:00", workEnd: "17:00",
             workDays: [1,2,3,4,5], dailyCap: 8, waterTargetMl: 2000,
             stepGoal: 10000, caloriesEnabled: false, waterReminderMin: 90, waterReminderCap: 4, speed: 1 }
day = {
  date: "2026-10-20",
  mode: "measured" | "manual" | null,
  segments: [{ kind: "desk"|"away"|"untracked", start, end|null, source }],
  breaks:   [{ id, start, end, durationMs, source: "measured"|"manual"|"reported" }],
  water:    [{ id, at, ml }],
  steps:    [{ id, at, total }],          // manual, latest wins
  calories: [{ id, at, kcal, note }],     // only used when enabled
  waterReminder: { visible, shownCount, lastAt },
  prompt:   { visible, shownCount, snoozeUntilSittingMs|null, pausedForDay },
  notice:   { text, at } | null,
  wrappedUp: false,
  lastSeen: epochMs
}
```
Sitting time = now − start of the current open desk segment (minus nothing; short away gaps are merged back into it). All times epoch ms. On load, if `now − lastSeen > 10 s` and the last segment is open, it is closed at `lastSeen` and an `untracked` segment fills the gap. Previous days stay stored for export and future insights.
Demo speed: settings durations are divided by `speed` when the engine compares them; measured durations are never altered.

## File Structure
```
daywell/
├── index.html            # single page shell
├── styles.css            # design tokens + layout
├── src/
│   ├── app.js            # wiring: store ⇄ engine ⇄ sources ⇄ ui, 1 s tick
│   ├── engine.js         # pure desk-time logic
│   ├── water.js          # pure water log ops + reminder rule
│   ├── habits.js         # pure steps + calorie ops
│   ├── reflection.js     # pure day summary
│   ├── store.js          # localStorage persistence
│   ├── time.js           # day keys, work-hours, formatting
│   ├── sources/
│   │   ├── idle.js       # Idle Detection adapter
│   │   └── manual.js     # manual fallback
│   └── ui/
│       ├── render.js     # Today screen rendering
│       └── settings.js   # settings drawer
├── tests/                # node --test suites for engine/water/reflection/time
├── scripts/serve.mjs     # zero-dependency static server
├── package.json          # start/test scripts, no dependencies
├── README.md
├── LICENSE               # MIT
└── devpost/              # Devpost learning workspace
```

## External Services and Dependencies
None at runtime besides the Google Fonts stylesheet (falls back to system fonts offline). No keys, no rate limits, no cost.

## Important Failure Modes
- **Idle Detection unsupported or denied** → Manual mode with explanation and "Try measured mode again" in Settings.
- **Watching a video / reading without touching input for > 60 s** → recorded as away; if ≥ minimum it becomes a break. Mitigation: the "Welcome back" notice has **Undo — I was here**, which converts it back to desk time.
- **Tab closed or browser throttles timers in background** → engine uses wall-clock timestamps, not tick counts, so background throttling doesn't distort durations; closed-tab gaps become *not tracked*.

## What Was Simplified and Why
- **Browser idle signal** instead of OS-level activity tracking — honest and permissioned; a desktop companion would see other apps.
- **localStorage** instead of IndexedDB/sync — a single day's record is small; history is kept but not queried.
- **In-page prompt + optional single notification** instead of a service-worker reminder system — works while the tab is open, which is the POC boundary.
- **Demo speed** instead of waiting 50 real minutes on video — thresholds only; detection stays real.

## Decisions and Open Issues
- Learner choices: desktop-browser POC, measured-desk-time kernel, local-only, manual fallback, visual direction (approved scope, learner PRD).
- Implementation details (agent): vanilla JS/no build, pure engine with node tests, 60 s idle window, `away.since = now − 60 s`, demo speed via `?speed=`.
- Genuine uncertainty: whether Idle Detection behaves as documented on the recording machine. Agreed investigation: slice 2 verifies permission prompt, `idle` after 60 s, and `locked` on screen lock in local Chrome; if it fails, Manual mode remains the working path and the video is adjusted.
- Open from PRD: none further.
