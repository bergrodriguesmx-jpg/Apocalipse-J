'use strict';
// Recortes da imagem original, sem redesenhar ou alterar o arquivo fornecido.
EZ.spriteFrames = {
  "idle": [
    [163, 60, 103, 211],
    [356, 60, 95, 216],
    [530, 62, 94, 213],
    [691, 64, 96, 205],
    [843, 61, 101, 211],
    [1011, 62, 96, 213],
    [1177, 61, 93, 215],
    [1333, 64, 99, 214]
  ],
  "walk": [
    [125, 321, 91, 193],
    [220, 326, 86, 191],
    [312, 326, 84, 192],
    [406, 325, 87, 193],
    [500, 321, 99, 190],
    [604, 320, 95, 197],
    [707, 320, 90, 201],
    [810, 318, 89, 202],
    [905, 319, 86, 193],
    [994, 316, 90, 204],
    [1087, 322, 90, 199],
    [1174, 324, 97, 191],
    [1268, 325, 86, 194],
    [1352, 322, 90, 194]
  ],
  "attack": [
    [117, 547, 100, 249],
    [226, 585, 93, 225],
    [310, 578, 122, 228],
    [385, 602, 150, 199],
    [539, 572, 129, 230],
    [659, 578, 110, 234],
    [784, 582, 114, 229],
    [901, 579, 116, 233],
    [1005, 561, 108, 244],
    [1105, 581, 107, 228],
    [1204, 590, 110, 209],
    [1328, 590, 111, 210]
  ],
  "ready": [
    [138, 861, 104, 199],
    [274, 862, 96, 190],
    [387, 860, 111, 192],
    [514, 857, 111, 190],
    [645, 858, 112, 195],
    [802, 853, 108, 207],
    [938, 856, 114, 197],
    [1070, 860, 110, 191],
    [1196, 860, 108, 193],
    [1325, 864, 107, 196]
  ]
};
EZ.loadSprites = function() {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      EZ.survivorImage = img;
      resolve(true);
    };
    img.onerror = () => {
      EZ.message('Não foi possível carregar assets/survivor.png.');
      resolve(false);
    };
    img.src = EZ.embeddedSprite || 'assets/survivor.png';
  });
};
EZ.spriteDirection = function(a) {
  const dx = Math.cos(a.angle) - Math.sin(a.angle),
    dy = (Math.cos(a.angle) + Math.sin(a.angle)) * .5;
  return ((Math.round((Math.atan2(dy, dx) - Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8;
};
EZ.drawSurvivor = function(a) {
  if (!EZ.survivorImage) return false;
  const dir = EZ.spriteDirection(a),
    moving = Math.hypot(a.vx, a.vy) > .12;
  // A prancha tem 14 poses de caminhada, não oito ciclos completos.
  const walks = [
      [0, 1],
      [2],
      [3, 4],
      [5, 6],
      [7],
      [8, 9],
      [10, 11],
      [12, 13]
    ],
    attacks = [0, 2, 4, 6, 7, 8, 10, 11],
    readies = [0, 1, 2, 3, 5, 6, 8, 9];
  let f = EZ.spriteFrames.idle[dir],
    baseHeight = 46;
  if (a.attackTime > 0 && !a.swimming) {
    f = EZ.spriteFrames.attack[attacks[dir]];
    baseHeight = 58;
  } else if (moving && !a.swimming) {
    const frames = walks[dir];
    f = EZ.spriteFrames.walk[frames[Math.floor(a.phase * 1.5) % frames.length]];
  } else if (EZ.state.tool === 'chop' && !a.swimming) f = EZ.spriteFrames.ready[readies[dir]];
  const p = EZ.project(a),
    scale = .22,
    width = Math.round(f[2] * scale),
    height = Math.round(f[3] * scale),
    c = EZ.ctx;
  c.save();
  c.imageSmoothingEnabled = false;
  if (a.swimming) {
    const surface = EZ.project({
      x: a.x,
      y: a.y,
      z: 0
    });
    c.beginPath();
    c.rect(p.x - 40, p.y - height - 10, 80, Math.max(0, surface.y - (p.y - height - 10)));
    c.clip();
  }
  c.drawImage(EZ.survivorImage, ...f, Math.round(p.x - width / 2), Math.round(p.y - height + 2), width,
    height);
  c.restore();
  if (a.swimming) {
    const q = EZ.project({
        x: a.x,
        y: a.y,
        z: 0
      }),
      wave = Math.floor(EZ.state.elapsed * 5) % 3;
    EZ.line({
      x: q.x - 10 - wave,
      y: q.y
    }, {
      x: q.x + 10 + wave,
      y: q.y
    }, '#87b3ba', 1);
    EZ.line({
      x: q.x - 7,
      y: q.y + 3
    }, {
      x: q.x + 7,
      y: q.y + 3
    }, '#527d8a', 1);
  }
  if (a.weapon && !a.swimming && EZ.state.tool === 'shoot') {
    const hand = EZ.project({
        x: a.x,
        y: a.y,
        z: a.z + 1.15
      }),
      m = EZ.state.input.mouse,
      ang = Math.atan2(m.y - hand.y, m.x - hand.x),
      len = a.weapon === 'pistol' ? 7 : 13;
    EZ.line(hand, {
      x: hand.x + Math.cos(ang) * len,
      y: hand.y + Math.sin(ang) * len
    }, '#283336', 3);
    if (a.cooldown > EZ.weapons[a.weapon].rate - .06) EZ.rect(hand.x + Math.cos(ang) * (len + 2), hand.y +
      Math.sin(ang) * (len + 2), 3, 3, '#f4cf82');
  }
  return true;
};
