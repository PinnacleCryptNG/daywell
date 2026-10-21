import test from 'node:test';
import assert from 'node:assert/strict';
import { createDay } from '../src/engine.js';
import { summarize } from '../src/reflection.js';
import { DEFAULT_SETTINGS } from '../src/store.js';
import { MINUTE } from '../src/time.js';

test('empty day says "No data", never zero', () => {
  const s = summarize(createDay('2026-10-19', 0), DEFAULT_SETTINGS, 0);
  assert.equal(s.deskMs, null);
  assert.equal(s.longestMs, null);
  assert.equal(s.waterMl, null);
  assert.match(s.headline, /okay/);
});

test('counts breaks and finds the longest sitting stretch without failure language', () => {
  const day = createDay('2026-10-19', 0);
  day.segments = [
    { kind: 'desk', start: 0, end: 40 * MINUTE },
    { kind: 'away', start: 40 * MINUTE, end: 45 * MINUTE },
    { kind: 'desk', start: 45 * MINUTE, end: null },
  ];
  day.breaks = [{ id: 'b', start: 40 * MINUTE, end: 45 * MINUTE, durationMs: 5 * MINUTE, source: 'measured' }];
  const s = summarize(day, DEFAULT_SETTINGS, 115 * MINUTE);
  assert.equal(s.breaks, 1);
  assert.equal(s.longestMs, 70 * MINUTE);
  assert.match(s.headline, /1 movement break today/);
  assert.doesNotMatch(s.headline + s.waterLine, /fail|missed|should/i);
});
