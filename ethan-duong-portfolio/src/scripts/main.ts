import { initDepth } from './depth';
import { createOcean } from './ocean';
import { initNav } from './nav';
import { initCopy, initPipeline, initPools, initReveal } from './ui';
import { initProjects } from './projects';
import { initSkills } from './skills';
import { initSeafloor } from './seafloor';
import { initEggs } from './eggs';

initDepth();
initReveal();
initNav();
initPipeline();
initPools();
initCopy();
initProjects();
initSkills();

const canvas = document.querySelector<HTMLCanvasElement>('[data-ocean]');
const floor = initSeafloor();
if (canvas) {
  const ocean = createOcean(canvas, document.querySelector<HTMLElement>('[data-fish-avoid]'));
  initEggs(ocean, floor);
}
