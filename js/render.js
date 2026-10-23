function biomeColor(t, seasonNow){
  if(t.snow>3) return lerpColor('#dfe6ec','#c3cdd6',t.snow/100);
  const dry=t.moist<30;
  switch(t.biome){
    case 'deepwater': return '#16345e';
    case 'shallow': return '#2d5a4a';
    case 'field': return '#4a3826';
    case 'overgrown': return dry?'#5a5a32':'#3f5a2e';
    case 'rocky': return '#4a4e55';
    case 'pineforest': return '#24382b';
    case 'broadleaf': return '#2c4a30';
    case 'meadow': return dry?'#6b6b35':'#3d5c33';
    case 'drygrass': return '#5a5530';
    default: return '#445530';
  }
}
function lerpColor(c1,c2,t){
  const p=h=>parseInt(h.slice(1),16); const a=p(c1),b=p(c2);
  const r=Math.round(((a>>16)&255)*(1-t)+((b>>16)&255)*t);
  const g=Math.round(((a>>8)&255)*(1-t)+((b>>8)&255)*t);
  const bl=Math.round((a&255)*(1-t)+(b&255)*t);
  return `rgb(${r},${g},${bl})`;
}
function shade(hex,f){
  if(hex.startsWith('rgb')){
    const m = hex.match(/\d+/g);
    if(!m) return hex;
    return `rgb(${clamp(Math.round(+m[0]*f),0,255)},${clamp(Math.round(+m[1]*f),0,255)},${clamp(Math.round(+m[2]*f),0,255)})`;
  }
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.round(clamp(r*f,0,255)); g=Math.round(clamp(g*f,0,255)); b=Math.round(clamp(b*f,0,255));
  return `rgb(${r},${g},${b})`;
}
function hh(){ return TH/2; }

function render(now){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(Math.round(camX+camOffsetX), Math.round(camY+camOffsetY));
  ctx.scale(zoom, zoom);

  const b = getVisibleGridBounds();
  const x0 = Math.floor(b.minGx) - 1, x1 = Math.ceil(b.maxGx) + 1;
  const y0 = Math.floor(b.minGy) - 1, y1 = Math.ceil(b.maxGy) + 1;

  const seasonNow = Math.floor(yearDay/90);
  const time = now*0.001;

  const drawList=[];
  for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++){
    const t = tileAt(x,y);
    if(t) drawList.push(t);
  }
  drawList.sort((a,b)=>(a.x+a.y)-(b.x+b.y));
  for(const t of drawList) drawTile(t, seasonNow, time);

  if(hoveredTile){
    const iso=gridToIso(hoveredTile.x+0.5, hoveredTile.y+0.5);
    ctx.beginPath(); ctx.moveTo(iso.x,iso.y); ctx.lineTo(iso.x+TW/2,iso.y+TH/2); ctx.lineTo(iso.x,iso.y+TH); ctx.lineTo(iso.x-TW/2,iso.y+TH/2); ctx.closePath();
    ctx.fillStyle='rgba(245,158,11,.22)'; ctx.fill(); ctx.strokeStyle='#f59e0b'; ctx.lineWidth=1.5/zoom; ctx.stroke();
  }

  const ents=[];
  const ccx0=Math.floor(x0/CS)-1, ccy0=Math.floor(y0/CS)-1, ccx1=Math.ceil(x1/CS)+1, ccy1=Math.ceil(y1/CS)+1;
  for(let cx=ccx0;cx<=ccx1;cx++) for(let cy=ccy0;cy<=ccy1;cy++){
    const c=chunks.get(chunkKey(cx,cy)); if(!c) continue;
    for(const tr of c.trees) if(tr.x>=x0-1&&tr.x<=x1+1&&tr.y>=y0-1&&tr.y<=y1+1) ents.push({k:tr.x+tr.y, draw:()=>drawTree(tr,seasonNow,time)});
    for(const r of c.rocks) if(r.x>=x0-1&&r.x<=x1+1&&r.y>=y0-1&&r.y<=y1+1) ents.push({k:r.x+r.y, draw:()=>drawRock(r)});
    for(const bs of c.bushes) if(bs.x>=x0-1&&bs.x<=x1+1&&bs.y>=y0-1&&bs.y<=y1+1) ents.push({k:bs.x+bs.y, draw:()=>drawBush(bs,seasonNow)});
    for(const f of c.fences) if(f.x>=x0-1&&f.x<=x1+1&&f.y>=y0-1&&f.y<=y1+1) ents.push({k:f.x+f.y, draw:()=>drawFence(f)});
    for(const bn of c.barns) if(bn.x>=x0-2&&bn.x<=x1+2&&bn.y>=y0-2&&bn.y<=y1+2) ents.push({k:bn.x+bn.y, draw:()=>drawBarn(bn)});
  }
  for(const f of campfires) ents.push({k:f.x+f.y+0.05, draw:()=>drawCampfire(f,time)});
  for(const c of corpses) if(c.x>=x0-1&&c.x<=x1+1&&c.y>=y0-1&&c.y<=y1+1) ents.push({k:c.x+c.y+0.1, draw:()=>drawCorpse(c)});
  for(const p of bodyParts) if(p.x>=x0-1&&p.x<=x1+1&&p.y>=y0-1&&p.y<=y1+1) ents.push({k:p.x+p.y+0.12, draw:()=>drawBodyPart(p)});
  for(const a of animals) if(a.x>=x0-1&&a.x<=x1+1&&a.y>=y0-1&&a.y<=y1+1) ents.push({k:a.x+a.y+0.15, draw:()=>drawAnimal(a)});
  for(const z of zombies) if(z.x>=x0-1&&z.x<=x1+1&&z.y>=y0-1&&z.y<=y1+1) ents.push({k:z.x+z.y+0.2, draw:()=>drawZombie(z,time)});
  if(player) ents.push({k:player.x+player.y+0.25, draw:()=>drawHumanoid(player, {shirt:'#8b2c2c', pants:'#1e3a5f', skin:'#e8c39e', hair:'#3a2418', scale:1})});
  for(const pr of projectiles) if(pr.x>=x0-1&&pr.x<=x1+1&&pr.y>=y0-1&&pr.y<=y1+1) ents.push({k:pr.x+pr.y+0.35, draw:()=>drawProjectile(pr)});
  ents.sort((a,b)=>a.k-b.k);
  for(const e of ents) e.draw();

  ctx.restore();
  drawParticles(now);
  drawAtmosphere(seasonNow);

  ctx.save();
  for(const f of campfires){
    const iso=gridToIso(f.x+0.5,f.y+0.5);
    const sx=iso.x*zoom+camX+camOffsetX, sy=(iso.y+hh())*zoom+camY+camOffsetY;
    const rad=(110+Math.sin(time*6)*10)*zoom;
    const g=ctx.createRadialGradient(sx,sy,5,sx,sy,rad);
    g.addColorStop(0,'rgba(255,160,60,.5)'); g.addColorStop(0.5,'rgba(255,120,30,.18)'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(sx-rad,sy-rad,rad*2,rad*2);
  }
  ctx.restore();

  if(hitFlashTimer>0){
    hitFlashTimer -= 0.016;
    document.getElementById('hitFlash').style.opacity = Math.min(1, hitFlashTimer*4);
  } else document.getElementById('hitFlash').style.opacity = 0;
  updateHUD(seasonNow);
}

// --- TILE COM PROFUNDIDADE (VOXEL) E PIXEL ART ---
function drawTile(t, seasonNow, time){
  const iso = gridToIso(t.x+0.5, t.y+0.5);
  const hw = TW/2, hhL = TH/2;

  let col = biomeColor(t, seasonNow);
  
  // Efeito de sombreamento duro para dar relevo pixelado
  col = shade(col, 0.85 + t.e * 0.35);

  // Desenha a parede lateral do tile (Profundidade)
  const elevationOffset = t.e * 15; 
  if (elevationOffset > 0) {
    ctx.fillStyle = shade(col, 0.6); // Parede escura
    ctx.beginPath();
    ctx.moveTo(iso.x - hw, iso.y + hhL - elevationOffset);
    ctx.lineTo(iso.x, iso.y + TH - elevationOffset);
    ctx.lineTo(iso.x, iso.y + TH);
    ctx.lineTo(iso.x - hw, iso.y + hhL);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(iso.x + hw, iso.y + hhL - elevationOffset);
    ctx.lineTo(iso.x, iso.y + TH - elevationOffset);
    ctx.lineTo(iso.x, iso.y + TH);
    ctx.lineTo(iso.x + hw, iso.y + hhL);
    ctx.fill();
  }

  // Chão
  const isoYOffset = iso.y - elevationOffset;
  ctx.beginPath();
  ctx.moveTo(iso.x, isoYOffset);
  ctx.lineTo(iso.x+hw, isoYOffset+hhL);
  ctx.lineTo(iso.x, isoYOffset+TH);
  ctx.lineTo(iso.x-hw, isoYOffset+hhL);
  ctx.closePath();
  ctx.fillStyle = col; 
  ctx.fill();
  
  // Borda do pixel art
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; 
  ctx.lineWidth = 1/zoom; 
  ctx.stroke();

  // Detalhes da água pixelada
  if(t.water > 0) {
    const isDeep = t.water === 2;
    const off = (time * (isDeep ? 4 : 2)) % 4;
    ctx.fillStyle = isDeep ? 'rgba(140,200,255,0.3)' : 'rgba(180,220,200,0.4)';
    // Pixels de água
    for(let px = -hw + 10; px < hw - 10; px += 10) {
       const py = isoYOffset + hhL + Math.sin(px + off) * 3;
       ctx.fillRect(iso.x + px, py, 4/zoom, 2/zoom);
    }
  }

  // Cultivo
  if(t.crop){
    const h=(t.crop.stage+1)*3.5, ripe=t.crop.stage>=3;
    ctx.fillStyle=ripe?'#e3b23c':(seasonNow===3?'#a3b18a':'#4d7c0f');
    for(let i=-1;i<=1;i++) ctx.fillRect(iso.x+i*5/zoom-1/zoom, isoYOffset+hhL-h, 2/zoom, h);
  }
}

function shadowAt(wx,wy,rx,ry){
  const iso = gridToIso(wx, wy);
  const t = tileAt(Math.floor(wx), Math.floor(wy));
  const elevationOffset = t ? t.e * 15 : 0;
  
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath(); 
  ctx.ellipse(iso.x+8, iso.y+hh()-elevationOffset+6, rx, ry, 0, 0, Math.PI*2); 
  ctx.fill();
}

function drawHumanoid(b, opts){
  const iso=gridToIso(b.x,b.y); 
  const cx=iso.x, cy=iso.y+hh();
  const sp=Math.hypot(b.vx,b.vy); 
  const moving = sp>0.2; 
  const wp = b.walkPhase;
  const flip = (Math.cos(b.facing) < 0) ? -1 : 1;
  
  shadowAt(b.x, b.y, 9, 4.5);
  
  ctx.save(); 
  ctx.translate(cx, cy); 
  ctx.scale(flip*opts.scale, opts.scale);
  
  // Lógica de Natação: Se estiver nadando, corta a parte de baixo do corpo (água sobe)
  const waterLevel = b.isSwimming ? 15 : 0; 
  ctx.beginPath();
  ctx.rect(-20, -50, 40, 50 - waterLevel); // Clip mask
  ctx.clip();

  const legSwing = moving ? Math.sin(wp)*4 : 0;
  const armSwing = moving ? Math.sin(wp+Math.PI)*3 : 0;
  
  ctx.fillStyle=opts.pants; 
  ctx.fillRect(-3,-10+legSwing*0.5, 3, 10);
  ctx.fillRect(0,-10-legSwing*0.5, 3, 10);
  
  ctx.fillStyle=shade(opts.shirt,0.85); 
  ctx.fillRect(-5,-18+armSwing, 3, 8);
  ctx.fillRect(2,-18-armSwing, 3, 8);
  
  ctx.fillStyle=opts.shirt; ctx.fillRect(-4,-22,8,13);
  ctx.fillStyle=opts.skin; ctx.fillRect(-3,-28,6,6);
  ctx.fillStyle=opts.hair; ctx.fillRect(-3,-29,6,2);
  
  // --- SPRITES DE ARMAS DIFERENTES ---
  if (b.equippedWeapon) {
    ctx.fillStyle = '#1a1a1a';
    if (b.equippedWeapon === 'pistol') {
      // Pistola curta
      ctx.fillRect(4, -18, 5, 2);
      ctx.fillRect(4, -16, 2, 3);
    } else if (b.equippedWeapon === 'rifle') {
      // Rifle longo com luneta
      ctx.fillRect(2, -18, 14, 2);
      ctx.fillRect(6, -20, 4, 2); // luneta
      ctx.fillRect(4, -16, 3, 3); // cabo
    } else if (b.equippedWeapon === 'shotgun') {
      // Escopeta cano duplo grosso
      ctx.fillRect(2, -18, 15, 3);
      ctx.fillRect(4, -15, 3, 4);
    }
  }
  
  ctx.restore();
  
  // Desenha ondinhas de água se estiver nadando
  if (b.isSwimming) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const ripple = Math.sin(timeOfDay * 20) * 2;
    ctx.fillRect(cx - 8, cy - 5 + ripple, 16, 2/zoom);
    ctx.fillRect(cx - 5, cy - 2 - ripple, 10, 1/zoom);
  }
}

function drawZombie(z, time){
  const iso=gridToIso(z.x,z.y); 
  shadowAt(z.x,z.y,9,4.5);
  const sp=Math.hypot(z.vx,z.vy); 
  const moving=sp>0.15; 
  const wp=z.walkPhase + Math.sin(z.limp)*2; 
  const flip=(Math.cos(z.facing)<0)?-1:1;
  
  ctx.save(); 
  ctx.translate(iso.x, iso.y+hh()); 
  ctx.scale(flip, 1); 
  
  const waterLevel = z.isSwimming ? 15 : 0;
  ctx.beginPath(); ctx.rect(-20, -50, 40, 50 - waterLevel); ctx.clip();

  const legSwing=moving?Math.sin(wp)*3.5:0; 
  const armSwing=moving?Math.sin(wp*0.7+Math.PI)*4:2;
  
  ctx.fillStyle='#3a3a4a'; ctx.fillRect(-2,-10+legSwing*0.8, 2, 10); ctx.fillRect(0,-10-legSwing*0.5, 2, 10);
  ctx.fillStyle='#5a7a4a'; ctx.fillRect(-5,-18, 3, 8); ctx.fillRect(2,-18, 4, 8);
  ctx.fillStyle='#4a6b3a'; ctx.fillRect(-4,-22,8,13);
  ctx.fillStyle='#9ab88a'; ctx.fillRect(-3,-28,6,6);
  ctx.fillStyle='#dc2626'; ctx.fillRect(-2,-27,1,1); ctx.fillRect(1,-27,1,1);
  
  ctx.restore();
}

function drawTree(tr, seasonNow, time){
  const iso = gridToIso(tr.x, tr.y); 
  const h = treeHeight(tr), stage = treeStage(tr);
  shadowAt(tr.x, tr.y, h*0.32, h*0.14); 
  const sway = Math.sin(time*1.5 + tr.phase) * wind.speed * (stage>=2 ? 3.5 : 1.5);
  const cx = iso.x + sway, cy = iso.y + hh();
  
  if(tr.dead){ 
    ctx.fillStyle='#3a2a1e'; ctx.fillRect(cx-2/zoom, cy-h*0.6, 4/zoom, h*0.6); 
    return; 
  }
  
  const tw = Math.max(2, h*0.07); 
  ctx.fillStyle = tr.species==='birch'?'#c9c4b8':'#3a2818'; 
  ctx.fillRect(cx-tw/2, cy-h*0.45, tw, h*0.45);
  
  if(stage === 0){ ctx.fillStyle = '#4d7c0f'; ctx.fillRect(cx-3, cy-h*0.5, 6, 6); return; }
  
  let c1 = '#1e3a2a', c2 = '#2d5238', c3 = '#3d6b48';
  if(seasonNow===2 && tr.species!=='pine') { c1='#b45309'; c2='#d97706'; c3='#ca8a04'; }
  else if(tr.species==='oak'){ c1='#2d5a2e'; c2='#3f7a3a'; c3='#559448'; }
  
  // Desenho pixelado da copa
  const r = h*0.38; 
  ctx.fillStyle = c1; 
  ctx.fillRect(cx-r, cy-h*0.62-r*0.5, r*2, r); 
  ctx.fillRect(cx-r*0.8, cy-h*0.62-r, r*1.6, r*1.5);
  
  ctx.fillStyle = c2; 
  ctx.fillRect(cx-r*0.6, cy-h*0.62-r*0.8, r*1.2, r*0.8); 
  
  ctx.fillStyle = c3; 
  ctx.fillRect(cx-r*0.4, cy-h*0.62-r*0.6, r*0.8, r*0.6);
}

function drawRock(r){
  const iso=gridToIso(r.x,r.y); shadowAt(r.x,r.y,10*r.s,5*r.s);
  const t = tileAt(Math.floor(r.x), Math.floor(r.y));
  const yo = iso.y+hh() - (t ? t.e * 15 : 0);
  
  // Rocha pixelada (blocos)
  ctx.fillStyle='#5a5f68'; 
  ctx.fillRect(iso.x-10*r.s, yo-8*r.s, 20*r.s, 10*r.s);
  ctx.fillStyle='#6e747e'; 
  ctx.fillRect(iso.x-6*r.s, yo-10*r.s, 12*r.s, 6*r.s);
}

function drawCampfire(f, time){
  const iso=gridToIso(f.x+0.5,f.y+0.5); const y=iso.y+hh();
  ctx.fillStyle='#3a2418'; ctx.fillRect(iso.x-8,y-2,16,4);
  const flick=Math.sin(time*10)*2;
  ctx.fillStyle='#ea580c'; ctx.fillRect(iso.x-4,y-8+flick, 8, 8);
  ctx.fillStyle='#fbbf24'; ctx.fillRect(iso.x-2,y-6+flick, 4, 6);
}

// Stubs para as funções que já existiam e não mudaram o estilo
function drawBush(b, seasonNow){
  const iso=gridToIso(b.x,b.y); shadowAt(b.x,b.y,8,4);
  const col=seasonNow===2?'#9a6b2a':(seasonNow===3?'#6b6b5a':'#2f6b34');
  ctx.fillStyle=col; ctx.fillRect(iso.x-6,iso.y+hh()-6,12,6);
}
function drawFence(f){ /* Mantido igual */ }
function drawBarn(b){ /* Mantido igual */ }
function drawCorpse(c){ /* Mantido igual */ }
function drawBodyPart(p){ /* Mantido igual */ }
function drawProjectile(pr){
  const iso = gridToIso(pr.x, pr.y);
  ctx.save(); ctx.translate(iso.x, iso.y + TH/2 - 15); ctx.rotate(pr.angle);
  ctx.fillStyle = '#fde047'; ctx.fillRect(-3,-1,6,2);
  ctx.restore();
}
function drawAnimal(a){ /* Mantido igual */ }
function drawParticles(now){ /* Mantido igual */ }
function drawAtmosphere(seasonNow){ /* Mantido igual */ }
