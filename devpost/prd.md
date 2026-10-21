---
doc: prd
status: approved
---

# Daywell — Product Requirements

A calm desktop-browser companion for desk-bound remote workers that measures real continuous desk time, credits breaks automatically when they step away, and nudges one small break at a time — with every number labelled by its source.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. **Arrive.** The worker opens Daywell in Chrome/Edge. First use shows a welcome card: one sentence ("Daywell notices how long you've really been at your desk and suggests small breaks — no guilt, no guessing"), three benefits, and **Start my day**.
2. **Connect the desk signal.** Start explains that Daywell uses the browser's idle signal (keyboard/mouse activity and screen lock on this computer only, nothing leaves the device) and then asks for permission. Granted → *Measured* mode. Denied or unsupported → *Manual* mode with "I'm at my desk / I'm stepping away" buttons. (`scope.md > The POC Boundary`)
3. **Work.** The Today screen shows a sitting ring filling toward the sitting threshold (default 50 min), a "Sitting for 23 min" label tagged *Measured · this computer*, the next suggested action, today's timeline, breaks, and water.
4. **Nudge.** When continuous desk time reaches the threshold inside work hours, one gentle prompt appears: "You've been sitting for 50 minutes. Take a 3-minute walk?" with **Done**, **Snooze 10 min**, **Snooze 30 min**, **Pause for today**. If the tab is in the background, the tab title changes and (if allowed) one system notification is shown.
5. **Step away.** The worker leaves or locks the screen. Daywell detects the away period.
6. **Come back — the kernel moment.** On return, a confirmation reads "Welcome back — break logged: 6 min away", the break appears on the timeline and in the breaks list as *Measured*, and the sitting clock resets to zero. No button pressed. (`scope.md > What "Working" Looks Like`)
7. **Hydrate.** Tap **+250 ml** (or another preset / custom). Water progress updates instantly; an **Undo** toast appears for a few seconds.
8. **Wrap up.** At the end of work hours, or via **Wrap up my day**, a reflection card summarizes: breaks taken, longest sitting stretch, water logged — in no-shame language ("You took 4 movement breaks today. Small pauses add up.").
9. **Return.** Reloading or reopening keeps today's data; time when Daywell wasn't open shows as "not tracked", never as sitting or as zero.

## Screens and Layout
One page, desktop-first, centred column (max ~1100 px), two-column card grid on wide screens, single column on narrow.
- **Welcome card** (first use only, replaces Today content until started).
- **Today** — header (Daywell wordmark, mode/source chip, Settings button); hero card with the sitting ring, sitting duration, status line and next action; **Today's timeline** strip; **Breaks** card (count + list); **Water** card (progress bar, presets, custom, entry list); **Reflection** card (shown after wrap-up).
- **Break prompt** — a calm in-page banner/dialog over the hero card, not a blocking modal.
- **Settings drawer** — slides in from the right: sitting threshold, minimum away time counted as a break, work hours and days, daily prompt cap, water target, data (export JSON, delete all), plus a short "How Daywell measures" explanation.

## Look and Feel
Carried from the learner's PRD (`scope.md > Inspiration & Identity`):
- Calm, premium, practical — "a considerate companion", not a medical portal, gamified tracker, or analytics dashboard.
- Palette: deep navy `#0B1020` for structure/header, blue `#3157FF` for primary actions, restrained cyan `#22D3EE` accent (breaks), warm white `#F8FAFC` surfaces, muted slate for secondary text.
- Manrope typeface; clear hierarchy, comfortable line spacing, generous spacing, simple cards, progress ring/bars, restrained borders, no neon or heavy gradients.
- Subtle transitions only; respect reduced-motion; never animate alerts aggressively.
- WCAG 2.2 AA contrast, visible focus, labelled controls, status never conveyed by colour alone.
- Tone: concise, specific, non-judgmental. Never "You failed your goal."

## Features and Behavior

### Measured desk time
- Uses the browser idle signal: *active* = recent keyboard/mouse input or unlocked screen; *away* = no input for the detection window or screen locked.
- Continuous desk time accumulates while active. Short gaps below the minimum break length (default 2 min) do not reset it.
- Every displayed value shows its source chip: **Measured · this computer**, **Manual**, or **Not tracked**.
- [ ] With permission granted, the sitting clock increases while the user is active and the chip reads *Measured · this computer*.
- [ ] Locking the screen or idling past the window switches status to "Away" within seconds of the browser reporting it.

### Automatic break credit
- An away period at least the minimum break length is logged as a *Measured* break with start time and duration, and resets the sitting clock.
- On return, a confirmation shows the break duration.
- [ ] After an away period ≥ minimum, a break appears in the list and timeline with its real duration and the sitting clock reads 0.
- [ ] An away period below the minimum logs nothing and the sitting clock continues.

### Break prompt
- Fires once when continuous desk time reaches the threshold, only within work hours, only when not snoozed/paused, and only while under the daily cap (default 8).
- **Done** resets the sitting clock and logs a *Reported* break; if a measured away period starts within 5 minutes, the break becomes *Measured* instead of being counted twice.
- **Snooze 10/30** hides the prompt and re-offers after that delay of continued sitting. **Pause for today** stops prompts until the next local day.
- Missed prompts are never stacked; at most one prompt is visible.
- [ ] Prompt appears exactly once at threshold; Snooze 10 re-offers 10 minutes later; Pause stops prompts for the rest of the day.
- [ ] No prompt appears outside work hours or after the cap.

### Manual mode
- When the idle signal is denied or unsupported, the chip reads *Manual* and two buttons — "I'm at my desk" / "I'm stepping away" — drive the same clock, prompts, and breaks (logged as *Manual*). A short note explains why and how to enable measured mode.
- [ ] Denying permission still leaves a working app with a clearly labelled manual clock.

### Today's timeline
- Horizontal strip across work hours: at-desk stretches (blue), breaks (cyan), not tracked (neutral hatched), with a legend and text equivalents.
- [ ] Gaps when the page was closed render as "not tracked", never as desk time or as a break.

### Water logging
- Presets 150 / 250 / 350 / 500 ml plus a custom amount; daily target (default 2,000 ml, labelled "a general estimate, not medical advice", editable).
- Shows consumed, target, remaining, and a progress bar. Undo toast after each add; each entry can be edited or deleted; totals recalculate immediately.
- [ ] Logging a glass takes one click; Undo removes it; editing an entry updates the total.

### Screen time on this computer
- A card showing today's active time on this computer (the same measured desk time, summed), labelled **Active screen time · this computer · Measured**, or *Manual* in manual mode. Shows the longest stretch. States plainly that phones, other devices and per-app usage are not included.
- [ ] With no tracked time the card reads "No data", never 0.

### Steps (manual)
- Daily goal default 10,000 (editable). The person types their current step total from their phone; Daywell stores each update and shows the latest, a progress bar, and when it was updated, labelled **Manual · from your phone**. Undo the last update.
- [ ] Before any update the card reads "No data"; after entering 6,200 it shows 6,200 of 10,000 with the Manual label.

### Calories (optional)
- Off by default; enabled in Settings. Manual entries (kcal + optional note), total for today, delete. Copy: "For awareness only. No targets, no judgment." No goal, no red/green colouring.
- [ ] Card is hidden until enabled; entries add up and can be deleted.

### Water reminders
- Optional reminder every 60 / 90 / 120 min (default 90) since the last glass, only during work hours, at most 4 a day, never while a break prompt is showing. Actions: **+250 ml** or **Not now**. Logging water resets the interval.
- [ ] Reminder appears after the interval, disappears when water is logged, and respects the cap.

### Daily reflection
- Shows count of breaks (by source), longest continuous sitting stretch, total measured desk time, and water vs target, in neutral language. Metrics with no data say "No data" instead of 0.
- [ ] Wrap up shows a reflection that never uses failure language.

### Settings and data
- Sitting threshold: 20 / 30 / 45 / 50 / 60 min. Minimum break: 1 / 2 / 3 / 5 min. Work hours (start/end) and days. Daily cap. Water target.
- Export today's and past days' data as JSON; Delete all data (with confirmation).
- [ ] Changing the threshold applies immediately to the current sitting stretch.

## States and Boundaries
- **First use** — welcome card; nothing tracked until **Start my day**.
- **Permission denied / API unsupported** — Manual mode, explained; Measured can be retried from Settings.
- **Outside work hours** — clock still shows desk time, status reads "Outside work hours — no nudges".
- **Paused for today** — status shows paused with **Resume**.
- **Page closed / reloaded** — data persists on this computer; the closed gap is "not tracked".
- **New local day** — fresh day; yesterday kept in storage; prompts and pause reset.
- **No data yet** — cards show friendly empty states ("No breaks yet today — your first one will appear here").
- **Privacy boundary** — all data stays in this browser; no account, no server, no analytics.

## Product Decisions
- Kernel is measured desk time with automatic break credit — learner approved scope ("approve scope"), drawn from the learner's PRD principles "reliable reminders and honest data" and "never substitute generated or guessed values".
- Desktop browser, local-only, single user — from approved scope boundary.
- Default 50-minute threshold and Done / Snooze 10 / Snooze 30 / Pause actions — from learner's PRD §7.2.
- Water presets 150/250/350/500 ml, undo/edit, non-medical target copy — from learner's PRD §7.4.
- Visual direction — from learner's PRD §10.
- *Assumption (agent):* default minimum break 2 min, daily cap 8, default water target 2,000 ml, default work hours 09:00–17:00 Mon–Fri. All editable.
- *Assumption (agent):* a labelled **demo speed** setting (time thresholds compressed) exists so the video can show a full cycle quickly; it never fabricates idle events. Demo speed also ignores work hours (stated in the banner), and outside work hours the person can choose "Remind me anyway today".

## What We're Building
Welcome + permission flow; screen-time card; manual steps toward 10k; optional calorie log; capped water reminders; measured/manual desk-time clock with source chips; automatic break credit; one-at-a-time break prompt with Done/Snooze/Pause, work hours and cap; today's timeline; water logging with undo/edit; daily reflection; settings with export/delete; persistence across reloads; labelled demo speed.

## Deferred From the POC
- 7/30-day insights — needs days of real data; storage keeps history so it can be added.
- Calendar-aware suppression — needs calendar OAuth.
- fl oz units — small but not needed for the proof.
- Installable PWA / background service worker reminders.

## Possible Later Enhancements
Weekly insights from stored days; calendar-aware quiet periods; desktop companion that also sees other apps; mobile companion for steps via HealthKit/Health Connect.

## Non-Goals
- Automatic step counting, calorie targets/estimates, phone or per-app screen time — no honest web source (scope cut).
- Medical advice or diagnosis.
- Employer dashboards, leaderboards, streak-loss shaming.
- Accounts, sync, or any server.

## Open Questions
- Idle Detection requires a user gesture and permission in Chrome/Edge; behaviour on the recording machine must be confirmed early in the build (does not block spec).
