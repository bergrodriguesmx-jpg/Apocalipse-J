'use strict';
EZ.project = function(p) {
  const c = EZ.state.camera;
  return {
    x: Math.round((p.x - p.y) * 16 + c.x + c.panX),
    y: Math.round((p.x + p.y) * 8 - (p.z ?? EZ.surfaceAt(p.x, p.y)) * 24 + c.y + c.panY)
  };
};
EZ.unproject = function(x, y, z = 0) {
  const c = EZ.state.camera,
    ix = x - c.x - c.panX,
    iy = y - c.y - c.panY + z * 24;
  return {
    x: (ix / 16 + iy / 8) / 2,
    y: (iy / 8 - ix / 16) / 2
  };
};
EZ.rect = function(x, y, w, h, color) {
  const c = EZ.ctx;
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
};
// Bresenham: todos os traços são pixels inteiros, inclusive ossos em rotação.
EZ.line = function(a, b, color, width = 1) {
  let x = Math.round(a.x),
    y = Math.round(a.y),
    x2 = Math.round(b.x),
    y2 = Math.round(b.y),
    dx = Math.abs(x2 - x),
    sx = x < x2 ? 1 : -1,
    dy = -Math.abs(y2 - y),
    sy = y < y2 ? 1 : -1,
    err = dx + dy;
  for (let i = 0; i < 2000; i++) {
    EZ.rect(x - Math.floor(width / 2), y - Math.floor(width / 2), width, width, color);
    if (x === x2 && y === y2) break;
    const e = 2 * err;
    if (e >= dy) {
      err += dy;
      x += sx;
    }
    if (e <= dx) {
      err += dx;
      y += sy;
    }
  }
};
EZ.diamond = function(x, y, w, h, color) {
  for (let row = -h; row < h; row++) {
    const half = Math.round(w * (1 - Math.abs(row + .5) / h));
    EZ.rect(x - half, y + row, half * 2, 1, color);
  }
};
EZ.shadow = function(x, y, r = 7) {
  const p = EZ.project({
    x,
    y
  });
  EZ.diamond(p.x, p.y, r, 3, '#263c35');
};
// Rasterização de polígonos por scanline: as alturas dos quatro cantos são compartilhadas.
EZ.polygon = function(points, color) {
  const min = Math.floor(Math.min(...points.map(p => p.y))),
    max = Math.ceil(Math.max(...points.map(p => p.y)));
  EZ.ctx.fillStyle = color;
  for (let y = Math.max(0, min); y <= Math.min(EZ.canvas.height, max); y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      if ((a.y <= y + .5 && b.y > y + .5) || (b.y <= y + .5 && a.y > y + .5)) xs.push(a.x + (y + .5 - a.y) *
        (b.x - a.x) / (b.y - a.y));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) EZ.ctx.fillRect(Math.floor(xs[i]), y, Math.ceil(xs[i + 1]) -
      Math.floor(xs[i]) + 1, 1);
  }
};
EZ.pickTerrain = function(x, y) {
  let previous = 6;
  for (let z = 6; z >= -3; z -= .25) {
    const g = EZ.unproject(x, y, z);
    if (z <= EZ.surfaceAt(g.x, g.y)) {
      let lo = z,
        hi = previous;
      for (let j = 0; j < 9; j++) {
        const mid = (lo + hi) / 2,
          q = EZ.unproject(x, y, mid);
        if (mid > EZ.surfaceAt(q.x, q.y)) hi = mid;
        else lo = mid;
      }
      return EZ.unproject(x, y, (lo + hi) / 2);
    }
    previous = z;
  }
  return EZ.unproject(x, y);
};
EZ.tileOnScreen = function(t) {
  const vertices = [
    [t.x, t.y],
    [t.x + 1, t.y],
    [t.x + 1, t.y + 1],
    [t.x, t.y + 1]
  ].map(([x, y], i) => EZ.project({
    x,
    y,
    z: Math.max(0, t.heights[i])
  }));
  return Math.max(...vertices.map(p => p.x)) >= 0 && Math.min(...vertices.map(p => p.x)) <= EZ.canvas
    .width && Math.max(...vertices.map(p => p.y)) >= 0 && Math.min(...vertices.map(p => p.y)) <= EZ.canvas
    .height;
};
EZ.drawTile = function(t) {
  const h = t.heights,
    points = [
      [t.x, t.y],
      [t.x + 1, t.y],
      [t.x + 1, t.y + 1],
      [t.x, t.y + 1]
    ].map(([x, y], i) => EZ.project({
      x,
      y,
      z: Math.max(0, h[i])
    }));
  const season = Math.floor((EZ.state.day - 1) / 4) % 4,
    slope = h[2] - h[0],
    colors = season === 3 ? ['#9eafa8', '#acbab0', '#95a59e'] : season === 2 ? ['#777449', '#848052',
      '#6a6d45'
    ] : ['#60764c', '#6b7e50', '#596c47'];
  const color = t.water ? (t.depth > 2 ? '#234453' : t.depth > 1 ? '#305a66' : '#467c7d') : t.field ?
    '#786046' : t.bed < .35 ? '#99946d' : colors[slope > .18 ? 2 : slope < -.18 ? 1 : Math.floor(t.variant *
      3)];
  EZ.polygon(points, color);
  const p = EZ.project({
    x: t.x + .5,
    y: t.y + .5
  });
  for (let k = 0; k < 3; k++) {
    const u = .18 + EZ.hash(t.x * 7 + k, t.y * 9 + k, EZ.state.seed) * .64,
      v = .18 + EZ.hash(t.y * 4 + k, t.x * 3, 31) * .64,
      q = EZ.project({
        x: t.x + u,
        y: t.y + v
      });
    EZ.rect(q.x, q.y, t.water ? 4 : 2, 1, t.water ? (t.depth > 1 ? '#3c6c78' : '#78a3a0') : t.grass < 25 ?
      '#95835c' : '#83915b');
  }
  if (t.water && t.depth < .5) {
    EZ.line(points[0], points[1], '#7b9e99', 1);
  }
  if (t.crop) {
    const n = Math.min(4, 1 + Math.floor(t.crop.progress / 25));
    for (let i = 0; i < 3; i++) {
      EZ.rect(p.x - 5 + i * 4, p.y - n * 2, 1, n * 2, t.crop.progress >= 100 ? '#dfbb69' : '#9aad61');
      EZ.rect(p.x - 6 + i * 4, p.y - n * 2, 3, 2, '#b9bc70');
    }
  }
};
EZ.drawObject = function(o) {
  const p = EZ.project(o),
    x = p.x,
    y = p.y;
  EZ.shadow(o.x, o.y, o.kind === 'barn' ? 27 : 10);
  if (o.kind === 'tree') {
    // Transparência ao ocultar o jogador, sem apagar a colisão.
    const pp = EZ.project(EZ.state.player),
      fade = Math.abs(pp.x - x) < 20 && pp.y < y && pp.y > y - o.h * 24;
    EZ.ctx.globalAlpha = fade ? .35 : 1;
    EZ.rect(x - 2, y - 32, 5, 32, '#453d30');
    EZ.rect(x - 1, y - 28, 2, 27, '#88704a');
    if (o.pine) {
      for (let tier = 0; tier < 4; tier++) {
        const top = y - o.h * 24 + tier * 11;
        for (let j = 0; j < 19; j++) {
          const w = Math.floor(j * .65) + 2;
          EZ.rect(x - w, top + j, w * 2, 1, j % 4 === 0 ? '#607e59' : '#385d4b');
        }
        EZ.rect(x - 4, top + 10, 5, 2, '#769261');
      }
    } else {
      EZ.rect(x - 18, y - 54, 36, 25, '#3d614a');
      EZ.rect(x - 13, y - 64, 27, 37, '#3d614a');
      EZ.rect(x - 16, y - 56, 24, 19, '#5b7c50');
      EZ.rect(x - 11, y - 61, 19, 11, '#78955a');
      for (let i = 0; i < 9; i++) EZ.rect(x - 13 + i % 3 * 8, y - 53 + Math.floor(i / 3) * 7, 4, 2,
        '#88a064');
    }
    EZ.ctx.globalAlpha = 1;
  } else if (o.kind === 'rock') {
    EZ.rect(x - 9, y - 7, 18, 7, '#586569');
    EZ.rect(x - 6, y - 12, 13, 9, '#7d8984');
    EZ.rect(x - 4, y - 12, 8, 3, '#a2aaa0');
  } else if (o.kind === 'bush') {
    EZ.rect(x - 7, y - 8, 14, 7, '#3c6445');
    EZ.rect(x - 5, y - 11, 10, 6, '#6e8d50');
    if (o.berries) {
      EZ.rect(x - 4, y - 7, 2, 2, '#c97862');
      EZ.rect(x + 3, y - 9, 2, 2, '#c97862');
    }
  } else if (o.kind === 'fence') {
    const a = EZ.project({
        x: o.x - o.hw,
        y: o.y,
        z: (o.z || 0) + .7
      }),
      b = EZ.project({
        x: o.x + o.hw,
        y: o.y,
        z: (o.z || 0) + .7
      });
    EZ.line(a, b, '#b49b6b', 2);
    EZ.line({
      x: a.x,
      y: a.y + 8
    }, {
      x: b.x,
      y: b.y + 8
    }, '#756a50', 2);
    EZ.rect(x - 1, y - 20, 3, 20, '#c4aa75');
  } else if (o.kind === 'barn') {
    EZ.rect(x - 31, y - 43, 62, 43, '#716b57');
    EZ.rect(x + 3, y - 43, 28, 43, '#555a50');
    for (let i = 0; i < 6; i++) EZ.rect(x - 29, y - 38 + i * 6, 58, 1, '#90816a');
    EZ.rect(x - 9, y - 24, 15, 24, '#2c3c38');
    EZ.rect(x + 13, y - 27, 10, 10, '#b6b68c');
    EZ.rect(x + 17, y - 27, 1, 10, '#545b4e');
    for (let row = 0; row < 22; row++) EZ.rect(x - 39 + row, y - 43 - row, 78 - row * 2, 1, row % 4 ===
      0 ? '#c38860' : '#98644f');
  }
};
EZ.drawSkeleton = function(nodes, links, color, skin, missing = new Set(), rag = false) {
  const list = links.filter(l => l.draw && !missing.has(l.group)).sort((a, b) => {
    const A = nodes[a.b],
      B = nodes[b.b];
    return A.x + A.y - B.x - B.y;
  });
  for (const l of list) {
    const a = EZ.project(nodes[l.a]),
      b = EZ.project(nodes[l.b]),
      col = l.group.includes('Leg') ? '#46545c' : l.group === 'head' ? skin : color;
    EZ.line(a, b, '#253330', l.width + 2);
    EZ.line(a, b, col, l.width);
    EZ.line({
      x: a.x - 1,
      y: a.y
    }, {
      x: b.x - 1,
      y: b.y
    }, l.group.includes('Leg') ? '#6a7470' : l.group === 'head' ? skin : '#a0a17a', 1);
  }
  if (nodes.head && !missing.has('head')) {
    const p = EZ.project(nodes.head);
    EZ.rect(p.x - 3, p.y - 4, 7, 7, '#263430');
    EZ.rect(p.x - 2, p.y - 3, 5, 5, skin);
    EZ.rect(p.x - 2, p.y - 4, 5, 2, '#4a4e3b');
    EZ.rect(p.x + 1, p.y - 1, 1, 1, rag ? '#574e3c' : '#ebd098');
  }
};
EZ.drawActor = function(a) {
  EZ.shadow(a.x, a.y, a.kind === 'rabbit' ? 4 : 7);
  if (a.kind === 'player') {
    EZ.drawSurvivor(a);
    return;
  }
  if (a.kind === 'player' || a.kind === 'zombie') {
    const pose = EZ.pose(a),
      links = EZ.boneDefs.map(([aa, b, group, width]) => ({
        a: aa,
        b,
        group,
        width,
        draw: true
      }));
    EZ.drawSkeleton(pose, links, a.color, a.skin, a.missing);
    if (a.kind === 'player') {
      const at = EZ.project({
          x: a.x,
          y: a.y,
          z: a.z + 1.23
        }),
        m = EZ.state.input.mouse,
        angle = Math.atan2(m.y - at.y, m.x - at.x),
        to = {
          x: at.x + Math.cos(angle) * 11,
          y: at.y + Math.sin(angle) * 11
        };
      EZ.line(at, to, '#253438', 3);
      EZ.line(at, to, '#afb1a0', 1);
    }
  } else {
    const p = EZ.project({
        x: a.x,
        y: a.y,
        z: a.z + .25
      }),
      small = a.kind === 'rabbit',
      col = {
        deer: '#b08c62',
        rabbit: '#bfbaa0',
        fox: '#bd794e',
        wolf: '#7f8c88'
      } [a.kind];
    EZ.rect(p.x - 7, p.y - 6, small ? 9 : 17, small ? 5 : 9, col);
    EZ.rect(p.x + 5, p.y - 10, 5, 7, col);
    EZ.rect(p.x + 8, p.y - 9, 1, 1, '#233b34');
    if (small) {
      EZ.rect(p.x + 4, p.y - 15, 2, 6, col);
      EZ.rect(p.x + 7, p.y - 14, 2, 5, col);
    } else {
      const s = Math.round(Math.sin(a.phase) * 2);
      EZ.rect(p.x - 5, p.y + 2, 2, 5 + s, '#564c3d');
      EZ.rect(p.x + 4, p.y + 2, 2, 5 - s, '#564c3d');
      if (a.kind === 'deer') {
        EZ.rect(p.x + 5, p.y - 16, 1, 6, '#d5c7a3');
        EZ.rect(p.x + 3, p.y - 16, 5, 1, '#d5c7a3');
      }
    }
  }
};
EZ.render = function() {
  const s = EZ.state,
    c = EZ.ctx;
  c.fillStyle = '#253b3a';
  c.fillRect(0, 0, EZ.canvas.width, EZ.canvas.height);
  s.world.stats.drawnTiles = 0;
  const draw = [];
  const push = (p, fn) => {
    const q = EZ.project(p);
    if (q.x > -90 && q.x < EZ.canvas.width + 90 && q.y > -20 && q.y < EZ.canvas.height + 120) draw
      .push({
        depth: p.x + p.y + .05,
        fn
      });
  };
  for (const t of s.world.view)
    if (EZ.tileOnScreen(t)) {
      draw.push({
        depth: t.x + t.y,
        fn: () => EZ.drawTile(t)
      });
      s.world.stats.drawnTiles++;
    }
  for (const o of s.world.viewObjects) push(o, () => EZ.drawObject(o));
  for (const stain of s.stains) push(stain, () => {
    const q = EZ.project(stain);
    EZ.diamond(q.x, q.y, stain.r, 2, '#774c40');
  });
  for (const f of s.fires) push(f, () => {
    const p = EZ.project(f);
    EZ.rect(p.x - 6, p.y - 2, 12, 3, '#5b5544');
    EZ.rect(p.x - 3, p.y - 10, 6, 9, '#cb7b3d');
    EZ.rect(p.x - 1, p.y - 7 - (Math.floor(s.elapsed * 8) % 3), 3, 7, '#f1cc75');
  });
  for (const l of s.loot) push(l, () => {
    const p = EZ.project(l);
    EZ.diamond(p.x, p.y, 5, 3, '#d3c285');
    EZ.rect(p.x - 3, p.y - 5, 6, 5, l.kind === 'ammo' ? '#c7b078' : '#ac7557');
  });
  for (const a of s.actors)
    if (!a.dead) push(a, () => EZ.drawActor(a));
  for (const r of s.ragdolls) {
    const ns = Object.values(r.nodes),
      p = ns[0];
    push(p, () => {
      EZ.shadow(p.x, p.y, 9);
      EZ.ctx.globalAlpha = Math.min(1, r.life / 5);
      EZ.drawSkeleton(r.nodes, r.links, r.color, r.skin, new Set(), true);
      if (r.links.length === 0 && r.nodes.head) {
        const q = EZ.project(r.nodes.head);
        EZ.rect(q.x - 3, q.y - 3, 6, 6, r.skin);
      }
      EZ.ctx.globalAlpha = 1;
    });
  }
  draw.sort((a, b) => a.depth - b.depth);
  for (const d of draw) d.fn();
  for (const b of s.bullets) EZ.line(EZ.project(b.old), EZ.project(b), '#edd493', 1);
  for (const p of s.particles) {
    const q = EZ.project(p);
    EZ.rect(q.x, q.y, 2, 2, '#a05d4b');
  }
  const night = s.clock < 6 || s.clock > 19;
  if (night) {
    c.fillStyle = 'rgba(13,24,42,.35)';
    c.fillRect(0, 0, EZ.canvas.width, EZ.canvas.height);
  }
  if (s.weather === 'Chuva' || s.weather === 'Tempestade')
    for (let i = 0; i < 65; i++) {
      const x = (i * 71 + Math.floor(s.elapsed * 14)) % EZ.canvas.width,
        y = (i * 43 + Math.floor(s.elapsed * 90)) % EZ.canvas.height;
      EZ.line({
        x,
        y
      }, {
        x: x - 2,
        y: y + 5
      }, '#9cafac');
    }
  const m = s.input.mouse;
  EZ.rect(m.x - 5, m.y, 3, 1, '#ead8a8');
  EZ.rect(m.x + 3, m.y, 3, 1, '#ead8a8');
  EZ.rect(m.x, m.y - 5, 1, 3, '#ead8a8');
  EZ.rect(m.x, m.y + 3, 1, 3, '#ead8a8');
};
