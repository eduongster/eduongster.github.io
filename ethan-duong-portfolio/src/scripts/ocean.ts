/**
 * The ocean behind the page: a school of fish (boids), marine snow, and
 * bioluminescence that takes over as you descend. One canvas, no libraries.
 *
 * Boids: each fish steers by three local rules (Craig Reynolds, 1987)
 *   separation: don't crowd your neighbours
 *   alignment:  swim the way your neighbours swim
 *   cohesion:   drift toward your neighbours' centre
 * plus a little wander, soft edges, cursor avoidance, and scroll parallax.
 */
import { clamp, glowSprite, isCoarsePointer, lerp, prefersReducedMotion, smoothstep } from './motion';
import { depthState } from './depth';

type RGB = [number, number, number];
type Layer = { scale: number; alpha: number; parallax: number; speed: number; tint: RGB; share: number };

// Far → near. Nearer fish are larger, brighter, faster, and move more with the scroll.
const LAYERS: Layer[] = [
  { scale: 0.5, alpha: 0.2, parallax: 0.18, speed: 0.55, tint: [110, 156, 186], share: 0.4 },
  { scale: 0.76, alpha: 0.28, parallax: 0.42, speed: 0.78, tint: [152, 198, 220], share: 0.34 },
  { scale: 1.05, alpha: 0.38, parallax: 0.78, speed: 1, tint: [198, 228, 241], share: 0.26 },
];
const DEEP_TINT: RGB = [74, 116, 146];

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  face: number; // -1 facing left … 1 facing right; passes through 0 as the fish turns
  pitch: number;
  phase: number;
  layer: number;
  len: number;
  limit: number; // how deep (0..1 of the page) this fish follows you
  wander: number;
  boost: number;
}
interface Mote {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  freq: number;
  a: number;
  par: number;
}
interface Spark {
  x: number;
  y: number;
  phase: number;
  speed: number;
  size: number;
  par: number;
}
interface Pellet {
  x: number;
  y: number;
  age: number;
  eaten: boolean;
}
interface Ring {
  x: number;
  y: number;
  age: number;
  big: boolean;
}

export interface Ocean {
  feed(x: number, y: number): void;
  setAbyss(on: boolean): void;
  remeasure(): void;
}

export function createOcean(canvas: HTMLCanvasElement, avoidEl: HTMLElement | null): Ocean {
  const ctx = canvas.getContext('2d')!;
  const lumeSprite = glowSprite('127,227,208');
  const lureSprite = glowSprite('242,184,114', 128);

  let W = 0;
  let H = 0;
  let dpr = 1;
  let fish: Fish[] = [];
  let motes: Mote[] = [];
  let sparks: Spark[] = [];
  let pellets: Pellet[] = [];
  let rings: Ring[] = [];
  let lastScroll = window.scrollY;
  let abyss = false;
  let abyssMix = 0;
  let running = false;
  let raf = 0;
  let last = performance.now();
  const born = performance.now();
  const pointer = { x: -9999, y: -9999, active: false, until: 0 };
  let avoid: { x: number; y: number; w: number; h: number } | null = null;

  const reduced = () => prefersReducedMotion();

  /* ---------------- setup ---------------- */

  function populate() {
    const area = W * H;
    const nFish = Math.round(clamp(area / 24000, 20, 56));
    fish = [];
    // Each layer starts as a loose school with a shared heading, so it reads as a school from frame one.
    const schools = [
      { cx: 0.62, cy: 0.24, dir: -1 },
      { cx: 0.74, cy: 0.58, dir: 1 },
      { cx: 0.8, cy: 0.36, dir: -1 },
    ];
    let made = 0;
    LAYERS.forEach((L, li) => {
      const count = li === LAYERS.length - 1 ? nFish - made : Math.round(nFish * L.share);
      made += count;
      const s = schools[li];
      for (let i = 0; i < count; i++) {
        const sp = 0.6 * L.speed;
        const a = (s.dir < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 0.5;
        fish.push({
          x: W * s.cx + (Math.random() - 0.5) * W * 0.34,
          y: H * s.cy + (Math.random() - 0.5) * H * 0.26,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp * 0.4,
          face: Math.cos(a) >= 0 ? 1 : -1,
          pitch: 0,
          phase: Math.random() * Math.PI * 2,
          layer: li,
          len: 27 * L.scale * (0.8 + Math.random() * 0.4),
          limit: 0.14 + Math.pow(Math.random(), 1.4) * (li === 2 ? 0.5 : li === 1 ? 0.78 : 1),
          wander: Math.random() * Math.PI * 2,
          boost: 0,
        });
      }
    });

    const nMotes = Math.round(clamp(area / 12500, 28, 120));
    motes = Array.from({ length: nMotes }, () => {
      const r = 0.35 + Math.pow(Math.random(), 2.2) * 1.45;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r,
        vy: 0.04 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
        freq: 0.0004 + Math.random() * 0.0009,
        a: 0.07 + (r / 1.8) * 0.26,
        par: 0.12 + (r / 1.8) * 0.4,
      };
    });

    const nSparks = Math.round(clamp(area / 36000, 10, 36));
    sparks = Array.from({ length: nSparks }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0005 + Math.random() * 0.0011,
      size: 8 + Math.random() * 20,
      par: 0.15 + Math.random() * 0.45,
    }));
  }

  function resize() {
    const coarse = isCoarsePointer();
    const nw = window.innerWidth;
    const nh = window.innerHeight;
    // On phones the URL bar changes the height while scrolling; don't reshuffle for that.
    if (W && coarse && nw === W && Math.abs(nh - H) < 160) return;
    const first = W === 0;
    const sx = first ? 1 : nw / W;
    const sy = first ? 1 : nh / H;
    W = nw;
    H = nh;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (first) populate();
    else {
      for (const f of fish) {
        f.x *= sx;
        f.y *= sy;
      }
      for (const m of motes) {
        m.x *= sx;
        m.y *= sy;
      }
      for (const s of sparks) {
        s.x *= sx;
        s.y *= sy;
      }
    }
    measureAvoid();
    if (!running) draw(performance.now());
  }

  function measureAvoid() {
    if (!avoidEl) return;
    // On narrow screens the copy spans the full width, so only keep the name clear.
    const el = W < 900 ? (avoidEl.querySelector<HTMLElement>('h1') ?? avoidEl) : avoidEl;
    const r = el.getBoundingClientRect();
    avoid = { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
  }

  /* ---------------- simulation ---------------- */

  function steer(f: Fish, tx: number, ty: number, maxSpeed: number, maxForce: number, out: { x: number; y: number }, w: number) {
    const m = Math.hypot(tx, ty);
    if (m < 1e-6) return;
    let sx = (tx / m) * maxSpeed - f.vx;
    let sy = (ty / m) * maxSpeed - f.vy;
    const sm = Math.hypot(sx, sy);
    if (sm > maxForce) {
      sx = (sx / sm) * maxForce;
      sy = (sy / sm) * maxForce;
    }
    out.x += sx * w;
    out.y += sy * w;
  }

  const acc = { x: 0, y: 0 };

  function step(dt: number, now: number) {
    const scrollY = window.scrollY;
    const dScroll = scrollY - lastScroll;
    lastScroll = scrollY;
    abyssMix += ((abyss ? 1 : 0) - abyssMix) * Math.min(1, 0.05 * dt);

    const top = H * 0.07;
    const bottom = H * 0.93;
    const av = avoid ? { x: avoid.x - 28, y: avoid.y - scrollY - 28, w: avoid.w + 56, h: avoid.h + 56 } : null;
    const pointerOn = pointer.active || now < pointer.until;

    for (const f of fish) {
      const L = LAYERS[f.layer];
      const maxSpeed = 0.95 * L.speed;
      const maxForce = 0.032 * L.speed;
      const R = 92 * L.scale;
      const S = 28 * L.scale;
      acc.x = 0;
      acc.y = 0;

      let n = 0;
      let cx = 0;
      let cy = 0;
      let ax = 0;
      let ay = 0;
      let sx = 0;
      let sy = 0;
      for (const o of fish) {
        if (o === f || o.layer !== f.layer) continue;
        const dx = o.x - f.x;
        const dy = o.y - f.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > R * R) continue;
        n++;
        cx += o.x;
        cy += o.y;
        ax += o.vx;
        ay += o.vy;
        if (d2 < S * S && d2 > 0.01) {
          sx -= dx / d2;
          sy -= dy / d2;
        }
      }
      if (n) {
        steer(f, ax / n, ay / n, maxSpeed, maxForce, acc, 1.0); // alignment
        steer(f, cx / n - f.x, cy / n - f.y, maxSpeed, maxForce, acc, 0.85); // cohesion
        if (sx || sy) steer(f, sx, sy, maxSpeed, maxForce, acc, 1.6); // separation
      }

      // Wander, mostly horizontal. Fish cruise; they don't climb like birds.
      f.wander += (Math.random() - 0.5) * 0.22 * dt;
      acc.x += Math.cos(f.wander) * maxForce * 0.45;
      acc.y += Math.sin(f.wander) * maxForce * 0.2;

      // Soft edges: allowed to slip just off-screen, then turn back.
      if (f.x < -50) acc.x += maxForce * clamp((-50 - f.x) / 60 + 0.6, 0, 2.4);
      if (f.x > W + 50) acc.x -= maxForce * clamp((f.x - W - 50) / 60 + 0.6, 0, 2.4);
      if (f.y < top) acc.y += maxForce * clamp((top - f.y) / 60, 0, 2.2);
      if (f.y > bottom) acc.y -= maxForce * clamp((f.y - bottom) / 60, 0, 2.2);

      // Keep the headline clear: nudge fish out of the hero copy.
      if (av && f.layer > 0 && f.x > av.x && f.x < av.x + av.w && f.y > av.y && f.y < av.y + av.h) {
        const dl = f.x - av.x;
        const dr = av.x + av.w - f.x;
        const dt2 = f.y - av.y;
        const db = av.y + av.h - f.y;
        const m = Math.min(dl, dr, dt2, db);
        const k = maxForce * 2.2;
        if (m === dr) acc.x += k;
        else if (m === dl) acc.x -= k;
        else if (m === dt2) acc.y -= k;
        else acc.y += k;
      }

      // Cursor: a predator by day, a lure in the abyss.
      if (pointerOn && f.layer > 0) {
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (abyss) {
          if (d < 460 && d > 24) steer(f, -dx, -dy, maxSpeed * 1.25, maxForce * 1.4, acc, 1);
        } else if (d < 150) {
          steer(f, dx, dy, maxSpeed * 2.6, maxForce * 5, acc, 1);
          f.boost = Math.min(1, f.boost + 0.2);
        }
      }

      // Food.
      if (pellets.length && f.layer > 0) {
        let best: Pellet | null = null;
        let bd = 280;
        for (const p of pellets) {
          if (p.eaten) continue;
          const d = Math.hypot(p.x - f.x, p.y - f.y);
          if (d < bd) {
            bd = d;
            best = p;
          }
        }
        if (best) {
          steer(f, best.x - f.x, best.y - f.y, maxSpeed * 1.8, maxForce * 3, acc, 1);
          f.boost = Math.min(1, f.boost + 0.05);
          if (bd < 9 * L.scale + 4) {
            best.eaten = true;
            rings.push({ x: best.x, y: best.y, age: 0, big: false });
          }
        }
      }

      f.vx += acc.x * dt;
      f.vy += acc.y * dt;
      f.vy *= Math.pow(0.975, dt);
      const sp = Math.hypot(f.vx, f.vy);
      const lim = maxSpeed * (1 + f.boost * 1.5);
      if (sp > lim) {
        f.vx = (f.vx / sp) * lim;
        f.vy = (f.vy / sp) * lim;
      } else if (sp < maxSpeed * 0.35) {
        const k = (maxSpeed * 0.35) / Math.max(sp, 1e-4);
        f.vx *= k;
        f.vy *= k;
      }
      f.boost = Math.max(0, f.boost - 0.01 * dt);

      f.x += f.vx * dt;
      f.y += f.vy * dt - dScroll * L.parallax;
      // Scrolling moves you through the water: fish left above you re-enter from below.
      if (f.y < -140) f.y = H + 40 + Math.random() * 80;
      else if (f.y > H + 140) f.y = -40 - Math.random() * 80;

      // Fish turn by yawing, not by looping: flip the silhouette through edge-on,
      // and keep the pitch shallow.
      if (Math.abs(f.vx) > 0.06) {
        const want = f.vx > 0 ? 1 : -1;
        f.face += (want - f.face) * Math.min(1, 0.09 * dt);
      }
      const pitch = clamp(Math.atan2(f.vy, Math.abs(f.vx)), -0.55, 0.55);
      f.pitch += (pitch - f.pitch) * Math.min(1, 0.12 * dt);
      f.phase += (0.08 + Math.hypot(f.vx, f.vy) * 0.2) * dt;
    }

    for (const m of motes) {
      m.y += m.vy * dt - dScroll * m.par;
      m.x += Math.sin(now * m.freq + m.phase) * 0.09 * dt;
      if (m.y > H + 6) {
        m.y = -6;
        m.x = Math.random() * W;
      } else if (m.y < -6) {
        m.y = H + 6;
        m.x = Math.random() * W;
      }
      if (m.x < -6) m.x = W + 6;
      else if (m.x > W + 6) m.x = -6;
    }

    for (const s of sparks) {
      s.y += -0.03 * dt - dScroll * s.par;
      s.x += Math.sin(now * 0.0003 + s.phase) * 0.05 * dt;
      if (s.y < -30) {
        s.y = H + 30;
        s.x = Math.random() * W;
      } else if (s.y > H + 30) {
        s.y = -30;
        s.x = Math.random() * W;
      }
    }

    for (const p of pellets) {
      p.y += 0.32 * dt - dScroll * 0.78;
      p.x += Math.sin(p.age * 0.05) * 0.08 * dt;
      p.age += dt;
    }
    pellets = pellets.filter((p) => !p.eaten && p.age < 1100 && p.y < H + 20 && p.y > -40);
    for (const r of rings) r.age += dt;
    rings = rings.filter((r) => r.age < (r.big ? 70 : 40));
  }

  /* ---------------- rendering ---------------- */

  function drawFish(f: Fish, alpha: number, tint: RGB) {
    const len = f.len;
    const h = len * 0.3;
    const wag = Math.sin(f.phase) * h * 0.55;
    const bend = Math.sin(f.phase - 0.9) * h * 0.2;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(Math.abs(f.face) < 0.08 ? 0.08 * Math.sign(f.face || 1) : f.face, 1);
    ctx.rotate(f.pitch);
    ctx.beginPath();
    ctx.moveTo(len * 0.5, 0);
    ctx.bezierCurveTo(len * 0.36, -h * 0.64, -len * 0.08, -h * 0.6, -len * 0.3, -h * 0.13 + bend);
    ctx.lineTo(-len * 0.54, -h * 0.62 + wag);
    ctx.quadraticCurveTo(-len * 0.44, wag * 0.5 + bend, -len * 0.54, h * 0.62 + wag);
    ctx.lineTo(-len * 0.3, h * 0.13 + bend);
    ctx.bezierCurveTo(-len * 0.08, h * 0.6, len * 0.36, h * 0.64, len * 0.5, 0);
    ctx.closePath();
    ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${alpha})`;
    ctx.fill();
    ctx.restore();
  }

  function draw(now: number) {
    const prog = depthState.progress;
    const intro = reduced() ? 1 : smoothstep(0, 1, (now - born) / 1800);
    ctx.clearRect(0, 0, W, H);

    // Marine snow
    const snowFade = 1 - 0.35 * prog;
    ctx.fillStyle = 'rgb(206,229,238)';
    for (const m of motes) {
      ctx.globalAlpha = m.a * snowFade * intro * (1 - abyssMix * 0.5);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bioluminescence: appears in the twilight zone, owns the abyss.
    const sparkVis = Math.max(smoothstep(0.3, 0.78, prog), abyssMix);
    if (sparkVis > 0.01) {
      for (const s of sparks) {
        const pulse = 0.5 + 0.5 * Math.sin(now * s.speed + s.phase);
        ctx.globalAlpha = sparkVis * intro * (0.15 + 0.85 * pulse * pulse) * 0.8;
        ctx.drawImage(lumeSprite, s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
    }

    // Fish
    const deepMix = smoothstep(0.05, 0.7, prog);
    const photophores = Math.max(smoothstep(0.28, 0.6, prog), abyssMix);
    for (const f of fish) {
      const L = LAYERS[f.layer];
      const vis = Math.max(clamp((f.limit - prog) / 0.08, 0, 1), abyssMix);
      if (vis <= 0.01) continue;
      const tint: RGB = [
        lerp(lerp(L.tint[0], DEEP_TINT[0], deepMix), 127, abyssMix),
        lerp(lerp(L.tint[1], DEEP_TINT[1], deepMix), 227, abyssMix),
        lerp(lerp(L.tint[2], DEEP_TINT[2], deepMix), 208, abyssMix),
      ];
      ctx.globalAlpha = 1;
      drawFish(f, L.alpha * vis * intro * (1 + abyssMix * 0.6), tint);
      if (photophores > 0.02) {
        const s = f.len * (0.55 + abyssMix * 1.4);
        const hx = f.x + f.face * Math.cos(f.pitch) * f.len * 0.24;
        const hy = f.y + Math.sin(f.pitch) * f.len * 0.24;
        ctx.globalAlpha = photophores * vis * intro * 0.75;
        ctx.drawImage(lumeSprite, hx - s / 2, hy - s / 2, s, s);
      }
    }

    // Food and ripples
    for (const p of pellets) {
      ctx.globalAlpha = 0.9 * intro;
      ctx.drawImage(lureSprite, p.x - 7, p.y - 7, 14, 14);
      ctx.fillStyle = 'rgb(255,236,205)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 1;
    for (const r of rings) {
      const life = r.big ? 70 : 40;
      const t = r.age / life;
      ctx.globalAlpha = (1 - t) * (r.big ? 0.5 : 0.7);
      ctx.strokeStyle = r.big ? 'rgb(200,235,245)' : 'rgb(127,227,208)';
      ctx.beginPath();
      ctx.arc(r.x, r.y, (r.big ? 6 : 2) + t * (r.big ? 46 : 14), 0, Math.PI * 2);
      ctx.stroke();
    }

    // In the abyss, the cursor is the only light.
    if (abyssMix > 0.01 && pointer.x > -999) {
      ctx.globalAlpha = abyssMix * 0.5;
      ctx.drawImage(lureSprite, pointer.x - 130, pointer.y - 130, 260, 260);
      ctx.globalAlpha = abyssMix;
      ctx.drawImage(lureSprite, pointer.x - 10, pointer.y - 10, 20, 20);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- loop ---------------- */

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(3, (now - last) / 16.667);
    last = now;
    step(dt, now);
    draw(now);
  }
  function start() {
    if (running || reduced()) return;
    running = true;
    last = performance.now();
    lastScroll = window.scrollY;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  /* ---------------- events ---------------- */

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  });
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    },
    { passive: true },
  );
  window.addEventListener(
    'pointerdown',
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (e.pointerType === 'touch') pointer.until = performance.now() + 700;
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    pointer.active = false;
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  // With motion reduced we still redraw on scroll, so fish thin out with depth (no movement).
  window.addEventListener(
    'scroll',
    () => {
      if (!running) requestAnimationFrame(() => draw(performance.now()));
    },
    { passive: true },
  );
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches) {
      stop();
      draw(performance.now());
    } else start();
  });
  if ('fonts' in document) document.fonts.ready.then(measureAvoid);

  resize();
  start();
  if (!running) draw(performance.now());

  return {
    feed(x, y) {
      if (reduced()) return;
      rings.push({ x, y, age: 0, big: true });
      for (let i = 0; i < 5; i++) {
        pellets.push({ x: x + (Math.random() - 0.5) * 34, y: y + (Math.random() - 0.5) * 14, age: -i * 6, eaten: false });
      }
    },
    setAbyss(on) {
      abyss = on;
      if (reduced()) {
        abyssMix = on ? 1 : 0;
        draw(performance.now());
      }
    },
    remeasure: measureAvoid,
  };
}
