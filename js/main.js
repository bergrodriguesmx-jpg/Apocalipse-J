/* ============================================================
   Init, reset e loop principal (ÚLTIMO script carregado)
   ============================================================ */

function resetWorld(newSeed){
  if(newSeed) worldSeed = Math.floor(Math.random()*1e9);
  simplex = new SimplexNoise(String(worldSeed));
  chunks.clear(); animals=[]; zombies=[]; corpses=[]; particles=[]; campfires=[];
  bodyParts=[]; projectiles=[];
  timeOfDay=8.0; dayCount=1; yearDay=30; weather='sunny'; weatherTimer=0; zombieSpawnTimer=0;
  let px=0, py=0;
  for(let i=0;i<60;i++){
    const tx=Math.round((Math.random()-0.5)*40), ty=Math.round((Math.random()-0.5)*40);
    const e=elevation(tx,ty), r=Math.abs(riverField(tx,ty));
    if(r>0.08 && e<0.6 && e>0.25){ px=tx; py=ty; break; }
  }
  player = makeBody(px, py, 0.28, 1.0);
  player.hp=100; player.hunger=20; player.thirst=15; player.stamina=100; player.tx=px; player.ty=py;
  player.shootCd = 0;
  inventory={wood:15,stone:8,food:6,seeds:12};
  spawnInitialFauna(px, py);
  campfires.push({x:px+1, y:py+1});
  const iso=gridToIso(px,py);
  camX=canvas.width/2-iso.x; camY=canvas.height/2-iso.y-60; camOffsetX=0; camOffsetY=0;
}

let rafId=null;
function loop(now){
  const dtMs=Math.min(100, now-lastFrame);
  lastFrame=now;
  if(gameState==='playing'){
    simAccum += dtMs*speed;
    let ticks=0;
    while(simAccum>=SIM_DT && ticks<8){ simulate(1); simAccum-=SIM_DT; ticks++; }
    if(ticks>=8) simAccum=0;
    ensureChunks();
    const dtSec=dtMs/1000;
    let ax=0, ay=0;
    if(keys['KeyW']||keys['ArrowUp']) ay-=1;
    if(keys['KeyS']||keys['ArrowDown']) ay+=1;
    if(keys['KeyA']||keys['ArrowLeft']) ax-=1;
    if(keys['KeyD']||keys['ArrowRight']) ax+=1;
    if(ax||ay){ const l=Math.hypot(ax,ay); ax/=l; ay/=l; ax*=PLAYER_ACCEL; ay*=PLAYER_ACCEL; player.tx=player.x; player.ty=player.y; }
    else {
      const ddx=player.tx-player.x, ddy=player.ty-player.y, dd=Math.hypot(ddx,ddy);
      if(dd>0.2){ ax=ddx/dd*PLAYER_ACCEL*0.8; ay=ddy/dd*PLAYER_ACCEL*0.8; }
    }
    stepBody(player, ax, ay, PLAYER_MAX_V, dtSec);
    if (player.shootCd > 0) player.shootCd -= dtSec;
    player.hunger=clamp(player.hunger+0.004*dtMs*speed,0,100);
    player.thirst=clamp(player.thirst+0.006*dtMs*speed,0,100);
    if(player.hunger>=90||player.thirst>=90) player.hp=clamp(player.hp-0.02*dtMs*speed,0,100);
    player.stamina=clamp(player.stamina+0.1*dtMs,0,100);
    separateBodies([player].concat(animals).concat(zombies));
    const iso=gridToIso(player.x,player.y);
    camX=lerp(camX, canvas.width/2-iso.x*zoom, 0.06);
    camY=lerp(camY, canvas.height/2-iso.y*zoom-40*zoom, 0.06);
  }
  render(now);
  rafId=requestAnimationFrame(loop);
}

function init(){
  canvas=document.getElementById('gameCanvas');
  ctx=canvas.getContext('2d');
  function resize(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  bindInput();
  document.getElementById('startBtn').addEventListener('click', ()=>{
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('hudTop').classList.remove('hidden');
    document.getElementById('ecoPanel').classList.remove('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    resetWorld(false); ensureChunks();
    gameState='playing'; lastFrame=performance.now();
    rafId=requestAnimationFrame(loop);
  });
  resetWorld(false); ensureChunks(); render(performance.now());
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();
