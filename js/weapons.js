'use strict';
EZ.reload = function() {
  const p = EZ.state.player,
    w = EZ.weapons[p.weapon];
  if (!w || p.swimming || p.reload > 0 || p.ammo[p.weapon] >= w.mag || p.reserve <= 0) return;
  p.reload = w.reload;
  EZ.message('Recarregando…');
};
EZ.aimPoint = function() {
  const s = EZ.state,
    m = s.input.mouse;
  let closest = null,
    best = 12;
  // Seleção da parte visível sob o cursor; a bala ainda colide no espaço 3D.
  for (const a of s.actors) {
    if (a === s.player || a.dead) continue;
    for (const h of EZ.hitSpheres(a)) {
      const q = EZ.project(h),
        d = Math.hypot(q.x - m.x, q.y - m.y);
      if (d < best) {
        best = d;
        closest = h;
      }
    }
  }
  return closest || {
    ...EZ.unproject(m.x, m.y, s.player.z + 1.2),
    z: s.player.z + 1.2
  };
};
EZ.fire = function() {
  const s = EZ.state,
    p = s.player,
    w = EZ.weapons[p.weapon];
  if (!w || p.swimming || p.cooldown > 0 || p.reload > 0 || p.dead) return;
  if (p.ammo[p.weapon] <= 0) {
    EZ.reload();
    return;
  }
  p.ammo[p.weapon]--;
  p.cooldown = w.rate;
  const aim = EZ.aimPoint(),
    start = {
      x: p.x,
      y: p.y,
      z: p.z + 1.2
    },
    dx = aim.x - start.x,
    dy = aim.y - start.y,
    dz = aim.z - start.z,
    len = Math.hypot(dx, dy, dz) || 1;
  p.angle = Math.atan2(dy, dx);
  for (let i = 0; i < w.pellets; i++) {
    let x = dx / len + (Math.random() - .5) * w.spread,
      y = dy / len + (Math.random() - .5) * w.spread,
      z = dz / len + (Math.random() - .5) * w.spread;
    const n = Math.hypot(x, y, z);
    x /= n;
    y /= n;
    z /= n;
    s.bullets.push({
      ...start,
      old: {
        ...start
      },
      vx: x * w.speed,
      vy: y * w.speed,
      vz: z * w.speed,
      damage: w.damage,
      impulse: w.impulse,
      life: .65
    });
  }
  EZ.sound(p.weapon === 'shotgun' ? 70 : 190, p.weapon === 'shotgun' ? .16 : .07);
};
EZ.stepBullets = function(dt) {
  const s = EZ.state;
  for (const b of s.bullets) {
    const old = {
        x: b.x,
        y: b.y,
        z: b.z
      },
      end = {
        x: b.x + b.vx * dt,
        y: b.y + b.vy * dt,
        z: b.z + b.vz * dt
      };
    b.old = old;
    b.life -= dt;
    let best = 1,
      hit = null,
      blocked = false;
    for (const a of s.actors) {
      if (a === s.player || a.dead) continue;
      for (const h of EZ.hitSpheres(a)) {
        const t = EZ.segmentSphere(old, end, h, h.r);
        if (t !== null && t < best) {
          best = t;
          hit = {
            a,
            h
          };
        }
      }
    }
    // Amostragem espacial curta para volumes estáticos, incluindo cercas/cabana.
    const steps = Math.ceil(Math.hypot(end.x - old.x, end.y - old.y, end.z - old.z) / .045);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (t > best) break;
      const p = {
        x: old.x + (end.x - old.x) * t,
        y: old.y + (end.y - old.y) * t,
        z: old.z + (end.z - old.z) * t
      };
      if (p.z < EZ.surfaceAt(p.x, p.y) || EZ.objectsNear(p.x, p.y, 2).some(o => o.kind !== 'bush' && p.z <=
          (o.z || 0) + o.h && (o.hw ? Math.abs(p
              .x - o.x) <= o.hw && Math.abs(p.y - o.y) <= o.hd : Math.hypot(p.x - o.x, p.y - o.y) <= o
            .r))) {
        best = t;
        hit = null;
        blocked = true;
        break;
      }
    }
    b.x = old.x + (end.x - old.x) * best;
    b.y = old.y + (end.y - old.y) * best;
    b.z = old.z + (end.z - old.z) * best;
    if (hit) {
      const v = Math.hypot(b.vx, b.vy, b.vz),
        imp = {
          x: b.vx / v * b.impulse,
          y: b.vy / v * b.impulse,
          z: b.vz / v * b.impulse + .25
        };
      EZ.damage(hit.a, hit.h.group, b.damage, imp, hit.h.node);
      b.life = 0;
    }
    if (blocked) b.life = 0;
  }
  s.bullets = s.bullets.filter(b => b.life > 0);
};
