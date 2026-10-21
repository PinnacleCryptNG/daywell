---
doc: scope
status: approved
---

# Daywell

A calm desktop-browser companion that notices how long you've *actually* been sitting at your computer and nudges you to take small breaks — honestly, without shame.

## The Unique Kernel
Breaks are based on **measured desk time, not a dumb timer**. Daywell uses the browser's own idle signal (keyboard/mouse activity and screen lock, with permission) to know when you're really at the desk. Step away and it credits the break automatically; sit for ~50 minutes of real continuous work and it offers one small, concrete break. Every number says where it came from — measured, manual, or unavailable — and missing data is never shown as zero.

## Who It's For
A desk-bound remote worker whose meetings and deep work blur into hours of sitting — "remind me to move without breaking my concentration." Today they rely on fixed-interval stand-up timers (which nag even after they just walked away and get muted), or nothing at all.

## The Core Loop
Open Daywell in a browser tab at the start of the workday → it quietly tracks continuous at-desk time → after the sitting threshold it suggests a 2–5 minute break (Done / Snooze / Pause for today) → when the person steps away, the gap is detected and logged as a break → they come back to "Break logged — 6 min away" and the sitting clock resets. A one-tap water log lives alongside. At the end of the day, a short no-shame reflection: "You took 4 movement breaks today. Small pauses add up."

## Inspiration & Identity
From the original PRD: calm, premium, health-oriented, practical — "a considerate companion, not a medical portal, gamified fitness tracker, or generic analytics dashboard." Deep navy #0B1020, blue #3157FF actions, restrained cyan #22D3EE accent, warm white #F8FAFC surfaces, Manrope type, simple cards and progress rings, subtle motion. Tone: concise, non-judgmental, specific ("You've been sitting for 50 minutes. Take a 3-minute walk?").

## Why This Matters to the Learner
The learner wrote a full PRD for Daywell around helping remote workers keep the small health habits that disappear during long workdays, with "reliable reminders and honest data" as the core principle. Learning goal: "excel in learning about Ideation and Prompts Engineering for building products."

## What "Working" Looks Like
Open the app in Chrome, allow idle detection, and see the Today screen with a live "sitting for" clock labelled *Measured · this computer*. When the threshold is reached a gentle break prompt appears with Done / Snooze / Pause. The "oh, that's cool" beat: walk away (or lock the screen), come back, and Daywell has already logged the break with its real duration — no button pressed. Log a glass of water in one tap and undo it. All of it survives a page reload. Demonstrable in under a minute on screen.

## The POC Boundary
- Desktop Chrome/Edge web app, single user, local-only data (no account).
- Measured at-desk time and automatic break detection via the browser idle signal, with a clearly labelled manual fallback when permission is denied or unsupported.
- Break prompt with Done / Snooze / Pause-for-today, configurable sitting threshold, work hours respected.
- Quick water logging with presets, undo/edit, daily target.
- Today screen with source labels and a simple end-of-day reflection.
- Active screen time on this computer, shown as its own measured card (desk time relabelled — no phone or per-app data).
- A 10k steps goal updated manually from the person's phone, labelled *Manual · from your phone*.
- Optional calorie log, off by default, awareness only (no targets, no judgment).
- Gentle water reminders on their own schedule, capped per day, never shown alongside a break prompt.

## Later
- 7-day / 30-day insights.
- Calendar-aware reminder suppression.
- Installable PWA, notification when the tab is in the background.
- Mobile companion.

## Explicitly Cut
- **Automatic step counting** — a web app can't count steps; would need native HealthKit/Health Connect. Steps are entered manually instead.
- **Per-app / phone screen time** — no honest browser API; only this computer's active time is shown.
- **Calorie targets and automatic estimates** — harm risk; the calorie log is manual, optional and target-free.
- **Accounts, sync, backend** — local-first is enough for a single-user proof of concept.
- **Native mobile app** — out of reach in the hackathon window and the desk is where the sitting happens.


## Revision (learner decision, after user feedback)
The manual step tracker is removed: a web app can't count steps, and typed-in steps added little. Time when Daywell is closed is shown explicitly as not tracked. Automatic phone screen time and steps (Health Connect / HealthKit) move to the post-hackathon roadmap as a native app.
