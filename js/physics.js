'use strict';
// Position Based Dynamics: partículas ponderadas por massa + distâncias rígidas.
// Restrições diagonais limitam flexão; apenas ligações explícitas são cortadas.
EZ.solveWorld = function(p, r) {
  for (const o of EZ.objectsNear(p.x, p.y, r + 2)) {
    if (o.kind === 'bush' || p.z - r > (o.z || 0) + o.h) continue;
    if (o.hw) {
      const qx = EZ.clamp(p.x, o.x - o.hw, o.x + o.hw),
        qy = EZ.clamp(p.y, o.y - o.hd, o.y + o.hd);
      let dx = p.x - qx,
        dy = p.y - qy,
        d = Math.hypot(dx, dy);
      if (d >= r) continue;
      if (d < 1e-8) {
        const ex = o.hw - Math.abs(p.x - o.x),
          ey = o.hd - Math.abs(p.y - o.y);
        if (ex < ey) p.x = o.x + (p.x >= o.x ? 1 : -1) * (o.hw + r);
        else p.y = o.y + (p.y >= o.y ? 1 : -1) * (o.hd + r);
      } else {
        p.x += dx / d * (r - d);
        p.y += dy / d * (r - d);
      }
    } else {
      let dx = p.x - o.x,
        dy = p.y - o.y,
        d = Math.hypot(dx, dy),
        min = r + o.r;
      if (d < min) {
        if (d < 1e-8) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        p.x = o.x + dx / d * min;
        p.y = o.y + dy / d * min;
      }
    }
  }
};
EZ.moveActor = function(a, dx, dy, speed, dt) {
  const n = Math.hypot(dx, dy);
  if (n > 1) {
    dx /= n;
    dy /= n;
  }
  const depth = EZ.depthAt(a.x, a.y),
    humanoid = a.kind === 'player' || a.kind === 'zombie';
  a.swimming = depth > (humanoid ? 1.05 : .5);
  a.wading = depth > .1 && !a.swimming;
  if (a.swimming) speed = a.kind === 'zombie' ? .48 : (a.stamina < 1 ? .48 : 1.15);
  else if (a.wading) speed *= .65;
  const k = 1 - Math.exp(-9 * dt);
  a.vx += (dx * speed - a.vx) * k;
  a.vy += (dy * speed - a.vy) * k;
  const ox = a.x,
    oy = a.y,
    oldGround = EZ.groundAt(ox, oy);
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  const travel = Math.hypot(a.x - ox, a.y - oy),
    rise = EZ.groundAt(a.x, a.y) - oldGround;
  if (!EZ.tile(a.x, a.y) || (travel > .00001 && rise / travel > 1.35)) {
    a.x = ox;
    a.y = oy;
    a.vx = a.vy = 0;
  } else if (rise > 0) {
    const slope = 1 / (1 + rise / Math.max(travel, .0001));
    a.x = ox + (a.x - ox) * slope;
    a.y = oy + (a.y - oy) * slope;
  }
  EZ.solveWorld(a, a.radius);
  const bed = EZ.groundAt(a.x, a.y),
    d = Math.max(0, -bed);
  a.swimming = d > (humanoid ? 1.05 : .5);
  a.wading = d > .1 && !a.swimming;
  a.z = a.swimming ? Math.max(bed, humanoid ? -1.05 : -.35) : bed;
  const v = Math.hypot(a.vx, a.vy);
  a.phase += v * dt * 6;
  if (v > .05) a.angle = Math.atan2(a.vy, a.vx);
};
EZ.separateActors = function(actors) {
  for (let i = 0; i < actors.length; i++)
    for (let j = i + 1; j < actors.length; j++) {
      const a = actors[i],
        b = actors[j];
      let dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy),
        r = a.radius + b.radius;
      if (d >= r) continue;
      if (d < 1e-8) {
        dx = 1;
        dy = 0;
        d = 1e-6;
      }
      const nx = dx / (d === 1e-6 ? 1 : d),
        ny = dy / (d === 1e-6 ? 1 : d),
        p = (r - d) * .5;
      a.x -= nx * p;
      a.y -= ny * p;
      b.x += nx * p;
      b.y += ny * p;
    }
  for (const a of actors) EZ.solveWorld(a, a.radius);
};
EZ.pose = function(a) {
  const s = Math.sin(a.phase) * (Math.hypot(a.vx, a.vy) > .1 ? 1 : 0),
    c = Math.cos(a.angle),
    f = Math.sin(a.angle);
  const point = (side, forward, z) => ({
    x: a.x - f * side + c * forward,
    y: a.y + c * side + f * forward,
    z: z + (a.z || 0)
  });
  return {
    hip: point(0, 0, .86),
    chest: point(0, 0, 1.32),
    head: point(0, .015, 1.67),
    le: point(-.33, -s * .10, 1.12),
    lh: point(-.39, -s * .18, .89),
    re: point(.33, s * .10, 1.12),
    rh: point(.39, s * .18, .89),
    lk: point(-.13, s * .13, .48),
    lf: point(-.13, s * .23, .09),
    rk: point(.13, -s * .13, .48),
    rf: point(.13, -s * .23, .09)
  };
};
EZ.boneDefs = [
  ['hip', 'chest', 'torso', 7],
  ['chest', 'head', 'head', 7],
  ['chest', 'le', 'leftArm', 4],
  ['le', 'lh', 'leftArm', 3],
  ['chest', 're', 'rightArm', 4],
  ['re', 'rh', 'rightArm', 3],
  ['hip', 'lk', 'leftLeg', 4],
  ['lk', 'lf', 'leftLeg', 4],
  ['hip', 'rk', 'rightLeg', 4],
  ['rk', 'rf', 'rightLeg', 4]
];
EZ.groupNodes = {
  head: ['head'],
  leftArm: ['le', 'lh'],
  rightArm: ['re', 'rh'],
  leftLeg: ['lk', 'lf'],
  rightLeg: ['rk', 'rf']
};
EZ.makeRagdoll = function(actor, onlyGroup = null, impulse = {
  x: 0,
  y: 0,
  z: 0
}, hitName = 'chest') {
  const pose = EZ.pose(actor),
    names = onlyGroup ? EZ.groupNodes[onlyGroup] : Object.keys(pose).filter(n => !Object.entries(EZ
      .groupNodes).some(([g, ns]) => actor.missing.has(g) && ns.includes(n)));
  const nodes = {};
  for (const name of names) {
    const p = pose[name];
    nodes[name] = {
      ...p,
      ox: p.x,
      oy: p.y,
      oz: p.z,
      vx: actor.vx,
      vy: actor.vy,
      vz: 0,
      r: name === 'head' ? .14 : .075,
      inv: name === 'hip' || name === 'chest' ? 1 / 12 : 1 / 3
    };
  }
  const links = [];

  function add(a, b, group, draw, width, min = 1, max = 1) {
    if (!nodes[a] || !nodes[b]) return;
    const A = nodes[a],
      B = nodes[b];
    links.push({
      a,
      b,
      group,
      draw,
      width,
      rest: Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z),
      min,
      max
    });
  }
  for (const [a, b, g, w] of EZ.boneDefs) add(a, b, g, true, w);
  // Limites de extensão e de dobra, preservando a flexibilidade dos cotovelos/joelhos.
  for (const [a, b, g] of [
      ['chest', 'lh', 'leftArm'],
      ['chest', 'rh', 'rightArm'],
      ['hip', 'lf', 'leftLeg'],
      ['hip', 'rf', 'rightLeg']
    ]) add(a, b, g, false, 0, .48, 1.03);
  add('head', 'hip', 'torso', false, 0, .88, 1.02);
  add('le', 're', 'torso', false, 0, .65, 1.08);
  add('lk', 'rk', 'torso', false, 0, .6, 1.6);
  const r = {
    nodes,
    links,
    color: actor.color,
    skin: actor.skin,
    life: EZ.C.corpseLife,
    age: 0,
    sleep: 0,
    sleeping: false
  };
  for (const [name, n] of Object.entries(nodes)) {
    const weight = name === hitName ? 1 : .18;
    n.vx += impulse.x * weight;
    n.vy += impulse.y * weight;
    n.vz += impulse.z * weight;
  }
  // Uma pequena inclinação inicial evita equilíbrio artificial perfeitamente vertical.
  for (const n of Object.values(nodes)) {
    n.vx += .16;
    n.vy += .09;
  }
  EZ.state.ragdolls.push(r);
  if (EZ.state.ragdolls.length > EZ.C.maxRagdolls) EZ.state.ragdolls.shift();
  return r;
};
EZ.stepRagdolls = function(dt) {
  for (const rag of EZ.state.ragdolls) {
    rag.life -= dt;
    rag.age += dt;
    if (rag.sleeping) continue;
    const ns = Object.values(rag.nodes);
    for (const p of ns) {
      p.ox = p.x;
      p.oy = p.y;
      p.oz = p.z;
      const submerged = p.z < 0 && EZ.depthAt(p.x, p.y) > 0;
      p.vz -= EZ.C.gravity * (submerged ? .35 : 1) * dt;
      if (submerged) {
        p.vx *= Math.exp(-3 * dt);
        p.vy *= Math.exp(-3 * dt);
        p.vz *= Math.exp(-3 * dt);
      }
      p.vx *= Math.exp(-.15 * dt);
      p.vy *= Math.exp(-.15 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
    for (let it = 0; it < EZ.C.iterations; it++) {
      for (const l of rag.links) {
        const a = rag.nodes[l.a],
          b = rag.nodes[l.b],
          dx = b.x - a.x,
          dy = b.y - a.y,
          dz = b.z - a.z,
          d = Math.hypot(dx, dy, dz);
        if (d < 1e-8) continue;
        const target = EZ.clamp(d, l.rest * l.min, l.rest * l.max),
          v = (d - target) / d / (a.inv + b.inv);
        a.x += dx * v * a.inv;
        a.y += dy * v * a.inv;
        a.z += dz * v * a.inv;
        b.x -= dx * v * b.inv;
        b.y -= dy * v * b.inv;
        b.z -= dz * v * b.inv;
      }
      for (const p of ns) {
        p.z = Math.max(EZ.groundAt(p.x, p.y) + p.r, p.z);
        EZ.solveWorld(p, p.r);
      }
    }
    let energy = 0;
    for (const p of ns) {
      const incoming = p.vz;
      p.vx = (p.x - p.ox) / dt;
      p.vy = (p.y - p.oy) / dt;
      p.vz = (p.z - p.oz) / dt;
      if (p.z <= EZ.groundAt(p.x, p.y) + p.r + .002) {
        p.vx *= Math.exp(-13 * dt);
        p.vy *= Math.exp(-13 * dt);
        p.vz = incoming < -.8 ? -incoming * .12 : Math.max(0, p.vz) * .1;
      }
      // Limite defensivo contra energia numérica em contatos muito apertados.
      p.vx = EZ.clamp(p.vx, -18, 18);
      p.vy = EZ.clamp(p.vy, -18, 18);
      p.vz = EZ.clamp(p.vz, -18, 18);
      energy += p.vx * p.vx + p.vy * p.vy + p.vz * p.vz;
    }
    if (energy / ns.length < .035 && rag.age > 2) rag.sleep += dt;
    else rag.sleep = 0;
    if (rag.sleep > .8) rag.sleeping = true;
  }
  EZ.state.ragdolls = EZ.state.ragdolls.filter(r => r.life > 0);
};
// Primeiro contato de um segmento com uma esfera (sem saltar alvos rápidos).
EZ.segmentSphere = function(a, b, p, r) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z,
    ox = a.x - p.x,
    oy = a.y - p.y,
    oz = a.z - p.z,
    A = dx * dx + dy * dy + dz * dz,
    C = ox * ox + oy * oy + oz * oz - r * r;
  if (C <= 0) return 0;
  if (A < 1e-12) return null;
  const B = 2 * (ox * dx + oy * dy + oz * dz),
    D = B * B - 4 * A * C;
  if (D < 0) return null;
  const t = (-B - Math.sqrt(D)) / (2 * A);
  return t >= 0 && t <= 1 ? t : null;
};
