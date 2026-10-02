# Ethan Duong · Portfolio

A single-page portfolio designed as a dive. The page starts at a moonlit surface and ends on the seafloor at 4,000 m. Scroll position maps to depth, every section is a depth station, and the water darkens as you go down.

## Stack

- **Astro 7**, static output. No UI framework, so the page ships zero framework JavaScript.
- **TypeScript** for the interactive parts, with no runtime libraries.
- **Canvas, written by hand**: a boids school of fish, marine snow, bioluminescence, and bathymetric contour lines traced with marching squares.
- **Self-hosted fonts**: Instrument Serif, Instrument Sans, and Martian Mono, Latin subset only (SIL OFL 1.1, see `src/assets/fonts/LICENSE.md`).

The built page is about 28 KB of gzipped HTML and CSS, 14 KB of gzipped JavaScript, and 84 KB of fonts. No images load on the page itself.

## Run it locally

You need Node 22.12 or newer.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve dist/
npm run check     # type-check the project
```

## Edit the content

All copy and data live in **`src/content/site.ts`**: your bio, projects, the Atlas pipeline stages, experience, skills, coursework, and contact details. Components only handle presentation, so you rarely need to touch them to update the site.

To swap the resume, replace `public/Ethan_Duong_Resume.pdf` (keep the file name, or update `resumeFile` in `site.ts`).

## Before you deploy

Everything on the site comes from the resume, plus the public Atlas repo. A few things weren't on the resume, so they're left for you:

- [ ] **Your role at Pioneers in Engineering.** Add it as `role` on the `pie` entry in `experience`. Until then the site shows "Extracurricular".
- [ ] **Project links** for BYOW, Scheme, CATS, and the robot (`link` on each project). These look like Berkeley course projects, and course code usually can't be posted publicly, so leaving them empty is fine. Rows without a link simply don't show a button.
- [ ] **Atlas details.** Check the stack line (openWakeWord, webrtcvad, whisper.cpp, Claude API, macOS `say`) and the "Next up" list against the repo as it is today. The repo README still lists text-to-speech as TBD.
- [ ] **About copy.** The two motivation lines are drafted from your Kumon and PiE experience. Rewrite them in your own voice.
- [ ] **Site URL.** `site` in `astro.config.mjs` is set to `https://eduongster.github.io`. Change it if you use another domain.
- [ ] **Optional:** a photo for the About section (search `site.ts` for `[ADD PHOTO]`).

## Deploy to GitHub Pages

1. Create a repo named **`eduongster.github.io`** and push this project to its `main` branch.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push. `.github/workflows/deploy.yml` builds and publishes the site at `https://eduongster.github.io`.

Prefer a project repo (for example `github.com/eduongster/portfolio`)? Add `base: '/portfolio'` to `astro.config.mjs` and the site will live at `https://eduongster.github.io/portfolio`. Links and assets already respect the base path.

Vercel and Netlify also work with zero config: import the repo and they detect Astro.

## Project structure

```
src/
  content/site.ts        all copy and data
  layouts/Base.astro     <head>, meta tags, fonts
  pages/index.astro      the page, section by section
  pages/404.astro        "Lost at sea"
  components/            one component per section, plus Nav, DepthGauge, Sketch, Icon
  scripts/
    main.ts              wires everything up
    ocean.ts             background canvas: boids, marine snow, bioluminescence
    depth.ts             scroll position → depth, gauge, active nav link
    sketches.ts          live project sketches (world generation, REPL, autocorrect, robot runs)
    seafloor.ts          bathymetric contours under the contact section
    skills.ts            skills constellation
    projects.ts          project preview pane and dialogs
    nav.ts, ui.ts        mobile menu, reveals, pipeline tabs, copy buttons, toasts
    eggs.ts              easter eggs
  styles/                design tokens and global styles
public/                  resume PDF, favicon, social image
```

## Design notes

- **Depth is the organizing idea.** Section labels show real depths (120 m, 400 m, 1,100 m…), the gauge on wide screens reads out depth, pressure (1 atm per 10 m), and the ocean zone, and zone names are set in italic the way nautical charts label water.
- **The fish are a boids simulation** (separation, alignment, cohesion) with three depth layers for parallax. They avoid your cursor, steer around the headline, and thin out as you descend. Lanternfish-style photophores switch on in the twilight zone.
- **The project sketches are illustrations, not project code.** Each one is drawn live in the browser and labeled that way on the page.

## Accessibility and performance

- Semantic landmarks, one `h1`, and a clean heading order. The Atlas pipeline is an ARIA tab set with arrow-key support, and dialogs use native `<dialog>`.
- A skip link, visible focus rings, and keyboard access for every control. The mobile menu makes the page behind it inert.
- `prefers-reduced-motion` turns off every animation. The ocean renders as a still frame and content is visible immediately.
- Animation loops pause when their section is off-screen or the tab is hidden.
- Passes an axe-core audit with no violations.

## Easter eggs

Spoilers, obviously.

1. Click the open water at the top of the page to feed the fish.
2. Type `abyss` anywhere, or press the tiny amber light in the footer, for deep sea mode. Your cursor becomes a lure. Press Esc to surface.
3. Open the browser console.
