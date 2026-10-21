# Daywell

A calm desktop-browser break companion for remote workers. Daywell measures how long you've **actually** been at your desk (using the browser's idle signal, not a fixed timer), credits a break automatically when you step away, and suggests one small break at a time. Every number is labelled by where it came from: measured, manual, or reported. Missing data is never shown as zero.

Alongside the break companion:
- **Screen time on this computer**: today's active time, measured from the same idle signal. Phones, other devices and per-app usage aren't included.
- **Steps toward 10k**: you type the count from your phone (a browser can't count steps), labelled *Manual · from your phone*.
- **Water**: one-tap logging plus gentle reminders, capped per day and never shown on top of a break suggestion.
- **Calories (optional)**: off by default, manual entries only, no targets.

Built for [Build With AI: Basics](https://learn-ai-basics.devpost.com/) with the Devpost Learn skill pack. The planning documents are in [`devpost/`](devpost/): [scope](devpost/scope.md), [PRD](devpost/prd.md), [spec](devpost/spec.md), [build checklist](devpost/checklist.md).

## Run it

Requires Node.js 18+. Measured mode needs desktop Chrome or Edge; every other browser, including phones, gets a clearly labelled manual mode.

```sh
npm start        # serves on http://localhost:5173
npm test         # engine, water, habits, reflection, time, store and device tests
```

Open `http://localhost:5173`, press **Start my day**, and allow idle detection. If you decline, or your browser doesn't support it, Daywell switches to a clearly labelled manual mode.

**Demo speed:** `http://localhost:5173/?speed=60` makes break thresholds run 60× faster (a 50-minute threshold takes 50 seconds) for recording. A banner shows while it's on. Idle detection and every measured duration stay real.

## How it works

- `src/sources/idle.js`: wraps the [Idle Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Idle_Detection_API). It reports "away" after 60 s without keyboard/mouse input, or when the screen locks.
- `src/engine.js`: pure, tested desk-time logic covering sitting stretches, automatic break credit, prompts, snooze/pause, work hours and the daily cap.
- `src/store.js`: saves everything to `localStorage` in this browser only. Time when the page wasn't open is shown as *not tracked*.
- `src/device.js`: recognises the browser and device and checks what it can actually do, so phones and other browsers get honest guidance instead of a broken feature.
- `src/ui/`: renders the four views (Today, Move, Hydrate, You) and the "Your rhythm" preferences.

## Privacy and security

- No accounts, no server, no analytics, no third-party scripts or fonts.
- A strict Content-Security-Policy allows scripts only from this site and blocks inline scripts.
- Saved data is validated when it loads; malformed or tampered entries are dropped, and anything you type is escaped before it's shown.
- Works offline after the first visit (service worker) and can be installed to the home screen.

## Not medical advice

Daywell offers general wellbeing nudges and is not a medical device.

## License

[MIT](LICENSE). Manrope font: SIL Open Font License ([`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)).
