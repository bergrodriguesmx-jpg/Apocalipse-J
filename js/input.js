function mouseToGrid(e){
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  return isoToGrid((mx-camX-camOffsetX)/zoom, (my-camY-camOffsetY)/zoom);
}
function findEntityAt(gx, gy){
  for(const c of chunks.values()){
    for(const tr of c.trees) if(Math.floor(tr.x)===gx&&Math.floor(tr.y)===gy) return {type:'tree',obj:tr,chunk:c};
    for(const r of c.rocks) if(Math.floor(r.x)===gx&&Math.floor(r.y)===gy) return {type:'rock',obj:r,chunk:c};
    for(const b of c.bushes) if(!b.hay&&Math.floor(b.x)===gx&&Math.floor(b.y)===gy) return {type:'bush',obj:b,chunk:c};
  }
  return null;
}
function findZombieNear(gx, gy, range){
  for(const z of zombies) if(dist2(z.x,z.y,gx+0.5,gy+0.5) < range*range) return z;
  return null;
}

function bindInput(){
  window.addEventListener('keydown', e=>{ keys[e.code]=true; });
  window.addEventListener('keyup', e=>{ keys[e.code]=false; });
  
  canvas.addEventListener('mousedown', e=>{
    if(!audioCtx) try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(_){}
    if(e.button===0){ isDragging=true; dragMoved=false; dragStart={x:e.clientX,y:e.clientY,ox:camOffsetX,oy:camOffsetY}; }
  });
  
  window.addEventListener('mousemove', e=>{
    if(isDragging){
      const dx=e.clientX-dragStart.x, dy=e.clientY-dragStart.y;
      if(Math.abs(dx)+Math.abs(dy)>4) dragMoved=true;
      camOffsetX=dragStart.ox+dx; camOffsetY=dragStart.oy+dy;
    }
    const g=mouseToGrid(e);
    const t=tileAt(Math.floor(g.x),Math.floor(g.y));
    if(t){ hoveredTile=t; updateTooltip(e.clientX,e.clientY); }
    else { hoveredTile=null; hideTooltip(); }
  });
  
  window.addEventListener('mouseup', ()=>{ isDragging=false; });

  canvas.addEventListener('click', e=>{
    if(dragMoved) return;
    const g=mouseToGrid(e);
    const gx=Math.floor(g.x), gy=Math.floor(g.y);
    const tile=tileAt(gx,gy);

    // PEGAR ITEM DO CHÃO
    let pickedLoot = null;
    for (let i = lootDrops.length - 1; i >= 0; i--) {
      const l = lootDrops[i];
      if (Math.hypot(l.x - (gx+0.5), l.y - (gy+0.5)) < 1.2) {
        pickedLoot = l;
        lootDrops.splice(i, 1);
        break;
      }
    }
    
    if (pickedLoot) {
      if (pickedLoot.type.includes('ammo')) {
        player.ammo += pickedLoot.amount;
        snd(400, 'sine', 0.1, 0.15);
      } else {
        player.equippedWeapon = pickedLoot.type;
        player.ammo = pickedLoot.amount * 10;
        snd(300, 'triangle', 0.15, 0.2);
      }
      return;
    }

    // ATIRAR
    if (player.equippedWeapon && (activeTool === 'inspect' || activeTool === 'interact')) {
      fireWeapon(gx, gy);
      return;
    }

    // AÇÕES DAS FERRAMENTAS
    if(!tile && activeTool !== 'inspect') return; 
    const ent=findEntityAt(gx,gy);

    switch(activeTool){
      case 'inspect':
      case 'interact': 
        if(player){ player.tx=gx+0.5; player.ty=gy+0.5; } 
        break;
      case 'chop': {
        const z=findZombieNear(gx,gy,1.5);
        if(z){
          z.hp=Math.max(0,z.hp-55);
          const ka=Math.atan2(z.y-player.y, z.x-player.x);
          z.vx+=Math.cos(ka)*5; z.vy+=Math.sin(ka)*5;
          for(let k=0;k<8;k++){ const aa=Math.random()*Math.PI*2, sp=1+Math.random()*3; particles.push({kind:'blood',x:z.x,y:z.y,vx:Math.cos(aa)*sp,vy:Math.sin(aa)*sp,life:25+Math.random()*20}); }
          snd(120,'sawtooth',.12,.25); setTimeout(()=>snd(60,'triangle',.15,.18),50);
        } else if(ent&&ent.type==='tree'){
          inventory.wood+=ent.obj.species==='pine'?6:4; if(tile) tile.humus+=8;
          ent.chunk.trees=ent.chunk.trees.filter(x=>x!==ent.obj);
          snd(120,'sawtooth',.12,.25); setTimeout(()=>snd(60,'triangle',.15,.18),50);
        }
        break; }
      case 'mine':
        if(ent&&ent.type==='rock'){ inventory.stone+=4; ent.chunk.rocks=ent.chunk.rocks.filter(x=>x!==ent.obj); snd(520,'square',.06,.15); setTimeout(()=>snd(180,'sine',.08,.1),30); }
        break;
      case 'forage':
        if(ent&&ent.type==='bush'&&ent.obj.berries){ inventory.food+=2; ent.obj.berries=false; snd(300,'sine',.1,.1); }
        else if(tile&&(tile.biome==='meadow'||tile.biome==='overgrown')){ if(Math.random()<0.5){ inventory.seeds+=1; snd(400,'sine',.08,.08);} }
        break;
      case 'plant':
        if(inventory.seeds>0&&tile&&tile.water===0&&!tile.crop){ inventory.seeds--; tile.biome='field'; tile.crop={stage:0,progress:0}; snd(400,'sine',.15,.12); }
        break;
      case 'plantTree':
        if(tile&&tile.water===0&&!isFieldTile(gx,gy)){
          const sp=tile.e>0.55?'pine':(tile.moist>70?'willow':'oak');
          const cc=chunks.get(chunkKey(Math.floor(gx/CS),Math.floor(gy/CS)));
          if(cc&&cc.trees.length<MAX_TREES_PER_CHUNK){ cc.trees.push(makeTree(gx+0.5,gy+0.5,sp,0)); snd(500,'sine',.15,.1); }
        }
        break;
      case 'water': if(tile) tile.moist=clamp(tile.moist+45,0,100); snd(400,'sine',.2,.12); break;
      case 'campfire':
        if(inventory.wood>=5&&inventory.stone>=3){ inventory.wood-=5; inventory.stone-=3; campfires.push({x:gx,y:gy}); snd(200,'triangle',.2,.2); }
        break;
      case 'eat':
        if(inventory.food>0){ inventory.food--; player.hunger=Math.max(0,player.hunger-30); snd(280,'sine',.08,.12); setTimeout(()=>snd(340,'sine',.08,.12),90); }
        break;
      case 'spawn_deer': animals.push(makeAnimal(gx,gy,'deer')); break;
      case 'spawn_rabbit': animals.push(makeAnimal(gx,gy,'rabbit')); break;
      case 'spawn_fox': animals.push(makeAnimal(gx,gy,'fox')); break;
      case 'spawn_wolf': animals.push(makeAnimal(gx,gy,'wolf')); break;
      case 'spawn_zombie': zombies.push(makeZombie(gx,gy)); break;
    }
  });
  
  canvas.addEventListener('wheel', e=>{ e.preventDefault(); zoom=clamp(zoom*(e.deltaY<0?1.08:0.92), MIN_ZOOM, MAX_ZOOM); }, {passive:false});
  
  document.querySelectorAll('.tool-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); activeTool=btn.dataset.tool;
    });
  });
  
  document.getElementById('btnPause').addEventListener('click', ()=>{
    gameState=gameState==='playing'?'paused':'playing';
    document.getElementById('btnPause').classList.toggle('active',gameState==='paused');
    document.getElementById('btnPause').innerHTML=gameState==='paused'?'<i class="fa-solid fa-play" style="color:#34d399"></i>':'<i class="fa-solid fa-pause" style="color:#fbbf24"></i>';
  });
  
  const setSpeed=id=>{ ['btnSpeed1','btnSpeed2','btnSpeed5'].forEach(b=>document.getElementById(b).classList.remove('active')); document.getElementById(id).classList.add('active'); };
  document.getElementById('btnSpeed1').addEventListener('click', ()=>{speed=1;setSpeed('btnSpeed1');});
  document.getElementById('btnSpeed2').addEventListener('click', ()=>{speed=2;setSpeed('btnSpeed2');});
  document.getElementById('btnSpeed5').addEventListener('click', ()=>{speed=5;setSpeed('btnSpeed5');});
  document.getElementById('btnRegen').addEventListener('click', ()=>resetWorld(true));
  
  document.getElementById('btnAudio').addEventListener('click', ()=>{
    muted=!muted;
    document.getElementById('btnAudio').classList.toggle('text-red-400',muted);
    document.getElementById('btnAudio').innerHTML=muted?'<i class="fa-solid fa-volume-xmark"></i>':'<i class="fa-solid fa-volume-high"></i>';
  });
}
