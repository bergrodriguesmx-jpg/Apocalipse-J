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
    document.getElementById(id + 'Text').textContent = Math.ceil(value) + '%';
  }
  document.getElementById('ammo').textContent = p.reload > 0 ? 'RECARREGANDO' : p.ammo[p.weapon] +
    ' / ' + p.reserve;
  document.getElementById('clock').textContent = String(Math.floor(s.clock)).padStart(2, '0') + ':' +
    String(Math.floor(s.clock % 1 * 60)).padStart(2, '0');
  document.getElementById('day').textContent = 'DIA ' + s.day + ' · ' + ['PRIMAVERA', 'VERÃO',
    'OUTONO', 'INVERNO'
  ][Math.floor((s.day - 1) / 4) % 4];
  document.getElementById('weather').textContent = s.weather.toUpperCase();
  document.getElementById('inventory').textContent =
    `MADEIRA ${s.inventory.wood}   PEDRA ${s.inventory.stone}   COMIDA ${s.inventory.food}   SEMENTES ${s.inventory.seeds}`;
  const zs = s.actors.filter(a => a.kind === 'zombie' && !a.dead).length,
    fauna = s.actors.filter(a => !['zombie', 'player'].includes(a.kind) && !a.dead).length;
  document.getElementById('eco').textContent =
    `${zs} infectados · ${fauna} animais · ${s.kills} abatidos`;
  const tile = EZ.tile(...Object.values(EZ.unproject(s.input.mouse.x, s.input.mouse.y)));
  document.getElementById('terrain').textContent = tile ?
    `SOLO ${tile.x},${tile.y} · UMIDADE ${Math.round(tile.moist)}%` + (tile.crop ?
      ` · CULTIVO ${Math.floor(tile.crop.progress)}%` : '') : '';
  document.getElementById('message').textContent = s.mode === 'dead' ?
    'VOCÊ MORREU · NOVO MUNDO PARA RECOMEÇAR' : s.mode === 'paused' ?
    'PAUSADO · ESPAÇO PARA CONTINUAR' : s.messageTime > 0 ? s.message : '';
  document.getElementById('pause').textContent = s.mode === 'paused' ? 'Continuar' : 'Pausar';
  document.getElementById('audio').textContent = s.muted ? 'Som: não' : 'Som: sim';
  for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('active', b.dataset
    .tool === s.tool);
  for (const b of document.querySelectorAll('[data-weapon]')) b.classList.toggle('active', b.dataset
    .weapon === p.weapon);
  for (const b of document.querySelectorAll('[data-speed]')) b.classList.toggle('active', Number(b
    .dataset.speed) === s.speed);
};
