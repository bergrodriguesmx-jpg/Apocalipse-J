function fireWeapon(gx, gy) {
  if (!player.equippedWeapon) return;
  if (player.shootCd > 0) return;
  if (player.ammo <= 0) {
    snd(150, 'square', 0.05, 0.1); // Som de clique vazio
    return;
  }
  
  const stat = WEAPON_STATS[player.equippedWeapon];
  player.shootCd = stat.cd;
  player.ammo--; // Consome 1 bala por tiro

  const dx = gx + 0.5 - player.x;
  const dy = gy + 0.5 - player.y;
  const dd = Math.hypot(dx, dy);
  if (dd < 0.1) return;
  const baseAngle = Math.atan2(dy, dx);

  for (let i = 0; i < stat.pellets; i++) {
    const a = baseAngle + (Math.random() - 0.5) * stat.spread;
    projectiles.push({
      x: player.x + Math.cos(a) * 0.4,
      y: player.y + Math.sin(a) * 0.4,
      vx: Math.cos(a) * stat.speed,
      vy: Math.sin(a) * stat.speed,
      life: 1.4,
      damage: stat.dmg,
      angle: a,
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
