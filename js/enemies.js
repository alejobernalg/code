// ---------------------------------------------------------------------
// Enemigos: definiciones, IA, spawner, resolución de daño y sprites
// ---------------------------------------------------------------------
import { W, PLATFORMS, GROUND_Y, ENEMY_DEFS, COLORS, JUMP_VELOCITY } from "./config.js";
import { applyPhysics, aabb, aabbOverlap, rand, px, pxG, circO, glow } from "./utils.js";
import { spawnParticles } from "./particles.js";
import { sfx } from "./audio.js";
import { state, awardScore, damagePlayer } from "./state.js";

const MID_LEFT = PLATFORMS[1];
const MID_RIGHT = PLATFORMS[2];
let nextId = 1;

// -----------------------------------------------------------------------
// SPAWNER
// -----------------------------------------------------------------------
function poolForTime(t) {
  const pool = ["normal"];
  if (t > 12) pool.push("normal", "arquero");
  if (t > 20) pool.push("escudo");
  if (t > 32) pool.push("veloz");
  return pool;
}

function pickSpawnPoint(side) {
  const fromLeft = side === "left";
  const onPlatform = Math.random() < 0.3;
  if (onPlatform) {
    const plat = fromLeft ? MID_LEFT : MID_RIGHT;
    return { x: fromLeft ? plat.x + 6 : plat.x + plat.w - 6, y: plat.y };
  }
  return { x: fromLeft ? -10 : W + 10, y: GROUND_Y };
}

export function spawnEnemy(tipo, side) {
  const def = ENEMY_DEFS[tipo];
  const point = pickSpawnPoint(side);
  const dir = side === "left" ? 1 : -1;
  state.enemigos.push({
    id: nextId++,
    tipo,
    x: point.x, y: point.y,
    vx: 0, vy: 0,
    hw: def.hw, h: def.h,
    onGround: true,
    direccion: dir,
    vida: def.vida,
    vidaMax: def.vida,
    atkTimer: rand(0.3, 1.0),
    hitFlash: 0,
    seed: Math.random() * 10,
    fleeing: false,
    decisionTimer: rand(0.15, 0.4),
    staggerTimer: 0
  });
  spawnParticles(point.x, point.y - def.h * 0.5, "rgba(255,220,150,0.5)", 4);
}

export function updateSpawner(dt) {
  if (state.fase !== "playing") return;

  // mini-jefe Inmortal, por tiempo de partida
  if (state.tiempoPartida >= state.proximoInmortal) {
    spawnEnemy("inmortal", Math.random() < 0.5 ? "left" : "right");
    state.proximoInmortal = state.tiempoPartida + 55 + rand(0, 15);
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    const maxConcurrent = 7;
    if (state.enemigos.length < maxConcurrent) {
      const pool = poolForTime(state.tiempoPartida);
      const tipo = pool[Math.floor(Math.random() * pool.length)];
      spawnEnemy(tipo, Math.random() < 0.5 ? "left" : "right");
    }
    const base = Math.max(0.7, 2.3 - state.tiempoPartida * 0.02);
    state.spawnTimer = base * rand(0.7, 1.2);
  }
}

// -----------------------------------------------------------------------
// DAÑO / MUERTE
// -----------------------------------------------------------------------
export function damageEnemy(en, dmg, { bypassShield = false, attackerX = null } = {}) {
  // El escudo con vida=2 debe morir en 2 golpes como máximo, siempre: el
  // primer golpe frontal solo le rompe el escudo (chispazo cosmético), pero
  // el daño se aplica igual. Ya no existe un golpe "gratis" que no cuente.
  if (en.tipo === "escudo" && !bypassShield && !en.shieldBroken) {
    const front = en.direccion;
    const attackSide = attackerX != null ? (Math.sign(attackerX - en.x) || front) : front;
    if (attackSide === front) {
      en.shieldBroken = true;
      sfx.block();
      spawnParticles(en.x, en.y - en.h * 0.6, COLORS.blockSpark, 6);
    }
  }

  en.vida -= dmg;
  en.hitFlash = 0.14;
  spawnParticles(en.x, en.y - en.h * 0.6, COLORS.white, 5);

  if (en.vida <= 0) {
    const def = ENEMY_DEFS[en.tipo];
    const mult = awardScore(def.score);
    sfx.enemyDown(en.tipo === "inmortal");
    if (mult > 1) sfx.combo(mult);
    spawnParticles(en.x, en.y - en.h * 0.6, COLORS.white, 12);
    const idx = state.enemigos.indexOf(en);
    if (idx >= 0) state.enemigos.splice(idx, 1);
  }
  return true;
}

/**
 * Empuja a un enemigo y lo deja "aturdido" un instante: sin el aturdimiento,
 * la IA del enemigo recalcula su velocidad en el mismo frame (o el siguiente)
 * y pisa por completo el impulso, así que el empujón nunca se sentiría.
 */
export function knockbackEnemy(en, dir, force, stagger = 0.35) {
  en.vx = dir * force;
  en.vy = -90;
  en.onGround = false;
  en.staggerTimer = stagger;
}

// -----------------------------------------------------------------------
// IA / ACTUALIZACIÓN
// -----------------------------------------------------------------------
function chase(en, def, dx) {
  en.direccion = dx >= 0 ? 1 : -1;
  en.vx = en.direccion * def.velocidad;
}

/**
 * El escudo solo protege el lado al que el enemigo está "comprometido"
 * a caminar, no el lado exacto del jugador en este instante: si actualizara
 * su dirección cada frame apuntando siempre al jugador, el escudo bloquearía
 * cualquier ataque frontal para siempre y jamás se podría flanquear. Con un
 * pequeño temporizador de decisión, el jugador puede rodearlo (p. ej. saltando
 * a una plataforma y cayendo del otro lado) antes de que vuelva a girarse.
 */
function updateEscudo(en, def, dx, dt) {
  en.decisionTimer -= dt;
  if (en.decisionTimer <= 0) {
    en.direccion = dx >= 0 ? 1 : -1;
    en.decisionTimer = rand(0.55, 0.9);
  }
  en.vx = en.direccion * def.velocidad;
}

function updateArchero(en, def, dx, dt) {
  const dist = Math.abs(dx);
  if (dist < def.fleeDist) {
    en.direccion = dx > 0 ? -1 : 1;
    en.vx = en.direccion * def.velocidad;
    en.fleeing = true;
  } else if (dist > def.keepDist) {
    en.direccion = dx > 0 ? 1 : -1;
    en.vx = en.direccion * def.velocidad * 0.55;
    en.fleeing = false;
  } else {
    en.vx = 0;
    en.direccion = dx >= 0 ? 1 : -1;
    en.fleeing = false;
  }

  en.atkTimer -= dt;
  if (!en.fleeing && dist < def.keepDist + 25 && en.atkTimer <= 0) {
    en.atkTimer = rand(1.5, 2.2);
    sfx.bow();
    state.proyectiles.push({
      tipo: "flecha", x: en.x + en.direccion * 8, y: en.y - en.h * 0.6,
      vx: def.arrowSpeed * en.direccion, dir: en.direccion, dmg: 1
    });
  }
}

function updateVeloz(en, def, dx) {
  chase(en, def, dx);
  if (en.onGround && Math.random() < 0.008) {
    en.vy = JUMP_VELOCITY * 0.85;
    en.onGround = false;
  }
}

export function updateEnemies(dt) {
  if (state.fase !== "playing") return;
  const jugador = state.jugador;

  for (let i = state.enemigos.length - 1; i >= 0; i--) {
    const en = state.enemigos[i];
    const def = ENEMY_DEFS[en.tipo];
    const dx = jugador.x - en.x;

    if (en.hitFlash > 0) en.hitFlash -= dt;

    if (en.staggerTimer > 0) {
      // aturdido por un empujón: la IA no toca vx/vy este rato, para que el
      // impulso realmente se note en vez de ser pisado en el mismo frame
      en.staggerTimer -= dt;
    } else {
      switch (en.tipo) {
        case "arquero": updateArchero(en, def, dx, dt); break;
        case "veloz": updateVeloz(en, def, dx); break;
        case "escudo": updateEscudo(en, def, dx, dt); break;
        default: chase(en, def, dx); break;
      }
    }

    applyPhysics(en, dt);

    // contacto cuerpo a cuerpo con el jugador
    if (en.atkTimer > 0 && en.tipo !== "arquero") en.atkTimer -= dt;
    const canTouch = en.tipo !== "arquero" || Math.abs(dx) < 14;
    if (canTouch && en.atkTimer <= 0 && aabbOverlap(aabb(en), aabb(jugador))) {
      const dir = Math.sign(dx) || en.direccion;
      const knockback = en.tipo === "inmortal" ? 1.6 : 1;
      const hit = damagePlayer(1, dir, { blockable: true });
      if (hit) {
        jugador.vx = dir * 95 * knockback;
        jugador.vy = -150 * (knockback > 1 ? 1.1 : 1);
      }
      en.atkTimer = 0.9;
    }
  }
}

// -----------------------------------------------------------------------
// DIBUJO
// -----------------------------------------------------------------------
function withFacing(ctx, x, y, facingRight, drawFn) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (!facingRight) ctx.scale(-1, 1);
  drawFn();
  ctx.restore();
}

function legs(ctx, phase, colorDark, colorLight) {
  const swing = Math.sin(phase) * 3;
  // pierna trasera, en sombra
  pxG(ctx, -2 - swing * 0.3, -8, 3, 8, colorDark, colorDark, COLORS.outline);
  // pierna delantera, iluminada desde arriba
  pxG(ctx, 1 + swing * 0.3, -8, 3, 8, colorLight, colorDark, COLORS.outline);
}

function drawNormal(ctx, en, phase, flash) {
  withFacing(ctx, en.x, en.y, en.direccion === 1, () => {
    px(ctx, -4, 1.5, 8, 1.5, "rgba(0,0,0,0.4)");
    legs(ctx, phase, COLORS.persianTrouserDark, COLORS.persianTrouser);
    pxG(ctx, -4, -14, 8, 9, flash || COLORS.persianTunicHi, flash || COLORS.persianTunicDark, COLORS.outline);
    px(ctx, -1.5, -20, 4, 4.5, COLORS.skin);
    pxG(ctx, -2.5, -23, 5.5, 3.5, "#4a382a", COLORS.persianTunicDark, COLORS.outline);
    ctx.strokeStyle = COLORS.bladeSilver;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(3, -16); ctx.lineTo(11, -12); ctx.stroke();
  });
}

function drawEscudo(ctx, en, phase, flash) {
  withFacing(ctx, en.x, en.y, en.direccion === 1, () => {
    px(ctx, -5, 1.5, 10, 1.5, "rgba(0,0,0,0.4)");
    legs(ctx, phase, COLORS.persianTrouserDark, COLORS.persianTrouser);
    pxG(ctx, -4.5, -15, 9, 10, flash || COLORS.persianTunicHi, flash || COLORS.persianTunicDark, COLORS.outline);
    px(ctx, -1.5, -21, 4, 4.5, COLORS.skin);
    pxG(ctx, -3, -24, 6, 3.5, "#5a4632", "#3a2a1a", COLORS.outline);
    // gran escudo rectangular al frente, con brillo metálico — astillado tras el primer golpe bloqueado
    if (en.shieldBroken) {
      pxG(ctx, 4, -22, 5, 18, "#7a6244", "#3a2e1c", COLORS.outline);
      ctx.strokeStyle = "rgba(20,12,10,0.6)";
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(4.5, -19); ctx.lineTo(7, -14); ctx.lineTo(5, -8); ctx.stroke();
    } else {
      pxG(ctx, 4, -22, 5, 18, "#c9a15a", "#6a4e24", COLORS.outline);
      px(ctx, 5.5, -20, 1, 13, "rgba(255,224,160,0.5)");
    }
    px(ctx, 6, -14, 1.4, 2.4, "#5a3a1a");
  });
}

function drawArquero(ctx, en, phase, flash) {
  withFacing(ctx, en.x, en.y, en.direccion === 1, () => {
    px(ctx, -4, 1.5, 8, 1.5, "rgba(0,0,0,0.4)");
    legs(ctx, phase, COLORS.archerClothDark, COLORS.archerCloth);
    pxG(ctx, -3.5, -15, 7, 10, flash || COLORS.archerClothHi, flash || COLORS.archerClothDark, COLORS.outline);
    pxG(ctx, -6, -20, 3, 7, COLORS.persianTrouser, COLORS.persianTrouserDark, COLORS.outline);
    px(ctx, -1.5, -20, 4, 4.5, COLORS.skin);
    pxG(ctx, -2.5, -23, 5.5, 3.5, "#fff3d4", COLORS.turban, COLORS.outline);
    ctx.strokeStyle = "#8a6a3a";
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(6, -14, 7, -1.1, 1.1); ctx.stroke();
  });
}

function drawVeloz(ctx, en, phase, flash) {
  withFacing(ctx, en.x, en.y, en.direccion === 1, () => {
    px(ctx, -3.5, 1.5, 7, 1.5, "rgba(0,0,0,0.4)");
    legs(ctx, phase * 1.6, COLORS.velozClothDark, COLORS.velozCloth);
    pxG(ctx, -3.5, -13, 7, 8, flash || COLORS.velozClothHi, flash || COLORS.velozClothDark, COLORS.outline);
    px(ctx, -1.5, -18, 4, 4.5, COLORS.skin);
    px(ctx, -2, -21, 5, 2, COLORS.velozClothDark);
    ctx.strokeStyle = COLORS.bladeSilver;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(3, -14); ctx.lineTo(9, -11); ctx.stroke();
  });
}

function drawInmortal(ctx, en, phase, flash) {
  withFacing(ctx, en.x, en.y, en.direccion === 1, () => {
    glow(ctx, 0, -14, 14, "rgba(232,194,58,0.18)", 1);
    px(ctx, -6, 1.5, 12, 1.8, "rgba(0,0,0,0.45)");
    legs(ctx, phase * 0.8, COLORS.immortalRobeDark, COLORS.immortalRobe);
    pxG(ctx, -6, -22, 12, 15, flash || COLORS.immortalRobeHi, flash || COLORS.immortalRobeDark, COLORS.outline);
    for (let i = -5; i <= 5; i += 2.5) {
      for (let j = -20; j <= -9; j += 3) px(ctx, i, j, 1.6, 1.6, COLORS.immortalGoldDark);
    }
    px(ctx, -6, -22, 12, 1.4, flash || COLORS.immortalGold);
    px(ctx, -2, -29, 4.5, 5, COLORS.skin);
    pxG(ctx, -3.5, -32, 7, 4, "#4a4a54", COLORS.immortalMask, COLORS.outline);
    px(ctx, -3.5, -32, 7, 1.4, COLORS.immortalGold);
    circO(ctx, -9, -19, 6, COLORS.immortalRobeDark, COLORS.outline);
    ctx.strokeStyle = COLORS.immortalGold;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(-9, -19, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = COLORS.bladeSilver;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(3, -20); ctx.lineTo(18, -16); ctx.stroke();

    // barra de vida
    const w = 16;
    px(ctx, -w / 2, -40, w, 2, "#1a1218");
    px(ctx, -w / 2, -40, w * Math.max(0, en.vida / en.vidaMax), 2, COLORS.hpFill);
  });
}

const DRAWERS = { normal: drawNormal, escudo: drawEscudo, arquero: drawArquero, veloz: drawVeloz, inmortal: drawInmortal };

export function drawEnemy(ctx, en) {
  const phase = Math.abs(en.vx) > 4 ? en.x * 0.6 : Math.sin(state.tiempoPartida * 3 + en.seed) * 0.5;
  const flash = en.hitFlash > 0 ? COLORS.white : null;
  (DRAWERS[en.tipo] || drawNormal)(ctx, en, phase, flash);
}
