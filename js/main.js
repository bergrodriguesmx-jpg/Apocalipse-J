'use strict';
EZ.reset = function(seed) {
  const s = EZ.state;
  s.seed = seed;
  s.clock = 8;
  s.day = 1;
  s.elapsed = 0;
  s.weather = 'Sol';
  s.weatherTimer = 0;
  s.ecosystemTimer = 0;
  s.speed = 1;
  s.tool = 'chop';
  s.kills = 0;
  s.messageTime = 0;
  s.input.down = false;
  s.input.pressed = false;
  s.input.keys.clear();
  for (const key of ['actors', 'ragdolls', 'bullets', 'particles', 'stains', 'loot', 'fires']) s[key] = [];
  s.inventory = {
    wood: 0,
    stone: 0,
    food: 2,
    seeds: 3
  };
  EZ.clearArchive();
  EZ.makeWorld(seed);
  // A clareira inicial é garantida em terra, independentemente da semente.
  let x = 32,
    y = 32;
  while (EZ.terrainHeight(x, y) < .5) x -= 2;
  const p = s.player = EZ.makeActor('player', x, y);
  Object.assign(p, {
    hunger: 15,
    thirst: 10,
    stamina: 100,
    oxygen: 100,
    waterBottle: 2,
    weapon: null,
    owned: new Set(),
    ammo: {
      pistol: 0,
      rifle: 0,
      shotgun: 0
    },
    reserve: 0,
    reload: 0
  });
  s.actors.push(p);
  EZ.resetSurvivorAnimation(p);
  s.camera.panX = s.camera.panY = 0;
  EZ.centerCamera(1);
  EZ.updateStreaming(true);
  // Pequeno abrigo inicial visível, sem equipamento criado pelo jogador.
  if (s.mode !== 'start') s.mode = 'playing';
  EZ.accumulator = 0;
};
EZ.centerCamera = function(k) {
  const s = EZ.state,
    p = s.player,
    c = s.camera;
  c.x += (EZ.canvas.width / 2 - (p.x - p.y) * 16 - c.x) * k;
  c.y += (EZ.canvas.height / 2 + 20 - (p.x + p.y) * 8 + p.z * 24 - c.y) * k;
};
EZ.resize = function() {
  const c = EZ.canvas,
    scale = Math.max(EZ.state.camera.scale, Math.ceil(innerWidth / 960), Math.ceil(innerHeight / 600));
  c.width = Math.max(160, Math.floor(innerWidth / scale));
  c.height = Math.max(100, Math.floor(innerHeight / scale));
  c.style.width = c.width * scale + 'px';
  c.style.height = c.height * scale + 'px';
  EZ.ctx.imageSmoothingEnabled = false;
  if (EZ.state.player) {
    EZ.centerCamera(1);
    EZ.updateStreaming();
  }
};
EZ.init = async function() {
  EZ.canvas = document.getElementById('game');
  EZ.ctx = EZ.canvas.getContext('2d', {
    alpha: false
  });
  EZ.resize();
  const start = document.getElementById('start');
  start.disabled = true;
  start.textContent = 'PREPARANDO A REGIÃO…';
  await EZ.openStorage();
  const spritesLoaded = await EZ.loadSprites();
  if (!spritesLoaded) {
    const intro = document.getElementById('intro');
    intro.hidden = false;
    let error = document.getElementById('spriteLoadError');
    if (!error) {
      error = document.createElement('p');
      error.id = 'spriteLoadError';
      error.setAttribute('role', 'alert');
      start.insertAdjacentElement('beforebegin', error);
    }
    error.textContent = EZ.spriteError;
    start.disabled = false;
    start.textContent = 'TENTAR CARREGAR NOVAMENTE';
    start.onclick = () => {
      start.onclick = null;
      EZ.init();
    };
    return;
  }
  const oldError = document.getElementById('spriteLoadError');
  if (oldError) oldError.remove();
  EZ.reset(EZ.state.seed);
  EZ.bindInput();
  window.addEventListener('resize', EZ.resize);
  start.disabled = false;
  start.textContent = 'ENTRAR NAS TERRAS PERDIDAS →';
  EZ.accumulator = 0;
  let last = performance.now(),
    hud = 0,
    stream = 0;

  function frame(now) {
    const real = Math.min((now - last) / 1000, .1);
    last = now;
    const s = EZ.state;
    stream += real;
    if (stream > .1 || s.world.queue.length) {
      EZ.updateStreaming();
      stream = 0;
    }
    if (s.mode === 'playing') {
      EZ.accumulator += real;
      let count = 0;
      while (EZ.accumulator >= EZ.C.dt && count < 20) {
        EZ.step(EZ.C.dt);
        EZ.accumulator -= EZ.C.dt;
        count++;
        if (s.mode !== 'playing') {
          EZ.accumulator = 0;
          break;
        }
      }
      if (count === 20) EZ.accumulator = 0;
      EZ.centerCamera(1 - Math.exp(-7 * real));
    } else {
      EZ.accumulator = 0;
      if (s.mode === 'dead') EZ.stepRagdolls(Math.min(real, 1 / 60));
    }
    EZ.render();
    hud += real;
    if (hud > .15) {
      EZ.updateHUD();
      hud = 0;
    }
    requestAnimationFrame(frame);
  }
  EZ.updateHUD();
  requestAnimationFrame(frame);
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', EZ.init);
else EZ.init();
