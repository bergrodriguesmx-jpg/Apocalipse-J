'use strict';
EZ.ecosystem = function(dt) {
  const s = EZ.state,
    wet = s.weather === 'Chuva' || s.weather === 'Tempestade';
  for (const t of s.world.tiles) {
    t.moist = EZ.clamp(t.moist + (wet ? 2 : -.06) * dt, t.water ? 100 : 10, 100);
    if (t.crop) t.crop.progress = EZ.clamp(t.crop.progress + dt * (t.moist / 65) * (t.fertility / 70) *
      .65, 0, 100);
  }
  for (const a of s.actors) {
    if (a.kind === 'player' || a.kind === 'zombie') continue;
    a.age += dt;
    a.hunger += dt * .05;
    const t = EZ.tile(a.x, a.y);
    if (t && !t.water && (a.kind === 'deer' || a.kind === 'rabbit')) a.hunger = Math.max(0, a.hunger -
      dt * .1);
    if (a.hunger > 100) EZ.kill(a);
  }
  if (s.actors.filter(a => !['zombie', 'player'].includes(a.kind)).length < EZ.C.maxAnimals && Math
    .random() < .04) {
    const a = s.actors.find(a => a.kind === 'rabbit' && a.age > 30);
    if (a) {
      const p = EZ.spawnSpot(a.x, a.y, 1, 3);
      if (p) s.actors.push(EZ.makeActor('rabbit', p.x, p.y));
    }
  }
};
EZ.step = function(dt) {
  const s = EZ.state,
    p = s.player;
  s.elapsed += dt;
  s.messageTime -= dt;
  s.clock += dt * .04;
  if (s.clock >= 24) {
    s.clock -= 24;
    s.day++;
  }
  s.weatherTimer += dt;
  if (s.weatherTimer > 65) {
    s.weatherTimer = 0;
    s.weather = ['Sol', 'Nublado', 'Chuva', 'Tempestade'][Math.floor(Math.random() * 4)];
  }
  p.cooldown = Math.max(0, p.cooldown - dt);
  if (p.reload > 0) {
    p.reload -= dt;
    if (p.reload <= 0) {
      const need = EZ.weapons[p.weapon].mag - p.ammo[p.weapon],
        n = Math.min(need, p.reserve);
      p.ammo[p.weapon] += n;
      p.reserve -= n;
    }
  }
  const keys = s.input.keys,
    sx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has(
      'ArrowLeft') ? 1 : 0),
    sy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has(
      'ArrowUp') ? 1 : 0);
  let dx = sx + sy,
    dy = sy - sx,
    n = Math.hypot(dx, dy);
  if (n) {
    dx /= n;
    dy /= n;
    p.target = null;
  } else if (p.target) {
    dx = p.target.x - p.x;
    dy = p.target.y - p.y;
    n = Math.hypot(dx, dy);
    if (n < .18) {
      p.target = null;
      dx = dy = 0;
    } else {
      dx /= n;
      dy /= n;
    }
  }
  const run = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && p.stamina > 1 && n > 0;
  p.stamina = EZ.clamp(p.stamina + (run ? -16 : 11) * dt, 0, 100);
  EZ.moveActor(p, dx, dy, run ? 4 : 2.5, dt);
  p.hunger = EZ.clamp(p.hunger + dt * .1, 0, 100);
  p.thirst = EZ.clamp(p.thirst + dt * .16, 0, 100);
  if (p.hunger >= 100 || p.thirst >= 100) p.hp -= dt * 3;
  if (s.input.down && s.tool === 'shoot') EZ.fire();
  if (s.input.pressed) {
    s.input.pressed = false;
    if (s.tool !== 'shoot') EZ.useTool();
  }
  for (const a of s.actors) {
    if (a === p || a.dead) continue;
    a.cooldown = Math.max(0, a.cooldown - dt);
    a.aiTimer -= dt;
    let dx = 0,
      dy = 0,
      sp = 1;
    if (a.kind === 'zombie') {
      let target = p,
        dist = EZ.distance(a, p);
      for (const o of s.actors)
        if (o !== a && o.kind !== 'zombie' && !o.dead && EZ.distance(a, o) < dist) {
          target = o;
          dist = EZ.distance(a, o);
        }
      if (dist < 13) {
        dx = target.x - a.x;
        dy = target.y - a.y;
        sp = 1.05;
        if (dist < .8 && a.cooldown === 0) {
          a.cooldown = 1.2;
          target.hp -= a.missing.has('leftArm') && a.missing.has('rightArm') ? 4 : 9;
          EZ.burst({
            x: target.x,
            y: target.y,
            z: 1
          }, {
            x: 0,
            y: 0
          }, 3);
          if (target.hp <= 0) EZ.kill(target);
        }
      }
    } else {
      let threat = s.actors.find(o => !o.dead && o.kind === 'zombie' && EZ.distance(a, o) < 5);
      if (!threat && (a.kind === 'deer' || a.kind === 'rabbit')) threat = s.actors.find(o => (o
        .kind === 'wolf' || o.kind === 'fox') && EZ.distance(a, o) < 4);
      if (threat) {
        dx = a.x - threat.x;
        dy = a.y - threat.y;
        sp = 3.2;
      } else if (a.kind === 'wolf' || a.kind === 'fox') {
        const prey = s.actors.find(o => !o.dead && o.kind === (a.kind === 'wolf' ? 'deer' :
          'rabbit') && EZ.distance(a, o) < 7);
        if (prey) {
          dx = prey.x - a.x;
          dy = prey.y - a.y;
          sp = 2;
          if (EZ.distance(a, prey) < .65 && a.cooldown === 0) {
            a.cooldown = 1;
            prey.hp -= 35;
            a.hunger = 0;
            if (prey.hp <= 0) EZ.kill(prey);
          }
        }
      }
    }
    if (dx === 0 && dy === 0) {
      if (a.aiTimer <= 0) {
        a.aiTimer = 2 + Math.random() * 4;
        a.tx = a.x + (Math.random() - .5) * 6;
        a.ty = a.y + (Math.random() - .5) * 6;
      }
      dx = a.tx - a.x;
      dy = a.ty - a.y;
      sp = .6;
    }
    const len = Math.hypot(dx, dy);
    if (len > .15) {
      dx /= len;
      dy /= len;
    } else dx = dy = 0;
    EZ.moveActor(a, dx, dy, sp, dt);
  }
  EZ.separateActors(s.actors.filter(a => !a.dead));
  EZ.stepBullets(dt);
  EZ.stepRagdolls(dt);
  for (const q of s.particles) {
    q.life -= dt;
    q.vz -= 9.81 * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.z += q.vz * dt;
    if (q.z < 0) {
      q.life = 0;
      s.stains.push({
        x: q.x,
        y: q.y,
        z: 0,
        r: 2 + Math.random() * 3
      });
    }
  }
  s.particles = s.particles.filter(q => q.life > 0);
  if (s.stains.length > 350) s.stains.splice(0, s.stains.length - 350);
  s.actors = s.actors.filter(a => !a.dead || a === p);
  s.spawnTimer += dt;
  if (s.spawnTimer > 18) {
    s.spawnTimer = 0;
    if (s.actors.filter(a => a.kind === 'zombie').length < EZ.C.maxZombies) {
      const q = EZ.spawnSpot(p.x, p.y, 14, 19);
      if (q) s.actors.push(EZ.makeActor('zombie', q.x, q.y));
    }
  }
  s.ecosystemTimer += dt;
  if (s.ecosystemTimer >= 1) {
    EZ.ecosystem(s.ecosystemTimer);
    s.ecosystemTimer = 0;
  }
  for (const l of s.loot)
    if (EZ.distance(p, l) < .8) {
      if (l.kind === 'ammo') p.reserve += l.amount;
      else s.inventory.food += l.amount;
      l.taken = true;
      EZ.message('Recurso coletado');
    } s.loot = s.loot.filter(l => !l.taken);
  if (p.hp <= 0 && !p.dead) EZ.kill(p);
};
