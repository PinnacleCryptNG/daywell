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
