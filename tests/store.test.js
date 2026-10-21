import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, loadData, sanitizeData, sanitizeSettings } from '../src/store.js';
import { createDay } from '../src/engine.js';

const memory = (value) => ({ getItem: () => value });

test('settings outside their limits fall back to defaults', () => {
  const s = sanitizeSettings({ thresholdMin: 9999, dailyCap: 'lots', workStart: '25:00', workEnd: '18:30', workDays: [1, 1, 9, 'x', 3], theme: 'neon', caloriesEnabled: 'yes', stepGoal: 8000 });
  assert.equal(s.thresholdMin, DEFAULT_SETTINGS.thresholdMin);
  assert.equal(s.dailyCap, DEFAULT_SETTINGS.dailyCap);
  assert.equal(s.workStart, DEFAULT_SETTINGS.workStart);
  assert.equal(s.workEnd, '18:30');
  assert.deepEqual(s.workDays, [1, 3]);
  assert.equal(s.theme, 'system');
  assert.equal(s.caloriesEnabled, false);
  assert.equal(s.stepGoal, 8000);
});

test('tampered entries are dropped and unsafe ids rejected', () => {
  const day = createDay('2026-10-20', 1);
  day.water = [{ id: 'w-1', at: 1, ml: 250 }, { id: '"><img src=x onerror=alert(1)>', at: 2, ml: 250 }, { id: 'w-2', at: 3, ml: 1e9 }];
  day.calories = [{ id: 'c-1', at: 1, kcal: 300, note: 'lunch' }, { id: 'c-2', at: 1, kcal: 300, note: { evil: true } }];
  day.notice = { kind: 'break', breakId: 'bad id"', durationMs: 5 };
  const out = sanitizeData({ settings: {}, days: { '2026-10-20': day, 'not-a-date': day, '2026-10-21': day } });
  assert.deepEqual(Object.keys(out.days), ['2026-10-20']);
  assert.deepEqual(out.days['2026-10-20'].water.map((w) => w.id), ['w-1']);
  assert.deepEqual(out.days['2026-10-20'].calories.map((c) => c.id), ['c-1']);
  assert.equal(out.days['2026-10-20'].notice, null);
});

test('corrupted or non-object storage starts fresh', () => {
  assert.deepEqual(loadData(memory('{not json')).days, {});
  assert.deepEqual(loadData(memory('[1,2,3]')).days, {});
  assert.equal(loadData(memory('null')).settings.thresholdMin, DEFAULT_SETTINGS.thresholdMin);
});

test('a valid saved day survives unchanged in its core fields', () => {
  const day = createDay('2026-10-20', 5);
  day.started = true;
  day.mode = 'measured';
  day.segments = [{ start: 1, end: null, kind: 'desk' }];
  const out = sanitizeData({ days: { '2026-10-20': day } }).days['2026-10-20'];
  assert.equal(out.started, true);
  assert.equal(out.mode, 'measured');
  assert.deepEqual(out.segments, day.segments);
  assert.deepEqual(out.prompt, day.prompt);
});
