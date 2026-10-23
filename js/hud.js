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
    
    // Atualiza Painel da Arma
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
}

// As funções updateTooltip, hideTooltip e findEntityAt continuam iguais.
