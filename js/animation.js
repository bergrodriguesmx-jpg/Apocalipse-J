'use strict';
// O relógio da animação avança na simulação, nunca durante o desenho.
// As poses de direções diferentes da prancha NÃO são quadros de um mesmo passo.
EZ.animationSettings = {
  walkStride: 1.65, // metros por ciclo completo (dois passos)
  runStride: 2.25,
  directionMargin: .09,
  turnResponse: 18,
  gaitResponse: 12,
  runResponse: 8
};
EZ.wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
EZ.screenFacing = function(angle) {
  return Math.atan2((Math.cos(angle) + Math.sin(angle)) * .5,
    Math.cos(angle) - Math.sin(angle));
};
EZ.spriteDirection = function(a) {
  const angle = EZ.screenFacing(a.angle);
  return ((Math.round((angle - Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8;
};
EZ.resetSurvivorAnimation = function(a) {
  a.animation = {
    phase: 0, time: 0, gait: 0, run: 0, swim: 0, speed: 0,
    facing: EZ.screenFacing(a.angle), direction: EZ.spriteDirection(a),
    recoil: 0, moving: false
  };
  return a.animation;
};
EZ.updateSurvivorAnimation = function(a, dt) {
  if (!a || a.dead || dt <= 0) return;
  const v = a.animation || EZ.resetSurvivorAnimation(a), cfg = EZ.animationSettings;
  const distance = Math.max(0, Math.min(a.moveDistance || 0, 6 * dt));
  const speed = distance / dt;
  const approach = (value, target, response) => target + (value - target) * Math.exp(-response * dt);
  v.time += dt;
  v.speed = approach(v.speed, speed, 16);
  // Histerese evita ligar/desligar a passada repetidamente ao quase parar.
  v.moving = v.moving ? v.speed > .055 : v.speed > .13;
  const targetGait = v.moving ? EZ.clamp(v.speed / 1.7, 0, 1) : 0;
  v.gait = approach(v.gait, targetGait, cfg.gaitResponse);
  v.run = approach(v.run, a.running && !a.swimming ? 1 : 0, cfg.runResponse);
  v.swim = approach(v.swim, a.swimming ? 1 : 0, 10);
  // Colisão ou bloqueio não fazem os pés correrem no lugar.
  const stride = cfg.walkStride + (cfg.runStride - cfg.walkStride) * v.run;
  v.phase = (v.phase + distance / stride * Math.PI * 2) % (Math.PI * 2);
  v.recoil *= Math.exp(-24 * dt);

  let target = EZ.screenFacing(a.angle);
  const aiming = !a.swimming && ((EZ.state.tool === 'shoot' && a.weapon) || a.attackTime > 0);
  if (aiming) {
    const hand = EZ.project({ x: a.x, y: a.y, z: a.z + 1.15 });
    const mouse = EZ.state.input.mouse;
    if (Math.hypot(mouse.x - hand.x, mouse.y - hand.y) > 3) {
      target = Math.atan2(mouse.y - hand.y, mouse.x - hand.x);
    }
  }
  v.facing = EZ.wrapAngle(v.facing + EZ.wrapAngle(target - v.facing) *
    (1 - Math.exp(-cfg.turnResponse * dt)));
  const center = Math.PI / 2 + v.direction * Math.PI / 4;
  if (Math.abs(EZ.wrapAngle(v.facing - center)) > Math.PI / 8 + cfg.directionMargin) {
    v.direction = ((Math.round((v.facing - Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8;
  }
};
EZ.survivorMotion = function(a) {
  const v = a.animation || EZ.resetSurvivorAnimation(a);
  const gait = v.gait * (1 - v.swim);
  const phase = v.phase;
  const fx = Math.cos(v.facing), fy = Math.sin(v.facing);
  // Movimentos contínuos; só a rasterização final é encaixada na grade de pixels.
  return {
    direction: v.direction, phase, gait, run: v.run, swim: v.swim,
    fx, fy,
    bob: -Math.abs(Math.sin(phase)) * gait * (.6 + .55 * v.run),
    breath: Math.sin(v.time * 2.4) * .4 * (1 - gait) + Math.sin(v.time * 3) * v.swim * .8,
    lean: fx * v.run * gait * 2.2 - fx * v.recoil * 1.5,
    sway: Math.sin(phase) * gait * .45,
    stride: gait * (2 + 1.6 * v.run),
    lift: gait * (.9 + 2.1 * v.run)
  };
};
