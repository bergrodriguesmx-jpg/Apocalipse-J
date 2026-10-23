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
  window.addEventListener('keydown', e=>{ 
    keys[e.code]=true; 
    // --- NOVO: Troca de Armas ---
    if(e.code === 'Digit1') player.equippedWeapon = 'pistol';
    if(e.code === 'Digit2') player.equippedWeapon = 'rifle';
    if(e.code === 'Digit3') player.equippedWeapon = 'shotgun';
  });
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
    
    // Pega a posição EXATA do mouse no mundo (não apenas o grid)
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = (mx - camX - camOffsetX) / zoom;
    const worldY = (my - camY - camOffsetY) / zoom;
    
    const g = isoToGrid(worldX, worldY);
    const gx = Math.floor(g.x), gy = Math.floor(g.y);
    const tile = tileAt(gx,gy);

    // Atirar
    if (player.equippedWeapon && (activeTool === 'inspect' || activeTool === 'interact')) {
      fireWeapon(worldX, worldY); // Passa a posição exata em pixels
      return;
    }

    // Ações das Ferramentas
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
          snd(120,'sawtooth',.12,.25);
        } else if(ent&&ent.type==='tree'){
          inventory.wood+=ent.obj.species==='pine'?6:4; if(tile) tile.humus+=8;
          ent.chunk.trees=ent.chunk.trees.filter(x=>x!==ent.obj);
          snd(120,'sawtooth',.12,.25);
        }
        break; }
      case 'mine':
        if(ent&&ent.type==='rock'){ inventory.stone+=4; ent.chunk.rocks=ent.chunk.rocks.filter(x=>x!==ent.obj); snd(520,'square',.06,.15); }
        break;
      case 'forage':
        if(ent&&ent.type==='bush'&&ent.obj.berries){ inventory.food+=2; ent.obj.berries=false; snd(300,'sine',.1,.1); }
        break;
      case 'campfire':
        if(inventory.wood>=5&&inventory.stone>=3){ inventory.wood-=5; inventory.stone-=3; campfires.push({x:gx,y:gy}); snd(200,'triangle',.2,.2); }
        break;
      case 'eat':
        if(inventory.food>0){ inventory.food--; player.hunger=Math.max(0,player.hunger-30); snd(280,'sine',.08,.12); }
        break;
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
  });
  
  document.getElementById('btnRegen').addEventListener('click', ()=>resetWorld(true));
  
  document.getElementById('btnAudio').addEventListener('click', ()=>{
    muted=!muted;
    document.getElementById('btnAudio').classList.toggle('text-red-400',muted);
    document.getElementById('btnAudio').innerHTML=muted?'<i class="fa-solid fa-volume-xmark"></i>':'<i class="fa-solid fa-volume-high"></i>';
  });
}
