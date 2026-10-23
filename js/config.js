'use strict';
// Todas as posições físicas estão em metros; a projeção só existe no render.
const EZ = window.EZ = {};
EZ.C = {
  dt: 1 / 120,
  iterations: 10,
  gravity: 9.81,
  chunkSize: 16,
  maxZombies: 36,
  maxAnimals: 40,
  maxRagdolls: 32,
  maxParticles: 350,
  corpseLife: 90,
  tileW: 32,
  tileH: 16
};
EZ.weapons = {
  pistol: {
    name: 'Pistola',
    damage: 34,
    impulse: 1.4,
    rate: .3,
    speed: 85,
    pellets: 1,
    spread: .012,
    mag: 12,
    reload: 1.2
  },
  rifle: {
    name: 'Rifle',
    damage: 55,
    impulse: 2.2,
    rate: .12,
    speed: 125,
    pellets: 1,
    spread: .008,
    mag: 30,
    reload: 1.8
  },
  shotgun: {
    name: 'Escopeta',
    damage: 19,
    impulse: 1.1,
    rate: .85,
    speed: 70,
    pellets: 8,
    spread: .075,
    mag: 6,
    reload: 2.1
  }
};
EZ.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
EZ.distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
EZ.rng = seed => () => {
  seed |= 0;
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
EZ.hash = (x, y, seed) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
EZ.state = {
  mode: 'start',
  speed: 1,
  tool: 'chop',
  seed: 123456,
  clock: 8,
  day: 1,
  elapsed: 0,
  weather: 'Sol',
  weatherTimer: 0,
  spawnTimer: 0,
  ecosystemTimer: 0,
  muted: false,
  actors: [],
  ragdolls: [],
  bullets: [],
  particles: [],
  stains: [],
  loot: [],
  fires: [],
  kills: 0,
  inventory: {
    wood: 15,
    stone: 8,
    food: 6,
    seeds: 12
  },
  camera: {
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
    scale: 3
  },
  input: {
    keys: new Set(),
    mouse: {
      x: 0,
      y: 0
    },
    down: false,
    pressed: false,
    drag: null
  },
  message: '',
  messageTime: 0
};
EZ.message = text => {
  EZ.state.message = text;
  EZ.state.messageTime = 3;
};
