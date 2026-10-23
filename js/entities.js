'use strict';
EZ.makeActor = function(kind, x, y) {
  return {
    kind,
    x,
    y,
    z: EZ.groundAt(x, y),
    thirst: 20,
    sex: Math.random() < .5 ? 0 : 1,
    repro: 0,
    swimming: false,
    attackTime: 0,
    vx: 0,
    vy: 0,
    radius: kind === 'rabbit' ? .18 : .29,
    hp: 100,
    angle: 0,
    phase: 0,
    cooldown: 0,
    aiTimer: 0,
    tx: x,
    ty: y,
    age: 0,
    hunger: 20,
    color: kind === 'player' ? '#c38b49' : kind === 'zombie' ? '#72865a' : '#ad7951',
    skin: kind === 'zombie' ? '#a1b080' : '#e4bc8b',
    missing: new Set(),
    limbHP: {
      head: 65,
      leftArm: 65,
      rightArm: 65,
      leftLeg: 80,
      rightLeg: 80
    },
    dead: false
  };
};
EZ.burst = function(p, v, count = 9) {
  for (let i = 0; i < count; i++) {
    if (EZ.state.particles.length >= EZ.C.maxParticles) break;
    EZ.state.particles.push({
      x: p.x,
      y: p.y,
      z: p.z ?? (EZ.groundAt(p.x, p.y) + .6),
      vx: v.x * .25 + (Math.random() - .5) * 2,
      vy: v.y * .25 + (Math.random() - .5) * 2,
      vz: Math.random() * 2,
      life: 1.8
    });
  }
};
EZ.kill = function(a, impulse = {
  x: 0,
  y: 0,
  z: 0
}, node = 'chest') {
  if (a.dead) return;
  a.dead = true;
  a.hp = 0;
  if (a.kind === 'zombie' || a.kind === 'player') EZ.makeRagdoll(a, null, impulse, node);
  else {
    // Fauna usa um corpo simples, sem anatomia humana reaproveitada.
    EZ.state.loot.push({
      x: a.x,
      y: a.y,
      kind: 'food',
      amount: 2
    });
    EZ.burst({
      x: a.x,
      y: a.y,
      z: a.z + .25
    }, impulse, 6);
  }
  if (a.kind === 'zombie') {
    EZ.state.kills++;
    if (Math.random() < .5) EZ.state.loot.push({
      x: a.x,
      y: a.y,
      kind: 'ammo',
      amount: 12
    });
  }
  if (a.kind === 'player') {
    EZ.state.mode = 'dead';
    EZ.state.input.down = false;
    EZ.message('Você morreu. Use Novo mundo para recomeçar.');
  }
};
EZ.damage = function(a, group, amount, impulse, node) {
  if (a.dead) return;
  a.hp -= amount * (group === 'head' ? 1.9 : 1);
  EZ.burst(EZ.pose(a)[node] || a, impulse);
  if (a.limbHP[group] !== undefined && !a.missing.has(group)) {
    a.limbHP[group] -= amount;
    if (a.limbHP[group] <= 0) {
      EZ.makeRagdoll(a, group, impulse, node);
      a.missing.add(group);
      if (group === 'head' || group.includes('Leg')) a.hp = 0;
    }
  }
  a.vx += impulse.x * .15;
  a.vy += impulse.y * .15;
  if (a.hp <= 0) EZ.kill(a, impulse, node);
};
EZ.hitSpheres = function(a) {
  if (a.kind !== 'zombie' && a.kind !== 'player') return [{
    x: a.x,
    y: a.y,
    z: a.z + (a.kind === 'rabbit' ? .2 : .45),
    r: a.radius,
    group: 'torso',
    node: 'chest'
  }];
  const p = EZ.pose(a),
    out = [];
  for (const [n1, n2, group] of EZ.boneDefs) {
    if (a.missing.has(group)) continue;
    const A = p[n1],
      B = p[n2];
    for (let i = 1; i <= 3; i++) {
      const t = i / 3;
      out.push({
        x: A.x + (B.x - A.x) * t,
        y: A.y + (B.y - A.y) * t,
        z: A.z + (B.z - A.z) * t,
        r: group === 'torso' ? .19 : group === 'head' ? .14 : .095,
        group,
        node: n2
      });
    }
  }
  return out;
};
