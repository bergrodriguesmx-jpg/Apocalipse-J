function updateHUD(seasonNow){
  if(gameState!=='playing'&&gameState!=='paused') return;
  if(player){
    document.getElementById('hpVal').textContent=Math.round(player.hp)+'%';
    document.getElementById('hpBar').style.width=player.hp+'%';
    document.getElementById('hungerVal').textContent=Math.round(100-player.hunger)+'%';
    document.getElementById('hungerBar').style.width=(100-player.hunger)+'%';
    document.getElementById('thirstVal').textContent=Math.round(100-player.thirst)+'%';
    document.getElementById('thirstBar').style.width=(100-player.thirst)+'%';
    document.getElementById('staminaVal').textContent=Math.round(player.stamina)+'%';
    document.getElementById('staminaBar').style.width=player.stamina+'%';
    
    const wName = document.getElementById('weaponName');
    const wAmmo = document.getElementById('ammoCount');
    
    if (player.equippedWeapon) {
      wName.textContent = `[1] PISTOLA | [2] RIFLE | [3] ESCOPETA`;
      wName.style.fontSize = '10px';
      wName.style.color = WEAPON_STATS[player.equippedWeapon].color;
      
      // Destaca a arma atual
      wName.innerHTML = `
        <span style="opacity:${player.equippedWeapon==='pistol'?1:0.4}">[1] Pistola</span> | 
        <span style="opacity:${player.equippedWeapon==='rifle'?1:0.4}">[2] Rifle</span> | 
        <span style="opacity:${player.equippedWeapon==='shotgun'?1:0.4}">[3] Escopeta</span>
      `;
      
      wAmmo.textContent = player.ammo;
      wAmmo.style.color = player.ammo > 0 ? '#e5e7eb' : '#ef4444';
    }
  }
  document.getElementById('invWood').textContent=inventory.wood;
  document.getElementById('invStone').textContent=inventory.stone;
  document.getElementById('invFood').textContent=inventory.food;
  document.getElementById('invSeeds').textContent=inventory.seeds;
  
  const hrs=String(Math.floor(timeOfDay)).padStart(2,'0'), mins=String(Math.floor((timeOfDay%1)*60)).padStart(2,'0');
  document.getElementById('clockText').textContent=hrs+':'+mins;
  document.getElementById('dayText').textContent='Dia '+dayCount;
  document.getElementById('seasonText').textContent=SEASONS[seasonNow];
  
  document.getElementById('ecoBiomass').textContent=ecoStats.biomass+' t';
  document.getElementById('ecoMoisture').textContent=ecoStats.moisture+'%';
  document.getElementById('ecoHerbivores').textContent=ecoStats.herbivores;
  document.getElementById('ecoZombies').textContent=ecoStats.zombies;
}

function updateTooltip(mx, my){
  const tt=document.getElementById('tooltip');
  if(!hoveredTile){ hideTooltip(); return; }
  const t=hoveredTile;
  tt.style.display='block';
  tt.style.left=Math.min(mx+15,window.innerWidth-260)+'px';
  tt.style.top=Math.min(my+15,window.innerHeight-180)+'px';
  const biomeNames={deepwater:'Rio Profundo',shallow:'Margem/Rio Raso',field:'Campo Arado',overgrown:'Campo Vegetado',rocky:'Solo Rochoso',pineforest:'Floresta de Coníferas',broadleaf:'Floresta Latifoliada',meadow:'Prado Úmido',drygrass:'Campo Seco',grass:'Pastagem'};
  document.getElementById('ttTitle').textContent=`Terreno [${t.x}, ${t.y}]`;
  document.getElementById('ttSub').textContent=biomeNames[t.biome]||t.biome;
  const ent=findEntityAt(t.x,t.y);
  let extra='';
  if(ent){
    if(ent.type==='tree'){ const st=['Muda','Jovem','Adulta','Madura','Morta'][treeStage(ent.obj)]; extra=`<div style="color:#a3e635"><b>Árvore:</b> ${({pine:'Pinheiro',oak:'Carvalho',birch:'Vidoeiro',willow:'Salgueiro'})[ent.obj.species]} — ${st}</div>`; }
    else if(ent.type==='rock') extra=`<div style="color:#d1d5db"><b>Rocha</b> — minerável</div>`;
  }
  document.getElementById('ttBody').innerHTML=`
    <div>Umidade: <b style="color:#38bdf8">${Math.round(t.moist)}%</b></div>
    <div>Fertilidade: <b style="color:#4ade80">${Math.round(t.fertility)}%</b></div>
    ${extra}
  `;
}
function hideTooltip(){ document.getElementById('tooltip').style.display='none'; }
