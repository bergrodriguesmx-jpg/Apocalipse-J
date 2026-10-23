function makeBody(x, y, radius, mass){ return { x, y, vx:0, vy:0, radius, mass, facing:0, walkPhase:Math.random()*6, attackCd:0, isSwimming: false }; }

function solidsNear(x, y, range){
  const out = [];
  const cx0=Math.floor((x-range)/CS), cx1=Math.ceil((x+range)/CS);
  const cy0=Math.floor((y-range)/CS), cy1=Math.ceil((y+range)/CS);
  for(let cx=cx0;cx<=cx1;cx++) for(let cy=cy0;cy<=cy1;cy++){
    const c=chunks.get(chunkKey(cx,cy)); if(!c) continue;
    for(const tr of c.trees) if(Math.abs(tr.x-x)<range && Math.abs(tr.y-y)<range) out.push({kind:'circle',x:tr.x,y:tr.y,r:0.35});
    for(const r of c.rocks) if(Math.abs(r.x-x)<range && Math.abs(r.y-y)<range) out.push({kind:'circle',x:r.x,y:r.y,r:0.4*r.s});
    for(const b of c.barns) if(Math.abs(b.x-x)<range+2 && Math.abs(b.y-y)<range+2) out.push({kind:'box',x:b.x,y:b.y,hw:b.w*0.5,hd:b.d*0.5});
  }
  for(const f of campfires) if(Math.abs(f.x-x)<range && Math.abs(f.y-y)<range) out.push({kind:'circle',x:f.x+0.5,y:f.y+0.5,r:0.4});
  return out;
}

function resolveCollisions(body){
  const range = body.radius + 2;
  const t = tileAt(Math.floor(body.x), Math.floor(body.y));
  
  // --- NOVO: MECÂNICA DE NATAÇÃO ---
  if(t && t.water > 0){
    body.isSwimming = true;
    // Atrito da água deixa o movimento mais lento
    body.vx *= 0.85; 
    body.vy *= 0.85;
  } else {
    body.isSwimming = false;
  }

  for(const s of solidsNear(body.x, body.y, range)){
    if(s.kind==='circle'){
      const dx=body.x-s.x, dy=body.y-s.y;
      const d=Math.hypot(dx,dy), minD=body.radius+s.r;
      if(d<minD && d>0.001){
        const push=(minD-d);
        body.x += dx/d*push; body.y += dy/d*push;
        const nx=dx/d, ny=dy/d;
        const vn = body.vx*nx + body.vy*ny;
        if(vn<0){ body.vx -= vn*nx*1.4; body.vy -= vn*ny*1.4; }
      }
    } else if(s.kind==='box'){
      const ox = clamp(body.x, s.x-s.hw, s.x+s.hw);
      const oy = clamp(body.y, s.y-s.hd, s.y+s.hd);
      const dx=body.x-ox, dy=body.y-oy;
      const d=Math.hypot(dx,dy);
      if(d<body.radius){
        if(d>0.001){
          const push=(body.radius-d);
          body.x += dx/d*push; body.y += dy/d*push;
          const nx=dx/d, ny=dy/d;
          const vn=body.vx*nx+body.vy*ny;
          if(vn<0){ body.vx -= vn*nx*1.4; body.vy -= vn*ny*1.4; }
        } else { body.x += body.radius; }
      }
    }
  }
  
  const cx0=Math.floor((body.x-2)/CS), cx1=Math.ceil((body.x+2)/CS);
  const cy0=Math.floor((body.y-2)/CS), cy1=Math.ceil((body.y+2)/CS);
  for(let cx=cx0;cx<=cx1;cx++) for(let cy=cy0;cy<=cy1;cy++){
    const c=chunks.get(chunkKey(cx,cy)); if(!c) continue;
    for(const f of c.fences){
      let x1,y1,x2,y2;
      if(f.orient===0){ x1=f.x-0.5; y1=f.y; x2=f.x+0.5; y2=f.y; }
      else { x1=f.x; y1=f.y-0.5; x2=f.x; y2=f.y+0.5; }
      const dx=x2-x1, dy=y2-y1, len2=dx*dx+dy*dy;
      let tt = len2>0 ? ((body.x-x1)*dx+(body.y-y1)*dy)/len2 : 0;
      tt=clamp(tt,0,1);
      const px=x1+tt*dx, py=y1+tt*dy;
      const ddx=body.x-px, ddy=body.y-py, d=Math.hypot(ddx,ddy);
      if(d<body.radius+0.08 && d>0.001){
        const push=body.radius+0.08-d;
        body.x += ddx/d*push; body.y += ddy/d*push;
        const nx=ddx/d, ny=ddy/d;
        const vn=body.vx*nx+body.vy*ny;
        if(vn<0){ body.vx -= vn*nx*1.6; body.vy -= vn*ny*1.6; }
      }
    }
  }
}

function separateBodies(list){
  for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++){
    const a=list[i], b=list[j];
    const dx=b.x-a.x, dy=b.y-a.y;
    const d=Math.hypot(dx,dy), minD=a.radius+b.radius;
    if(d<minD && d>0.001){
      const push=(minD-d)*0.5;
      const nx=dx/d, ny=dy/d;
      a.x -= nx*push; a.y -= ny*push;
      b.x += nx*push; b.y += ny*push;
      const rvx=b.vx-a.vx, rvy=b.vy-a.vy;
      const vn=rvx*nx+rvy*ny;
      if(vn<0){ a.vx+=vn*nx*0.5; a.vy+=vn*ny*0.5; b.vx-=vn*nx*0.5; b.vy-=vn*ny*0.5; }
    }
  }
}

function stepBody(body, ax, ay, maxV, dt){
  if (body.isSwimming) maxV *= 0.45; // Fica muito mais lento na água
  
  body.vx += ax*dt; body.vy += ay*dt;
  const fr = Math.exp(-FRICTION*dt);
  body.vx *= fr; body.vy *= fr;
  const sp = Math.hypot(body.vx, body.vy);
  if(sp>maxV){ body.vx = body.vx/sp*maxV; body.vy = body.vy/sp*maxV; }
  body.x += body.vx*dt; body.y += body.vy*dt;
  
  resolveCollisions(body);
  
  if(sp>0.15){ body.facing = Math.atan2(body.vy, body.vx); body.walkPhase += sp*dt*6; }
  
  if(sp>1.5 && !body.isSwimming && Math.random()<0.15*dt*60){
    const iso=gridToIso(body.x,body.y);
    particles.push({kind:'dust', sx:iso.x*zoom+camX+camOffsetX+(Math.random()-0.5)*10, sy:iso.y*zoom+camY+camOffsetY+TH*0.4*zoom, v:0.3, drift:Math.cos(wind.angle)*wind.speed, life:20});
  }
  // Partículas de água ao nadar
  if(sp>1.0 && body.isSwimming && Math.random()<0.2*dt*60){
    const iso=gridToIso(body.x,body.y);
    particles.push({kind:'water_splash', sx:iso.x*zoom+camX+camOffsetX, sy:iso.y*zoom+camY+camOffsetY+TH*0.5*zoom, v:0.2, drift:0, life:15});
  }
}
