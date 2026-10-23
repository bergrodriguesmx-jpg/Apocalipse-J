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
      wName.textContent = WEAPON_STATS[player.equippedWeapon].name;
      wName.style.color = WEAPON_STATS[player.equippedWeapon].color;
      wAmmo.textContent = player.ammo;
      wAmmo.style.color = player.ammo > 0 ? '#e5e7eb' : '#ef4444';
    } else {
      wName.textContent = 'SEM ARMA';
      wName.style.color = '#9aa7b2';
      wAmmo.textContent = '0';
      wAmmo.style.color = '#ef4444';
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
  const wMap={sunny:['Ensolarado','fa-sun','#fbbf24'],cloudy:['Nublado','fa-cloud','#94a3b8'],rain:['Chuva','fa-cloud-rain','#60a5fa'],storm:['Tempestade','fa-cloud-bolt','#a78bfa'],snow:['Neve','fa-snowflake','#bae6fd']};
  const w=wMap[weather];
  document.getElementById('weatherText').textContent=w[0];
  document.getElementById('weatherIcon').className='fa-solid '+w[1];
  document.getElementById('weatherIcon').style.color=w[2];
  document.getElementById('tempText').textContent='('+temperature+'°C)';
  document.getElementById('timeIcon').className='fa-solid '+((timeOfDay>6&&timeOfDay<19)?'fa-sun':'fa-moon');
  document.getElementById('timeIcon').style.color=(timeOfDay>6&&timeOfDay<19)?'#fbbf24':'#c4b5fd';
  const kmh=Math.round(wind.speed*22);
  const arrow=document.getElementById('windText');
  arrow.style.transform=`rotate(${wind.angle*180/Math.PI}deg)`;
  arrow.innerHTML='→ '+kmh+' km/h';
  document.getElementById('ecoBiomass').textContent=ecoStats.biomass+' t';
  document.getElementById('ecoMoisture').textContent=ecoStats.moisture+'%';
  document.getElementById('ecoHerbivores').textContent=ecoStats.herbivores;
  document.getElementById('ecoZombies').textContent=ecoStats.zombies;
  const badge=document.getElementById('ecoHealthBadge');
  if(ecoStats.zombies>15){ badge.textContent='Infestação'; badge.style.background='rgba(69,26,26,.6)'; badge.style.color='#fca5a5'; badge.style.borderColor='#991b1b'; }
  else if(ecoStats.moisture<25){ badge.textContent='Seca'; badge.style.background='rgba(120,53,15,.5)'; badge.style.color='#fdba74'; badge.style.borderColor='#b45309'; }
  else { badge.textContent='Equilibrado'; badge.style.background='rgba(6,78,59,.5)'; badge.style.color='#6ee7b7'; badge.style.borderColor='#047857'; }
  
  const counts={};
  for(const a of animals) counts[a.species]=(counts[a.species]||0)+1;
  const names={deer:'Veados',rabbit:'Coelhos',fox:'Raposas',wolf:'Lobos',zombie:'Zumbis'};
  const colors={deer:'#d97706',rabbit:'#d1d5db',fox:'#f97316',wolf:'#94a3b8',zombie:'#a3e635'};
  let html='';
  for(const sp of ['deer','rabbit','fox','wolf','zombie']){
    html+=`<div style="display:flex;justify-content:space-between;background:rgba(10,14,18,.6);padding:3px 7px;border-radius:3px;border:1px solid #1a242e"><span style="color:${colors[sp]}"><i class="fa-solid ${sp==='deer'?'fa-horse':sp==='rabbit'?'fa-paw':sp==='fox'?'fa-dog':sp==='wolf'?'fa-shield-dog':'fa-skull'} mr-1"></i>${names[sp]}</span><b>${sp==='zombie'?zombies.length:(counts[sp]||0)}</b></div>`;
  }
  document.getElementById('speciesList').innerHTML=html;
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
    else if(ent.type==='bush') extra=`<div style="color:#4ade80"><b>Arbusto</b> ${ent.obj.berries?'— com bagas':''}</div>`;
  }
  const zNear=findZombieNear(t.x,t.y,1.5);
  if(zNear) extra+=`<div style="color:#a3e635"><b>Zumbi próximo!</b> HP ${Math.round(zNear.hp)}%</div>`;
  document.getElementById('ttBody').innerHTML=`
    <div>Umidade: <b style="color:#38bdf8">${Math.round(t.moist)}%</b></div>
    <div>Fertilidade: <b style="color:#4ade80">${Math.round(t.fertility)}%</b></div>
    <div>Elevação: <b style="color:#c4b5fd">${Math.round(t.e*100)} m</b></div>
    ${t.snow>3?`<div style="color:#bae6fd">Neve: ${Math.round(t.snow)}%</div>`:''}
    ${t.crop?`<div style="color:#eab308">Cultivo: Fase ${t.crop.stage+1}/4</div>`:''}
    ${extra}
  `;
}
function hideTooltip(){ document.getElementById('tooltip').style.display='none'; }
