import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, inWorkHours } from '../src/time.js';
import { DEFAULT_SETTINGS } from '../src/store.js';

test('work hours respect days and times', () => {
  assert.equal(inWorkHours(new Date(2026, 9, 19, 9, 0).getTime(), DEFAULT_SETTINGS), true);
  assert.equal(inWorkHours(new Date(2026, 9, 19, 17, 0).getTime(), DEFAULT_SETTINGS), false);
  assert.equal(inWorkHours(new Date(2026, 9, 25, 12, 0).getTime(), DEFAULT_SETTINGS), false);
});

test('durations read naturally and missing data is "No data"', () => {
  assert.equal(formatDuration(null), 'No data');
  assert.equal(formatDuration(42_000), '42 s');
  assert.equal(formatDuration(6 * 60_000), '6 min');
  assert.equal(formatDuration(65 * 60_000), '1 h 05 min');
});
