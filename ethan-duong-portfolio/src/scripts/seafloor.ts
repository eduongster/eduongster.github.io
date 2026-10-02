/**
 * The seafloor under the contact section, drawn like a bathymetric chart:
 * isobaths (lines of equal depth) traced with marching squares over value noise.
 * Drawn once per resize. No animation needed down here.
 */
import { mulberry32 } from './motion';

export interface Seafloor {
  setBright(on: boolean): void;
}

function makeNoise(seed: number) {
  const rnd = mulberry32(seed);
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const vals = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    perm[i] = i;
    vals[i] = rnd();
  }
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < size; i++) perm[i + size] = perm[i];
  const at = (x: number, y: number) => vals[perm[(perm[x & 255] + y) & 511] & 255];
  const s = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = s(x - xi);
    const yf = s(y - yi);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x: number, y: number) => {
    let sum = 0;
    let amp = 0.55;
    let f = 1;
    for (let o = 0; o < 4; o++) {
      sum += value(x * f, y * f) * amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum;
  };
}

export function initSeafloor(): Seafloor {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-seafloor]');
  if (!canvas) return { setBright() {} };
  const noise = makeNoise(4000);
  let bright = false;

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas!.clientWidth;
    const h = canvas!.clientHeight;
    if (!w || !h) return;
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    const ctx = canvas!.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cell = w < 700 ? 7 : 8;
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(h / cell) + 1;
    const field = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = i * cell;
        const y = j * cell;
        // Noise plus a gentle slope: the floor falls away toward the bottom of the page.
        field[j * cols + i] = noise(x * 0.0036, y * 0.0055) + (y / h) * 0.42;
      }

    const levels: number[] = [];
    for (let v = 0.2; v < 1.3; v += 0.055) levels.push(v);
    const labelled: { x: number; y: number; text: string }[] = [];

    levels.forEach((lv, li) => {
      const major = li % 4 === 0;
      const alpha = (major ? 0.2 : 0.09) * (bright ? 2.2 : 1) * (0.55 + (li / levels.length) * 0.7);
      ctx.strokeStyle = `rgba(127,227,208,${Math.min(0.7, alpha)})`;
      ctx.lineWidth = major ? 1 : 0.8;
      ctx.beginPath();
      let labelAt: { x: number; y: number } | null = null;
      for (let j = 0; j < rows - 1; j++)
        for (let i = 0; i < cols - 1; i++) {
          const a = field[j * cols + i];
          const b = field[j * cols + i + 1];
          const c = field[(j + 1) * cols + i + 1];
          const d = field[(j + 1) * cols + i];
          const idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          const x = i * cell;
          const y = j * cell;
          const t = (p: number, q: number) => (lv - p) / (q - p || 1e-6);
          const top = [x + t(a, b) * cell, y] as const;
          const right = [x + cell, y + t(b, c) * cell] as const;
          const bottom = [x + t(d, c) * cell, y + cell] as const;
          const left = [x, y + t(a, d) * cell] as const;
          const seg = (p: readonly [number, number], q: readonly [number, number]) => {
            ctx.moveTo(p[0], p[1]);
            ctx.lineTo(q[0], q[1]);
            if (major && !labelAt && p[0] > w * 0.6 && p[0] < w * 0.9 && p[1] > h * 0.25 && p[1] < h * 0.92) labelAt = { x: p[0], y: p[1] };
          };
          switch (idx) {
            case 1:
            case 14:
              seg(left, bottom);
              break;
            case 2:
            case 13:
              seg(bottom, right);
              break;
            case 3:
            case 12:
              seg(left, right);
              break;
            case 4:
            case 11:
              seg(top, right);
              break;
            case 5:
              seg(left, top);
              seg(bottom, right);
              break;
            case 6:
            case 9:
              seg(top, bottom);
              break;
            case 7:
            case 8:
              seg(left, top);
              break;
            case 10:
              seg(left, bottom);
              seg(top, right);
              break;
          }
        }
      ctx.stroke();
      if (labelAt) labelled.push({ ...(labelAt as { x: number; y: number }), text: `${(4000 + li * 25).toLocaleString('en-US')}` });
    });

    // Chart-style depth labels, knocked out of the line they sit on.
    ctx.font = '9px "Martian Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    for (const l of labelled) {
      const tw = ctx.measureText(l.text).width + 10;
      ctx.clearRect(l.x - tw / 2, l.y - 7, tw, 14);
      ctx.fillStyle = `rgba(127,227,208,${bright ? 0.75 : 0.42})`;
      ctx.fillText(l.text, l.x - tw / 2 + 5, l.y + 0.5);
    }
  }

  let t = 0;
  new ResizeObserver(() => {
    clearTimeout(t);
    t = window.setTimeout(draw, 120);
  }).observe(canvas);
  if ('fonts' in document) document.fonts.ready.then(draw);

  return {
    setBright(on) {
      bright = on;
      draw();
    },
  };
}
