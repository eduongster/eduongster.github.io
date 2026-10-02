/** Smaller page behaviours: reveals, the Atlas pipeline tabs, the About diagram, copy buttons, toasts. */
import { prefersReducedMotion, whenVisible } from './motion';

/* ---------- Toast ---------- */
let toastTimer = 0;
export function toast(message: string, ms = 3200) {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), ms);
}

/* ---------- Reveal: dim what's below the fold, bring it into focus on arrival ---------- */
export function initReveal() {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const els = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const fold = window.innerHeight * 0.94;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.remove('is-pending');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
  );
  for (const el of els) {
    if (el.getBoundingClientRect().top > fold) {
      el.classList.add('is-pending');
      io.observe(el);
    }
  }
}

/* ---------- Atlas pipeline: accessible tabs + pause when off-screen ---------- */
export function initPipeline() {
  const root = document.querySelector<HTMLElement>('[data-pipeline]');
  if (!root) return;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (i: number, focus = false) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls')!);
      if (panel) panel.hidden = !on;
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const keys: Record<string, number> = {
        ArrowRight: (i + 1) % tabs.length,
        ArrowDown: (i + 1) % tabs.length,
        ArrowLeft: (i - 1 + tabs.length) % tabs.length,
        ArrowUp: (i - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (e.key in keys) {
        e.preventDefault();
        select(keys[e.key], true);
      }
    });
  });
  if (!prefersReducedMotion()) whenVisible(root, (v) => root.classList.toggle('is-live', v));
}

/* ---------- About: light pools respond to taps as well as hover ---------- */
export function initPools() {
  const fig = document.querySelector<HTMLElement>('[data-pools]');
  if (!fig) return;
  const pools = [...fig.querySelectorAll<HTMLButtonElement>('[data-pool]')];
  pools.forEach((p) =>
    p.addEventListener('click', () => {
      const id = p.dataset.pool!;
      const next = fig.dataset.active === id ? '' : id;
      if (next) fig.dataset.active = next;
      else delete fig.dataset.active;
      pools.forEach((q) => {
        const on = q.dataset.pool === next;
        q.classList.toggle('is-active', on);
        q.setAttribute('aria-pressed', String(on));
      });
    }),
  );
}

/* ---------- Copy buttons ---------- */
export function initCopy() {
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    const text = btn.querySelector<HTMLElement>('[data-copy-text]');
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy!;
      let ok = false;
      try {
        await navigator.clipboard.writeText(value);
        ok = true;
      } catch {
        // Fallback for browsers or frames that refuse the async clipboard.
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          ok = document.execCommand('copy');
        } catch {
          ok = false;
        }
        ta.remove();
      }
      if (ok) {
        btn.classList.add('is-done');
        if (text) text.textContent = 'Copied';
        toast(`${btn.dataset.copyLabel ?? 'Text'} copied: ${value}`);
        setTimeout(() => {
          btn.classList.remove('is-done');
          if (text) text.textContent = 'Copy';
        }, 2000);
      } else {
        toast(`Couldn’t copy automatically. Select ${value} and copy it by hand.`, 4500);
      }
    });
  });
}
