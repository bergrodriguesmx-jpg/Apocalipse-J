function spawnCorpse(x, y, vx, vy, kind, species){
  corpses.push({ x, y, vx:vx*0.6+(Math.random()-0.5)*2, vy:vy*0.6+(Math.random()-0.5)*2,
    angle: Math.random()*Math.PI*2, vr:(Math.random()-0.5)*8, kind, species, life: 600 });
  for(let i=0;i<10;i++){
    const a=Math.random()*Math.PI*2, sp=1+Math.random()*3;
    particles.push({kind:'blood', x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:30+Math.random()*20});
  }
}

function spawnDismemberment(x, y, vx, vy, isZombie) {
  const types = ['head', 'arm', 'leg', 'torso_chunk'];
  const n = 2 + Math.floor(Math.random() * 3); // 2 a 4 partes
  for (let i = 0; i < n; i++) {
    const t = types[Math.floor(Math.random() * types.length)];
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 4;
    bodyParts.push({
      x, y,
      vx: vx * 0.4 + Math.cos(a) * sp,
      vy: vy * 0.4 + Math.sin(a) * sp,
      vz: 2 + Math.random() * 5,    // Impulso vertical
      z: 6 + Math.random() * 4,     // Altura inicial
      angle: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 14, // Rotação
      type: t,
      color: isZombie ? '#4a6b3a' : '#8b2c2c',
      skinColor: isZombie ? '#9ab88a' : '#e8c39e',
      life: 450 + Math.random() * 200,
      maxLife: 650
    });
  }
  // Spray de sangue
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
    particles.push({kind:'blood', x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:35+Math.random()*25});
  }
}

function spawnLoot(x, y, type, amount = 1) {
  lootDrops.push({ x, y, type, amount, id: Math.random() });
}

const SPECIES_CFG = {
  deer:   { herbivore:true,  radius:0.35, mass:1.2, color:'#8b5a2b', maxAge:120, reproRate:0.004, preyOf:'wolf' },
  rabbit: { herbivore:true,  radius:0.22, mass:0.5, color:'#a8a29e', maxAge:60,  reproRate:0.012, preyOf:'fox' },
  fox:    { herbivore:false, radius:0.28, mass:0.7, color:'#ea580c', maxAge:70,  reproRate:0.004, hunts:'rabbit' },
  wolf:   { herbivore:false, radius:0.34, mass:1.0, color:'#6b7280', maxAge:100, reproRate:0.002, hunts:'deer' }
};

function makeAnimal(x, y, species){
  const b = makeBody(x, y, SPECIES_CFG[species].radius, SPECIES_CFG[species].mass);
  b.species = species; b.hp=100; b.hunger=30+Math.random()*30; b.thirst=30+Math.random()*30;
  b.age=Math.random()*30; b.state='wander'; b.timer=0; b.sex=Math.random()>0.5?0:1; b.tx=x; b.ty=y;
  return b;
}
function makeZombie(x, y){
  const b = makeBody(x, y, 0.3, 0.9);
  b.hp = 100; b.attackCd = 0; b.limp = Math.random()*Math.PI*2;
  return b;
}

function spawnInitialFauna(cx, cy){
  animals = []; zombies = []; corpses = []; bodyParts = []; projectiles = []; lootDrops = [];
  for(let i=0;i<6;i++) animals.push(makeAnimal(cx+(Math.random()-0.5)*20, cy+(Math.random()-0.5)*20, 'deer'));
  for(let i=0;i<10;i++) animals.push(makeAnimal(cx+(Math.random()-0.5)*25, cy+(Math.random()-0.5)*25, 'rabbit'));
  for(let i=0;i<3;i++) animals.push(makeAnimal(cx+(Math.random()-0.5)*30, cy+(Math.random()-0.5)*30, 'fox'));
  for(let i=0;i<2;i++) animals.push(makeAnimal(cx+(Math.random()-0.5)*35, cy+(Math.random()-0.5)*35, 'wolf'));
  for(let i=0;i<4;i++) zombies.push(makeZombie(cx+(Math.random()-0.5)*40, cy+(Math.random()-0.5)*40));
}
