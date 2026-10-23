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

function drawLoot(l) {
  const iso = gridToIso(l.x, l.y);
  const y = iso.y + hh();
  const pulse = (Math.sin(performance.now()*0.005) + 1) * 0.5;
  
  ctx.save();
  ctx.translate(iso.x, y - 5);
  
  if (l.type.includes('ammo')) {
    ctx.fillStyle = '#4a5a3a';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = '#1a1c1d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(-2, -2, 4, 4);
  } else {
    ctx.fillStyle = '#2a2a2a';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    if (l.type === 'pistol') {
      ctx.fillRect(-6, -3, 12, 6);
      ctx.fillRect(-2, 3, 4, 6);
    } else if (l.type === 'rifle') {
      ctx.fillRect(-10, -2, 20, 4);
      ctx.fillRect(2, -4, 6, 2);
      ctx.fillRect(-6, 2, 4, 4);
    } else if (l.type === 'shotgun') {
      ctx.fillRect(-12, -3, 24, 3);
      ctx.fillRect(-12, 0, 24, 3);
      ctx.fillRect(-8, 3, 6, 5);
    }
    
    ctx.fillRect(-6, -3, 12, 6);
    ctx.strokeRect(-6, -3, 12, 6);
  }
  
  ctx.globalAlpha = 0.3 + pulse * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI*2);
  ctx.fillStyle = l.type.includes('ammo') ? '#fbbf24' : '#60a5fa';
  ctx.fill();
  
  ctx.restore();
}

function render(now){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(camX+camOffsetX, camY+camOffsetY);
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
  
  // Adiciona Loot na fila de renderização
  for(const l of lootDrops) {
    if(l.x>=x0-1 && l.x<=x1+1 && l.y>=y0-1 && l.y<=y1+1) {
      ents.push({k:l.x+l.y+0.08, draw:()=>drawLoot(l)});
    }
  }

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

// ... (MANTENHA AS DEMAIS FUNÇÕES DE DESENHO: drawTile, drawGroundDetails, drawWaterTile, etc.)
// Para poupar espaço, as funções de desenho de terreno e itens continuam as mesmas do código anterior, 
// com exceção do drawHumanoid que adiciona a arma:

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
  
  // NOVO: Desenha a arma se estiver equipada
  if (b.equippedWeapon) {
    ctx.fillStyle = '#111';
    ctx.fillRect(5, -18, 10, 3); // Cano
    ctx.fillRect(3, -16, 4, 6);  // Cabo
  }
  ctx.restore();
}

// As demais funções (drawTree, drawZombie, drawAnimal, drawParticles, etc) continuam iguais.
