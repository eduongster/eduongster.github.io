/**
 * All site copy and data lives here. Components only handle presentation.
 *
 * Source of truth: Ethan_Duong_Resume.pdf (plus the public Atlas repo).
 * Anything not on the resume is marked with a `[ADD …]` comment instead of
 * being made up. Search this file for "[ADD" before you deploy.
 */

export const person = {
  name: 'Ethan Duong',
  headline: 'Computer Science + Data Science @ UC Berkeley',
  tagline:
    'I learn how systems work by building them from scratch: an interpreter, a game engine, and now a voice assistant that listens and talks back.',
  email: 'ethan_duong@berkeley.edu',
  phone: '+1 (408) 386-5387',
  phoneHref: 'tel:+14083865387',
  github: 'https://github.com/eduongster',
  githubLabel: '@eduongster',
  linkedin: 'https://www.linkedin.com/in/ethanduonginfo/',
  linkedinLabel: 'in/ethanduonginfo',
  /** File lives in /public. Keep the name in sync if you replace the PDF. */
  resumeFile: 'Ethan_Duong_Resume.pdf',
  // [ADD PHOTO] Optional: a portrait for the About section.
};

export const meta = {
  title: 'Ethan Duong',
  description:
    'Ethan Duong studies Computer Science and Data Science at UC Berkeley and builds software from the ground up, from a Scheme interpreter to Atlas, a voice AI assistant.',
  // [ADD SITE URL] Update astro.config.mjs `site` once you know your domain.
};

/* ------------------------------------------------------------------ */
/* The dive: every section is a depth station.                         */
/* ------------------------------------------------------------------ */

export type Station = { id: string; nav: string; depth: number; inNav: boolean };

export const stations: Station[] = [
  { id: 'top', nav: 'Home', depth: 0, inNav: false },
  { id: 'about', nav: 'About', depth: 120, inNav: true },
  { id: 'projects', nav: 'Projects', depth: 400, inNav: true },
  { id: 'experience', nav: 'Experience', depth: 1100, inNav: true },
  { id: 'skills', nav: 'Skills', depth: 2000, inNav: true },
  { id: 'education', nav: 'Education', depth: 3000, inNav: false },
  { id: 'contact', nav: 'Contact', depth: 4000, inNav: true },
];

/** Standard ocean zones (pelagic zones), in metres. */
export const zones = [
  { name: 'Sunlight zone', science: 'Epipelagic', from: 0, to: 200 },
  { name: 'Twilight zone', science: 'Mesopelagic', from: 200, to: 1000 },
  { name: 'Midnight zone', science: 'Bathypelagic', from: 1000, to: 4000 },
  { name: 'Abyssal zone', science: 'Abyssopelagic', from: 4000, to: 6000 },
];

export const depthOf = (id: string) => stations.find((s) => s.id === id)?.depth ?? 0;

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

export const about = {
  title: 'Below the surface',
  lead: 'I’m a Computer Science and Data Science student at UC Berkeley, and I learn best by building the whole thing myself.',
  body: [
    'I like projects where I can see every layer: the parser under an interpreter, the seeded randomness under a generated world, the audio pipeline under a voice assistant. Right now that’s Atlas, a voice assistant I’m building to learn how speech, language models, and APIs fit together.',
    'From 2023 to 2025 I worked at Kumon, where I tutored more than 50 students and used their progress data to adjust each plan. It left me with a question I now ask about everything I build: does this actually work for the person using it?',
  ],
  log: [
    { k: 'Studying', v: 'CS + Data Science, UC Berkeley, class of 2029' },
    { k: 'Building', v: 'Atlas, a voice AI assistant' },
    { k: 'Taught', v: '50+ students at Kumon' },
    { k: 'Also', v: 'Real-time scoreboard, Pioneers in Engineering' },
  ],
  /** The three overlapping "light pools" diagram. */
  pools: [
    {
      id: 'software',
      label: 'Software',
      caption: 'A Java world engine, a Scheme interpreter, a typing trainer, and features for a live competition scoreboard.',
    },
    {
      id: 'data',
      label: 'Data',
      caption: 'A Data Science major. At Kumon I tracked student performance data to adjust learning plans. At PiE I wire match data into the scoreboard.',
    },
    {
      id: 'ai',
      label: 'AI',
      caption: 'Atlas chains a wake word model, speech recognition, a language model, and speech synthesis into one conversation loop.',
    },
  ],
  poolsCenter: {
    label: 'Real-world impact',
    caption: 'Where I want to work: software that uses data and AI to help real people.',
  },
};

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export const atlas = {
  id: 'atlas',
  name: 'Atlas',
  kicker: 'Flagship project',
  status: 'In progress',
  subtitle: 'A custom voice AI assistant',
  summary:
    'Say the wake word, ask a question, and Atlas answers out loud. I’m building it one stage at a time to learn how voice pipelines, LLM orchestration, and API integrations fit together.',
  repo: 'https://github.com/eduongster/atlas-voice-assistant',
  repoLabel: 'eduongster/atlas-voice-assistant',
  stack: ['Python', 'openWakeWord', 'webrtcvad', 'whisper.cpp', 'Claude API', 'macOS say'],
  stages: [
    {
      id: 'wake',
      short: 'Wake word',
      name: 'Wake word detection',
      tech: 'openWakeWord',
      job: 'Listens for its name on-device. Nothing downstream runs until you call it.',
      note: 'A small always-on model keeps the idle loop light. The wake word has its own test script, so it can be tested on its own.',
    },
    {
      id: 'vad',
      short: 'VAD',
      name: 'Voice activity detection',
      tech: 'webrtcvad',
      job: 'Hears when you stop talking, so recording ends with your sentence instead of on a fixed timer.',
      note: 'webrtcvad labels short audio frames as speech or silence. That frame-level signal decides where your turn ends.',
    },
    {
      id: 'stt',
      short: 'Speech-to-text',
      name: 'Speech-to-text',
      tech: 'whisper.cpp',
      job: 'Transcribes your request locally with whisper.cpp, a C/C++ port of OpenAI’s Whisper.',
      note: 'Transcription runs on the machine, so raw audio never leaves it. Only text moves on to the next stage.',
    },
    {
      id: 'llm',
      short: 'LLM',
      name: 'Language model',
      tech: 'Claude API',
      job: 'Turns the transcript into a reply, with conversation memory so follow-up questions keep their context.',
      note: 'This is the only network hop in the loop, and it carries text, not audio.',
    },
    {
      id: 'tts',
      short: 'Text-to-speech',
      name: 'Text-to-speech',
      tech: 'macOS say',
      job: 'Speaks the reply with the built-in macOS voice, then hands control back to the wake word listener.',
      note: 'When the reply finishes, the loop resets and Atlas goes back to listening.',
    },
  ],
  highlights: [
    {
      title: 'One loop, five stages',
      body: 'Each stage has one job and a clean handoff to the next. When Atlas finishes talking, it goes back to listening.',
    },
    {
      title: 'Local where it counts',
      body: 'The wake word, speech detection, and transcription all run on the machine. Only text reaches the language model.',
    },
    {
      title: 'Built in testable pieces',
      body: 'Separate test scripts for the wake word and voice features let me check one stage without running the whole loop.',
    },
  ],
  next: [
    'A custom “Hey Atlas” wake word model',
    'Memory that persists between sessions (SQLite)',
    'Google Calendar, timers, and reminders',
  ],
};

export type Project = {
  id: 'byow' | 'scheme' | 'cats' | 'robot';
  name: string;
  fullName?: string;
  tagline: string;
  date: string;
  stack: string[];
  problem: string;
  built: string[];
  detail: string;
  sketch: string;
  /** [ADD PROJECT LINK] Course projects usually can't be posted publicly. Leave empty if so. */
  link?: string;
};

export const projects: Project[] = [
  {
    id: 'byow',
    name: 'BYOW',
    fullName: 'Build Your Own World',
    tagline: 'A tile-based game engine that grows a whole explorable world from one seed.',
    date: 'Apr 2026',
    stack: ['Java', 'OOP', 'Algorithms'],
    problem:
      'Generate worlds that feel random but can be rebuilt exactly. The same seed has to produce the same rooms and hallways every time, and every room has to be reachable.',
    built: [
      'Procedural generation of rooms and the hallways that connect them, driven by seeded randomness',
      'Connectivity constraints so no room ends up cut off from the rest of the world',
      'Real-time avatar movement with collision detection, from keyboard and mouse input',
      'Save and load that serializes the full game state, so a reloaded world matches exactly',
    ],
    detail:
      'Determinism ties the engine together. Seeded randomness makes generation repeatable, and serializing the full game state brings a saved session back exactly as it was.',
    sketch: 'Seeded rooms and hallways, generated live',
    // link: '[ADD PROJECT LINK]',
  },
  {
    id: 'scheme',
    name: 'Scheme Interpreter',
    tagline: 'An interpreter for Scheme, a dialect of Lisp, written in Python.',
    date: 'Nov 2025',
    stack: ['Python', 'Scheme'],
    problem:
      'Turn raw text into a running program: split it into tokens, parse the nested expressions, and evaluate them with the right scoping rules.',
    built: [
      'A tokenizer and parser that handle deeply nested expressions',
      'An evaluator with recursion, lambda functions, and lexical scoping',
      'An interactive REPL that reads, evaluates, and prints in a continuous loop',
    ],
    detail:
      'Lexical scoping is the subtle part. Each function remembers the environment it was defined in. That’s how the closure returned by make‑adder keeps its own n.',
    sketch: 'A REPL session: recursion, lambdas, closures',
    // link: '[ADD PROJECT LINK]',
  },
  {
    id: 'cats',
    name: 'CATS',
    tagline: 'A typing trainer that measures speed and accuracy, and fixes typos as you type.',
    date: 'Oct 2025',
    stack: ['Python'],
    problem: 'Score typing fairly against a reference text, and catch mistakes the moment they happen.',
    built: [
      'Speed and accuracy scoring that compares what you type against the reference text',
      'Autocorrect that replaces a typo with the most similar valid word',
      'Modular code that supports different typing modes and makes new features easy to add',
    ],
    detail:
      'Autocorrect is a similarity search. Score each valid word by how few edits turn the typo into it, then pick the closest match.',
    sketch: 'Autocorrect picking the closest word',
    // link: '[ADD PROJECT LINK]',
  },
  {
    id: 'robot',
    name: 'PiE Robotics Competition',
    tagline: 'A VEX robot built for an obstacle course, made reliable one test at a time.',
    date: 'Mar – Apr 2024',
    stack: ['VEX', 'Hardware design'],
    problem: 'Get a robot through an obstacle-based course consistently, not just once.',
    built: [
      'Built and tested a VEX robot for an obstacle-based competition',
      'Improved drivetrain and mechanism reliability through repeated testing and small design changes',
      'Documented each change and its test results to guide team decisions',
    ],
    detail:
      'The method was iterative: change one thing, test it, record the result, and let the log guide the next decision.',
    sketch: 'Runs through the course, one iteration at a time',
    // link: '[ADD PROJECT LINK]',
  },
];

/* ------------------------------------------------------------------ */
/* Experience                                                          */
/* ------------------------------------------------------------------ */

export type Role = {
  id: string;
  org: string;
  /** [ADD ROLE] Your title at PiE isn't on the resume. */
  role?: string;
  kind: string;
  place: string;
  start: string; // YYYY-MM
  end: string | null; // null = present
  dates: string;
  stat?: { value: string; label: string };
  points: string[];
  aside?: string;
};

export const experience: Role[] = [
  {
    id: 'pie',
    org: 'Pioneers in Engineering',
    // role: '[ADD ROLE]', // your title at PiE isn't on the resume
    kind: 'Extracurricular',
    place: 'UC Berkeley',
    start: '2025-08',
    end: null,
    dates: 'Aug 2025 – Present',
    points: [
      'Build features for a real-time scoreboard for high school robotics competitions across the Bay Area.',
      'Integrate match data with the scoreboard so results update accurately and on time during events.',
      'Work with the software, hardware, and outreach teams to keep competitions running.',
    ],
    aside: 'In spring 2024 I built a robot for the PiE Robotics Competition. Now I build features for PiE’s competition scoreboard.',
  },
  {
    id: 'kumon',
    org: 'Kumon',
    role: 'Assistant Manager',
    kind: 'Work',
    place: 'San Jose, CA',
    start: '2023-11',
    end: '2025-08',
    dates: 'Nov 2023 – Aug 2025',
    stat: { value: '50+', label: 'students tutored in math and English' },
    points: [
      'Tutored more than 50 students in math and English, adapting instruction to each skill level.',
      'Tracked student performance data and used it to adjust individualized learning plans.',
      'Ran daily center operations: grading, scheduling, and parent communication.',
      'Streamlined the grading and organization workflow to keep high-volume sessions moving.',
    ],
  },
];

/** Rows for the timeline chart. Dates come straight from the resume. */
export const timeline = {
  start: '2023-09',
  // "Now" is the month the site is built, so the chart stays current on every deploy.
  rows: [
    { id: 'kumon', label: 'Kumon', sub: 'Assistant Manager', kind: 'role', start: '2023-11', end: '2025-08' },
    { id: 'robot', label: 'PiE Robotics Competition', sub: 'VEX robot', kind: 'project', start: '2024-03', end: '2024-04' },
    { id: 'pie', label: 'Pioneers in Engineering', sub: 'Scoreboard', kind: 'role', start: '2025-08', end: null },
    { id: 'cats', label: 'CATS', sub: 'Python', kind: 'project', start: '2025-10', end: '2025-10' },
    { id: 'scheme', label: 'Scheme Interpreter', sub: 'Python', kind: 'project', start: '2025-11', end: '2025-11' },
    { id: 'byow', label: 'BYOW', sub: 'Java', kind: 'project', start: '2026-04', end: '2026-04' },
    { id: 'atlas', label: 'Atlas', sub: 'In progress', kind: 'now', start: null, end: null },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Skills                                                              */
/* ------------------------------------------------------------------ */

export const skillGroups = [
  { id: 'lang', label: 'Languages', items: ['Python', 'Java', 'C', 'C++', 'Scheme', 'SQL', 'HTML', 'CSS'] },
  { id: 'ai', label: 'AI & speech', items: ['Claude API', 'whisper.cpp', 'openWakeWord', 'webrtcvad'] },
  { id: 'concepts', label: 'Concepts', items: ['Data structures', 'Algorithms', 'OOP', 'Functional programming'] },
  { id: 'tools', label: 'Tools', items: ['Git', 'GitHub', 'Jupyter Notebook', 'VS Code', 'IntelliJ IDEA'] },
  { id: 'hardware', label: 'Hardware', items: ['VEX', 'Hardware design'] },
];

/** Which skills each project used. Drives the constellation's links. */
export const projectSkills: { id: string; label: string; skills: string[] }[] = [
  { id: 'atlas', label: 'Atlas', skills: ['Python', 'openWakeWord', 'webrtcvad', 'whisper.cpp', 'Claude API', 'Git', 'GitHub'] },
  { id: 'byow', label: 'BYOW', skills: ['Java', 'OOP', 'Algorithms'] },
  { id: 'scheme', label: 'Scheme Interpreter', skills: ['Python', 'Scheme'] },
  { id: 'cats', label: 'CATS', skills: ['Python'] },
  { id: 'robot', label: 'PiE Robotics', skills: ['VEX', 'Hardware design'] },
];

/* ------------------------------------------------------------------ */
/* Education                                                           */
/* ------------------------------------------------------------------ */

export const education = {
  school: 'University of California, Berkeley',
  degree: 'B.A. Computer Science & Data Science',
  grad: 'Expected May 2029',
  place: 'Berkeley, CA',
  coursework: [
    { group: 'Computer science', items: ['Structure and Interpretation of Computer Programs', 'Data Structures'] },
    { group: 'Data science', items: ['Principles and Techniques of Data Science'] },
    { group: 'Math', items: ['Discrete Mathematics and Probability', 'Linear Algebra', 'Calculus I, II, and III'] },
  ],
};

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export const contact = {
  title: 'Drop me a line.',
  body: 'Whether it’s an internship, a project, or a question about something you saw on the way down, my inbox is open.',
};
