import test from 'node:test';
import assert from 'node:assert/strict';
import { deviceAdvice, notificationAdvice, parseAgent } from '../src/device.js';

const UA = {
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  edgeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
};

test('recognises common browsers, systems and device types', () => {
  assert.deepEqual(parseAgent(UA.chromeMac), { browser: 'Chrome', os: 'macOS', form: 'desktop' });
  assert.deepEqual(parseAgent(UA.edgeWin), { browser: 'Edge', os: 'Windows', form: 'desktop' });
  assert.deepEqual(parseAgent(UA.firefoxLinux), { browser: 'Firefox', os: 'Linux', form: 'desktop' });
  assert.deepEqual(parseAgent(UA.safariIphone), { browser: 'Safari', os: 'iOS', form: 'phone' });
  assert.deepEqual(parseAgent(UA.chromeAndroid), { browser: 'Chrome', os: 'Android', form: 'phone' });
  assert.deepEqual(parseAgent(UA.ipadDesktopMode, { touchPoints: 5 }), { browser: 'Safari', os: 'iOS', form: 'tablet' });
});

test('advice follows real capability, not the browser name', () => {
  const caps = (idle) => ({ idle, notifications: 'default', standalone: false });
  assert.equal(deviceAdvice({ ...parseAgent(UA.chromeMac), caps: caps(true) }).mode, 'measured');
  assert.equal(deviceAdvice({ ...parseAgent(UA.chromeMac), caps: caps(false) }).mode, 'manual');
  assert.match(deviceAdvice({ ...parseAgent(UA.safariIphone), caps: caps(false) }).detail, /Phones and tablets/);
  assert.match(deviceAdvice({ ...parseAgent(UA.firefoxLinux), caps: caps(false) }).detail, /Firefox doesn't share/);
});

test('explains the iPhone home-screen requirement for notifications', () => {
  assert.match(notificationAdvice({ os: 'iOS', caps: { notifications: 'unsupported', standalone: false } }), /Home Screen/);
});
