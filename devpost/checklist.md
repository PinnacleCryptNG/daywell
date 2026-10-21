---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast — learner asked to minimise back-and-forth ("Do everything you need to do"); hands-on checkpoints below.

## Slices

- [x] **1. You can open Daywell and see a calm Today screen with a running manual sitting clock**
  Becomes usable: The page loads with the welcome card; Start my day begins a Manual sitting clock in the hero ring; "I'm stepping away / I'm back" logs a manual break.
  Why now: Scaffolds the project and proves the engine → UI path end to end with the simplest source.
  PRD ref: `prd.md > The Core Journey` (steps 1, 3, 6), `prd.md > Manual mode`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Desk-time engine`, `spec.md > Interface`, `spec.md > File Structure`
  Build: package.json, serve script, index/styles, engine with tests, manual source, hero/breaks rendering.
  Verify (mechanical): `npm test` passes; `npm start` serves; in Chrome, start, step away ≥ min, come back → break listed, clock reset.
  Learner check: Open the app and say whether the look matches what you pictured.
  Commit: `Add Today screen with manual desk-time clock`

- [x] **2. Daywell measures desk time and logs a break by itself when you walk away**
  Becomes usable: Measured mode via Idle Detection; away periods auto-logged with real duration and a "Welcome back" notice with Undo.
  Why now: This is the unique kernel and the largest technical risk.
  PRD ref: `prd.md > Measured desk time`, `prd.md > Automatic break credit`
  Spec ref: `spec.md > Desk signal sources`, `spec.md > Important Failure Modes`
  Build: idle source, permission flow, fallback to manual on deny/unsupported, source chips, undo-I-was-here.
  Verify (mechanical): engine tests for away ≥/< minimum and undo; in local Chrome, grant permission, idle > 60 s, return → measured break.
  Learner check: Allow the permission, walk away for a couple of minutes, come back and see the break logged.
  Commit: `Detect away periods and credit breaks automatically`

- [x] **3. A gentle break prompt appears at the threshold, respecting snooze, pause, work hours and cap**
  Becomes usable: Done / Snooze 10 / Snooze 30 / Pause for today; tab title + optional notification; demo speed.
  Why now: Completes the core loop on top of a working clock.
  PRD ref: `prd.md > Break prompt`, `prd.md > The Core Journey` (step 4)
  Spec ref: `spec.md > Desk-time engine`, `spec.md > Data Model`
  Build: prompt rules in engine with tests, banner UI, Done→Measured upgrade, `?speed=`.
  Verify (mechanical): engine tests for each rule; at `?speed=60` prompt shows after ~50 s.
  Learner check: Open with demo speed, wait for the prompt, try Snooze and Done.
  Commit: `Add break prompt with snooze, pause and work hours`

- [x] **4. Today survives a reload and shows an honest timeline**
  Becomes usable: Persistence, not-tracked gaps, new-day rollover, today's timeline strip.
  Why now: Persistence is where the data model can be wrong; the timeline makes honesty visible.
  PRD ref: `prd.md > Today's timeline`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Store`, `spec.md > Data Model`
  Build: store, load/close-gap logic with tests, timeline rendering with legend.
  Verify (mechanical): tests for gap handling and day rollover; reload in Chrome keeps breaks; closed gap shows hatched.
  Learner check: Reload the page and confirm everything is still there.
  Commit: `Persist today and draw the honest timeline`

- [x] **5. You can log water in one tap, undo or edit it**
  Becomes usable: Water card with presets, custom, target, entries, undo toast, edit/delete.
  Why now: Rounds out the Today screen once the kernel is solid.
  PRD ref: `prd.md > Water logging`
  Spec ref: `spec.md > Water`
  Build: water.js with tests, water card UI.
  Verify (mechanical): tests for add/remove/edit/total; UI add → undo → edit.
  Learner check: Log a glass, undo it, log another and edit it.
  Commit: `Add quick water logging with undo and edit`

- [x] **6. You can wrap up the day and adjust settings**
  Becomes usable: Reflection card, settings drawer, export/delete data.
  Why now: Closes the core journey and makes defaults adjustable.
  PRD ref: `prd.md > Daily reflection`, `prd.md > Settings and data`
  Spec ref: `spec.md > Reflection`, `spec.md > Store`
  Build: reflection.js with tests, wrap-up card, settings drawer, README + LICENSE.
  Verify (mechanical): tests for reflection copy and "No data"; change threshold → ring updates; export downloads JSON.
  Learner check: Wrap up your day and read the reflection — does the tone feel right?
  Commit: `Add daily reflection, settings and data controls`

- [x] **7. You can see today's active screen time and track steps toward 10k**
  Becomes usable: Screen-time card (measured) and a manual steps card with a 10k goal.
  Why now: Learner restated the full concept; both reuse existing data/patterns honestly.
  PRD ref: `prd.md > Screen time on this computer`, `prd.md > Steps (manual)`
  Spec ref: `spec.md > Habits`, `spec.md > Data Model`
  Build: habits.js with tests, two cards, step goal setting, reflection stats.
  Verify (mechanical): tests for steps; UI shows "No data" then entered value with Manual label.
  Learner check: Enter your phone's step count and check the screen-time number makes sense.
  Commit: `Add screen-time card and manual 10k steps`

- [x] **8. You can turn on an optional calorie log**
  Becomes usable: Settings toggle reveals a target-free calorie log.
  Why now: Lowest priority of the restated concept; kept off by default.
  PRD ref: `prd.md > Calories (optional)`
  Spec ref: `spec.md > Habits`
  Build: calorie ops with tests, card, settings toggle.
  Verify (mechanical): tests; card hidden by default, appears when enabled.
  Learner check: Turn it on, log an entry, and say whether the tone feels right.
  Commit: `Add optional calorie log`

- [x] **9. Daywell gently reminds you to drink water**
  Becomes usable: Capped water reminders that never collide with a break prompt.
  Why now: Completes the hydration part of the concept on top of water logging.
  PRD ref: `prd.md > Water reminders`
  Spec ref: `spec.md > Water reminders`
  Build: waterReminderDue with tests, reminder banner, settings.
  Verify (mechanical): tests for interval/cap/work hours/prompt collision; demo speed shows reminder.
  Learner check: In demo speed, wait for the water reminder and log a glass from it.
  Commit: `Add capped water reminders`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (kernel working)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions

- Timeline spans from the first tracked moment to now (minimum one hour), not fixed work hours — a full 09:00–17:00 strip made short demo stretches invisible.
- Undo on the welcome-back notice says "Undo, I was here" and restores the earlier sitting stretch — added because the 60 s idle window can mistake reading or watching for being away.
- Added screen-time card, manual 10k steps, optional calorie log and water reminders (slices 7–9) — learner restated the full concept after the first checkpoint and chose honest web-app versions over cutting them.
