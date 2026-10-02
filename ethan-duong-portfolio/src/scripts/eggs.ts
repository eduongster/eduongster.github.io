/**
 * Three small secrets:
 *   1. Click (or tap) the open water in the hero to feed the fish.
 *   2. Type "abyss" anywhere, or press the tiny lure in the footer, for deep sea mode.
 *   3. A note in the browser console for anyone who opens it.
 */
import type { Ocean } from './ocean';
import type { Seafloor } from './seafloor';
import { toast } from './ui';

export function initEggs(ocean: Ocean, floor: Seafloor) {
  console.log('%c  ><(((º>', 'color:#7fe3d0;font:600 16px ui-monospace,monospace');
  console.log(
    '%cHey, you opened the console. I like curious people.\n' +
      'The fish are a hand-written boids simulation. No libraries swimming around in here.\n' +
      'Two things to try: click the water up top, or type "abyss" anywhere on the page.\n' +
      '— Ethan · https://github.com/eduongster',
    'color:#a9bcc7;font:12px/1.7 ui-monospace,monospace',
  );

  /* 1. Feeding */
  const zone = document.querySelector<HTMLElement>('[data-feed-zone]');
  let fed = 0;
  zone?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, label, [role="tab"]')) return;
    if (window.getSelection()?.toString()) return;
    ocean.feed(e.clientX, e.clientY);
    fed++;
    if (fed === 1) toast('You fed the school.');
    if (fed === 12) toast('They’re full. Maybe go look at the projects?');
  });

  /* 2. Deep sea mode */
  const lure = document.querySelector<HTMLButtonElement>('[data-lure]');
  let on = false;
  function set(next: boolean, via: 'key' | 'lure') {
    on = next;
    document.documentElement.classList.toggle('abyss', on);
    ocean.setAbyss(on);
    floor.setBright(on);
    lure?.setAttribute('aria-pressed', String(on));
    toast(
      on
        ? `Deep sea mode. The lights are out and your cursor is the only glow. ${via === 'key' ? 'Press Esc' : 'Tap the lure again'} to surface.`
        : 'Back to normal light.',
      on ? 5200 : 2200,
    );
  }
  let buffer = '';
  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, [contenteditable="true"]')) return;
    if (e.key === 'Escape' && on && !document.querySelector('dialog[open]')) {
      set(false, 'key');
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-5);
    if (buffer === 'abyss') {
      buffer = '';
      set(!on, 'key');
    }
  });
  lure?.addEventListener('click', () => set(!on, 'lure'));
}
