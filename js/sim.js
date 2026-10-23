/* ============================================================
   Loop de simulação ecológica + física (tick)
   ============================================================ */

function simulate(dt){
  const dtSec = dt*SIM_DT/1000;

  if(Math.random()<0.01*dt){ wind.targetAngle=Math.random()*Math.PI*2; wind.targetSpeed=0.1+Math.random()*0.7; }
  wind.angle=lerp(wind.angle, wind.targetAngle, 0.02*dt);
  wind.speed=clamp(lerp(wind.speed, wind.targetSpeed+Math.sin(performance.now()*0.001)*0.15, 0.05*dt), 0.05, 0.95);

  timeOfDay=(timeOfDay+0.012*dt)%24;
  if(timeOfDay<0.012){ dayCount++; yearDay=(yearDay+1)%360; }
  const season=Math.floor(yearDay/90);
  weatherTimer+=0.008*dt;
  if(weatherTimer>1){
    weatherTimer=0; const r=Math.random();
    const wb = season===3?0.35:0;
    if(r<0.45-wb) weather='sunny'; else if(r<0.7) weather='cloudy';
    else if(season===3 && r<0.9) weather='snow'; else if(r<0.9) weather='rain'; else weather='storm';
  }
  const seasonBase=[17,26,15,4][season];
  const diurnal=Math.sin((timeOfDay-9)/24*Math.PI*2)*5;
  const weatherMod=weather==='sunny'?3:weather==='storm'?-4:weather==='snow'?-6:-1;
  temperature=Math.round(seasonBase+diurnal+weatherMod);
  const isRaining=weather==='rain'||weather==='storm', isSnowing=weather==='snow';

  let mSum=0, mCount=0, bioSum=0;
  const evap=(timeOfDay>6&&timeOfDay<19?0.06:0.015)*(0.6+wind.speed)*(temperature>20?1.4:0.8);
  for(const c of chunks.values()){
    for(const t of c.tiles){
      if(t.water===2){ t.moist=100; continue; }
      if(isRaining) t.moist=clamp(t.moist+(weather==='storm'?1.4:0.7)*dt,0,100);
      else if(isSnowing) t.moist=clamp(t.moist+0.15*dt,0,100);
      else t.moist=clamp(t.moist-evap*dt,2,100);
      if(isSnowing&&temperature<2) t.snow=clamp(t.snow+0.4*dt,0,100);
      else if(temperature>3) t.snow=clamp(t.snow-0.5*dt,0,100);
      if(t.humus>0){ t.fertility=clamp(t.fertility+0.02*dt,0,100); t.humus=Math.max(0,t.humus-0.01*dt); }
      if(t.crop){
        const day=timeOfDay>6&&timeOfDay<19;
        const gf=(t.moisture/50)*(t.fertility/50)*(day?1.4:0.4)*(season!==3?1:0.1)*0.06*dt;
        t.crop.progress+=gf;
        if(t.crop.progress>=100&&t.crop.stage<3){ t.crop.stage++; t.crop.progress=0; }
      }
      mSum+=t.moist; mCount++;
    }
    for(let i=c.trees.length-1;i>=0;i--){
      const tr=c.trees[i];
      const tile=tileAt(Math.floor(tr.x),Math.floor(tr.y));
      if(!tile) continue;
      const cfg={pine:{e:[0.45,0.9],m:[15,60]},oak:{e:[0.25,0.6],m:[35,80]},birch:{e:[0.2,0.55],m:[45,85]},willow:{e:[0.15,0.5],m:[60,100]}}[tr.species];
      const stress=(tile.e>=cfg.e[0]&&tile.e<=cfg.e[1]?0:0.4)+(tile.moist>=cfg.m[0]&&tile.moist<=cfg.m[1]?0:0.5)+(temperature>-5&&temperature<38?0:0.3);
      if(!tr.dead){
        tr.age+=0.03*dt;
        if(stress>0) tr.health=clamp(tr.health-stress*0.12*dt,0,100); else tr.health=clamp(tr.health+0.05*dt,0,100);
        if(tr.health<=0||tr.age>(tr.species==='pine'?140:110)){ tr.dead=true; tr.phase=0; }
        tr.seedCooldown-=dt;
        if(treeStage(tr)>=2&&tr.seedCooldown<=0&&particles.length<120){
          tr.seedCooldown=15+Math.random()*25;
          const a=wind.angle+(Math.random()-0.5)*1.2, spd=0.3+wind.speed*0.8;
          particles.push({kind:'seed',x:tr.x,y:tr.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:40+Math.random()*40,species:tr.species});
        }
      } else { tr.phase+=dt; if(tr.phase>60){ if(tile) tile.humus+=20; c.trees.splice(i,1); continue; } }
      bioSum+=treeHeight(tr)*0.4;
    }
  }
  ecoStats.moisture=mCount?Math.round(mSum/mCount):0; ecoStats.biomass=Math.round(bioSum/100);

  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; if(p.kind!=='seed') continue;
    p.x+=p.vx*dt*0.5; p.y+=p.vy*dt*0.5; p.life-=dt;
    if(p.life<=0){
      const t=tileAt(Math.floor(p.x),Math.floor(p.y));
      if(t&&t.water===0&&!isFieldTile(Math.floor(p.x),Math.floor(p.y))){
        const cc=chunks.get(chunkKey(Math.floor(p.x/CS),Math.floor(p.y/CS)));
        let crowded=false;
        if(cc){ for(const tr of cc.trees){ if(dist2(tr.x,tr.y,p.x,p.y)<1.2){crowded=true;break;} } }
        if(!crowded&&cc&&cc.trees.length<MAX_TREES_PER_CHUNK) cc.trees.push(makeTree(p.x,p.y,p.species,0));
      }
      particles.splice(i,1);
    }
  }

  // ---- ANIMAIS ----
  let herb=0, pred=0;
  for(let i=animals.length-1;i>=0;i--){
    const a=animals[i]; const cfg=SPECIES_CFG[a.species];
    a.age+=0.02*dt; a.hunger=clamp(a.hunger+0.06*dt,0,100); a.thirst=clamp(a.thirst+0.09*dt,0,100);
    if(a.hunger>95||a.thirst>95||a.age>cfg.maxAge) a.hp=clamp(a.hp-0.3*dt,0,100);
    if(a.hp<=0){
      spawnDismemberment(a.x, a.y, a.vx*0.5, a.vy*0.5, false);
      spawnCorpse(a.x,a.y,a.vx,a.vy,'animal',a.species);
      animals.splice(i,1); continue;
    }
    let ax=0, ay=0, maxV=ANIMAL_MAX_V[a.species];
    let threat=null, bdT=36;
    for(const z of zombies){ const dd=dist2(z.x,z.y,a.x,a.y); if(dd<bdT){bdT=dd;threat=z;} }
    if(!threat && cfg.herbivore) for(const o of animals){ if(SPECIES_CFG[o.species].hunts===a.species){ const dd=dist2(o.x,o.y,a.x,a.y); if(dd<bdT){bdT=dd;threat=o;} } }
    if(threat){
      const fa=Math.atan2(a.y-threat.y, a.x-threat.x);
      a.tx=a.x+Math.cos(fa)*5; a.ty=a.y+Math.sin(fa)*5;
      maxV*=1.8;
    } else if(a.thirst>65){
      let best=null, bd=1e9;
      for(const c of chunks.values()) for(const t of c.tiles) if(t.water>0){ const dd=dist2(t.x,t.y,a.x,a.y); if(dd<bd){bd=dd;best=t;} }
      if(best&&bd<400){ a.tx=best.x; a.ty=best.y; } else { a.tx=a.x+(Math.random()-0.5)*8; a.ty=a.y+(Math.random()-0.5)*8; }
      const tile=tileAt(Math.floor(a.x),Math.floor(a.y));
      if(tile&&tile.water>0) a.thirst=Math.max(0,a.thirst-40);
    } else if(cfg.herbivore && a.hunger>55){
      const tile=tileAt(Math.floor(a.x),Math.floor(a.y));
      if(tile&&(tile.biome==='meadow'||tile.biome==='grass'||tile.biome==='drygrass'||tile.biome==='overgrown')&&tile.moist>25){
        a.hunger=Math.max(0,a.hunger-(a.species==='deer'?22:14)); tile.humus+=4; tile.moist=clamp(tile.moist-2,0,100);
        a.tx=a.x; a.ty=a.y;
      } else { a.tx=a.x+(Math.random()-0.5)*6; a.ty=a.y+(Math.random()-0.5)*6; }
    } else if(!cfg.herbivore && a.hunger>50){
      let prey=null, bd=1e9;
      for(const o of animals) if(o.species===cfg.hunts){ const dd=dist2(o.x,o.y,a.x,a.y); if(dd<bd){bd=dd;prey=o;} }
      if(prey&&bd<225){ a.tx=prey.x; a.ty=prey.y; if(bd<0.5){ a.hunger=Math.max(0,a.hunger-55); prey.hp=0; } }
      else { a.tx=a.x+(Math.random()-0.5)*8; a.ty=a.y+(Math.random()-0.5)*8; }
    } else {
      a.timer-=dt;
      if(a.timer<=0){ a.timer=8+Math.random()*10; a.tx=a.x+(Math.random()-0.5)*8; a.ty=a.y+(Math.random()-0.5)*8; }
    }
    const ddx=a.tx-a.x, ddy=a.ty-a.y, dd=Math.hypot(ddx,ddy);
    if(dd>0.2){ ax=ddx/dd*PLAYER_ACCEL*0.7; ay=ddy/dd*PLAYER_ACCEL*0.7; }
    stepBody(a, ax, ay, maxV, dtSec);
    if(cfg.herbivore) herb++; else pred++;
    if(a.age>15&&a.hunger<40&&a.thirst<40&&animals.length<MAX_ANIMALS&&Math.random()<cfg.reproRate*dt){
      for(const o of animals) if(o.species===a.species&&o!==a&&o.sex!==a.sex&&o.age>15&&dist2(o.x,o.y,a.x,a.y)<4){ animals.push(makeAnimal(a.x,a.y,a.species)); break; }
    }
  }
  separateBodies(animals);
  ecoStats.herbivores=herb; ecoStats.predators=pred;

  // ---- ZUMBIS ----
  zombieSpawnTimer += dt;
  if(zombies.length<MAX_ZOMBIES && zombieSpawnTimer>40){
    zombieSpawnTimer=0;
    const a=Math.random()*Math.PI*2, d=18+Math.random()*8;
    zombies.push(makeZombie(player.x+Math.cos(a)*d, player.y+Math.sin(a)*d));
  }
  for(let i=zombies.length-1;i>=0;i--){
    const z=zombies[i];
    if(z.hp<=0){
      spawnDismemberment(z.x, z.y, z.vx*0.5, z.vy*0.5, true);
      spawnCorpse(z.x,z.y,z.vx,z.vy,'zombie');
      zombies.splice(i,1); continue;
    }
    let target=player, bdT=dist2(player.x,player.y,z.x,z.y);
    for(const a of animals){ const dd=dist2(a.x,a.y,z.x,z.y); if(dd<bdT){bdT=dd;target=a;} }
    let ax=0, ay=0;
    if(bdT<144){
      const ddx=target.x-z.x, ddy=target.y-z.y, dd=Math.hypot(ddx,ddy);
      z.limp += 0.1*dt;
      const perpX=-ddy/(dd||1), perpY=ddx/(dd||1);
      const wobble=Math.sin(z.limp)*0.5;
      ax=(ddx/(dd||1)+perpX*wobble)*ZOMBIE_ACCEL;
      ay=(ddy/(dd||1)+perpY*wobble)*ZOMBIE_ACCEL;
      z.attackCd-=dt;
      if(dd<z.radius+target.radius+0.1 && z.attackCd<=0){
        z.attackCd=12;
        const dmg = target===player ? 8 : 40;
        target.hp = Math.max(0, target.hp - dmg);
        const kb=3.5/target.mass;
        target.vx += ddx/(dd||1)*kb; target.vy += ddy/(dd||1)*kb;
        for(let k=0;k<6;k++){ const aa=Math.random()*Math.PI*2, sp=1+Math.random()*2; particles.push({kind:'blood',x:target.x,y:target.y,vx:Math.cos(aa)*sp,vy:Math.sin(aa)*sp,life:25+Math.random()*15}); }
        if(target===player){ hitFlashTimer=0.25; snd(180,'sawtooth',.2,.3); }
      }
    } else {
      if(Math.random()<0.02*dt){ z.tx=z.x+(Math.random()-0.5)*10; z.ty=z.y+(Math.random()-0.5)*10; }
      if(z.tx!==undefined){ const ddx=z.tx-z.x, ddy=z.ty-z.y, dd=Math.hypot(ddx,ddy); if(dd>0.2){ ax=ddx/dd*ZOMBIE_ACCEL*0.5; ay=ddy/dd*ZOMBIE_ACCEL*0.5; } }
    }
    stepBody(z, ax, ay, ZOMBIE_MAX_V, dtSec);
  }
  separateBodies(zombies);
  separateBodies(zombies.concat(animals));
  ecoStats.zombies = zombies.length;

  // PROJÉTEIS
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    const sp = Math.hypot(pr.vx, pr.vy);
    const travel = sp * dtSec;
    const sub = Math.max(1, Math.ceil(travel / 0.15));
    const stepX = pr.vx * dtSec / sub;
    const stepY = pr.vy * dtSec / sub;
    let hit = false;

    for (let s = 0; s < sub && !hit; s++) {
      pr.x += stepX;
      pr.y += stepY;

      for (let j = zombies.length - 1; j >= 0; j--) {
        const z = zombies[j];
        const rSum = z.radius + 0.18;
        if (dist2(z.x, z.y, pr.x, pr.y) < rSum * rSum) {
          z.hp -= pr.damage;
          const ka = Math.atan2(pr.vy, pr.vx);
          const kb = 4 / z.mass;
          z.vx += Math.cos(ka) * kb;
          z.vy += Math.sin(ka) * kb;
          for (let k = 0; k < 10; k++) {
            const aa = ka + (Math.random() - 0.5) * 1.2;
            const sp2 = 2 + Math.random() * 4;
            particles.push({kind:'blood', x:z.x, y:z.y, vx:Math.cos(aa)*sp2, vy:Math.sin(aa)*sp2, life:30+Math.random()*20});
          }
          if (z.hp <= 0) {
            spawnDismemberment(z.x, z.y, pr.vx * 0.35, pr.vy * 0.35, true);
            spawnCorpse(z.x, z.y, z.vx, z.vy, 'zombie');
            zombies.splice(j, 1);
          }
          hit = true;
          break;
        }
      }

      if (!hit) {
        const cc = chunks.get(chunkKey(Math.floor(pr.x / CS), Math.floor(pr.y / CS)));
        if (cc) {
          for (const tr of cc.trees) {
            if (tr.dead) continue;
            if (dist2(tr.x, tr.y, pr.x, pr.y) < 0.09) { hit = true; break; }
          }
        }
      }
    }

    pr.trail.push({ x: pr.x, y: pr.y });
    if (pr.trail.length > 6) pr.trail.shift();

    pr.life -= dtSec;
    if (hit || pr.life <= 0) projectiles.splice(i, 1);
  }

  // MEMBROS DESMEMBRADOS
  for (let i = bodyParts.length - 1; i >= 0; i--) {
    const p = bodyParts[i];
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.z += p.vz * dtSec;
    p.vz -= 14 * dtSec;
    if (p.z <= 0) {
      p.z = 0;
      p.vz *= -0.25;
      p.vx *= 0.55; p.vy *= 0.55;
      p.vr *= 0.55;
    }
    p.vx *= Math.exp(-1.6 * dtSec);
    p.vy *= Math.exp(-1.6 * dtSec);
    p.angle += p.vr * dtSec;
    p.vr *= Math.exp(-1.2 * dtSec);
    p.life -= dt;
    if (p.life <= 0) bodyParts.splice(i, 1);
  }

  // CORPOS
  for(let i=corpses.length-1;i>=0;i--){
    const c=corpses[i];
    c.x+=c.vx*dtSec; c.y+=c.vy*dtSec;
    c.vx*=Math.exp(-3*dtSec); c.vy*=Math.exp(-3*dtSec);
    c.angle+=c.vr*dtSec; c.vr*=Math.exp(-2*dtSec);
    c.life-=dt;
    resolveCollisions({x:c.x,y:c.y,vx:c.vx,vy:c.vy,radius:0.3,mass:1});
    if(c.life<=0) corpses.splice(i,1);
  }

  // CLIMA VISUAL
  const seasonNow=Math.floor(yearDay/90);
  if(isRaining||isSnowing){
    const n=isSnowing?2:(weather==='storm'?5:3);
    for(let i=0;i<n;i++) if(particles.length<260) particles.push({kind:isSnowing?'snow':'rain', sx:Math.random()*canvas.width, sy:Math.random()*canvas.height, v:isSnowing?(0.6+Math.random()*0.8):(6+Math.random()*4), drift:Math.cos(wind.angle)*wind.speed*3, life:300});
  }
  if(seasonNow===2&&Math.random()<0.3*dt&&particles.length<260) particles.push({kind:'leaf',sx:Math.random()*canvas.width,sy:-10,v:0.5+Math.random(),drift:Math.cos(wind.angle)*wind.speed*2,life:400,hue:Math.random()*40});
  if(seasonNow===0&&Math.random()<0.15*dt&&particles.length<260) particles.push({kind:'pollen',sx:Math.random()*canvas.width,sy:Math.random()*canvas.height,v:0.2,drift:Math.cos(wind.angle)*wind.speed*1.5,life:200});
  for(const f of campfires) if(Math.random()<0.4*dt&&particles.length<260){ const iso=gridToIso(f.x+0.5,f.y+0.5); particles.push({kind:'ember',wx:f.x+0.5,wy:f.y+0.5,vx:(Math.random()-0.5)*0.5,vy:-1-Math.random(),life:30+Math.random()*20}); }
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; if(p.kind!=='blood') continue;
    p.x+=p.vx*dtSec*2; p.y+=p.vy*dtSec*2; p.vx*=0.9; p.vy*=0.9; p.life-=dt;
    if(p.life<=0){ const t=tileAt(Math.floor(p.x),Math.floor(p.y)); if(t) t.humus+=0.5; particles.splice(i,1); }
  }
}
