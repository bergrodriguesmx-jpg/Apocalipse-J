'use strict';
EZ.ecosystem = function(dt) {
  const s = EZ.state,
    w = s.world,
    wet = s.weather === 'Chuva' || s.weather === 'Tempestade';
  for (const t of w.activeTiles) {
    t.moist = EZ.clamp(t.moist + (wet ? 1.6 : -.025) * dt, t.water ? 100 : 8, 100);
    t.grass = EZ.clamp(t.grass + dt * .07 * (t.moist / 60), 0, 100);
    if (t.crop) t.crop.progress = EZ.clamp(t.crop.progress + dt * (t.moist / 65) * (t.fertility / 70) * .55,
      0, 100);
  }
  for (const key of w.activeKeys) {
    const c = w.chunks.get(key);
    if (!c?.ready) continue;
    c.lastEco = s.elapsed;
    for (const o of [...c.objects]) {
      if (o.kind === 'bush') {
        o.regrow = (o.regrow || 0) + dt;
        if (o.regrow > 180) {
          o.regrow = 0;
          o.berries = true;
        }
      }
      if (o.kind === 'tree') {
        o.age += dt * .02;
        o.seedTime += dt;
        if (o.age > 260) {
          EZ.removeObject(o);
          continue;
        }
        if (o.seedTime > 150) {
          o.seedTime = 0;
          if (c.objects.filter(v => v.kind === 'tree').length < 24) {
            const q = EZ.spawnSpot(o.x, o.y, 1.5, 4),
              t = q && EZ.tile(q.x, q.y);
            if (t && t.moist > 30 && EZ.chunkKey(q.x, q.y) === key) c.objects.push({
              ...o,
              id: key + ':seed:' + s.elapsed,
              x: q.x,
              y: q.y,
              z: EZ.groundAt(q.x, q.y),
              age: 1,
              h: .45,
              hp: 1
            });
          }
        }
        o.h = EZ.clamp(.45 + o.age * .03, .45, 3.5);
      }
    }
  }
  const animals = s.actors.filter(a => !['player', 'zombie'].includes(a.kind) && !a.dead);
  for (const a of animals) {
    a.age += dt * .03;
    a.hunger = EZ.clamp(a.hunger + dt * .10, 0, 110);
    a.thirst = EZ.clamp(a.thirst + dt * .13, 0, 110);
    a.repro = Math.max(0, (a.repro || 0) - dt);
    const t = EZ.tile(a.x, a.y);
    if (t?.water) a.thirst = Math.max(0, a.thirst - 25 * dt);
    if ((a.kind === 'deer' || a.kind === 'rabbit') && t && !t.water && t.grass > 3) {
      a.hunger = Math.max(0, a.hunger - 1.8 * dt);
      t.grass = Math.max(0, t.grass - dt * .9);
    }
    if (a.hunger > 95 || a.thirst > 95 || a.age > 160) a.hp -= dt * 2;
    if (a.hp <= 0) {
      EZ.kill(a);
      continue;
    }
    if (s.actors.filter(v => !['player', 'zombie'].includes(v.kind) && !v.dead).length >= EZ.C.maxAnimals)
      continue;
    if (a.age > 20 && a.hunger < 35 && a.thirst < 50 && a.repro === 0 && Math.random() < dt * .025) {
      const partner = animals.find(b => b !== a && b.kind === a.kind && b.sex !== a.sex && b.age > 20 && b
        .repro === 0 && EZ.distance(a, b) < 3);
      if (partner) {
        const q = EZ.spawnSpot(a.x, a.y, 1, 2);
        if (q) {
          const child = EZ.makeActor(a.kind, q.x, q.y);
          child.age = 0;
          s.actors.push(child);
          a.repro = partner.repro = 150;
        }
      }
    }
  }
};
EZ.seekHabitat = function(a, type) {
  const w = EZ.state.world,
    cx = Math.floor(a.x / EZ.C.chunkSize),
    cy = Math.floor(a.y / EZ.C.chunkSize);
  let best = null,
    dist = Infinity;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const c = w.chunks.get((cx + i) + ',' + (cy + j));
      if (!c?.ready) continue;
      for (const t of c.tiles) {
        if (type === 'water' ? !t.water : (t.water || t.grass < 20)) continue;
        const d = (t.x + .5 - a.x) ** 2 + (t.y + .5 - a.y) ** 2;
        if (d < dist) {
          dist = d;
          best = {
            x: t.x + .5,
            y: t.y + .5
          };
        }
      }
    }
  return best;
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
  if (s.weatherTimer > 75) {
    s.weatherTimer = 0;
    s.weather = ['Sol', 'Nublado', 'Chuva', 'Tempestade'][Math.floor(Math.random() * 4)];
  }
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.attackTime = Math.max(0, p.attackTime - dt);
  if (p.reload > 0) {
    p.reload -= dt;
    if (p.reload <= 0 && p.weapon) {
      const need = EZ.weapons[p.weapon].mag - p.ammo[p.weapon],
        n = Math.min(need, p.reserve);
      p.ammo[p.weapon] += n;
      p.reserve -= n;
    }
  }
  const keys = s.input.keys,
    sx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ?
      1 : 0),
    sy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ?
      1 : 0);
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
  const run = !p.swimming && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && p.stamina > 1 && n > 0;
  EZ.moveActor(p, dx, dy, run ? 4 : 2.5, dt);
  p.running = run && !p.swimming && !p.wading;
  if (p.swimming) {
    p.stamina = EZ.clamp(p.stamina + (n > 0 ? -4 : 1) * dt, 0, 100);
    p.oxygen = EZ.clamp(p.oxygen + (p.stamina < 1 ? -10 : 5) * dt, 0, 100);
    if (p.oxygen <= 0) p.hp -= dt * 9;
  } else {
    p.stamina = EZ.clamp(p.stamina + (run ? -16 : 11) * dt, 0, 100);
    p.oxygen = Math.min(100, p.oxygen + 30 * dt);
  }
  p.hunger = EZ.clamp(p.hunger + dt * .075, 0, 100);
  p.thirst = EZ.clamp(p.thirst + dt * .11, 0, 100);
  if (p.hunger >= 100 || p.thirst >= 100) p.hp -= dt * 2;
  if (s.input.down && s.tool === 'shoot') EZ.fire();
  if (s.input.pressed) {
    s.input.pressed = false;
    if (s.tool !== 'shoot') EZ.useTool();
  }
  for (const a of s.actors) {
    if (a === p || a.dead) continue;
    a.cooldown = Math.max(0, a.cooldown - dt);
    a.aiTimer -= dt;
    let tx = a.tx,
      ty = a.ty,
      sp = .65;
    if (a.kind === 'zombie') {
      let target = p,
        dist = EZ.distance(a, p);
      for (const o of s.actors)
        if (o !== a && o.kind !== 'zombie' && !o.dead && EZ.distance(a, o) < dist) {
          target = o;
          dist = EZ.distance(a, o);
        }
      if (dist < (s.clock > 19 || s.clock < 6 ? 18 : 12)) {
        tx = target.x;
        ty = target.y;
        sp = 1.05;
        if (dist < .8 && Math.abs(a.z - target.z) < 1 && a.cooldown === 0) {
          a.cooldown = 1.3;
          target.hp -= a.missing.has('leftArm') && a.missing.has('rightArm') ? 4 : 9;
          EZ.burst({
            x: target.x,
            y: target.y,
            z: target.z + 1
          }, {
            x: 0,
            y: 0
          }, 3);
          if (target.hp <= 0) EZ.kill(target);
        }
      }
    } else {
      const herb = a.kind === 'deer' || a.kind === 'rabbit';
      let threat = s.actors.find(o => !o.dead && (o.kind === 'zombie' || (herb && (o.kind === 'wolf' || o
        .kind === 'fox'))) && EZ.distance(a, o) < 5);
      if (threat) {
        tx = a.x + (a.x - threat.x) * 3;
        ty = a.y + (a.y - threat.y) * 3;
        sp = 3;
      } else if (a.thirst > 55) {
        if (a.aiTimer <= 0) {
          const q = EZ.seekHabitat(a, 'water');
          if (q) {
            a.tx = q.x;
            a.ty = q.y;
          }
          a.aiTimer = 4;
        }
        tx = a.tx;
        ty = a.ty;
        sp = 1;
      } else if (!herb && a.hunger > 35) {
        const prey = s.actors.find(o => !o.dead && o.kind === (a.kind === 'wolf' ? 'deer' : 'rabbit') && EZ
          .distance(a, o) < 10);
        if (prey) {
          tx = prey.x;
          ty = prey.y;
          sp = 2.3;
          if (EZ.distance(a, prey) < .65 && a.cooldown === 0) {
            a.cooldown = 1;
            prey.hp -= 35;
            if (prey.hp <= 0) {
              EZ.kill(prey);
              a.hunger = Math.max(0, a.hunger - 65);
            }
          }
        }
      } else if (herb && a.hunger > 55 && a.aiTimer <= 0) {
        const q = EZ.seekHabitat(a, 'grass');
        if (q) {
          a.tx = tx = q.x;
          a.ty = ty = q.y;
        }
        a.aiTimer = 5;
      }
    }
    if (a.aiTimer <= 0 && tx === a.tx && ty === a.ty) {
      a.aiTimer = 3 + Math.random() * 4;
      a.tx = tx = a.x + (Math.random() - .5) * 8;
      a.ty = ty = a.y + (Math.random() - .5) * 8;
    }
    let vx = tx - a.x,
      vy = ty - a.y,
      len = Math.hypot(vx, vy);
    if (len > .18) {
      vx /= len;
      vy /= len;
    } else vx = vy = 0;
    // Desvio local: evita tentar atravessar continuamente troncos e paredes.
    const obstacle = EZ.objectsNear(a.x + vx * .7, a.y + vy * .7, 1).find(o => o.kind !== 'bush' && EZ
      .distance(o, {
        x: a.x + vx * .7,
        y: a.y + vy * .7
      }) < (o.hw ? 1.6 : o.r + .35));
    if (obstacle) {
      const old = vx;
      vx = -vy;
      vy = old;
    }
    EZ.moveActor(a, vx, vy, sp, dt);
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
    const ground = EZ.surfaceAt(q.x, q.y);
    if (q.z < ground) {
      q.life = 0;
      if (ground > 0) s.stains.push({
        x: q.x,
        y: q.y,
        z: ground + .01,
        r: 2 + Math.random() * 3
      });
    }
  }
  s.particles = s.particles.filter(q => q.life > 0);
  if (s.stains.length > 250) s.stains.splice(0, s.stains.length - 250);
  s.stains = s.stains.filter(a => EZ.distance(a, p) < 65);
  s.actors = s.actors.filter(a => !a.dead || a === p);
  s.ecosystemTimer += dt;
  if (s.ecosystemTimer >= 1) {
    EZ.ecosystem(s.ecosystemTimer);
    s.ecosystemTimer = 0;
  }
  for (const l of s.loot)
    if (EZ.distance(p, l) < .8) {
      if (l.kind === 'ammo') p.reserve += l.amount;
      else if (EZ.weapons[l.kind]) {
        p.owned.add(l.kind);
        p.weapon = l.kind;
        s.tool = 'shoot';
        EZ.message('Encontrou ' + EZ.weapons[l.kind].name + '! Recarregue com R.');
      } else {
        s.inventory.food += l.amount;
      }
      l.taken = true;
    }
  s.loot = s.loot.filter(l => !l.taken);
  EZ.updateSurvivorAnimation(p, dt);
  if (p.hp <= 0 && !p.dead) EZ.kill(p);
};
