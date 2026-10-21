export const IDLE_WINDOW_MS = 60_000;

export class SourceError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function idleSupported() {
  return typeof window !== 'undefined' && 'IdleDetector' in window && window.isSecureContext;
}

export async function createIdleSource({ request }) {
  if (!idleSupported()) throw new SourceError('unsupported', 'This browser does not support idle detection.');
  let state = null;
  try {
    state = (await navigator.permissions.query({ name: 'idle-detection' })).state;
  } catch {
    state = null;
  }
  if (state !== 'granted') {
    if (!request) throw new SourceError('needs-gesture', 'Permission must be requested from a click.');
    const result = await window.IdleDetector.requestPermission();
    if (result !== 'granted') throw new SourceError('denied', 'Idle detection permission was not granted.');
  }

  const controller = new AbortController();
  const detector = new window.IdleDetector();
  let emit = () => {};

  const report = () => {
    const now = Date.now();
    if (detector.userState === 'active' && detector.screenState === 'unlocked') emit({ type: 'active', t: now });
    else if (detector.screenState === 'locked') emit({ type: 'away', t: now, since: now });
    else if (detector.userState === 'idle') emit({ type: 'away', t: now, since: now - IDLE_WINDOW_MS });
  };

  return {
    kind: 'measured',
    async start(onSignal) {
      emit = onSignal;
      detector.addEventListener('change', report);
      await detector.start({ threshold: IDLE_WINDOW_MS, signal: controller.signal });
      report();
    },
    replay: report,
    stop() {
      controller.abort();
    },
  };
}
