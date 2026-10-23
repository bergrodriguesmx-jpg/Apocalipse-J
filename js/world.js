'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const context={console,Math,Set,Map,Promise,Date,performance,window:{},document:{readyState:'loading',addEventListener(){}}};context.window=context;vm.createContext(context);
for(const f of ['config','audio','storage','world','physics','entities','weapons','sprites','render','hud','input','sim','main'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),context,{filename:f+'.js'});
const E=context.EZ,s=E.state;E.canvas={width:480,height:300};
async function run(){await E.openStorage();E.reset(123456);
assert.equal(s.player.weapon,null);assert.equal(s.player.owned.size,0);assert.equal(s.inventory.wood,0);
const c=E.generateChunk(-10,3),d=E.generateChunk(-10,3);assert.equal(JSON.stringify(c.tiles),JSON.stringify(d.tiles));assert.equal(JSON.stringify(c.objects),JSON.stringify(d.objects));
const samples=[[-10000,20000],[-100,-100],[0,0],[1000,1000]];for(const [x,y]of samples){E.chunk(Math.floor(x/16),Math.floor(y/16));assert(E.tile(x,y));assert(Number.isFinite(E.groundAt(x,y)));}
const a=E.chunk(2,2);a.objects=[];const t=a.tiles[12];t.crop={progress:37};t.moist=76;E.evictChunk(a);const restored=E.chunk(2,2);await new Promise(r=>setTimeout(r,0));assert(restored.ready);assert.equal(restored.tiles[12].crop.progress,37);assert.equal(restored.objects.length,0);
// Bounds don't grow with explored distance. Cold state uses archive, not active geometry.
let maxCache=0;for(let i=0;i<60;i++){s.player.x=100+i*80;s.player.y=-80-i*40;s.player.z=E.groundAt(s.player.x,s.player.y);E.centerCamera(1);E.updateStreaming(true);maxCache=Math.max(maxCache,s.world.chunks.size);}assert(maxCache<60);assert(s.world.view.length<7000);
E.reset(123456);let wet=null;for(let y=15;y<65&&!wet;y++)for(let x=20;x<85;x++)if(E.terrainHeight(x,y)<-2){wet={x:x+.5,y:y+.5};break;}assert(wet);s.player.x=wet.x;s.player.y=wet.y;s.player.z=E.groundAt(wet.x,wet.y);E.centerCamera(1);E.updateStreaming(true);E.moveActor(s.player,0,0,2.5,E.C.dt);assert(s.player.swimming);assert(Math.abs(s.player.z+1.05)<.001);
s.actors=[s.player];s.player.stamina=0;s.player.oxygen=0;s.input.keys.add('KeyW');const hp=s.player.hp;for(let i=0;i<12;i++)E.step(E.C.dt);assert(s.player.hp<hp,'Exaustão em água profunda causa dano');assert(s.player.stamina<.1);s.input.keys.clear();
s.player.x=32;s.player.y=32;E.updateStreaming(true);E.moveActor(s.player,0,0,2.5,E.C.dt);assert(!s.player.swimming);assert(Math.abs(s.player.z-E.groundAt(s.player.x,s.player.y))<1e-9);
const z=E.makeActor('zombie',33,32);s.actors=[s.player,z];E.damage(z,'leftArm',70,{x:1,y:0,z:.3},'lh');assert(z.missing.has('leftArm'));E.kill(z);assert(!s.ragdolls[1].nodes.le);for(let i=0;i<600;i++)E.stepRagdolls(E.C.dt);for(const rag of s.ragdolls)for(const n of Object.values(rag.nodes)){assert(Number.isFinite(n.z));assert(n.z>=E.groundAt(n.x,n.y)+n.r-.001);}
// Shoot at same elevation; ground must block bullets fired into rising terrain.
E.reset(123456);s.actors=[s.player];s.player.weapon='pistol';s.player.owned.add('pistol');s.player.ammo.pistol=3;s.player.swimming=true;E.fire();assert.equal(s.bullets.length,0);s.player.swimming=false;
// Pick terrain on a known projected surface (allow a pixel due to integer raster).
for(const [x,y]of [[32,32],[37,29],[45,30]]){const q=E.project({x,y}),p=E.pickTerrain(q.x,q.y);assert(E.distance({x,y},p)<.3);}
const tile=E.tile(32,32);tile.crop={progress:0};s.player.hp=100000;for(let i=0;i<120*30;i++)E.step(E.C.dt);assert(tile.crop.progress>0);assert(Number.isFinite(s.player.hp));assert(s.particles.length<=E.C.maxParticles);
const directions=E.spriteFrames.idle.length;assert.equal(directions,8);for(const frames of Object.values(E.spriteFrames))for(const [x,y,w,h]of frames){assert(x>=0&&y>=0&&x+w<=1448&&y+h<=1086);}
console.log(JSON.stringify({status:'PASS',maxCachedChunks:maxCache,checks:['geração determinística','coordenadas negativas e distantes','evicção e restauração de cultivo/objetos','cache limitado em 60 deslocamentos','natação e afogamento','saída da água','ragdoll sobre relevo','armas bloqueadas ao nadar','picking com elevação','30 segundos de simulação','recortes de oito direções']},null,2));return E;}
module.exports={E,run};if(require.main===module)run().catch(e=>{console.error(e);process.exit(1);});
