'use strict';
EZ.updateHUD = function() {
  const s = EZ.state,
    p = s.player;
  for (const [id, value] of Object.entries({
      hp: p.hp,
      food: 100 - p.hunger,
      water: 100 - p.thirst,
      energy: p.stamina
    })) {
    document.getElementById(id).value = value;
    document.getElementById(id + 'Text').textContent = Math.max(0, Math.ceil(value)) + '%';
  }
  document.getElementById('ammo').textContent = !p.weapon ? 'PROCURE ARMAS' : p.reload > 0 ?
    'RECARREGANDO' : p.ammo[p.weapon] + ' / ' + p.reserve;
  document.getElementById('clock').textContent = String(Math.floor(s.clock)).padStart(2, '0') + ':' +
    String(Math.floor(s.clock % 1 * 60)).padStart(2, '0');
  document.getElementById('day').textContent = 'DIA ' + s.day + ' · ' + ['PRIMAVERA', 'VERÃO', 'OUTONO',
    'INVERNO'
  ][Math.floor((s.day - 1) / 4) % 4];
  document.getElementById('weather').textContent = s.weather.toUpperCase();
  document.getElementById('inventory').textContent =
    `MADEIRA ${s.inventory.wood} · PEDRA ${s.inventory.stone} · COMIDA ${s.inventory.food} · SEMENTES ${s.inventory.seeds} · CANTIL ${p.waterBottle}/3`;
  const zs = s.actors.filter(a => a.kind === 'zombie' && !a.dead).length,
    fauna = s.actors.filter(a => !['zombie', 'player'].includes(a.kind) && !a.dead).length;
  document.getElementById('eco').textContent = `REGIÃO ATIVA: ${zs} infectados · ${fauna} animais`;
  const g = EZ.pickTerrain(s.input.mouse.x, s.input.mouse.y),
    tile = EZ.tile(g.x, g.y);
  document.getElementById('terrain').textContent = tile ?
    `ALTITUDE ${EZ.groundAt(g.x,g.y).toFixed(1)} m · ${tile.water?'PROFUNDIDADE '+EZ.depthAt(g.x,g.y).toFixed(1)+' m':'UMIDADE '+Math.round(tile.moist)+'%'}` +
    (tile.crop ? ` · CULTIVO ${Math.floor(tile.crop.progress)}%` : '') : '';
  document.getElementById('stream').textContent =
    `${s.world.stats.drawnTiles} células visíveis · ${s.world.chunks.size} chunks em memória`;
  document.getElementById('swim').textContent = p.swimming ?
    `NADANDO · FÔLEGO ${Math.ceil(p.oxygen)}% · profundidade ${EZ.depthAt(p.x,p.y).toFixed(1)} m` : p
    .wading ? 'ATRAVESSANDO ÁGUA RASA' : '';
  document.getElementById('message').textContent = s.mode === 'dead' ?
    'VOCÊ MORREU · NOVO MUNDO PARA RECOMEÇAR' : s.mode === 'paused' ? 'PAUSADO · ESPAÇO PARA CONTINUAR' : s
    .messageTime > 0 ? s.message : EZ.archive.warning ?
    'Armazenamento indisponível: regiões exploradas serão conservadas na memória.' : '';
  document.getElementById('pause').textContent = s.mode === 'paused' ? 'Continuar' : 'Pausar';
  document.getElementById('audio').textContent = s.muted ? 'Som: não' : 'Som: sim';
  for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('active', b.dataset.tool ===
    s.tool);
  for (const b of document.querySelectorAll('[data-weapon]')) {
    b.classList.toggle('active', b.dataset.weapon === p.weapon);
    b.disabled = !p.owned.has(b.dataset.weapon);
    b.title = b.disabled ? 'Encontre esta arma em uma ruína' : '';
  }
};
