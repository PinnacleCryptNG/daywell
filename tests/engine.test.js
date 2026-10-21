import test from 'node:test';
import assert from 'node:assert/strict';
import { canNudgeNow, createDay, reduce, sittingMs, status } from '../src/engine.js';
import { DEFAULT_SETTINGS } from '../src/store.js';
import { MINUTE } from '../src/time.js';

const monday10 = new Date(2026, 9, 19, 10, 0, 0).getTime();
const saturday10 = new Date(2026, 9, 24, 10, 0, 0).getTime();
const settings = { ...DEFAULT_SETTINGS };

function run(events, opts = {}) {
  const s = { ...settings, ...opts };
  let day = createDay('2026-10-19', events[0].t);
  for (const e of events) day = reduce(day, e, s);
  return day;
}

const at = (min, base = monday10) => base + min * MINUTE;

test('start opens a desk segment and sitting time grows', () => {
  const day = run([{ type: 'start', t: at(0), mode: 'measured' }, { type: 'tick', t: at(23) }]);
  assert.equal(status(day), 'sitting');
  assert.equal(sittingMs(day, at(23)), 23 * MINUTE);
});

test('away period at or above the minimum logs a measured break and resets the clock', () => {
  const day = run([
    { type: 'start', t: at(0), mode: 'measured' },
    { type: 'away', t: at(31), since: at(30) },
    { type: 'active', t: at(36) },
  ]);
  assert.equal(day.breaks.length, 1);
  assert.equal(day.breaks[0].durationMs, 6 * MINUTE);
  assert.equal(day.breaks[0].source, 'measured');
  assert.equal(sittingMs(day, at(36)), 0);
  assert.equal(day.notice.kind, 'break');
});

test('away period shorter than the minimum is merged back into desk time', () => {
  const day = run([
    { type: 'start', t: at(0), mode: 'measured' },
    { type: 'away', t: at(20), since: at(20) },
    { type: 'active', t: at(21) },
  ]);
  assert.equal(day.breaks.length, 0);
  assert.equal(sittingMs(day, at(25)), 25 * MINUTE);
  assert.equal(day.segments.length, 1);
});

test('idle "since" never reaches before the desk segment started', () => {
  const day = run([
    { type: 'start', t: at(0), mode: 'measured' },
    { type: 'away', t: at(0.5), since: at(-0.5) },
    { type: 'active', t: at(10) },
  ]);
  assert.equal(day.breaks[0].start, at(0));
});

test('undo "I was here" turns the break back into continuous desk time', () => {
  let day = run([
    { type: 'start', t: at(0), mode: 'measured' },
    { type: 'away', t: at(30), since: at(30) },
    { type: 'active', t: at(35) },
  ]);
  day = reduce(day, { type: 'undoBreak', t: at(36), id: day.breaks[0].id }, settings);
  assert.equal(day.breaks.length, 0);
  assert.equal(day.segments.length, 1);
  assert.equal(sittingMs(day, at(40)), 40 * MINUTE);
});

test('manual mode drives the same break logic with manual source', () => {
  const day = run([
    { type: 'start', t: at(0), mode: 'manual' },
    { type: 'away', t: at(10) },
    { type: 'active', t: at(15) },
  ]);
  assert.equal(day.breaks[0].source, 'manual');
});

test('prompt appears once at the threshold during work hours', () => {
  let day = run([{ type: 'start', t: at(0), mode: 'measured' }, { type: 'tick', t: at(49) }]);
  assert.equal(day.prompt.visible, false);
  day = reduce(day, { type: 'tick', t: at(50) }, settings);
  assert.equal(day.prompt.visible, true);
  day = reduce(day, { type: 'tick', t: at(51) }, settings);
  assert.equal(day.prompt.shownCount, 1);
});

test('snooze re-offers after the snooze length of continued sitting', () => {
  let day = run([{ type: 'start', t: at(0), mode: 'measured' }, { type: 'tick', t: at(50) }]);
  day = reduce(day, { type: 'snooze', t: at(50), minutes: 10 }, settings);
  day = reduce(day, { type: 'tick', t: at(59) }, settings);
  assert.equal(day.prompt.visible, false);
  day = reduce(day, { type: 'tick', t: at(60) }, settings);
  assert.equal(day.prompt.visible, true);
  assert.equal(day.prompt.shownCount, 2);
});

test('pause for today stops prompts until resumed', () => {
  let day = run([{ type: 'start', t: at(0), mode: 'measured' }, { type: 'tick', t: at(50) }]);
  day = reduce(day, { type: 'pause', t: at(50) }, settings);
  day = reduce(day, { type: 'tick', t: at(120) }, settings);
  assert.equal(day.prompt.visible, false);
});

test('no prompt outside work hours or beyond the daily cap', () => {
  const weekend = run([
    { type: 'start', t: at(0, saturday10), mode: 'measured' },
    { type: 'tick', t: at(90, saturday10) },
  ]);
  assert.equal(weekend.prompt.visible, false);
  const capped = run([{ type: 'start', t: at(0), mode: 'measured' }, { type: 'tick', t: at(50) }], { dailyCap: 0 });
  assert.equal(capped.prompt.visible, false);
});

test('Done logs a reported break that upgrades to measured when the user steps away soon after', () => {
  let day = run([{ type: 'start', t: at(0), mode: 'measured' }, { type: 'tick', t: at(50) }]);
  day = reduce(day, { type: 'done', t: at(50) }, settings);
  assert.equal(day.breaks[0].source, 'reported');
  assert.equal(sittingMs(day, at(50)), 0);
  day = reduce(day, { type: 'away', t: at(52), since: at(51) }, settings);
  day = reduce(day, { type: 'active', t: at(55) }, settings);
  assert.equal(day.breaks.length, 1);
  assert.equal(day.breaks[0].source, 'measured');
});

test('demo speed compresses thresholds but not measured durations', () => {
  let day = run([{ type: 'start', t: at(0), mode: 'measured' }], { speed: 60 });
  day = reduce(day, { type: 'tick', t: at(0) + 50_000 }, { ...settings, speed: 60 });
  assert.equal(day.prompt.visible, true);
  day = reduce(day, { type: 'away', t: at(1), since: at(1) }, { ...settings, speed: 60 });
  day = reduce(day, { type: 'active', t: at(2) }, { ...settings, speed: 60 });
  assert.equal(day.breaks[0].durationMs, MINUTE);
});

test('closing a gap ends the open segment at last seen, leaving the gap untracked', () => {
  let day = run([{ type: 'start', t: at(0), mode: 'measured' }, { type: 'tick', t: at(20) }]);
  day = reduce(day, { type: 'closeGap', t: at(80) }, settings);
  assert.equal(status(day), 'stopped');
  assert.equal(day.segments[0].end, at(20));
  day = reduce(day, { type: 'active', t: at(80) }, settings);
  assert.equal(day.segments[1].start, at(80));
  assert.equal(day.breaks.length, 0);
});

test('nudges outside work hours only when overridden for today or in demo speed', () => {
  const settings = { workStart: '09:00', workEnd: '17:00', workDays: [1, 2, 3, 4, 5], speed: 1 };
  const night = new Date(2026, 9, 20, 22, 0).getTime();
  const day = createDay('2026-10-20', night);
  assert.equal(canNudgeNow(night, settings, day), false);
  assert.equal(canNudgeNow(night, { ...settings, speed: 60 }, day), true);
  const overridden = reduce(day, { type: 'ignoreHours', value: true, t: night }, settings);
  assert.equal(canNudgeNow(night, settings, overridden), true);
});
