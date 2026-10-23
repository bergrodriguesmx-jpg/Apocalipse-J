function fireWeapon(mouseIsoX, mouseIsoY) {
  if (!player.equippedWeapon) return;
  if (player.shootCd > 0) return;
  if (player.ammo <= 0) {
    snd(150, 'square', 0.05, 0.1);
    return;
  }
  
  const stat = WEAPON_STATS[player.equippedWeapon];
  player.shootCd = stat.cd;
  player.ammo--;

  // Pega a posição exata do jogador na tela
  const pIso = gridToIso(player.x, player.y);
  const pY = pIso.y - 15; // Altura aproximada da arma

  // Calcula o ângulo do jogador até o mouse
  const dx = mouseIsoX - pIso.x;
  const dy = mouseIsoY - pY;
  const visualAngle = Math.atan2(dy, dx);

  // Para a física do jogo, precisamos saber o ângulo em coordenadas de grid (isométricas)
  const targetGrid = isoToGrid(mouseIsoX, mouseIsoY + 15); 
  const gridDx = targetGrid.x - player.x;
  const gridDy = targetGrid.y - player.y;
  const baseAngle = Math.atan2(gridDy, gridDx);

  for (let i = 0; i < stat.pellets; i++) {
    const spreadOffset = (Math.random() - 0.5) * stat.spread;
    
    projectiles.push({
      // Física (Grid)
      x: player.x + Math.cos(baseAngle + spreadOffset) * 0.4,
      y: player.y + Math.sin(baseAngle + spreadOffset) * 0.4,
      vx: Math.cos(baseAngle + spreadOffset) * stat.speed,
      vy: Math.sin(baseAngle + spreadOffset) * stat.speed,
      life: 1.4,
      damage: stat.dmg,
      // Visual (Tela)
      angle: visualAngle + spreadOffset, 
      trail: []
    });
  }

  if (player.equippedWeapon === 'shotgun') {
    snd(70, 'square', 0.18, 0.35);
    setTimeout(() => snd(120, 'triangle', 0.1, 0.25), 40);
  } else if (player.equippedWeapon === 'rifle') {
    snd(180, 'square', 0.09, 0.28);
  } else {
    snd(260, 'square', 0.12, 0.25);
  }
}
