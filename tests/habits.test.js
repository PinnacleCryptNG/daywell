import test from 'node:test';
import assert from 'node:assert/strict';
import { addCalories, caloriesTotal, latestSteps, removeEntry, setSteps } from '../src/habits.js';

test('steps: no data until updated, latest update wins, undo restores previous', () => {
  assert.equal(latestSteps([]), null);
  let { entries } = setSteps([], 4200, 1);
  const second = setSteps(entries, 6200, 2);
  entries = second.entries;
  assert.equal(latestSteps(entries).total, 6200);
  entries = removeEntry(entries, second.entry.id);
  assert.equal(latestSteps(entries).total, 4200);
});

test('steps: rejects negative, fractional and absurd values', () => {
  assert.throws(() => setSteps([], -1, 1), RangeError);
  assert.throws(() => setSteps([], 12.5, 1), RangeError);
  assert.throws(() => setSteps([], 1_000_000, 1), RangeError);
});

test('calories: empty is no data, entries add up, notes are trimmed', () => {
  assert.equal(caloriesTotal([]), null);
  let { entries, entry } = addCalories([], 450, '  lunch  ', 1);
  assert.equal(entry.note, 'lunch');
  ({ entries } = addCalories(entries, 120, '', 2));
  assert.equal(caloriesTotal(entries), 570);
  assert.equal(caloriesTotal(removeEntry(entries, entry.id)), 120);
  assert.throws(() => addCalories([], 0, '', 1), RangeError);
});
