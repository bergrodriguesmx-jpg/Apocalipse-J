'use strict';
EZ.chunkKey = (x, y) => Math.floor(x / EZ.C.chunkSize) + ',' + Math.floor(y / EZ.C.chunkSize);
EZ.noise = function(x, y, salt = 0) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let fx = x - ix,
    fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => EZ.hash(a, b, EZ.state.seed + salt);
  return (h(ix, iy) * (1 - fx) + h(ix + 1, iy) * fx) * (1 - fy) + (h(ix, iy + 1) * (1 - fx) + h(ix + 1, iy +
    1) * fx) * fy;
};
EZ.terrainHeight = function(x, y) {
  // Rios conectados serpenteiam sem terminar; largura e colinas não repetem por chunk.
  const bend = 48 + Math.sin(y * .035) * 7 + (EZ.noise(y * .006, 7) - .5) * 25;
  const nearest = Math.round((x - bend) / 150),
    center = bend + nearest * 150;
  const distance = Math.abs(x - center),
    width = 3.2 + EZ.noise(y * .025, nearest, 32) * 2;
  const hills = .7 + EZ.noise(x * .025, y * .025, 90) * 3.5 + EZ.noise(x * .08, y * .08, 45) * .8;
  if (distance < width) return -2.7 * (1 - (distance / width) ** 2);
  const bank = EZ.clamp((distance - width) / 5, 0, 1);
  return hills * bank * bank * (3 - 2 * bank);
};
EZ.makeWorld = function(seed) {
  EZ.state.world = {
    seed,
    chunks: new Map(),
    visited: new Set(),
    queue: [],
    view: [],
    viewObjects: [],
    activeTiles: [],
    version: 0,
    viewStamp: '',
    lastStream: -1,
    // IDs da sessão evitam aplicar callbacks de um mundo antigo após reiniciar.
    id: seed + ':' + Date.now() + ':' + Math.random(),
    activeKeys: new Set(),
    stats: {
      drawnTiles: 0,
      activeChunks: 0,
      cachedChunks: 0
    }
  };
};
EZ.generateChunk = function(cx, cy) {
  const N = EZ.C.chunkSize,
    key = cx + ',' + cy,
    c = {
      cx,
      cy,
      key,
      tiles: [],
      objects: [],
      fauna: [],
      loot: [],
      fires: [],
      ready: true,
      awake: false,
      lastEco: EZ.state.elapsed,
      lastFauna: EZ.state.elapsed
    };
  const rand = EZ.rng((EZ.hash(cx, cy, EZ.state.seed) * 4294967295) >>> 0);
  for (let ly = 0; ly < N; ly++)
    for (let lx = 0; lx < N; lx++) {
      const x = cx * N + lx,
        y = cy * N + ly,
        heights = [EZ.terrainHeight(x, y), EZ.terrainHeight(x + 1, y), EZ.terrainHeight(x + 1, y + 1), EZ
          .terrainHeight(x, y + 1)
        ],
        bed = heights.reduce((a, b) => a + b) / 4;
      const t = {
        x,
        y,
        chunk: key,
        heights,
        bed,
        depth: Math.max(0, -bed),
        water: bed < 0,
        moist: bed < 0 ? 100 : 45 + rand() * 25,
        fertility: 45 + rand() * 45,
        grass: 70 + rand() * 30,
        crop: null,
        field: false,
        variant: rand()
      };
      c.tiles.push(t);
      const clear = Math.hypot(x - 32, y - 32) < 5,
        steep = Math.max(...heights) - Math.min(...heights) > .85;
      if (bed > .25 && !clear && !steep) {
        const r = rand();
        let kind = r < .055 ? 'tree' : r < .073 ? 'rock' : r < .10 ? 'bush' : null;
        if (kind) {
          c.objects.push({
            id: key + ':' + lx + ':' + ly,
            chunk: key,
            kind,
            x: x + .5,
            y: y + .5,
            z: bed,
            r: kind === 'rock' ? .42 : .28,
            h: kind === 'tree' ? 2.7 + rand() : .5,
            hp: kind === 'tree' ? 3 : 2,
            pine: rand() < .6,
            berries: kind === 'bush',
            age: 60 + rand() * 120,
            seedTime: 0
          });
        }
      }
    }
  // Ruínas rurais determinísticas e saque finito: sem armas gratuitas no inventário.
  const ruin = rand() < .22 || (cx === 2 && cy === 1);
  if (ruin) {
    const x = cx * N + 8,
      y = cy * N + 8,
      z = EZ.terrainHeight(x, y);
    if (z > .4) {
      c.objects = c.objects.filter(o => Math.hypot(o.x - x, o.y - y) > 2.8);
      c.objects.push({
        id: key + ':barn',
        chunk: key,
        kind: 'barn',
        x,
        y,
        z,
        hw: 1.4,
        hd: 1,
        r: 1.4,
        h: 2.7
      });
      const weapon = cx === 2 && cy === 1 ? 'pistol' : rand() < .45 ? 'shotgun' : 'rifle';
      c.loot.push({
        x: x - 2.2,
        y: y + 1.6,
        kind: weapon,
        amount: 1
      }, {
        x: x - 2,
        y: y + 1,
        kind: 'ammo',
        amount: 12 + Math.floor(rand() * 18)
      }, {
        x: x + 2,
        y: y + 1,
        kind: 'food',
        amount: 2
      });
    }
  }
  const species = ['rabbit', 'rabbit', 'deer', 'deer', 'fox', 'wolf', 'zombie', 'zombie'];
  for (let i = 0; i < 4; i++) {
    const t = c.tiles[Math.floor(rand() * c.tiles.length)];
    if (t.water || Math.hypot(t.x - 32, t.y - 32) < 7) continue;
    const kind = species[Math.floor(rand() * species.length)],
      a = EZ.makeActor(kind, t.x + .5, t.y + .5);
    a.id = key + ':fauna:' + i;
    a.z = t.bed;
    a.age = 20 + rand() * 40;
    a.hunger = 20 + rand() * 30;
    a.sex = rand() < .5 ? 0 : 1;
    a.phase = rand() * 6;
    a.aiTimer = rand() * 3;
    c.fauna.push(a);
  }
  return c;
};
EZ.packActor = a => ({
  ...a,
  missing: [...a.missing]
});
EZ.unpackActor = a => ({
  ...a,
  missing: new Set(a.missing || [])
});
EZ.chunk = function(cx, cy) {
  const w = EZ.state.world,
    key = cx + ',' + cy;
  if (w.chunks.has(key)) return w.chunks.get(key);
  const c = EZ.generateChunk(cx, cy);
  w.chunks.set(key, c);
  w.version++;
  if (w.visited.has(key)) {
    c.ready = false;
    const worldID = w.id;
    EZ.archiveGet(w.id + ':' + key).then(saved => {
      if (EZ.state.world.id !== worldID || w.chunks.get(key) !== c) return;
      if (saved) {
        Object.assign(c, saved);
        c.fauna = c.fauna.map(EZ.unpackActor);
      }
      c.ready = true;
      c.awake = false;
      EZ.catchUpChunk(c);
      w.version++;
    });
  }
  return c;
};
EZ.tile = function(x, y) {
  const N = EZ.C.chunkSize,
    ix = Math.floor(x),
    iy = Math.floor(y),
    c = EZ.state.world?.chunks.get(EZ.chunkKey(ix, iy));
  return c?.ready ? c.tiles[(iy - c.cy * N) * N + ix - c.cx * N] : null;
};
EZ.groundAt = function(x, y) {
  const t = EZ.tile(x, y);
  if (!t) return EZ.terrainHeight(x, y);
  const u = x - Math.floor(x),
    v = y - Math.floor(y),
    h = t.heights;
  return h[0] * (1 - u) * (1 - v) + h[1] * u * (1 - v) + h[2] * u * v + h[3] * (1 - u) * v;
};
EZ.surfaceAt = (x, y) => Math.max(0, EZ.groundAt(x, y));
EZ.depthAt = (x, y) => Math.max(0, -EZ.groundAt(x, y));
EZ.objectsNear = function(x, y, range = 2) {
  const w = EZ.state.world,
    N = EZ.C.chunkSize,
    out = [];
  for (let cy = Math.floor((y - range) / N); cy <= Math.floor((y + range) / N); cy++)
    for (let cx = Math.floor((x - range) / N); cx <= Math.floor((x + range) / N); cx++) {
      const c = w.chunks.get(cx + ',' + cy);
      if (c?.ready)
        for (const o of c.objects)
          if (Math.abs(o.x - x) < range + 2 && Math.abs(o.y - y) < range + 2) out.push(o);
    }
  return out;
};
EZ.freeSpot = function(x, y, r = .35) {
  const t = EZ.tile(x, y);
  if (!t || EZ.depthAt(x, y) > .1) return false;
  return !EZ.objectsNear(x, y, r + 2).some(o => o.kind !== 'bush' && (o.hw ? Math.abs(x - o.x) < o.hw + r &&
    Math.abs(y - o.y) < o.hd + r : EZ.distance(o, {
      x,
      y
    }) < o.r + r));
};
EZ.removeObject = function(o) {
  const c = EZ.state.world.chunks.get(o.chunk);
  if (c) {
    c.objects = c.objects.filter(a => a !== o);
    EZ.state.world.version++;
  }
};
EZ.spawnSpot = function(x, y, min, max) {
  for (let i = 0; i < 50; i++) {
    const a = Math.random() * Math.PI * 2,
      d = min + Math.random() * (max - min),
      p = {
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d
      };
    if (EZ.freeSpot(p.x, p.y)) return p;
  }
  return null;
};
EZ.catchUpChunk = function(c) {
  const elapsed = Math.max(0, EZ.state.elapsed - c.lastEco);
  if (elapsed <= 0) return;
  // Evolução analítica limitada: não executa milhares de passos ao revisitar.
  const dt = Math.min(elapsed, 7200);
  for (const t of c.tiles) {
    t.moist = t.water ? 100 : 50 + (t.moist - 50) * Math.exp(-dt / 600);
    t.grass = 100 - (100 - t.grass) * Math.exp(-dt / 400);
    if (t.crop) t.crop.progress = Math.min(100, t.crop.progress + dt * (t.moist / 65) * (t.fertility / 70) *
      .4);
  }
  for (const o of c.objects) {
    if (o.kind === 'bush' && elapsed > 180) o.berries = true;
    if (o.kind === 'tree') o.age += dt * .02;
  }
  // Animais distantes consomem alimento local; capacidade de suporte limita população.
  const herb = c.fauna.filter(a => a.kind === 'deer' || a.kind === 'rabbit'),
    pred = c.fauna.filter(a => a.kind === 'wolf' || a.kind === 'fox');
  const food = c.tiles.reduce((n, t) => n + (t.water ? 0 : t.grass), 0),
    capacity = Math.max(1, Math.floor(food / 2500));
  for (const a of c.fauna) {
    a.age += dt * .03;
    a.hunger = EZ.clamp(a.hunger + dt * .025 - (herb.includes(a) && herb.length <= capacity ? dt * .035 :
      0), 0, 110);
    if (pred.includes(a) && herb.length) a.hunger = Math.max(0, a.hunger - dt * .02);
  }
  if (elapsed > 120 && pred.length && herb.length) {
    const victim = herb[0];
    c.fauna = c.fauna.filter(a => a !== victim);
  }
  c.fauna = c.fauna.filter(a => a.kind === 'zombie' || (a.hunger < 105 && a.age < 160));
  c.lastEco = EZ.state.elapsed;
};
EZ.sleepChunk = function(c) {
  if (!c.awake) return;
  const s = EZ.state;
  c.fauna = [...c.fauna, ...s.actors.filter(a => a !== s.player && EZ.chunkKey(a.x, a.y) === c.key && !a
    .dead)];
  s.actors = s.actors.filter(a => a === s.player || EZ.chunkKey(a.x, a.y) !== c.key);
  c.loot = s.loot.filter(a => EZ.chunkKey(a.x, a.y) === c.key);
  s.loot = s.loot.filter(a => EZ.chunkKey(a.x, a.y) !== c.key);
  c.fires = s.fires.filter(a => EZ.chunkKey(a.x, a.y) === c.key);
  s.fires = s.fires.filter(a => EZ.chunkKey(a.x, a.y) !== c.key);
  c.lastEco = s.elapsed;
  c.awake = false;
};
EZ.wakeChunk = function(c) {
  if (c.awake || !c.ready) return;
  EZ.catchUpChunk(c);
  const s = EZ.state;
  for (const a of c.fauna) {
    const cap = a.kind === 'zombie' ? EZ.C.maxZombies : EZ.C.maxAnimals;
    if (s.actors.filter(o => a.kind === 'zombie' ? o.kind === 'zombie' : !['player', 'zombie'].includes(o
        .kind)).length >= cap) continue;
    s.actors.push(a);
  }
  c.fauna = c.fauna.filter(a => !s.actors.includes(a));
  s.loot.push(...c.loot);
  c.loot = [];
  s.fires.push(...c.fires);
  c.fires = [];
  c.awake = true;
};
EZ.evictChunk = function(c) {
  EZ.sleepChunk(c);
  const w = EZ.state.world;
  w.visited.add(c.key);
  EZ.archivePut(w.id + ':' + c.key, {
    ...c,
    fauna: c.fauna.map(EZ.packActor),
    awake: false,
    ready: true
  });
  w.chunks.delete(c.key);
  w.version++;
};
EZ.viewBounds = function() {
  const points = [];
  for (const x of [-90, EZ.canvas.width + 90])
    for (const y of [-60, EZ.canvas.height + 130])
      for (const z of [-3, 6]) points.push(EZ.unproject(x, y, z));
  return {
    minX: Math.floor(Math.min(...points.map(p => p.x))),
    maxX: Math.ceil(Math.max(...points.map(p => p.x))),
    minY: Math.floor(Math.min(...points.map(p => p.y))),
    maxY: Math.ceil(Math.max(...points.map(p => p.y)))
  };
};
EZ.updateStreaming = function(force = false) {
  const s = EZ.state,
    w = s.world,
    N = EZ.C.chunkSize,
    p = s.player,
    b = EZ.viewBounds(),
    px = Math.floor(p.x / N),
    py = Math.floor(p.y / N),
    wanted = new Set(),
    active = new Set();
  for (let cy = py - 1; cy <= py + 1; cy++)
    for (let cx = px - 1; cx <= px + 1; cx++) {
      const key = cx + ',' + cy;
      wanted.add(key);
      active.add(key);
    }
  for (let cy = Math.floor(b.minY / N); cy <= Math.floor(b.maxY / N); cy++)
    for (let cx = Math.floor(b.minX / N); cx <= Math.floor(b.maxX / N); cx++) wanted.add(cx + ',' + cy);
  let budget = force ? 100 : 3;
  // Primeiro o espaço de movimento; câmera deslocada nunca impede o jogador de andar.
  for (const key of wanted) {
    if (!w.chunks.has(key) && budget-- > 0) {
      const [x, y] = key.split(',').map(Number);
      EZ.chunk(x, y);
    }
  }
  for (const c of w.chunks.values())
    if (c.awake && !active.has(c.key)) EZ.sleepChunk(c);
  for (const key of active) {
    const c = w.chunks.get(key);
    if (c?.ready) EZ.wakeChunk(c);
  }
  for (const a of [...s.actors])
    if (a !== s.player && !active.has(EZ.chunkKey(a.x, a.y))) {
      const key = EZ.chunkKey(a.x, a.y),
        [cx, cy] = key.split(',').map(Number),
        c = EZ.chunk(cx, cy);
      if (c.ready) {
        c.fauna.push(a);
        s.actors = s.actors.filter(v => v !== a);
      }
    }
  w.activeKeys = active;
  for (const c of [...w.chunks.values()])
    if (!wanted.has(c.key) && c.ready) EZ.evictChunk(c);
  w.activeTiles = [];
  for (const key of active) {
    const c = w.chunks.get(key);
    if (c?.ready) w.activeTiles.push(...c.tiles);
  }
  // A lista de desenho contém apenas tiles potencialmente visíveis, com margem para copas/relevo.
  w.view = [];
  w.viewObjects = [];
  for (const c of w.chunks.values()) {
    if (!c.ready) continue;
    for (const t of c.tiles)
      if (t.x >= b.minX && t.x <= b.maxX && t.y >= b.minY && t.y <= b.maxY) w.view.push(t);
    w.viewObjects.push(...c.objects);
  }
  w.view.sort((a, b) => a.x + a.y - b.x - b.y);
  w.stats.activeChunks = active.size;
  w.stats.cachedChunks = w.chunks.size;
};
