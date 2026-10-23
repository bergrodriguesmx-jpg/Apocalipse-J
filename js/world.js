'use strict';
EZ.makeWorld = function(seed) {
  const tiles = [],
    objects = [],
    random = EZ.rng(seed),
    N = EZ.C.size;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const river = 48 + Math.sin(y * .13) * 3,
        water = Math.abs(x - river) < 2;
      const clear = Math.hypot(x - 32, y - 32) < 6,
        field = x > 24 && x < 30 && y > 26 && y < 32;
      const t = {
        x,
        y,
        water,
        field,
        moist: water ? 100 : 40 + random() * 35,
        fertility: 50 + random() * 40,
        crop: null,
        variant: random()
      };
      tiles.push(t);
      if (!water && !clear && !field) {
        const r = random();
        if (r < .085) objects.push({
          kind: 'tree',
          x: x + .5,
          y: y + .5,
          r: .28,
          h: 2.9 + random(),
          hp: 3,
          pine: random() < .55
        });
        else if (r < .105) objects.push({
          kind: 'rock',
          x: x + .5,
          y: y + .5,
          r: .42,
          h: .55,
          hp: 2
        });
        else if (r < .135) objects.push({
          kind: 'bush',
          x: x + .5,
          y: y + .5,
          r: .2,
          h: .4,
          berries: true
        });
      }
    }
  // Cabana e cerca: visíveis, com o mesmo volume usado nas colisões.
  objects.push({
    kind: 'barn',
    x: 36,
    y: 27,
    r: 1.2,
    h: 2.8,
    hw: 1.5,
    hd: 1.1
  });
  for (let i = 0; i < 6; i++) objects.push({
    kind: 'fence',
    x: 24 + i,
    y: 25,
    r: .15,
    h: .8,
    hw: .5,
    hd: .07
  });
  EZ.state.world = {
    tiles,
    objects
  };
};
EZ.tile = (x, y) => {
  x = Math.floor(x);
  y = Math.floor(y);
  return x < 0 || y < 0 || x >= EZ.C.size || y >= EZ.C.size ? null : EZ.state.world.tiles[y * EZ.C
    .size + x];
};
EZ.freeSpot = function(x, y, r = .35) {
  if (!EZ.tile(x, y) || EZ.tile(x, y).water) return false;
  return !EZ.state.world.objects.some(o => o.kind !== 'bush' && (o.hw ? Math.abs(x - o.x) < o.hw + r &&
    Math.abs(y - o.y) < o.hd + r : Math.hypot(x - o.x, y - o.y) < o.r + r));
};
EZ.spawnSpot = function(x, y, min, max) {
  for (let i = 0; i < 80; i++) {
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
