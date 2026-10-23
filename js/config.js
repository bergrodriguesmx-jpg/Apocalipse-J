/* ============================================================
   ECOZUMBI — Configuração global, constantes, estado e utilitários
   Deve ser o PRIMEIRO script carregado.
   ============================================================ */

const TW = 64, TH = 32;
const CS = 16;
const SIM_DT = 180;
const MAX_ANIMALS = 70;
const MAX_ZOMBIES = 40;
const MAX_TREES_PER_CHUNK = 26;
const SEASONS = ['Primavera','Verão','Outono','Inverno'];

// === CÂMERA / CAMPO DE VISÃO ===
const DEFAULT_ZOOM = 1.6;   // era 1.0 — câmera mais próxima (~35% menos área visível)
const MIN_ZOOM = 1.0;       // era 0.5 — não deixa afastar demais
const MAX_ZOOM = 3.0;       // era 2.2 — permite aproximar mais
const CHUNK_MARGIN = 2;     // margem de chunks além do visível (evita pop-in)

// Física
const FRICTION = 6.0;
const PLAYER_ACCEL = 14;
const PLAYER_MAX_V = 3.2;
const ANIMAL_MAX_V = { deer:2.6, rabbit:3.8, fox:3.2, wolf:3.0 };
const ZOMBIE_MAX_V = 1.6;
const ZOMBIE_ACCEL = 5;

// Estado global mutável
let canvas, ctx;
let gameState = 'start';
let speed = 1;
let worldSeed = Math.floor(Math.random()*1e9);
let simplex = null;
const chunks = new Map();
let animals = [];
let zombies = [];
let corpses = [];
let bodyParts = [];
let projectiles = [];
let particles = [];
let campfires = [];
let player = null;
let inventory = { wood:15, stone:8, food:6, seeds:12 };
let activeTool = 'inspect';
let camX = 0, camY = 0, zoom = DEFAULT_ZOOM;
let camOffsetX = 0, camOffsetY = 0;
let isDragging = false, dragStart = {x:0,y:0}, dragMoved = false;
let hoveredTile = null;
let keys = {};
let timeOfDay = 8.0;
let dayCount = 1;
let yearDay = 30;
let weather = 'sunny';
let weatherTimer = 0;
let temperature = 18;
let wind = { angle: Math.PI*0.25, speed: 0.3, targetAngle: Math.PI*0.25, targetSpeed: 0.3 };
let simAccum = 0, lastFrame = performance.now();
let ecoStats = { biomass:0, moisture:0, herbivores:0, predators:0, zombies:0 };
let muted = false;
let audioCtx = null;
let zombieSpawnTimer = 0;
let hitFlashTimer = 0;

// Utilitários
function hash2(x, y){ const s = Math.sin(x*127.1 + y*311.7 + worldSeed*0.013)*43758.5453; return s - Math.floor(s); }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function dist2(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }

function gridToIso(wx, wy){ return { x:(wx-wy)*(TW/2), y:(wx+wy)*(TH/2) }; }
function isoToGrid(ix, iy){
  return { x:(ix/(TW/2)+iy/(TH/2))/2, y:(iy/(TH/2)-ix/(TW/2))/2 };
}

// === FUNÇÃO: retorna AABB do que a câmera vê em coordenadas de grid ===
function getVisibleGridBounds(){
  const z = zoom;
  // 4 cantos da tela em coordenadas de mundo (antes do translate/scale)
  const corners = [
    { x: (-camX - camOffsetX)/z,              y: (-camY - camOffsetY)/z },
    { x: (canvas.width - camX - camOffsetX)/z, y: (-camY - camOffsetY)/z },
    { x: (-camX - camOffsetX)/z,              y: (canvas.height - camY - camOffsetY)/z },
    { x: (canvas.width - camX - camOffsetX)/z, y: (canvas.height - camY - camOffsetY)/z }
  ];
  let minGx = Infinity, minGy = Infinity, maxGx = -Infinity, maxGy = -Infinity;
  for (const c of corners) {
    const g = isoToGrid(c.x, c.y);
    if (g.x < minGx) minGx = g.x;
    if (g.x > maxGx) maxGx = g.x;
    if (g.y < minGy) minGy = g.y;
    if (g.y > maxGy) maxGy = g.y;
  }
  return { minGx, minGy, maxGx, maxGy };
}
