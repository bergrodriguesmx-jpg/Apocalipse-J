'use strict';
EZ.reset = function(seed) {
  const s = EZ.state;
  s.seed = seed;
  s.clock = 8;
  s.day = 1;
  s.elapsed = 0;
  s.weather = 'Sol';
  s.weatherTimer = 0;
  s.spawnTimer = 0;
  s.ecosystemTimer = 0;
  s.speed = 1;
  s.tool = 'shoot';
  s.kills = 0;
  s.messageTime = 0;
  s.input.down = false;
  s.input.pressed = false;
  s.input.keys.clear();
  for (const key of ['actors', 'ragdolls', 'bullets', 'particles', 'stains', 'loot', 'fires']) s[
    key] = [];
  s.inventory = {
    wood: 15,
    stone: 8,
    food: 6,
    seeds: 12
  };
  EZ.makeWorld(seed);
  const p = s.player = EZ.makeActor('player', 32, 32);
  Object.assign(p, {
    hunger: 15,
    thirst: 10,
    stamina: 100,
    weapon: 'pistol',
    ammo: {
      pistol: 12,
      rifle: 30,
      shotgun: 6
    },
    reserve: 120,
    reload: 0
  });
  s.actors.push(p);
  for (const [kind, count] of [
      ['deer', 5],
      ['rabbit', 8],
      ['fox', 2],
      ['wolf', 2],
      ['zombie', 7]
    ])
    for (let i = 0; i < count; i++) {
      const q = EZ.spawnSpot(32, 32, kind === 'zombie' ? 9 : 5, 18);
      if (q) s.actors.push(EZ.makeActor(kind, q.x, q.y));
    }
  s.loot.push({
    x: 33,
    y: 32,
    kind: 'ammo',
    amount: 36
  });
  s.fires.push({
    x: 30,
    y: 33
  });
  s.camera.panX = s.camera.panY = 0;
  EZ.centerCamera(1);
  if (s.mode !== 'start') s.mode = 'playing';
  EZ.accumulator = 0;
};
EZ.centerCamera = function(k) {
  const s = EZ.state,
    p = s.player,
    c = s.camera;
  c.x += (EZ.canvas.width / 2 - (p.x - p.y) * 16 - c.x) * k;
  c.y += (EZ.canvas.height / 2 + 20 - (p.x + p.y) * 8 - c.y) * k;
};
EZ.resize = function() {
  const c = EZ.canvas,
    scale = EZ.state.camera.scale;
  c.width = Math.max(160, Math.floor(innerWidth / scale));
  c.height = Math.max(100, Math.floor(innerHeight / scale));
  c.style.width = c.width * scale + 'px';
  c.style.height = c.height * scale + 'px';
  EZ.ctx.imageSmoothingEnabled = false;
  if (EZ.state.player) EZ.centerCamera(1);
};
EZ.init = function() {
  EZ.canvas = document.getElementById('game');
  EZ.ctx = EZ.canvas.getContext('2d', {
    alpha: false
  });
  EZ.resize();
  EZ.reset(EZ.state.seed);
  EZ.bindInput();
  window.addEventListener('resize', EZ.resize);
  EZ.accumulator = 0;
  let last = performance.now(),
    hud = 0;

  function frame(now) {
    const real = Math.min((now - last) / 1000, .1);
    last = now;
    const s = EZ.state;
    if (s.mode === 'playing') {
      EZ.accumulator += real * s.speed;
      let count = 0;
      while (EZ.accumulator >= EZ.C.dt && count < 64) {
        EZ.step(EZ.C.dt);
        EZ.accumulator -= EZ.C.dt;
        count++;
        if (s.mode !== 'playing') {
          EZ.accumulator = 0;
          break;
        }
      }
      if (count === 64) EZ.accumulator = 0;
      EZ.centerCamera(1 - Math.exp(-7 * real));
    } else {
      EZ.accumulator = 0;
      if (s.mode === 'dead') EZ.stepRagdolls(Math.min(real, 1 / 60));
    }
    EZ.render();
    hud += real;
    if (hud > .1) {
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
