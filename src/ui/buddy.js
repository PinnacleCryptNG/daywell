import { SCENE_DATA } from './buddy-scenes.js';

export const BUDDY_STYLES = ['cartoon', 'pixel'];

const LABELS = {
  drink: 'A woman walks in, drinks from her water bottle and walks back out',
  stretch: 'A woman walks in, stretches her arms overhead and to each side, then walks back out',
};
const atlases = new Map();

const sceneFor = (scene, style) => SCENE_DATA[scene][style] || SCENE_DATA[scene].cartoon;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function atlas(src) {
  if (!atlases.has(src)) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    atlases.set(src, img.decode().then(() => img).catch((err) => {
      atlases.delete(src);
      throw err;
    }));
  }
  return atlases.get(src);
}

export function preloadBuddy(style) {
  for (const scene of Object.keys(SCENE_DATA)) atlas(sceneFor(scene, style).src).catch(() => {});
}

export function sceneDuration(scene, style) {
  return sceneFor(scene, style).frames.reduce((ms, f) => ms + f[3], 0);
}

function drawCell(ctx, data, img, cell, cx, flip) {
  ctx.clearRect(0, 0, data.w, data.h);
  if (cell < 0) return;
  const [sx, sy, sw, sh] = data.cells[cell];
  const w = sw * data.scale;
  const h = sh * data.scale;
  const x = Math.round(cx - w / 2);
  ctx.save();
  if (flip) {
    ctx.translate(2 * x + w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, data.ground - h, w, h);
  ctx.restore();
}

// Plays the scene `loops` times, then rests on the standing frame.
export function mountBuddy(container, scene, style, { loops = 2 } = {}) {
  const data = sceneFor(scene, style);
  const canvas = document.createElement('canvas');
  canvas.width = data.w;
  canvas.height = data.h;
  canvas.className = `buddy buddy-${scene}${data.pixel ? ' buddy-pixel' : ''}`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', LABELS[scene]);
  container.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = !data.pixel;
  atlas(data.src).then((img) => {
    if (!canvas.isConnected) return;
    if (reducedMotion()) {
      drawCell(ctx, data, img, data.still, data.restX, 0);
      return;
    }
    const total = sceneDuration(scene, style);
    let start = null;
    let shown = -1;
    const step = (t) => {
      if (!canvas.isConnected) return;
      start ??= t;
      const elapsed = t - start;
      if (elapsed >= total * loops) {
        drawCell(ctx, data, img, data.rest, data.restX, 0);
        return;
      }
      let ms = elapsed % total;
      let i = 0;
      while (ms >= data.frames[i][3]) ms -= data.frames[i++][3];
      if (i !== shown) {
        const [cell, cx, flip] = data.frames[i];
        drawCell(ctx, data, img, cell, cx, flip);
        shown = i;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }).catch(() => container.replaceChildren());
}
