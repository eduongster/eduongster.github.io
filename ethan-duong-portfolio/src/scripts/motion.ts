/** Shared motion + math helpers. */

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const prefersReducedMotion = () => reduceQuery.matches;
export const onReducedMotionChange = (fn: (reduced: boolean) => void) =>
  reduceQuery.addEventListener('change', (e) => fn(e.matches));

export const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Small, fast, seedable PRNG (mulberry32). Same seed, same sequence. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Run `fn` at most once per animation frame. */
export function rafThrottle(fn: () => void) {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn();
    });
  };
}

/** Observe visibility of an element; returns a disconnect function. */
export function whenVisible(el: Element, cb: (visible: boolean) => void, rootMargin = '0px') {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting)), { rootMargin });
  io.observe(el);
  return () => io.disconnect();
}

/** A pre-rendered soft glow sprite, reused for every glowing thing. */
export function glowSprite(rgb: string, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.18, `rgba(${rgb},0.55)`);
  grad.addColorStop(0.45, `rgba(${rgb},0.14)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}
