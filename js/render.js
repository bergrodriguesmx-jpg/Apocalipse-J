/* ============================================================
   Renderização isométrica com culling correto (AABB 4 cantos),
   iluminação por elevação, oclusão ambiente, detalhes no chão,
   espuma na água, copas realistas.
   ============================================================ */

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
  ctx.translate(camX+camOffsetX, camY+camOffsetY);
  ctx.scale(zoom, zoom);

  // === CULLING CORRETO: usa AABB dos 4 cantos ===
  const b = getVisibleGridBounds();
  const x0 = Math.floor(b.minGx) - 1, x1 = Math.ceil(b.maxGx) + 1;
  const y0 = Math.floor(b.minGy) - 1, y1 = Math.ceil(b.maxGy) + 1;

  const seasonNow = Math.floor(yearDay/90);
  const time = now*0.001;

  // Tiles visíveis (já filtrados pelo AABB)
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

// ==== TILE com iluminação por elevação + AO + detalhes ====
function drawTile(t, seasonNow, time){
  const iso = gridToIso(t.x+0.5, t.y+0.5);
  const hw = TW/2, hhL = TH/2;

  let col = biomeColor(t, seasonNow);
  const v = hash2(t.x*1.7, t.y*2.3);
  col = shade(col, 0.92 + v*0.16);

  // Iluminação por elevação (mais alto = mais claro)
  col = shade(col, 0.86 + t.e * 0.32);

  // Umidade escurece
  if(t.moist>70 && t.water===0) col = shade(col, 0.88);

  // Oclusão ambiente: escurece se vizinhos são mais altos
  let ao = 0;
  const nb = tileAt(t.x-1, t.y-1); if(nb && nb.e > t.e + 0.06) ao += 0.06;
  const nb2 = tileAt(t.x+1, t.y+1); if(nb2 && nb2.e > t.e + 0.06) ao += 0.06;
  const nb3 = tileAt(t.x+1, t.y-1); if(nb3 && nb3.e > t.e + 0.06) ao += 0.06;
  const nb4 = tileAt(t.x-1, t.y+1); if(nb4 && nb4.e > t.e + 0.06) ao += 0.06;
  if(ao > 0) col = shade(col, 1 - Math.min(ao, 0.22));

  ctx.beginPath();
  ctx.moveTo(iso.x, iso.y);
  ctx.lineTo(iso.x+hw, iso.y+hhL);
  ctx.lineTo(iso.x, iso.y+TH);
  ctx.lineTo(iso.x-hw, iso.y+hhL);
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.20)'; ctx.lineWidth = 0.5/zoom; ctx.stroke();

  // Detalhes no chão
  if(t.water === 0 && t.snow < 3) drawGroundDetails(t, iso, seasonNow);

  // Água com espuma
  if(t.water > 0) drawWaterTile(t, iso, time);

  // Neve
  if(t.snow > 3 && t.water === 0){
    ctx.save();
    ctx.globalAlpha = clamp(t.snow/100, 0, 0.85);
    ctx.fillStyle = '#e8eef2';
    ctx.beginPath();
    ctx.moveTo(iso.x, iso.y+1); ctx.lineTo(iso.x+hw, iso.y+hhL);
    ctx.lineTo(iso.x, iso.y+TH); ctx.lineTo(iso.x-hw, iso.y+hhL);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Cultivo
  if(t.crop){
    const h=(t.crop.stage+1)*3.5, ripe=t.crop.stage>=3;
    ctx.fillStyle=ripe?'#e3b23c':(seasonNow===3?'#a3b18a':'#4d7c0f');
    for(let i=-1;i<=1;i++) ctx.fillRect(iso.x+i*5/zoom-1/zoom, iso.y+hhL-h, 2/zoom, h);
  }
  if(t.biome==='field' && !t.crop){
    ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=0.8/zoom;
    for(let i=-1;i<=1;i++){
      ctx.beginPath();
      ctx.moveTo(iso.x-hw*0.5, iso.y+hhL+i*4/zoom);
      ctx.lineTo(iso.x+hw*0.5, iso.y+hhL+i*4/zoom);
      ctx.stroke();
    }
  }
}

// Detalhes visuais por tile (grama, flores, pedras, folhas)
function drawGroundDetails(t, iso, seasonNow){
  const hw = TW/2, hhL = TH/2;
  const hash = hash2(t.x*13.1, t.y*17.7);

  // Tufos de grama
  if((t.biome==='grass'||t.biome==='meadow'||t.biome==='overgrown') && hash < 0.62){
    const numTufts = 2 + Math.floor(hash*4);
    ctx.strokeStyle = seasonNow===3 ? '#6b5a3a' : '#3a5a2a';
    ctx.lineWidth = 0.9/zoom;
    for(let i=0;i<numTufts;i++){
      const hx = hash2(t.x*3+i*7, t.y*5+i*3);
      const hy = hash2(t.x*5+i*11, t.y*3+i*7);
      const px = iso.x + (hx - 0.5) * hw * 0.85;
      const py = iso.y + hhL + hy * hhL * 0.75;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + (hx-0.5)*2, py - (2.5 + hx*1.5)/zoom);
      ctx.stroke();
    }
  }

  // Flores no prado
  if(t.biome==='meadow' && hash > 0.52 && seasonNow !== 3){
    const fc = t.flowerColor || '#fbbf24';
    const numFlowers = 1 + Math.floor(hash*3);
    ctx.fillStyle = fc;
    for(let i=0;i<numFlowers;i++){
      const hx = hash2(t.x*9+i, t.y*13+i);
      const hy = hash2(t.x*11+i, t.y*17+i);
      const px = iso.x + (hx - 0.5) * hw * 0.75;
      const py = iso.y + hhL + hy * hhL * 0.65;
      ctx.beginPath();
      ctx.arc(px, py, 1.2/zoom, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Pedras pequenas em solo seco/rochoso
  if((t.biome==='drygrass'||t.biome==='rocky') && hash < 0.5){
    const n = 1 + Math.floor(hash*3);
    for(let i=0;i<n;i++){
      const hx = hash2(t.x*13+i, t.y*19+i);
      const hy = hash2(t.x*17+i, t.y*23+i);
      const px = iso.x + (hx - 0.5) * hw * 0.8;
      const py = iso.y + hhL + hy * hhL * 0.6;
      ctx.fillStyle = 'rgba(70,70,75,0.55)';
      ctx.beginPath();
      ctx.ellipse(px, py, 1.6/zoom, 0.8/zoom, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Folhas espalhadas na floresta
  if((t.biome==='pineforest'||t.biome==='broadleaf') && hash < 0.45){
    const n = 2 + Math.floor(hash*3);
    for(let i=0;i<n;i++){
      const hx = hash2(t.x*19+i, t.y*29+i);
      const hy = hash2(t.x*23+i, t.y*31+i);
      const px = iso.x + (hx - 0.5) * hw * 0.8;
      const py = iso.y + hhL + hy * hhL * 0.7;
      const leafCol = seasonNow===2 ? ['#b45309','#dc2626','#a16207'][i%3] : 'rgba(60,90,40,0.42)';
      ctx.fillStyle = leafCol;
      ctx.beginPath();
      ctx.ellipse(px, py, 2.2/zoom, 1/zoom, hx*3, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

// Água com ondulação + espuma nas bordas rasas
function drawWaterTile(t, iso, time){
  const hw = TW/2, hhL = TH/2;
  const deep = t.water === 2;

  ctx.save();
  ctx.globalAlpha = deep ? 0.5 : 0.4;
  const off = (time * (deep ? 14 : 8)) % 14;
  for(let i=0;i<3;i++){
    const px = iso.x - hw/2 + ((i*20 + off*0.7) % (hw*0.9));
    const py = iso.y + hhL*0.35 + i*5 + off*Math.sin(t.flow)*0.2;
    ctx.strokeStyle = deep ? 'rgba(140,200,255,.5)' : 'rgba(180,220,200,.5)';
    ctx.lineWidth = 1/zoom;
    ctx.beginPath();
    ctx.moveTo(px-4/zoom, py);
    ctx.quadraticCurveTo(px, py-2/zoom, px+4/zoom, py);
    ctx.stroke();
  }
  ctx.restore();

  if(!deep){
    // Espuma nas bordas que tocam terra
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.lineWidth = 1.6/zoom;
    const edges = [
      { dx:0, dy:-1, pts:[[iso.x, iso.y+1], [iso.x+hw, iso.y+hhL]] },
      { dx:1, dy:0,  pts:[[iso.x+hw, iso.y+hhL], [iso.x, iso.y+TH]] },
      { dx:0, dy:1,  pts:[[iso.x, iso.y+TH], [iso.x-hw, iso.y+hhL]] },
      { dx:-1, dy:0, pts:[[iso.x-hw, iso.y+hhL], [iso.x, iso.y+1]] }
    ];
    for(const e of edges){
      const n = tileAt(t.x + e.dx, t.y + e.dy);
      if(n && n.water === 0){
        ctx.beginPath();
        ctx.moveTo(e.pts[0][0], e.pts[0][1]);
        ctx.lineTo(e.pts[1][0], e.pts[1][1]);
        ctx.stroke();
      }
    }
  }
}

function shadowAt(wx,wy,rx,ry){
  const t = timeOfDay;
  const day = t>6 && t<19;
  const len = day ? (1.2 - Math.abs(t-12)/12)*14 : 2;
  const sunAngle = ((t-6)/12)*Math.PI;
  const sx = Math.cos(sunAngle)*len, sy = Math.sin(sunAngle)*len*0.4 + 6;
  const iso = gridToIso(wx, wy);
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(iso.x+sx, iso.y+hh()+sy, rx, ry, 0, 0, Math.PI*2);
  ctx.fill();
}

// Árvore com copa multi-blob (mais orgânica)
function drawTree(tr, seasonNow, time){
  const iso = gridToIso(tr.x, tr.y);
  const h = treeHeight(tr), stage = treeStage(tr);
  shadowAt(tr.x, tr.y, h*0.32, h*0.14);
  const sway = Math.sin(time*1.5 + tr.phase) * wind.speed * (stage>=2 ? 3.5 : 1.5);
  const cx = iso.x + sway, cy = iso.y + hh();

  if(tr.dead){
    ctx.fillStyle='#3a2a1e'; ctx.fillRect(cx-2/zoom, cy-h*0.6, 4/zoom, h*0.6);
    ctx.strokeStyle='#2a1d13'; ctx.lineWidth=1.5/zoom;
    ctx.beginPath();
    ctx.moveTo(cx, cy-h*0.5); ctx.lineTo(cx-8/zoom, cy-h*0.75);
    ctx.moveTo(cx, cy-h*0.4); ctx.lineTo(cx+7/zoom, cy-h*0.65);
    ctx.stroke();
    return;
  }

  const tw = Math.max(2, h*0.07);
  ctx.fillStyle = tr.species==='birch'?'#c9c4b8':'#3a2818';
  ctx.fillRect(cx-tw/2, cy-h*0.45, tw, h*0.45);
  ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=0.8/zoom;
  ctx.strokeRect(cx-tw/2, cy-h*0.45, tw, h*0.45);

  if(stage === 0){
    ctx.fillStyle = '#4d7c0f';
    ctx.beginPath(); ctx.arc(cx, cy-h*0.5, 3/zoom, 0, Math.PI*2); ctx.fill();
    return;
  }

  let c1,c2,c3;
  const bare = seasonNow===3 && tr.species!=='pine' && tr.species!=='willow';
  const autumn = seasonNow===2 && tr.species!=='pine';
  if(bare){}
  else if(autumn){
    const pal = [['#b45309','#92400e','#d97706'],['#a16207','#ca8a04','#854d0e'],['#991b1b','#b91c1c','#7f1d1d']];
    const p = pal[Math.floor(tr.phase*3)%3]; c1=p[0]; c2=p[1]; c3=p[2];
  }
  else if(tr.species==='pine'){c1='#1e3a2a'; c2='#2d5238'; c3='#3d6b48';}
  else if(tr.species==='birch'){c1='#3f6b35'; c2='#558a45'; c3='#6ba357';}
  else if(tr.species==='willow'){c1='#3a6b4a'; c2='#4f8a5f'; c3='#6ba378';}
  else {c1='#2d5a2e'; c2='#3f7a3a'; c3='#559448';}

  if(bare){
    ctx.strokeStyle='#4a3826'; ctx.lineWidth=1.5/zoom;
    ctx.beginPath();
    ctx.moveTo(cx, cy-h*0.45); ctx.lineTo(cx-h*0.25, cy-h*0.7);
    ctx.moveTo(cx, cy-h*0.5);  ctx.lineTo(cx+h*0.22, cy-h*0.72);
    ctx.moveTo(cx, cy-h*0.55); ctx.lineTo(cx, cy-h*0.85);
    ctx.stroke();
    return;
  }

  // Copa multi-blob com Path2D para contorno único
  const r = h*0.38;
  const seedBase = tr.phase * 100;
  const numBlobs = 6 + Math.floor(Math.abs(Math.sin(seedBase)) * 3);

  const blobs = [];
  for(let i=0;i<numBlobs;i++){
    const hx = hash2(seedBase + i*3.1, seedBase + i*7.3);
    const hy = hash2(seedBase + i*5.7, seedBase + i*11.1);
    const bx = cx + (hx - 0.5) * r * 1.3;
    const by = cy - h*0.62 + (hy - 0.5) * r * 0.9;
    const br = r * (0.28 + hx * 0.24);
    blobs.push({ bx, by, br, hx, hy });
  }

  // Camada 1 (base escura)
  ctx.fillStyle = c1;
  for(const b of blobs){
    ctx.beginPath(); ctx.arc(b.bx, b.by, b.br, 0, Math.PI*2); ctx.fill();
  }
  // Camada 2 (média)
  ctx.fillStyle = c2;
  for(const b of blobs){
    ctx.beginPath();
    ctx.arc(b.bx - r*0.12, b.by - r*0.08, b.br*0.75, 0, Math.PI*2);
    ctx.fill();
  }
  // Camada 3 (highlight)
  ctx.fillStyle = c3;
  for(let i=0;i<Math.floor(numBlobs/2);i++){
    const b = blobs[i];
    ctx.beginPath();
    ctx.arc(b.bx - r*0.22, b.by - r*0.16, b.br*0.42, 0, Math.PI*2);
    ctx.fill();
  }
  // Contorno único composto
  ctx.strokeStyle = 'rgba(0,0,0,0.42)'; ctx.lineWidth = 1.1/zoom;
  const compound = new Path2D();
  for(const b of blobs) compound.arc(b.bx, b.by, b.br, 0, Math.PI*2);
  ctx.stroke(compound);
}

function drawRock(r){
  const iso=gridToIso(r.x,r.y); shadowAt(r.x,r.y,10*r.s,5*r.s);
  ctx.fillStyle='#5a5f68'; ctx.beginPath(); ctx.ellipse(iso.x,iso.y+hh()-2,11*r.s,7*r.s,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#6e747e'; ctx.beginPath(); ctx.ellipse(iso.x-2*r.s,iso.y+hh()-5,7*r.s,4*r.s,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1/zoom; ctx.stroke();
}
function drawBush(b, seasonNow){
  const iso=gridToIso(b.x,b.y);
  if(b.hay){ shadowAt(b.x,b.y,8,4); ctx.fillStyle='#b8943f'; ctx.fillRect(iso.x-7,iso.y+hh()-10,14,8); ctx.fillStyle='#d4af5a'; ctx.fillRect(iso.x-7,iso.y+hh()-10,14,3); ctx.strokeStyle='#7a5f28'; ctx.lineWidth=1; ctx.strokeRect(iso.x-7,iso.y+hh()-10,14,8); return; }
  shadowAt(b.x,b.y,8,4);
  const col=seasonNow===2?'#9a6b2a':(seasonNow===3?'#6b6b5a':'#2f6b34');
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(iso.x,iso.y+hh()-3,8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=shade(col,1.2); ctx.beginPath(); ctx.arc(iso.x-3,iso.y+hh()-5,4.5,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1; ctx.stroke();
  if(b.berries&&seasonNow!==3){ ctx.fillStyle='#dc2626'; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(iso.x-4+i*2.5,iso.y+hh()-4+(i%2)*3,1.4,0,Math.PI*2); ctx.fill(); } }
}
function drawFence(f){
  const iso=gridToIso(f.x,f.y); const y=iso.y+hh();
  ctx.fillStyle='#5c4426'; ctx.fillRect(iso.x-1.5,y-12,3,12);
  ctx.strokeStyle='#6b5030'; ctx.lineWidth=2;
  if(f.orient===0){ ctx.beginPath(); ctx.moveTo(iso.x-TW/2,y-9); ctx.lineTo(iso.x+TW/2,y-9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(iso.x-TW/2,y-5); ctx.lineTo(iso.x+TW/2,y-5); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(iso.x-TW/4,y-9-TH/4); ctx.lineTo(iso.x+TW/4,y-9+TH/4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(iso.x-TW/4,y-5-TH/4); ctx.lineTo(iso.x+TW/4,y-5+TH/4); ctx.stroke(); }
}
function drawBarn(b){
  const iso=gridToIso(b.x,b.y); const y=iso.y+hh();
  shadowAt(b.x,b.y,26,12);
  const w=b.w*TW*0.5;
  ctx.fillStyle='#5a3a28';
  ctx.beginPath(); ctx.moveTo(iso.x,y-w*0.5); ctx.lineTo(iso.x+w,y-w*0.5+w*0.5); ctx.lineTo(iso.x+w,y+w*0.5); ctx.lineTo(iso.x,y); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#6b4630';
  ctx.beginPath(); ctx.moveTo(iso.x,y-w*0.5); ctx.lineTo(iso.x-w,y-w*0.5+w*0.5); ctx.lineTo(iso.x-w,y+w*0.5); ctx.lineTo(iso.x,y); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#3a4a5a';
  ctx.beginPath(); ctx.moveTo(iso.x,y-w*0.5-14); ctx.lineTo(iso.x+w+4,y-w*0.5+w*0.5-6); ctx.lineTo(iso.x,y+w*0.5-2); ctx.lineTo(iso.x-w-4,y-w*0.5+w*0.5-6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle='#2a1c10'; ctx.fillRect(iso.x-6,y-8,12,10);
  if(timeOfDay<6||timeOfDay>19){ ctx.fillStyle='rgba(255,200,80,.85)'; ctx.fillRect(iso.x+w*0.3,y-w*0.5+w*0.25,5,5); }
}
function drawCampfire(f, time){
  const iso=gridToIso(f.x+0.5,f.y+0.5); const y=iso.y+hh();
  ctx.fillStyle='#3a2418'; ctx.fillRect(iso.x-8,y-2,16,4);
  const flick=Math.sin(time*10)*2;
  ctx.fillStyle='#ea580c'; ctx.beginPath(); ctx.arc(iso.x,y-4,6+flick*0.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fbbf24'; ctx.beginPath(); ctx.arc(iso.x,y-5,3.5+flick*0.2,0,Math.PI*2); ctx.fill();
}
function drawHumanoid(b, opts){
  const iso=gridToIso(b.x,b.y);
  const cx=iso.x, cy=iso.y+hh();
  const sp=Math.hypot(b.vx,b.vy);
  const moving = sp>0.2;
  const wp = b.walkPhase;
  const flip = (Math.cos(b.facing) < 0) ? -1 : 1;
  const lean = moving ? clamp(sp/3,0,1)*0.15 : 0;
  shadowAt(b.x, b.y, 9, 4.5);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(flip*opts.scale, opts.scale);
  ctx.rotate(lean);
  const legSwing = moving ? Math.sin(wp)*4 : 0;
  const armSwing = moving ? Math.sin(wp+Math.PI)*3 : 0;
  ctx.strokeStyle=opts.pants; ctx.lineWidth=3.2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-2,-10); ctx.lineTo(-2+legSwing*0.6, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2,-10); ctx.lineTo(2-legSwing*0.6, 0); ctx.stroke();
  ctx.strokeStyle=shade(opts.shirt,0.85); ctx.lineWidth=2.8;
  ctx.beginPath(); ctx.moveTo(-4,-18); ctx.lineTo(-5+armSwing*0.5, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4,-18); ctx.lineTo(5-armSwing*0.5, -8); ctx.stroke();
  ctx.fillStyle=opts.shirt; ctx.fillRect(-5,-22,10,13);
  ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1; ctx.strokeRect(-5,-22,10,13);
  ctx.fillStyle=opts.skin; ctx.beginPath(); ctx.arc(0,-26,4.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle=opts.hair; ctx.beginPath(); ctx.arc(0,-28,4.5,Math.PI,0); ctx.fill();
  ctx.restore();
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
  ctx.rotate(Math.sin(time*3+z.limp)*0.08);
  const legSwing=moving?Math.sin(wp)*3.5:0;
  const armSwing=moving?Math.sin(wp*0.7+Math.PI)*4:2;
  ctx.strokeStyle='#3a3a4a'; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-2,-10); ctx.lineTo(-2+legSwing*0.8,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2,-10); ctx.lineTo(2-legSwing*0.5,0); ctx.stroke();
  ctx.strokeStyle='#5a7a4a'; ctx.lineWidth=2.8;
  ctx.beginPath(); ctx.moveTo(-4,-18); ctx.lineTo(-9+armSwing*0.3,-14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4,-18); ctx.lineTo(9-armSwing*0.3,-14); ctx.stroke();
  ctx.fillStyle='#4a6b3a';
  ctx.beginPath(); ctx.moveTo(-5,-22); ctx.lineTo(5,-22); ctx.lineTo(6,-10); ctx.lineTo(3,-9); ctx.lineTo(1,-13); ctx.lineTo(-2,-9); ctx.lineTo(-5,-10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle='#9ab88a'; ctx.beginPath(); ctx.arc(0,-26,4.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#2a2a2a'; ctx.beginPath(); ctx.arc(0,-28,4.8,Math.PI*0.8,Math.PI*2.2); ctx.fill();
  ctx.fillStyle='#dc2626'; ctx.fillRect(-2.5,-27,1.5,1.5); ctx.fillRect(1,-27,1.5,1.5);
  ctx.fillStyle='#7f1d1d'; ctx.fillRect(-1.5,-23.5,3,1.2);
  ctx.restore();
}
function drawAnimal(a){
  const iso=gridToIso(a.x,a.y);
  const cfg=SPECIES_CFG[a.species];
  shadowAt(a.x,a.y,cfg.radius*25,cfg.radius*12);
  const sp=Math.hypot(a.vx,a.vy);
  const moving=sp>0.2;
  const wp=a.walkPhase;
  const flip=(Math.cos(a.facing)<0)?-1:1;
  const bodyLen=cfg.radius*28, bodyH=cfg.radius*16;
  ctx.save();
  ctx.translate(iso.x, iso.y+hh());
  ctx.scale(flip,1);
  ctx.strokeStyle=shade(cfg.color,0.7); ctx.lineWidth=2.2; ctx.lineCap='round';
  const ls=moving?Math.sin(wp)*3:0;
  ctx.beginPath(); ctx.moveTo(-bodyLen*0.4,-bodyH*0.3); ctx.lineTo(-bodyLen*0.4+ls,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-bodyLen*0.4,-bodyH*0.3); ctx.lineTo(-bodyLen*0.4-ls,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bodyLen*0.4,-bodyH*0.3); ctx.lineTo(bodyLen*0.4-ls,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bodyLen*0.4,-bodyH*0.3); ctx.lineTo(bodyLen*0.4+ls,0); ctx.stroke();
  ctx.fillStyle=cfg.color;
  ctx.beginPath(); ctx.ellipse(0,-bodyH*0.5,bodyLen*0.5,bodyH*0.5,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1; ctx.stroke();
  const hx=bodyLen*0.55, hy=-bodyH*0.7
