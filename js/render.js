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
function lerpColor(c1,c2,t){ const p=h=>parseInt(h.slice(1),16); const a=p(c1),b=p(c2); const r=Math.round(((a>>16)&255)*(1-t)+((b>>16)&255)*t); const g=Math.round(((a>>8)&255)*(1-t)+((b>>8)&255)*t); const bl=Math.round((a&255)*(1-t)+(b&255)*t); return `rgb(${r},${g},${bl})`; }
function shade(hex,f){ if(hex.startsWith('rgb')){ const m = hex.match(/\d+/g); if(!m) return hex; return `rgb(${clamp(Math.round(+m[0]*f),0,255)},${clamp(Math.round(+m[1]*f),0,255)},${clamp(Math.round(+m[2]*f),0,255)})`; } const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; r=Math.round(clamp(r*f,0,255)); g=Math.round(clamp(g*f,0,255)); b=Math.round(clamp(b*f,0,255)); return `rgb(${r},${g},${b})`; }
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
  for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++){ const t = tileAt(x,y); if(t) drawList.push(t); }
  drawList.sort((a,b)=>(a.x+a.y)-(b.x+b.y));
  for(const t of drawList) drawTile(t, seasonNow, time);

  const ents=[];
  const ccx0=Math.floor(x0/CS)-1, ccy0=Math.floor(y0/CS)-1, ccx1=Math.ceil(x1/CS)+1, ccy1=Math.ceil(y1/CS)+1;
  for(let cx=ccx0;cx<=ccx1;cx++) for(let cy=ccy0;cy<=ccy1;cy++){
    const c=chunks.get(chunkKey(cx,cy)); if(!c) continue;
    for(const tr of c.trees) if(tr.x>=x0-1&&tr.x<=x1+1&&tr.y>=y0-1&&tr.y<=y1+1) ents.push({k:tr.x+tr.y, draw:()=>drawTree(tr,seasonNow,time)});
    for(const r of c.rocks) if(r.x>=x0-1&&r.x<=x1+1&&r.y>=y0-1&&r.y<=y1+1) ents.push({k:r.x+r.y, draw:()=>drawRock(r)});
  }
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
  
  if(hitFlashTimer>0){ hitFlashTimer -= 0.016; document.getElementById('hitFlash').style.opacity = Math.min(1, hitFlashTimer*4); } else document.getElementById('hitFlash').style.opacity = 0;
  updateHUD(seasonNow);
}

// --- DESENHOS PIXELADOS DE DESMEMBRAMENTO ---
function drawBodyPart(p) {
  const iso = gridToIso(p.x, p.y);
  const lift = p.z * 6;
  const sx = iso.x, sy = iso.y + TH/2 - lift;
  const alpha = Math.min(1, p.life / 120);

  // Sombra no chão (fica no chão, não voa com a parte)
  ctx.save();
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(iso.x - 5, iso.y + TH/2 - 2, 10, 4);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.rotate(p.angle);
  
  // Desenho quadrado (pixelado) de cada parte
  if (p.type === 'head') {
    ctx.fillStyle = p.skinColor;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = '#7f1d1d'; // Sangue
    ctx.fillRect(-4, 2, 8, 3);
    ctx.fillStyle = '#dc2626'; // Olhos
    ctx.fillRect(-2, -2, 2, 2); ctx.fillRect(1, -2, 2, 2);
  } else if (p.type === 'arm') {
    ctx.fillStyle = p.skinColor;
    ctx.fillRect(-2, -6, 4, 12); // Braço
    ctx.fillStyle = p.color; // Manga
    ctx.fillRect(-3, -6, 6, 4);
  } else if (p.type === 'leg') {
    ctx.fillStyle = '#1e3a5f'; // Calça
    ctx.fillRect(-3, -8, 6, 14);
    ctx.fillStyle = '#0a0a0a'; // Sapato
    ctx.fillRect(-3, 6, 6, 3);
  } else {
    ctx.fillStyle = p.color;
    ctx.fillRect(-5, -4, 10, 8); // Torso
    ctx.fillStyle = 'rgba(120,20,20,0.8)';
    ctx.fillRect(-5, -1, 10, 4); // Sangue
  }
  
  ctx.restore();
}

function drawCorpse(c){
  const iso=gridToIso(c.x,c.y); 
  const t = tileAt(Math.floor(c.x), Math.floor(c.y));
  const yo = iso.y+hh() - (t ? t.e * 15 : 0);
  
  ctx.save(); ctx.translate(Math.round(iso.x), Math.round(yo)); ctx.rotate(c.angle);
  if(c.kind==='zombie'){
    ctx.fillStyle='#4a6b3a'; ctx.fillRect(-8,-4,16,6);
    ctx.fillStyle='#9ab88a'; ctx.fillRect(6,-3,5,5);
    ctx.fillStyle='#7f1d1d'; ctx.fillRect(-4,0,6,2);
  } else {
    const col = c.species?SPECIES_CFG[c.species].color:'#8b5a2b';
    ctx.fillStyle=col; ctx.fillRect(-8,-3,16,6);
    ctx.fillStyle=shade(col,0.85); ctx.fillRect(6,-2,4,4);
  }
  ctx.restore();
}

function drawHumanoid(b, opts){
  const iso=gridToIso(b.x,b.y); 
  const cx=iso.x, cy=iso.y+hh();
  const sp=Math.hypot(b.vx,b.vy); const moving = sp>0.2; const wp = b.walkPhase;
  const flip = (Math.cos(b.facing) < 0) ? -1 : 1;
  
  shadowAt(b.x, b.y, 9, 4.5);
  
  ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.scale(flip*opts.scale, opts.scale);
  
  const waterLevel = b.isSwimming ? 15 : 0; 
  ctx.beginPath(); ctx.rect(-20, -50, 40, 50 - waterLevel); ctx.clip();

  const legSwing = moving ? Math.sin(wp)*4 : 0;
  const armSwing = moving ? Math.sin(wp+Math.PI)*3 : 0;
  
  ctx.fillStyle=opts.pants; 
  ctx.fillRect(-3,-10+legSwing*0.5, 3, 10); ctx.fillRect(0,-10-legSwing*0.5, 3, 10);
  ctx.fillStyle=shade(opts.shirt,0.85); 
  ctx.fillRect(-5,-18+armSwing, 3, 8); ctx.fillRect(2,-18-armSwing, 3, 8);
  ctx.fillStyle=opts.shirt; ctx.fillRect(-4,-22,8,13);
  ctx.fillStyle=opts.skin; ctx.fillRect(-3,-28,6,6);
  ctx.fillStyle=opts.hair; ctx.fillRect(-3,-29,6,2);
  
  if (b.equippedWeapon) {
    ctx.fillStyle = '#1a1a1a';
    if (b.equippedWeapon === 'pistol') {
      ctx.fillRect(4, -18, 5, 2); ctx.fillRect(4, -16, 2, 3);
    } else if (b.equippedWeapon === 'rifle') {
      ctx.fillRect(2, -18, 14, 2); ctx.fillRect(6, -20, 4, 2); ctx.fillRect(4, -16, 3, 3);
    } else if (b.equippedWeapon === 'shotgun') {
      ctx.fillRect(2, -18, 15, 3); ctx.fillRect(4, -15, 3, 4);
    }
  }
  ctx.restore();
  
  if (b.isSwimming) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const ripple = Math.sin(timeOfDay * 20) * 2;
    ctx.fillRect(cx - 8, cy - 5 + ripple, 16, 2/zoom);
  }
}

function drawZombie(z, time){
  const iso=gridToIso(z.x,z.y); shadowAt(z.x,z.y,9,4.5);
  const sp=Math.hypot(z.vx,z.vy); const moving=sp>0.15; const wp=z.walkPhase + Math.sin(z.limp)*2; const flip=(Math.cos(z.facing)<0)?-1:1;
  ctx.save(); ctx.translate(Math.round(iso.x), Math.round(iso.y+hh())); ctx.scale(flip, 1);
  const waterLevel = z.isSwimming ? 15 : 0; ctx.beginPath(); ctx.rect(-20, -50, 40, 50 - waterLevel); ctx.clip();
  const legSwing=moving?Math.sin(wp)*3.5:0; const armSwing=moving?Math.sin(wp*0.7+Math.PI)*4:2;
  ctx.fillStyle='#3a3a4a'; ctx.fillRect(-2,-10+legSwing*0.8, 2, 10); ctx.fillRect(0,-10-legSwing*0.5, 2, 10);
  ctx.fillStyle='#5a7a4a'; ctx.fillRect(-5,-18, 3, 8); ctx.fillRect(2,-18, 4, 8);
  ctx.fillStyle='#4a6b3a'; ctx.fillRect(-4,-22,8,13);
  ctx.fillStyle='#9ab88a'; ctx.fillRect(-3,-28,6,6);
  ctx.fillStyle='#dc2626'; ctx.fillRect(-2,-27,1,1); ctx.fillRect(1,-27,1,1);
  ctx.restore();
}

function drawTile(t, seasonNow, time){
  const iso = gridToIso(t.x+0.5, t.y+0.5);
  const hw = TW/2, hhL = TH/2;
  let col = biomeColor(t, seasonNow);
  col = shade(col, 0.85 + t.e * 0.35);

  const elevationOffset = t.e * 15; 
  if (elevationOffset > 0) {
    ctx.fillStyle = shade(col, 0.6);
    ctx.beginPath(); ctx.moveTo(iso.x - hw, iso.y + hhL - elevationOffset); ctx.lineTo(iso.x, iso.y + TH - elevationOffset); ctx.lineTo(iso.x, iso.y + TH); ctx.lineTo(iso.x - hw, iso.y + hhL); ctx.fill();
    ctx.beginPath(); ctx.moveTo(iso.x + hw, iso.y + hhL - elevationOffset); ctx.lineTo(iso.x, iso.y + TH - elevationOffset); ctx.lineTo(iso.x, iso.y + TH); ctx.lineTo(iso.x + hw, iso.y + hhL); ctx.fill();
  }

  const isoYOffset = iso.y - elevationOffset;
  ctx.beginPath(); ctx.moveTo(iso.x, isoYOffset); ctx.lineTo(iso.x+hw, isoYOffset+hhL); ctx.lineTo(iso.x, isoYOffset+TH); ctx.lineTo(iso.x-hw, isoYOffset+hhL); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1/zoom; ctx.stroke();

  if(t.water > 0) {
    const isDeep = t.water === 2;
    const off = (time * (isDeep ? 4 : 2)) % 4;
    ctx.fillStyle = isDeep ? 'rgba(140,200,255,0.3)' : 'rgba(180,220,200,0.4)';
    for(let px = -hw + 10; px < hw - 10; px += 10) {
       const py = isoYOffset + hhL + Math.sin(px + off) * 3;
       ctx.fillRect(iso.x + px, py, 4/zoom, 2/zoom);
    }
  }
}

function drawTree(tr, seasonNow, time){
  const iso = gridToIso(tr.x, tr.y); const h = treeHeight(tr), stage = treeStage(tr);
  shadowAt(tr.x, tr.y, h*0.32, h*0.14); 
  const cx = iso.x, cy = iso.y + hh();
  if(tr.dead){ ctx.fillStyle='#3a2a1e'; ctx.fillRect(cx-2/zoom, cy-h*0.6, 4/zoom, h*0.6); return; }
  const tw = Math.max(2, h*0.07); ctx.fillStyle = tr.species==='birch'?'#c9c4b8':'#3a2818'; ctx.fillRect(cx-tw/2, cy-h*0.45, tw, h*0.45);
  if(stage === 0){ ctx.fillStyle = '#4d7c0f'; ctx.fillRect(cx-3, cy-h*0.5, 6, 6); return; }
  let c1 = '#1e3a2a', c2 = '#2d5238', c3 = '#3d6b48';
  if(seasonNow===2 && tr.species!=='pine') { c1='#b45309'; c2='#d97706'; c3='#ca8a04'; }
  else if(tr.species==='oak'){ c1='#2d5a2e'; c2='#3f7a3a'; c3='#559448'; }
  const r = h*0.38; 
  ctx.fillStyle = c1; ctx.fillRect(cx-r, cy-h*0.62-r*0.5, r*2, r); ctx.fillRect(cx-r*0.8, cy-h*0.62-r, r*1.6, r*1.5);
  ctx.fillStyle = c2; ctx.fillRect(cx-r*0.6, cy-h*0.62-r*0.8, r*1.2, r*0.8); 
  ctx.fillStyle = c3; ctx.fillRect(cx-r*0.4, cy-h*0.62-r*0.6, r*0.8, r*0.6);
}

function drawRock(r){
  const iso=gridToIso(r.x,r.y); shadowAt(r.x,r.y,10*r.s,5*r.s);
  const t = tileAt(Math.floor(r.x), Math.floor(r.y)); const yo = iso.y+hh() - (t ? t.e * 15 : 0);
  ctx.fillStyle='#5a5f68'; ctx.fillRect(iso.x-10*r.s, yo-8*r.s, 20*r.s, 10*r.s);
  ctx.fillStyle='#6e747e'; ctx.fillRect(iso.x-6*r.s, yo-10*r.s, 12*r.s, 6*r.s);
}

// Stubs e funções auxiliares mantidas breves
function shadowAt(wx,wy,rx,ry){ const iso = gridToIso(wx, wy); const t = tileAt(Math.floor(wx), Math.floor(wy)); const elevationOffset = t ? t.e * 15 : 0; ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(iso.x+8, iso.y+hh()-elevationOffset+6, rx, ry, 0, 0, Math.PI*2); ctx.fill(); }
function drawAnimal(a){ /* Mantido igual */ }
function drawProjectile(pr){ const iso = gridToIso(pr.x, pr.y); ctx.save(); ctx.translate(iso.x, iso.y + TH/2 - 15); ctx.rotate(pr.angle); ctx.fillStyle = '#fde047'; ctx.fillRect(-3,-1,6,2); ctx.restore(); }
function drawParticles(now){ /* Mantido igual */ }
function drawAtmosphere(seasonNow){ /* Mantido igual */ }
