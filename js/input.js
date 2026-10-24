'use strict';
EZ.selectWeapon = function(name) {
  const p = EZ.state.player;
  if (!p.owned.has(name)) {
    EZ.message('Procure essa arma nas ruínas.');
    return;
  }
  if (p.reload > 0) {
    EZ.message('Espere terminar a recarga.');
    return;
  }
  p.weapon = name;
  EZ.state.tool = 'shoot';
};
EZ.useTool = function() {
  const s = EZ.state,
    p = s.player,
    m = s.input.mouse,
    g = EZ.pickTerrain(m.x, m.y),
    t = EZ.tile(g.x, g.y),
    inv = s.inventory;
  if (s.tool === 'eat') {
    if (inv.food > 0) {
      inv.food--;
      p.hunger = Math.max(0, p.hunger - 35);
      EZ.message('Você comeu.');
    } else EZ.message('Sem comida.');
    return;
  }
  if (s.tool === 'move') {
    p.target = g;
    return;
  }
  if (p.swimming) {
    EZ.message('Saia da água funda para usar ferramentas.');
    return;
  }
  if (!t || EZ.distance(p, g) > 2.8) {
    EZ.message('Aproxime-se: alcance máximo de 2,8 metros.');
    return;
  }
  const object = EZ.objectsNear(g.x, g.y, 2).filter(o => EZ.distance(o, g) < 1).sort((a, b) => EZ.distance(
      a, g) -
    EZ.distance(b, g))[0];
  if ((s.tool === 'chop' || s.tool === 'mine') && p.cooldown > 0) return;
  if (s.tool === 'chop' || s.tool === 'mine') {
    p.attackTime = .35;
  }
  if (s.tool === 'chop') {
    const z = s.actors.find(a => a.kind === 'zombie' && EZ.distance(a, g) < .9 && !a.dead);
    if (z) {
      if (p.cooldown > 0) return;
      p.cooldown = .5;
      EZ.damage(z, 'torso', 45, {
        x: (z.x - p.x) * 2,
        y: (z.y - p.y) * 2,
        z: .2
      }, 'chest');
      return;
    }
    if (object?.kind === 'tree') {
      p.cooldown = .5;
      object.hp--;
      EZ.sound(120);
      if (object.hp <= 0) {
        inv.wood += 5;
        EZ.removeObject(object);
      }
    }
  } else if (s.tool === 'mine' && object?.kind === 'rock') {
    p.cooldown = .5;
    object.hp--;
    EZ.sound(400);
    if (object.hp <= 0) {
      inv.stone += 4;
      EZ.removeObject(object);
    }
  } else if (s.tool === 'forage') {
    if (object?.kind === 'bush' && object.berries) {
      object.berries = false;
      inv.food += 2;
    } else if (t.crop?.progress >= 100) {
      inv.food += 3;
      inv.seeds += 2;
      t.crop = null;
    } else EZ.message('Nada pronto para colher.');
  } else if (s.tool === 'plant') {
    if (!t.water && !t.crop && inv.seeds > 0 && EZ.freeSpot(t.x + .5, t.y + .5)) {
      t.crop = {
        progress: 0
      };
      t.field = true;
      inv.seeds--;
    } else EZ.message('Escolha um terreno livre e tenha sementes.');
  } else if (s.tool === 'water') {
    if (t.water) {
      p.thirst = 0;
      p.waterBottle = 3;
      EZ.message('Você bebeu e encheu o cantil.');
    } else {
      if (p.waterBottle <= 0) {
        EZ.message('Encha o cantil no rio.');
        return;
      }
      p.waterBottle--;
      t.moist = Math.min(100, t.moist + 35);
      EZ.message('Solo irrigado.');
    }
  } else if (s.tool === 'campfire') {
    if (inv.wood >= 5 && inv.stone >= 3 && EZ.freeSpot(g.x, g.y) && !s.fires.some(f => EZ.distance(f,
        g) < 1)) {
      inv.wood -= 5;
      inv.stone -= 3;
      s.fires.push({
        x: g.x,
        y: g.y
      });
    } else EZ.message('Precisa de espaço, 5 madeiras e 3 pedras.');
  }
};
EZ.pause = function() {
  const s = EZ.state;
  if (s.mode === 'playing') s.mode = 'paused';
  else if (s.mode === 'paused') s.mode = 'playing';
  s.input.down = false;
  s.input.pressed = false;
};
EZ.bindInput = function() {
  const s = EZ.state,
    canvas = EZ.canvas;

  function clear() {
    s.input.keys.clear();
    s.input.down = false;
    s.input.pressed = false;
    s.input.drag = null;
  }

  function point(e) {
    const r = canvas.getBoundingClientRect();
    s.input.mouse = {
      x: (e.clientX - r.left) * canvas.width / r.width,
      y: (e.clientY - r.top) * canvas.height / r.height
    };
  }
  window.addEventListener('keydown', e => {
    if (e.target.closest('input,textarea,select')) return;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    s.input.keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'Space') EZ.pause();
    if (s.mode !== 'playing') return;
    const w = {
      Digit1: 'pistol',
      Digit2: 'rifle',
      Digit3: 'shotgun'
    } [e.code];
    if (w) EZ.selectWeapon(w);
    if (e.code === 'KeyR') EZ.reload();
    if (e.code === 'KeyF') {
      s.camera.panX = s.camera.panY = 0;
    }
    if (e.code === 'KeyE') {
      const previous = s.tool;
      s.tool = 'eat';
      EZ.useTool();
      s.tool = previous;
    }
  });
  window.addEventListener('keyup', e => s.input.keys.delete(e.code));
  window.addEventListener('blur', () => {
    clear();
    if (s.mode === 'playing') s.mode = 'paused';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clear();
      if (s.mode === 'playing') s.mode = 'paused';
    }
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (s.mode !== 'playing') return;
    point(e);
    EZ.unlockAudio();
    canvas.setPointerCapture(e.pointerId);
    if (e.button === 2 || e.button === 1) s.input.drag = {
      x: e.clientX,
      y: e.clientY,
      px: s.camera.panX,
      py: s.camera.panY
    };
    else if (e.button === 0) {
      s.input.down = true;
      s.input.pressed = true;
    }
  });
  canvas.addEventListener('pointermove', e => {
    point(e);
    const d = s.input.drag;
    if (d) {
      const r = canvas.getBoundingClientRect();
      s.camera.panX = d.px + (e.clientX - d.x) * canvas.width / r.width;
      s.camera.panY = d.py + (e.clientY - d.y) * canvas.height / r.height;
    }
  });
  canvas.addEventListener('pointerup', () => {
    s.input.down = false;
    s.input.drag = null;
  });
  canvas.addEventListener('pointercancel', clear);
  canvas.addEventListener('lostpointercapture', () => {
    s.input.down = false;
    s.input.drag = null;
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    s.camera.scale = EZ.clamp(s.camera.scale + (e.deltaY < 0 ? 1 : -1), 2, 5);
    EZ.resize();
  }, {
    passive: false
  });
  document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => {
    s.tool = b.dataset.tool;
  });
  document.querySelectorAll('[data-weapon]').forEach(b => b.onclick = () => EZ.selectWeapon(b.dataset
    .weapon));

  document.getElementById('pause').onclick = EZ.pause;
  document.getElementById('newWorld').onclick = () => EZ.reset((Math.random() * 1e9) | 0);
  document.getElementById('audio').onclick = () => {
    EZ.unlockAudio();
    s.muted = !s.muted;
  };
  document.getElementById('reload').onclick = EZ.reload;
  document.getElementById('start').onclick = () => {
    EZ.unlockAudio();
    s.mode = 'playing';
    document.getElementById('intro').hidden = true;
  };
};
