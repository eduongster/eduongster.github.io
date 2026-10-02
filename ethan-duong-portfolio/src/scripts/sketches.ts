/**
 * Live sketches for the project index and dialogs. Each one illustrates the
 * project's central idea; none of them is the project's own code.
 */
import { mulberry32, prefersReducedMotion } from './motion';

export interface SketchCtl {
  play(): void;
  pause(): void;
  reseed?(): void;
}

const noop: SketchCtl = { play() {}, pause() {} };

export function mountSketch(el: HTMLElement): SketchCtl {
  switch (el.dataset.sketch) {
    case 'byow':
      return byow(el);
    case 'robot':
      return robot(el);
    case 'scheme':
      return scheme(el);
    case 'cats':
      return cats(el);
    default:
      return noop;
  }
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, canvas.clientWidth);
  const h = Math.max(1, canvas.clientHeight);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function loop(tick: (now: number) => boolean | void) {
  let raf = 0;
  let on = false;
  const frame = (now: number) => {
    if (!on) return;
    const keep = tick(now);
    if (keep === false) {
      on = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  return {
    start() {
      if (on) return;
      on = true;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      on = false;
      cancelAnimationFrame(raf);
    },
    get running() {
      return on;
    },
  };
}

/* ------------------------------------------------------------------ */
/* BYOW: seeded rooms + hallways on a tile grid                        */
/* ------------------------------------------------------------------ */

type Room = { x: number; y: number; w: number; h: number; cx: number; cy: number };
type World = {
  cols: number;
  rows: number;
  grid: Uint8Array; // 0 empty, 1 room, 2 hall, 3 wall
  rooms: Room[];
  halls: [number, number][][];
  walls: [number, number][];
  seed: number;
};

function generateWorld(seed: number, cols: number, rows: number): World {
  const rnd = mulberry32(seed);
  const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const grid = new Uint8Array(cols * rows);
  const rooms: Room[] = [];
  for (let tries = 0; tries < 120 && rooms.length < 11; tries++) {
    const w = ri(4, 9);
    const h = ri(3, 6);
    const x = ri(1, cols - w - 2);
    const y = ri(1, rows - h - 2);
    const clash = rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y);
    if (clash) continue;
    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
  }
  for (const r of rooms) for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) grid[yy * cols + xx] = 1;

  // Connect every room with a minimum spanning tree (Prim), so nothing is cut off.
  const inTree = new Set([0]);
  const edges: [number, number][] = [];
  while (inTree.size < rooms.length) {
    let best: [number, number] | null = null;
    let bd = Infinity;
    for (const a of inTree)
      for (let b = 0; b < rooms.length; b++) {
        if (inTree.has(b)) continue;
        const d = Math.abs(rooms[a].cx - rooms[b].cx) + Math.abs(rooms[a].cy - rooms[b].cy);
        if (d < bd) {
          bd = d;
          best = [a, b];
        }
      }
    if (!best) break;
    inTree.add(best[1]);
    edges.push(best);
  }

  const halls: [number, number][][] = [];
  for (const [a, b] of edges) {
    const A = rooms[a];
    const B = rooms[b];
    const path: [number, number][] = [];
    const horizFirst = rnd() < 0.5;
    const push = (x: number, y: number) => {
      if (grid[y * cols + x] === 0) grid[y * cols + x] = 2;
      path.push([x, y]);
    };
    const sx = Math.sign(B.cx - A.cx) || 1;
    const sy = Math.sign(B.cy - A.cy) || 1;
    if (horizFirst) {
      for (let x = A.cx; x !== B.cx; x += sx) push(x, A.cy);
      for (let y = A.cy; y !== B.cy + sy; y += sy) push(B.cx, y);
    } else {
      for (let y = A.cy; y !== B.cy; y += sy) push(A.cx, y);
      for (let x = A.cx; x !== B.cx + sx; x += sx) push(x, B.cy);
    }
    halls.push(path.filter(([x, y]) => grid[y * cols + x] === 2));
  }

  const walls: [number, number][] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (grid[y * cols + x] !== 0) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const v = grid[ny * cols + nx];
          if (v === 1 || v === 2) {
            near = true;
            break;
          }
        }
      if (near) walls.push([x, y]);
    }
  for (const [x, y] of walls) grid[y * cols + x] = 3;
  return { cols, rows, grid, rooms, halls, walls, seed };
}

function byow(el: HTMLElement): SketchCtl {
  const canvas = el.querySelector('canvas')!;
  const meta = el.querySelector<HTMLElement>('[data-sketch-meta]');
  const isDialog = el.dataset.sketchSize === 'dialog';
  let seed = isDialog ? 61026 : 20260418;
  let world: World | null = null;
  let started = 0;
  let finished = false;
  const avatar = { x: 0, y: 0, px: 0, py: 0, dx: 1, dy: 0, moved: 0 };
  const trail: [number, number][] = [];

  const T_ROOM = 110;
  const T_HALLS = 950;
  const T_WALLS = 320;
  const timings = () => {
    const rooms = (world?.rooms.length ?? 0) * T_ROOM + 220;
    return { rooms, halls: rooms + 80 + T_HALLS, walls: rooms + 80 + T_HALLS + T_WALLS };
  };

  function build() {
    const { w, h } = fit(canvas);
    const cols = isDialog ? 46 : 44;
    const rows = Math.max(16, Math.round((cols * h) / w) - 2);
    world = generateWorld(seed, cols, rows);
    const r0 = world.rooms[0];
    Object.assign(avatar, { x: r0.cx, y: r0.cy, px: r0.cx, py: r0.cy, dx: 1, dy: 0, moved: 0 });
    trail.length = 0;
    if (meta) meta.textContent = `seed ${seed} · ${world.rooms.length} rooms · ${world.halls.length} hallways`;
  }

  function stepAvatar(now: number) {
    if (!world || now - avatar.moved < 190) return;
    avatar.moved = now;
    const { grid, cols } = world;
    const floor = (x: number, y: number) => grid[y * cols + x] === 1 || grid[y * cols + x] === 2;
    const dirs: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const options = dirs.filter(([dx, dy]) => floor(avatar.x + dx, avatar.y + dy) && !(dx === -avatar.dx && dy === -avatar.dy));
    let pick: [number, number] | undefined;
    if (options.some(([dx, dy]) => dx === avatar.dx && dy === avatar.dy) && Math.random() < 0.75) pick = [avatar.dx, avatar.dy];
    else pick = options[Math.floor(Math.random() * options.length)] ?? [-avatar.dx, -avatar.dy];
    trail.push([avatar.x, avatar.y]);
    if (trail.length > 7) trail.shift();
    avatar.px = avatar.x;
    avatar.py = avatar.y;
    avatar.dx = pick[0];
    avatar.dy = pick[1];
    avatar.x += pick[0];
    avatar.y += pick[1];
  }

  function draw(now: number, elapsed: number) {
    if (!world) return;
    const { ctx, w, h } = fit(canvas);
    const { cols, rows, rooms, halls, walls } = world;
    const s = Math.floor(Math.min((w - 24) / cols, (h - 40) / rows));
    const ox = Math.round((w - cols * s) / 2);
    const oy = Math.round((h - 26 - rows * s) / 2);
    const t = timings();
    ctx.clearRect(0, 0, w, h);

    // Tile grid texture
    ctx.fillStyle = 'rgba(150,196,218,0.09)';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) ctx.fillRect(ox + x * s + s / 2 - 0.5, oy + y * s + s / 2 - 0.5, 1, 1);

    // Rooms, one after another
    rooms.forEach((r, i) => {
      const a = Math.min(1, Math.max(0, (elapsed - i * T_ROOM) / 220));
      if (a <= 0) return;
      ctx.fillStyle = `rgba(127,227,208,${0.17 * a})`;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) ctx.fillRect(ox + x * s + 1, oy + y * s + 1, s - 2, s - 2);
      ctx.strokeStyle = `rgba(127,227,208,${0.35 * a})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + r.x * s + 0.5, oy + r.y * s + 0.5, r.w * s - 1, r.h * s - 1);
    });

    // Hallways grow tile by tile
    const total = halls.reduce((n, p) => n + p.length, 0);
    const shown = Math.floor(Math.min(1, Math.max(0, (elapsed - t.rooms - 80) / T_HALLS)) * total);
    let k = 0;
    ctx.fillStyle = 'rgba(127,227,208,0.11)';
    for (const path of halls)
      for (const [x, y] of path) {
        if (k++ >= shown) break;
        ctx.fillRect(ox + x * s + 1, oy + y * s + 1, s - 2, s - 2);
      }

    // Walls settle in last
    const wa = Math.min(1, Math.max(0, (elapsed - t.halls) / T_WALLS));
    if (wa > 0) {
      ctx.fillStyle = `rgba(150,196,218,${0.2 * wa})`;
      for (const [x, y] of walls) ctx.fillRect(ox + x * s + 2, oy + y * s + 2, s - 4, s - 4);
    }

    // Avatar
    if (elapsed > t.walls) {
      const glide = Math.min(1, (now - avatar.moved) / 190);
      const ax = avatar.px + (avatar.x - avatar.px) * glide;
      const ay = avatar.py + (avatar.y - avatar.py) * glide;
      trail.forEach(([x, y], i) => {
        ctx.fillStyle = `rgba(200,255,243,${0.06 + (i / trail.length) * 0.16})`;
        ctx.fillRect(ox + x * s + 2, oy + y * s + 2, s - 4, s - 4);
      });
      ctx.shadowColor = 'rgba(127,227,208,0.9)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#c8fff3';
      ctx.fillRect(ox + ax * s + 1.5, oy + ay * s + 1.5, s - 3, s - 3);
      ctx.shadowBlur = 0;
    }
  }

  const anim = loop((now) => {
    const elapsed = now - started;
    if (elapsed > timings().walls) {
      finished = true;
      stepAvatar(now);
    }
    draw(now, elapsed);
  });

  build();
  draw(performance.now(), 1e9);
  finished = true;
  new ResizeObserver(() => {
    const was = anim.running;
    build();
    if (!was) draw(performance.now(), 1e9);
  }).observe(canvas);

  return {
    play() {
      if (prefersReducedMotion()) return;
      if (!finished || !world) build();
      if (!anim.running) {
        // Replay the generation the first time; afterwards just let the avatar roam.
        if (!started) started = performance.now();
        anim.start();
      }
    },
    pause() {
      anim.stop();
    },
    reseed() {
      seed = Math.floor(Math.random() * 90000) + 10000;
      build();
      started = performance.now();
      finished = false;
      if (prefersReducedMotion()) draw(performance.now(), 1e9);
      else anim.start();
    },
  };
}

/* ------------------------------------------------------------------ */
/* PiE robot: three runs through an obstacle course                    */
/* ------------------------------------------------------------------ */

function catmull(points: [number, number][], samples: number) {
  const out: [number, number][] = [];
  const p = [points[0], ...points, points[points.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    for (let j = 0; j < samples; j++) {
      const t = j / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p[i - 1][0], p[i][0], p[i + 1][0], p[i + 2][0]), f(p[i - 1][1], p[i][1], p[i + 1][1], p[i + 2][1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function robot(el: HTMLElement): SketchCtl {
  const canvas = el.querySelector('canvas')!;
  const meta = el.querySelector<HTMLElement>('[data-sketch-meta]');
  const obstacles = [
    { x: 0.27, y: 0, w: 0.055, h: 0.56 },
    { x: 0.51, y: 0.44, w: 0.055, h: 0.56 },
    { x: 0.74, y: 0, w: 0.055, h: 0.52 },
  ];
  // Three attempts. The first two clip an obstacle; the third runs clean.
  const courses: [number, number][][] = [
    [
      [0.07, 0.8],
      [0.3, 0.8],
      [0.42, 0.6],
      [0.505, 0.455],
    ],
    [
      [0.07, 0.8],
      [0.3, 0.79],
      [0.43, 0.52],
      [0.535, 0.28],
      [0.65, 0.46],
      [0.735, 0.545],
    ],
    [
      [0.07, 0.8],
      [0.3, 0.8],
      [0.42, 0.52],
      [0.535, 0.27],
      [0.65, 0.5],
      [0.77, 0.76],
      [0.9, 0.62],
      [0.93, 0.3],
    ],
  ];
  const runs = [
    { noise: 0.012, phase: 1.3, dur: 1500, ok: false },
    { noise: 0.008, phase: 4.1, dur: 2300, ok: false },
    { noise: 0.003, phase: 2.2, dur: 3000, ok: true },
  ];
  const ideal = catmull(courses[2], 28);
  const GAP = 650;
  const HOLD = 2600;
  const cycle = runs.reduce((n, r) => n + r.dur + GAP, 0) + HOLD;

  const paths = courses.map((pts, ri) => {
    const base = catmull(pts, 28);
    const run = runs[ri];
    return base.map(([x, y], i, arr) => {
      const t = i / arr.length;
      const [nx, ny] = arr[Math.min(i + 1, arr.length - 1)];
      const [px, py] = arr[Math.max(i - 1, 0)];
      const dx = nx - px;
      const dy = ny - py;
      const m = Math.hypot(dx, dy) || 1;
      // Wobble fades to zero at both ends so each run starts on the pad and ends where it stopped.
      const env = Math.sin(Math.PI * Math.min(1, t * 1.02));
      const off = (Math.sin(t * 17 + run.phase) * 0.6 + Math.sin(t * 41 + run.phase * 2) * 0.4) * run.noise * env;
      return [x + (-dy / m) * off, y + (dx / m) * off] as [number, number];
    });
  });
  let started = 0;

  function draw(elapsed: number) {
    const { ctx, w, h } = fit(canvas);
    const pad = 18;
    const aw = w - pad * 2;
    const ah = h - pad * 2 - 20;
    const X = (x: number) => pad + x * aw;
    const Y = (y: number) => pad + y * ah;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(150,196,218,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pad + 0.5, pad + 0.5, aw - 1, ah - 1, 10);
    ctx.stroke();
    for (const o of obstacles) {
      ctx.fillStyle = 'rgba(150,196,218,0.09)';
      ctx.strokeStyle = 'rgba(150,196,218,0.3)';
      ctx.beginPath();
      ctx.roundRect(X(o.x), Y(o.y), o.w * aw, o.h * ah, 4);
      ctx.fill();
      ctx.stroke();
    }
    const [sx, sy] = ideal[0];
    const [gx, gy] = ideal[ideal.length - 1];
    ctx.strokeStyle = 'rgba(150,196,218,0.45)';
    ctx.beginPath();
    ctx.arc(X(sx), Y(sy), 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(127,227,208,0.8)';
    ctx.beginPath();
    ctx.arc(X(gx), Y(gy), 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '9px "Martian Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(132,153,166,1)';
    ctx.fillText('START', X(sx) - 14, Y(sy) + 24);
    ctx.fillStyle = 'rgba(127,227,208,0.9)';
    ctx.fillText('GOAL', X(gx) - 12, Y(gy) - 16);

    let t = elapsed % cycle;
    let current = -1;
    let frac = 1;
    for (let i = 0; i < runs.length; i++) {
      if (t < runs[i].dur) {
        current = i;
        frac = t / runs[i].dur;
        break;
      }
      t -= runs[i].dur;
      if (t < GAP) {
        current = i;
        frac = 1;
        break;
      }
      t -= GAP;
    }
    if (current === -1) current = runs.length - 1;
    const fading = elapsed % cycle > cycle - 600 ? 1 - ((elapsed % cycle) - (cycle - 600)) / 600 : 1;

    const colors = ['rgba(150,196,218,0.38)', 'rgba(169,188,199,0.6)', 'rgba(127,227,208,0.95)'];
    for (let i = 0; i <= current; i++) {
      const p = paths[i];
      const n = i < current ? p.length : Math.max(2, Math.floor(p.length * frac));
      ctx.globalAlpha = fading;
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = i === 2 ? 1.8 : 1.3;
      ctx.setLineDash(i === 2 ? [] : [4, 4]);
      ctx.beginPath();
      p.slice(0, n).forEach(([x, y], j) => (j ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.stroke();
      ctx.setLineDash([]);
      const [ex, ey] = p[n - 1];
      const done = i < current || frac >= 1;
      if (done) {
        ctx.font = '9px "Martian Mono", ui-monospace, monospace';
        if (runs[i].ok) {
          ctx.fillStyle = 'rgba(127,227,208,1)';
          ctx.fillText(`RUN ${i + 1} · CLEAN`, X(ex) - 30, Y(ey) + 26);
        } else {
          // Mark the collision.
          ctx.strokeStyle = 'rgba(242,184,114,0.95)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(X(ex) - 4, Y(ey) - 4);
          ctx.lineTo(X(ex) + 4, Y(ey) + 4);
          ctx.moveTo(X(ex) + 4, Y(ey) - 4);
          ctx.lineTo(X(ex) - 4, Y(ey) + 4);
          ctx.stroke();
          ctx.fillStyle = 'rgba(242,184,114,0.95)';
          ctx.textAlign = 'right';
          ctx.fillText(`RUN ${i + 1} · HIT`, X(ex) - 10, Y(ey) + (i === 0 ? -12 : 20));
          ctx.textAlign = 'left';
        }
      } else {
        const [bx, by] = p[Math.max(0, n - 2)];
        const ang = Math.atan2(Y(ey) - Y(by), X(ex) - X(bx));
        ctx.save();
        ctx.translate(X(ex), Y(ey));
        ctx.rotate(ang);
        ctx.fillStyle = i === 2 ? '#c8fff3' : '#a9bcc7';
        ctx.shadowColor = 'rgba(127,227,208,0.7)';
        ctx.shadowBlur = i === 2 ? 12 : 0;
        ctx.beginPath();
        ctx.roundRect(-7, -5.5, 14, 11, 3);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    if (meta) {
      const label = current === 2 && frac >= 1 ? 'iteration 3 of 3 · clean run' : `iteration ${current + 1} of 3`;
      if (meta.textContent !== label) meta.textContent = label;
    }
  }

  const anim = loop((now) => {
    draw(now - started);
  });
  // At rest, show the finished story: all three runs.
  const restFrame = () => draw(runs.reduce((n, r) => n + r.dur + GAP, 0) + 10);
  restFrame();
  new ResizeObserver(() => {
    if (!anim.running) restFrame();
  }).observe(canvas);

  return {
    play() {
      if (prefersReducedMotion() || anim.running) return;
      started = performance.now();
      anim.start();
    },
    pause() {
      anim.stop();
      restFrame();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Scheme: the REPL types itself out                                   */
/* ------------------------------------------------------------------ */

function scheme(el: HTMLElement): SketchCtl {
  let played = false;
  return {
    play() {
      if (played || prefersReducedMotion()) return;
      played = true;
      const lines = [...el.querySelectorAll<HTMLElement>('.repl__line')];
      let t = 300;
      for (const line of lines) {
        const kind = line.dataset.line;
        line.style.setProperty('--delay', `${t}ms`);
        if (kind === 'out') {
          t += 420;
        } else {
          const n = line.querySelector('.repl__src')?.textContent?.length ?? 0;
          line.style.setProperty('--n', String(n));
          line.style.setProperty('--dur', `${n * 36}ms`);
          t += n * 36 + (kind === 'in' ? 260 : 120);
        }
      }
      const code = el.querySelector('code');
      if (code) {
        const tail = document.createElement('span');
        tail.className = 'repl__line repl__line--tail';
        tail.style.setProperty('--delay', `${t}ms`);
        tail.innerHTML = '<span class="repl__prompt">scm&gt; </span><span class="repl__caret"></span>';
        code.appendChild(tail);
      }
      // steps() can land one character short of the end; release the clip once each line is typed.
      el.querySelectorAll<HTMLElement>('.repl__src').forEach((src) =>
        src.addEventListener(
          'animationend',
          () => {
            src.style.animation = 'none';
            src.style.maxWidth = 'none';
          },
          { once: true },
        ),
      );
      el.classList.add('is-typing');
    },
    pause() {},
  };
}

/* ------------------------------------------------------------------ */
/* CATS: autocorrect by edit distance                                  */
/* ------------------------------------------------------------------ */

export function editDistance(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const DEMO_WORDS = ['fish', 'swim', 'in', 'schools', 'school', 'shoals', 'to', 'stay', 'safe', 'sharks', 'shells', 'scales', 'coral', 'current', 'reef'];
const WORDS = [
  ...new Set(
    `ocean sea wave waves tide tides current currents deep reef coral kelp shark sharks whale whales dolphin octopus squid
    jellyfish fish school schools shoal shoals shell shells scale scales sand salt water light dark night moon star starfish
    crab lobster shrimp turtle seal anchor boat ship sail harbor island diver dive swim float drift bubble bubbles pressure
    abyss trench seafloor lantern glow depth surface twilight midnight sunlight zone hello world python java scheme code data
    typing speed accuracy keyboard letter word words quick brown fox jumps over lazy dog the and with from under below above
    atlas voice engine seed room rooms hallway robot score scoreboard student teacher learn build system systems berkeley
    computer science interpreter game tutor math english team match test print loop lambda define list tree graph node
    recursion parser token assistant listen speak model memory calendar`
      .split(/\s+/)
      .filter(Boolean),
  ),
];

function closest(word: string, vocab: string[]) {
  return vocab
    .map((w) => ({ w, d: editDistance(word, w) }))
    .sort((a, b) => a.d - b.d || a.w.length - b.w.length)
    .slice(0, 3);
}

function cats(el: HTMLElement): SketchCtl {
  const typedEl = el.querySelector<HTMLElement>('[data-cats-typed]')!;
  const panel = el.querySelector<HTMLElement>('[data-cats-panel]')!;
  const typoEl = el.querySelector<HTMLElement>('[data-cats-typo]')!;
  const list = el.querySelector<HTMLElement>('[data-cats-cands]')!;
  const input = el.querySelector<HTMLInputElement>('[data-cats-input]');
  const result = el.querySelector<HTMLElement>('[data-cats-result]');
  const script = { before: 'fish swim in ', typo: 'scools', after: ' to stay safe' };
  let timers: number[] = [];
  let playing = false;

  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

  function renderCands(word: string) {
    typoEl.textContent = word;
    const top = closest(word, DEMO_WORDS);
    list.innerHTML = top
      .map(
        ({ w, d }, i) =>
          `<li class="${i === 0 ? 'is-best' : ''}"><span>${esc(w)}</span><span class="cats__bar" style="--d:${d}"></span><span class="mono">${d} edit${d === 1 ? '' : 's'}</span></li>`,
      )
      .join('');
    return top[0].w;
  }

  function type(text: string, prefixHtml: string, at: number, speed = 60) {
    for (let i = 1; i <= text.length; i++) {
      timers.push(
        window.setTimeout(() => {
          typedEl.innerHTML = `${prefixHtml}${esc(text.slice(0, i))}<span class="cats__caret"></span>`;
        }, at + i * speed),
      );
    }
    return at + text.length * speed;
  }

  function run() {
    timers.forEach(clearTimeout);
    timers = [];
    typedEl.innerHTML = '<span class="cats__caret"></span>';
    panel.style.opacity = '0.25';
    let t = type(script.before, '', 200);
    t = type(script.typo, esc(script.before), t);
    timers.push(
      window.setTimeout(() => {
        typedEl.innerHTML = `${esc(script.before)}<span class="cats__word is-wrong">${script.typo}</span><span class="cats__caret"></span>`;
        renderCands(script.typo);
        panel.style.opacity = '1';
      }, t + 250),
    );
    const fixed = closest(script.typo, DEMO_WORDS)[0].w;
    const fixedHtml = `${esc(script.before)}<span class="cats__word is-fixed">${fixed}</span>`;
    timers.push(
      window.setTimeout(() => {
        typedEl.innerHTML = `${fixedHtml}<span class="cats__caret"></span>`;
      }, t + 1500),
    );
    t = type(script.after, fixedHtml, t + 1600);
    timers.push(
      window.setTimeout(() => {
        typedEl.innerHTML = `${fixedHtml}${esc(script.after)}`;
        playing = false;
      }, t + 600),
    );
  }

  if (input && result) {
    input.addEventListener('input', () => {
      const w = input.value.trim().toLowerCase().replace(/[^a-z]/g, '');
      if (!w) {
        result.textContent = '';
        return;
      }
      const top = closest(w, WORDS);
      if (top[0].d === 0) {
        result.innerHTML = `<b>${esc(w)}</b> is already in the dictionary.`;
        return;
      }
      const rest = top
        .slice(1)
        .map(({ w: x, d }) => `${esc(x)} (${d})`)
        .join(', ');
      result.innerHTML = `Closest: <b>${esc(top[0].w)}</b>, ${top[0].d} edit${top[0].d === 1 ? '' : 's'} away. Next: ${rest}.`;
    });
  }

  return {
    play() {
      if (playing || prefersReducedMotion()) return;
      playing = true;
      run();
    },
    pause() {},
  };
}
