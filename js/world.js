/* ============================================================
   Terreno procedural, chunks, biomas, vegetação
   ============================================================ */

function elevation(x, y){
  let e=0, amp=1, freq=0.0045, max=0;
  for(let o=0;o<4;o++){ e += simplex.noise2D(x*freq, y*freq)*amp; max+=amp; amp*=0.5; freq*=2.1; }
  let v = (e/max + 1)/2 + (x*0.0002 + y*0.00015);
  return clamp(v, 0, 1);
}
function riverField(x, y){
  const warp = 1.8;
  const wx = x*0.0055 + simplex.noise2D(x*0.0018, y*0.0018)*warp;
  const wy = y*0.0055 + simplex.noise2D(x*0.0018+55.5, y*0.0018+55.5)*warp;
  return simplex.noise2D(wx, wy);
}
function fieldNoise(x, y){ return simplex.noise2D(x*0.009 + 300, y*0.009 + 300); }
function isFieldTile(x, y){
  if(!isFinite(x)||!isFinite(y)) return false;
  const e = elevation(x,y), r = Math.abs(riverField(x,y));
  if(r < 0.07 || e > 0.62) return false;
  return fieldNoise(x,y) > 0.32;
}
function moistureBase(x, y, r){
  const mNoise = (simplex.noise2D(x*0.02+77, y*0.02+77)+1)/2;
  return clamp(25 + mNoise*35 + 100*Math.exp(-Math.abs(r)*22), 0, 100);
}

function chunkKey(cx,cy){ return cx+','+cy; }
function getChunk(cx, cy){
  const k = chunkKey(cx,cy);
  let c = chunks.get(k);
  if(!c){ c = generateChunk(cx, cy); chunks.set(k, c); }
  return c;
}
function tileAt(wx, wy){
  const cx = Math.floor(wx/CS), cy = Math.floor(wy/CS);
  const c = chunks.get(chunkKey(cx,cy));
  if(!c) return null;
  const lx = ((wx%CS)+CS)%CS, ly = ((wy%CS)+CS)%CS;
  return c.tiles[ly*CS + lx];
}
function generateChunk(cx, cy){
  const tiles = new Array(CS*CS);
  const trees = [], fences = [], barns = [], rocks = [], bushes = [];
  for(let ly=0; ly<CS; ly++) for(let lx=0; lx<CS; lx++){
    const wx = cx*CS+lx, wy = cy*CS+ly;
    const e = elevation(wx,wy), r = riverField(wx,wy), ar = Math.abs(r);
    let water = ar<0.030?2 : (ar<0.055?1:0);
    const field = isFieldTile(wx,wy);
    const moist = moistureBase(wx,wy,r);
    let biome = 'grass';
    if(water===2) biome='deepwater';
    else if(water===1) biome='shallow';
    else if(field) biome = hash2(wx,wy)>0.5?'field':'overgrown';
    else if(e>0.66) biome='rocky';
    else if(e>0.52) biome='pineforest';
    else if(moist>62) biome='broadleaf';
    else if(moist>45) biome='meadow';
    else biome='drygrass';
    let flow = 0;
    if(water>0){ const eps=1.5; const gx=riverField(wx+eps,wy)-riverField(wx-eps,wy); const gy=riverField(wx,wy+eps)-riverField(wx,wy-eps); flow=Math.atan2(gy,gx); }
    tiles[ly*CS+lx] = { x:wx, y:wy, e, water, biome, moist,
      fertility: clamp(30+(simplex.noise2D(wx*0.03+9,wy*0.03+9)+1)/2*50+(field?25:0),5,100),
      humus: 5+hash2(wx,wy)*10, flow, crop:null, snow:0 };
    if(water===0 && !field && biome!=='rocky'){
      let density = biome==='pineforest'?0.55 : biome==='broadleaf'?0.42 : biome==='meadow'?0.08 : 0.12;
      if(hash2(wx*3.1,wy*2.7)<density && trees.length<MAX_TREES_PER_CHUNK){
        const h=hash2(wx*7.3,wy*5.1);
        let species = e>0.55||h<0.35?'pine' : moist>70?'willow' : h<0.6?'birch':'oak';
        trees.push(makeTree(wx+hash2(wx,wy+1)*0.7, wy+hash2(wx+1,wy)*0.7, species, 0.5+hash2(wx,wy)*0.5));
      }
    }
    if(water===0 && biome==='rocky' && hash2(wx*5,wy*5)<0.35) rocks.push({x:wx+0.5,y:wy+0.5,s:0.7+hash2(wx,wy)*0.6});
    if(water===0 && !field && hash2(wx*9,wy*9)<0.06) bushes.push({x:wx+0.5,y:wy+0.5, berries:hash2(wx,wy)>0.4});
    if(field){
      if(!isFieldTile(wx+1,wy)||!isFieldTile(wx-1,wy)) fences.push({x:wx+0.5,y:wy,orient:0});
      if(!isFieldTile(wx,wy+1)||!isFieldTile(wx,wy-1)) fences.push({x:wx,y:wy+0.5,orient:1});
    }
  }
  if(hash2(cx*13.7, cy*17.3) > 0.91){
    for(let i=0;i<12;i++){
      const lx=Math.floor(hash2(cx+i,cy)*CS), ly=Math.floor(hash2(cx,cy+i)*CS);
      const t=tiles[ly*CS+lx];
      if(t && (t.biome==='field'||t.biome==='overgrown')){
        barns.push({x:t.x+0.5,y:t.y+0.5,w:2.2+hash2(cx,cy)*1.2,d:1.6+hash2(cx+1,cy)*0.8});
        for(let b=0;b<3;b++) if(hash2(cx+b,cy+b)>0.4) bushes.push({x:t.x+1.5+b*0.7,y:t.y+1.2,hay:true});
        break;
      }
    }
  }
  return { cx, cy, tiles, trees, fences, barns, rocks, bushes };
}
function makeTree(x,y,species,ageFrac){ return { x, y, species, age: ageFrac*80, health:100, phase:Math.random()*Math.PI*2, dead:false, seedCooldown:Math.random()*20 }; }
function treeStage(t){ if(t.dead) return 4; if(t.age<5) return 0; if(t.age<20) return 1; if(t.age<55) return 2; return 3; }
function treeHeight(t){ return [8,22,42,56,30][treeStage(t)] * (t.species==='pine'?1.15:t.species==='willow'?0.8:1); }

function ensureChunks(){
  const center = isoToGrid((canvas.width/2-(camX+camOffsetX))/zoom, (canvas.height/2-(camY+camOffsetY))/zoom);
  const ccx=Math.floor(center.x/CS), ccy=Math.floor(center.y/CS);
  for(let dx=-LOAD_RADIUS;dx<=LOAD_RADIUS;dx++) for(let dy=-LOAD_RADIUS;dy<=LOAD_RADIUS;dy++) getChunk(ccx+dx,ccy+dy);
  const maxD=LOAD_RADIUS+2;
  for(const [k,c] of chunks) if(Math.abs(c.cx-ccx)>maxD||Math.abs(c.cy-ccy)>maxD) chunks.delete(k);
}
