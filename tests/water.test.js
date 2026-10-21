import test from 'node:test';
import assert from 'node:assert/strict';
import { addWater, editWater, removeWater, waterTotal } from '../src/water.js';

test('add, undo (remove), and edit keep totals correct', () => {
  let { entries, entry } = addWater([], 250, 1);
  ({ entries } = addWater(entries, 500, 2));
  assert.equal(waterTotal(entries), 750);
  entries = removeWater(entries, entry.id);
  assert.equal(waterTotal(entries), 500);
  entries = editWater(entries, entries[0].id, 350);
  assert.equal(waterTotal(entries), 350);
});

test('rejects invalid amounts', () => {
  assert.throws(() => addWater([], 0, 1), RangeError);
  assert.throws(() => addWater([], 5000, 1), RangeError);
  assert.throws(() => addWater([], Number.NaN, 1), RangeError);
});

import { waterReminderDue } from '../src/water.js';
import { createDay } from '../src/engine.js';

const MIN = 60_000;
const always = () => true;
const base = { waterReminderMin: 90, waterReminderCap: 4 };
function startedDay() {
  const day = createDay('2026-10-20', 0);
  day.started = true;
  day.segments = [{ kind: 'desk', start: 0, end: null }];
  return day;
}

test('water reminder: due after the interval since the last glass', () => {
  const day = startedDay();
  assert.equal(waterReminderDue(day, base, 89 * MIN, { inWorkHours: always }), false);
  assert.equal(waterReminderDue(day, base, 90 * MIN, { inWorkHours: always }), true);
  day.water = [{ id: 'w', at: 60 * MIN, ml: 250 }];
  assert.equal(waterReminderDue(day, base, 120 * MIN, { inWorkHours: always }), false);
  assert.equal(waterReminderDue(day, base, 150 * MIN, { inWorkHours: always }), true);
});

test('water reminder: respects off, cap, work hours, break prompt and demo speed', () => {
  const day = startedDay();
  const t = 200 * MIN;
  assert.equal(waterReminderDue(day, { ...base, waterReminderMin: 0 }, t, { inWorkHours: always }), false);
  assert.equal(waterReminderDue(day, base, t, { inWorkHours: () => false }), false);
  assert.equal(waterReminderDue({ ...day, prompt: { ...day.prompt, visible: true } }, base, t, { inWorkHours: always }), false);
  assert.equal(waterReminderDue({ ...day, waterReminder: { visible: false, shownCount: 4, lastAt: 0 } }, base, t, { inWorkHours: always }), false);
  assert.equal(waterReminderDue(day, base, 90 * 1000, { inWorkHours: always, speed: 60 }), true);
});
