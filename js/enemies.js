// ---------------------------------------------------------------------
// Enemigos: definiciones, IA, spawner, resolución de daño y sprites
// ---------------------------------------------------------------------
import { W, activePlatforms, GROUND_Y, ENEMY_DEFS, COLORS, JUMP_VELOCITY, RINO_PACE_TIME, RINO_TELEGRAPH_TIME, RINO_CHARGE_MAX_TIME, RINO_STUN_TIME, RINO_RECOVER_TIME } from "./config.js";
import { applyPhysics, aabb, aabbOverlap, rand, px, pxG, circO, glow } from "./utils.js";
import { spawnParticles } from "./particles.js";
import { sfx } from "./audio.js";
import { state, awardScore, damagePlayer, registerEnemyDefeat, announceBoss } from "./state.js";
let nextId = 1;

const BOSS_ANNOUNCE = { rinoceronte: "¡BESTIA DE GUERRA!", elefante: "¡ELEFANTE DE GUERRA!" };
const isBestiaCarga = (tipo) => tipo === "rinoceronte" || tipo === "elefante";

// -----------------------------------------------------------------------
// SPAWNER
// -----------------------------------------------------------------------
function poolForTime(t) {
  if (state.nivel === 3) {
    const pool = ["explosivo", "explosivo"];
    if (t > 5) pool.push("incendiario");
    if (t > 22) pool.push("explosivo", "incendiario");
    return pool;
  }
  const pool = ["normal"];
  if (t > 12) pool.push("normal", "arquero");
  if (t > 20) pool.push("escudo");
  if (t > 32) pool.push("veloz");
  return pool;
}

function pickSpawnPoint(side, tipo) {
  const fromLeft = side === "left";
  // El jefe siempre entra por el suelo del corredor, nunca sobre una cornisa.
  const onPlatform = !isBestiaCarga(tipo) && Math.random() < 0.3;
  if (onPlatform) {
    const candidates = activePlatforms.filter(p => p.tier > 0 && !p.destroyed);
    const plat = candidates[fromLeft ? 0 : candidates.length - 1];
    if (plat) return { x: fromLeft ? plat.x + 6 : plat.x + plat.w - 6, y: plat.y };
  }
  return { x: fromLeft ? -10 : W + 10, y: GROUND_Y };
}

export function spawnEnemy(tipo, side) {
  const def = ENEMY_DEFS[tipo];
  const point = pickSpawnPoint(side, tipo);
  const dir = side === "left" ? 1 : -1;
  const enemy = {
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
  };
  if (isBestiaCarga(tipo)) {
    enemy.faseCarga = "acecho";
    enemy.faseTimer = rand(...RINO_PACE_TIME);
    enemy.cargaDir = dir;
    announceBoss(BOSS_ANNOUNCE[tipo]);
  }
  state.enemigos.push(enemy);
  spawnParticles(point.x, point.y - def.h * 0.5, "rgba(255,220,150,0.5)", 4);
}

export function updateSpawner(dt) {
  if (state.fase !== "playing") return;

  // Nivel 2: combate 1 contra 1 contra la bestia — sin oleadas ni jefe extra.
  if (state.nivel === 2) {
    if (!state.jefeGenerado) {
      state.rinoTimer -= dt;
      if (state.rinoTimer <= 0) {
        spawnEnemy("rinoceronte", Math.random() < 0.5 ? "left" : "right");
        state.jefeGenerado = true;
      }
    }
    return;
  }

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
    sfx.enemyDown(en.tipo === "inmortal" || isBestiaCarga(en.tipo));
    if (mult > 1) sfx.combo(mult);
    spawnParticles(en.x, en.y - en.h * 0.6, COLORS.white, 12);
    const idx = state.enemigos.indexOf(en);
    if (idx >= 0) state.enemigos.splice(idx, 1);
    registerEnemyDefeat();
    // El rinoceronte es solo la primera oleada del jefe del nivel 2: al
    // caer, entra el elefante de guerra — la amenaza real de la pelea.
    if (en.tipo === "rinoceronte" && state.nivel === 2 && state.fase === "playing") {
      spawnEnemy("elefante", en.x < W / 2 ? "left" : "right");
    }
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

/**
 * IA compartida por las dos bestias de guerra del nivel 2 (rinoceronte y
 * elefante): acecha despacio, se detiene y agacha la testuz como aviso, y
 * luego embiste en línea recta a la dirección fijada en ese instante — no
 * vuelve a corregir rumbo en pleno galope, así que subir a una de las
 * cornisas del corredor esquiva el golpe por completo. Al llegar a un borde
 * de la pantalla (o agotar el tiempo máximo) queda aturdida: ventana segura
 * para contraatacar antes de que retome el acecho.
 */
function updateBestiaCarga(en, def, dx, dt) {
  en.faseTimer -= dt;
  switch (en.faseCarga) {
    case "acecho":
      en.direccion = dx >= 0 ? 1 : -1;
      en.vx = en.direccion * def.velocidad;
      if (en.faseTimer <= 0) {
        en.faseCarga = "aviso";
        en.faseTimer = RINO_TELEGRAPH_TIME;
        en.cargaDir = dx >= 0 ? 1 : -1;
        en.direccion = en.cargaDir;
        en.vx = 0;
        sfx.charge();
      }
      break;
    case "aviso":
      en.vx = 0;
      if (en.faseTimer <= 0) {
        en.faseCarga = "carga";
        en.faseTimer = RINO_CHARGE_MAX_TIME;
        en.vx = en.cargaDir * def.chargeSpeed;
        state.screenShake = Math.max(state.screenShake, 0.5);
        sfx.chargeRelease();
      }
      break;
    case "carga": {
      en.vx = en.cargaDir * def.chargeSpeed;
      const atEdge = (en.cargaDir < 0 && en.x <= en.hw + 1.5) || (en.cargaDir > 0 && en.x >= W - en.hw - 1.5);
      if (atEdge || en.faseTimer <= 0) {
        en.faseCarga = "aturdido";
        en.faseTimer = RINO_STUN_TIME;
        en.vx = 0;
        sfx.block();
        state.screenShake = Math.max(state.screenShake, 0.8);
        spawnParticles(en.x, en.y - 2, "rgba(180,150,110,0.6)", 10);
      }
      break;
    }
    case "aturdido":
      en.vx = 0;
      if (en.faseTimer <= 0) {
        en.faseCarga = "acecho";
        en.faseTimer = rand(...RINO_RECOVER_TIME);
      }
      break;
  }
}

function destroyPlatforms(x, y, radius) {
  for (const plat of activePlatforms) {
    if (!plat.destructible || plat.destroyed) continue;
    const nearX = Math.max(plat.x, Math.min(x, plat.x + plat.w));
    const nearY = Math.max(plat.y, Math.min(y, plat.y + plat.h));
    if (Math.hypot(x - nearX, y - nearY) <= radius) {
      plat.hp--;
      spawnParticles(nearX, plat.y, "#61d4c4", 10);
      if (plat.hp <= 0) plat.destroyed = true;
    }
  }
}

function detonate(en, def) {
  const player = state.jugador;
  spawnParticles(en.x, en.y - en.h * 0.55, "#ffb13b", 24);
  spawnParticles(en.x, en.y - en.h * 0.55, "#e85328", 16);
  state.screenShake = 1;
  destroyPlatforms(en.x, en.y, def.blastRadius);
  if (Math.hypot(player.x - en.x, (player.y - 10) - en.y) < def.blastRadius) {
    damagePlayer(1, Math.sign(player.x - en.x) || en.direccion, { blockable: true });
  }
  const idx = state.enemigos.indexOf(en);
  if (idx >= 0) state.enemigos.splice(idx, 1);
}

function updateExplosivo(en, def, dx, dt) {
  chase(en, def, dx);
  en.fuse = Math.abs(dx) < 26 ? (en.fuse ?? def.fuse) - dt : def.fuse;
  if (en.fuse <= 0) detonate(en, def);
}

function updateIncendiario(en, def, dx, dt) {
  const dist = Math.abs(dx);
  en.direccion = dx >= 0 ? 1 : -1;
  en.vx = dist < def.fleeDist ? -en.direccion * def.velocidad : dist > def.keepDist ? en.direccion * def.velocidad * 0.65 : 0;
  en.atkTimer -= dt;
  if (dist < def.keepDist + 18 && en.atkTimer <= 0) {
    en.atkTimer = rand(1.7, 2.5);
    state.proyectiles.push({ tipo: "bomba", x: en.x + en.direccion * 7, y: en.y - en.h * 0.65, vx: def.fireSpeed * en.direccion, vy: -125, dmg: 1, life: 1.25 });
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
        case "explosivo": updateExplosivo(en, def, dx, dt); break;
        case "incendiario": updateIncendiario(en, def, dx, dt); break;
        case "rinoceronte": case "elefante": updateBestiaCarga(en, def, dx, dt); break;
        default: chase(en, def, dx); break;
      }
    }

    applyPhysics(en, dt);

    // contacto cuerpo a cuerpo con el jugador
    if (en.atkTimer > 0 && en.tipo !== "arquero" && en.tipo !== "incendiario") en.atkTimer -= dt;
    const canTouch = !["arquero", "incendiario", "explosivo"].includes(en.tipo) || Math.abs(dx) < 14;
    // Aturdida, la bestia no golpea: es la ventana de contraataque prometida
    // por el diseño del nivel, no solo un enemigo más pasivo.
    const stunned = isBestiaCarga(en.tipo) && en.faseCarga === "aturdido";
    if (canTouch && !stunned && en.atkTimer <= 0 && aabbOverlap(aabb(en), aabb(jugador))) {
      const charging = isBestiaCarga(en.tipo) && en.faseCarga === "carga";
      const dir = Math.sign(dx) || en.direccion;

      if (en.tipo === "elefante" && charging) {
        // La embestida en sí es letal si te agarra de frente a ras de suelo.
        // El elefante es tan alto que su trompa igual alcanza a un jugador
        // parado en una cornisa — pero ese roce es mucho más perdonable
        // (una vida) que quedar atrapado de lleno en su camino.
        const onLedge = jugador.onGround && jugador.y < GROUND_Y - 2;
        const hit = damagePlayer(onLedge ? 1 : 99, dir, { blockable: true });
        if (hit) {
          jugador.vx = dir * 95 * 2.6;
          jugador.vy = -150 * 1.1;
        }
      } else {
        const knockback = en.tipo === "inmortal" ? 1.6 : charging ? 2.2 : 1;
        const hit = damagePlayer(charging ? 2 : 1, dir, { blockable: true });
        if (hit) {
          jugador.vx = dir * 95 * knockback;
          jugador.vy = -150 * (knockback > 1 ? 1.1 : 1);
        }
      }
      en.atkTimer = charging ? 0.5 : 0.9;
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

function drawExplosivo(ctx, en, phase, flash) {
  withFacing(ctx, en.x, en.y, en.direccion === 1, () => {
    const armed = en.fuse != null && en.fuse < 0.25;
    glow(ctx, 0, -13, armed ? 14 : 7, armed ? "rgba(255,75,30,0.8)" : "rgba(255,130,35,0.35)", 1);
    legs(ctx, phase * 1.8, "#3a2422", "#714030");
    pxG(ctx, -4, -14, 8, 9, flash || "#b84a28", flash || "#5d2622", COLORS.outline);
    px(ctx, -2, -20, 4, 4, COLORS.skin);
    circO(ctx, 5, -14, 4, armed ? "#fff0a0" : "#e88b32", COLORS.outline);
    px(ctx, 4.5, -17, 1, 2, "#f5d65c");
  });
}

function drawIncendiario(ctx, en, phase, flash) {
  withFacing(ctx, en.x, en.y, en.direccion === 1, () => {
    legs(ctx, phase, "#183f42", "#28665f");
    pxG(ctx, -4, -15, 8, 10, flash || "#3f9185", flash || "#174b4c", COLORS.outline);
    px(ctx, -2, -21, 4, 4, COLORS.skin);
    pxG(ctx, -3, -24, 6, 3, "#62cfc0", "#216a67", COLORS.outline);
    circO(ctx, 6, -15, 3.5, "#ef8c32", COLORS.outline);
  });
}

function drawRinoceronte(ctx, en, phase, flash) {
  withFacing(ctx, en.x, en.y, en.direccion === 1, () => {
    const aviso = en.faseCarga === "aviso";
    const carga = en.faseCarga === "carga";
    const aturdido = en.faseCarga === "aturdido";
    const crouch = aviso ? 2 : 0;

    // estela de polvo tras la embestida
    if (carga) {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.22 * (4 - i) / 3;
        ctx.fillStyle = COLORS.rinoHideDark;
        ctx.beginPath();
        ctx.ellipse(-8 - i * 7, 1, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    px(ctx, -16, 1.5, 30, 2, "rgba(0,0,0,0.45)");

    // patas — dos delante, dos atrás; zancada corta y pesada
    const stride = (carga ? Math.sin(en.x * 0.9) : Math.sin(phase)) * (carga ? 4.5 : 2.2);
    pxG(ctx, -12 - stride * 0.3, -10 + crouch, 5, 11, COLORS.rinoHideDark, "#1e1610", COLORS.outline);
    pxG(ctx, 6 + stride * 0.3, -10 + crouch, 5, 11, COLORS.rinoHideDark, "#1e1610", COLORS.outline);
    pxG(ctx, -9 + stride * 0.3, -11 + crouch, 5, 12, COLORS.rinoHideHi, COLORS.rinoHide, COLORS.outline);
    pxG(ctx, 9 - stride * 0.3, -11 + crouch, 5, 12, COLORS.rinoHideHi, COLORS.rinoHide, COLORS.outline);

    // cuerpo macizo
    pxG(ctx, -15, -26 + crouch, 26, 17, flash || COLORS.rinoHideHi, flash || COLORS.rinoHideDark, COLORS.outline);
    // plaquetas de hierro en el lomo
    for (let i = -13; i <= 9; i += 5) px(ctx, i, -25 + crouch, 3.5, 3, i % 10 === -3 ? COLORS.rinoArmorHi : COLORS.rinoArmorDark);
    // cola
    ctx.strokeStyle = COLORS.rinoHideDark;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-15, -18 + crouch);
    ctx.quadraticCurveTo(-21, -14 + crouch, -19, -8 + crouch);
    ctx.stroke();

    // testuz blindada — baja al avisar, embiste al frente
    const headY = -22 + crouch + (aviso ? 4 : 0);
    pxG(ctx, 6, headY - 8, 14, 12, flash || COLORS.rinoArmorHi, flash || COLORS.rinoArmorDark, COLORS.outline);
    px(ctx, 7, headY - 8, 12, 2, flash || COLORS.rinoArmor);

    // ojo — brasa encendida, más viva justo antes de embestir
    const eyeGlow = aviso ? 5 : carga ? 4 : 2.5;
    glow(ctx, 12, headY - 3, eyeGlow, "rgba(255,140,40,0.7)", 1);
    px(ctx, 11, headY - 4, 1.6, 1.6, COLORS.rinoEye);

    // cuerno envuelto en cadenas, con la punta de metal pulido
    const hornLen = carga ? 15 : 12;
    ctx.strokeStyle = COLORS.rinoHorn;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(18, headY - 5);
    ctx.lineTo(18 + hornLen, headY - 5);
    ctx.stroke();
    if (carga) glow(ctx, 18 + hornLen, headY - 5, 6, "rgba(255,255,255,0.65)", 0.8);
    ctx.fillStyle = COLORS.rinoHornTip;
    ctx.beginPath();
    ctx.moveTo(18 + hornLen, headY - 8);
    ctx.lineTo(18 + hornLen + 5, headY - 5);
    ctx.lineTo(18 + hornLen, headY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLORS.rinoChain;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(19 + i * 4, headY - 5, 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // aviso: resplandor rojo pulsante sobre la testuz
    if (aviso) glow(ctx, 12, headY - 8, 12, "rgba(255,50,40,0.5)", 0.6 + Math.sin(state.tiempoPartida * 20) * 0.3);

    // aturdida: estrellas girando sobre la cabeza
    if (aturdido) {
      const spin = state.tiempoPartida * 6;
      for (let i = 0; i < 3; i++) {
        const a = spin + (i * Math.PI * 2) / 3;
        const sx = 6 + Math.cos(a) * 9, sy = headY - 16 + Math.sin(a) * 3;
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // barra de vida
    const w = 26;
    px(ctx, -w / 2 + 5, -42, w, 2, "#1a1218");
    px(ctx, -w / 2 + 5, -42, w * Math.max(0, en.vida / en.vidaMax), 2, COLORS.hpFill);
  });
}

/** La verdadera amenaza del nivel 2: entra tras la caída del rinoceronte. */
function drawElefante(ctx, en, phase, flash) {
  withFacing(ctx, en.x, en.y, en.direccion === 1, () => {
    const aviso = en.faseCarga === "aviso";
    const carga = en.faseCarga === "carga";
    const aturdido = en.faseCarga === "aturdido";
    const crouch = aviso ? 2 : 0;

    if (carga) {
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.24 * (5 - i) / 4;
        ctx.fillStyle = COLORS.elefHideDark;
        ctx.beginPath();
        ctx.ellipse(-12 - i * 8, 1, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    px(ctx, -22, 1.5, 42, 2.5, "rgba(0,0,0,0.5)");

    // patas — gruesas y cortas, zancada pesada
    const stride = (carga ? Math.sin(en.x * 0.7) : Math.sin(phase)) * (carga ? 4 : 1.8);
    pxG(ctx, -17 - stride * 0.3, -12 + crouch, 7, 14, COLORS.elefHideDark, "#161618", COLORS.outline);
    pxG(ctx, 9 + stride * 0.3, -12 + crouch, 7, 14, COLORS.elefHideDark, "#161618", COLORS.outline);
    pxG(ctx, -13 + stride * 0.3, -13 + crouch, 7, 15, COLORS.elefHideHi, COLORS.elefHide, COLORS.outline);
    pxG(ctx, 13 - stride * 0.3, -13 + crouch, 7, 15, COLORS.elefHideHi, COLORS.elefHide, COLORS.outline);

    // cuerpo — mole gris, más grande que el rinoceronte
    pxG(ctx, -21, -34 + crouch, 38, 23, flash || COLORS.elefHideHi, flash || COLORS.elefHideDark, COLORS.outline);
    // cola
    ctx.strokeStyle = COLORS.elefHideDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-21, -22 + crouch);
    ctx.quadraticCurveTo(-28, -16 + crouch, -25, -8 + crouch);
    ctx.stroke();

    // howdah — torreta de guerra atada al lomo, con estandarte
    pxG(ctx, -10, -46 + crouch, 22, 12, COLORS.elefHowdahHi, COLORS.elefHowdahDark, COLORS.outline);
    px(ctx, -10, -46 + crouch, 22, 2, COLORS.elefHowdah);
    for (let i = -8; i <= 8; i += 6) px(ctx, i, -47 + crouch, 2, 4, COLORS.elefHowdahDark);
    ctx.strokeStyle = COLORS.elefBanner;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, -46 + crouch);
    ctx.lineTo(-2, -56 + crouch + Math.sin(state.tiempoPartida * 4) * 1.5);
    ctx.stroke();
    ctx.fillStyle = COLORS.elefBanner;
    ctx.beginPath();
    ctx.moveTo(-2, -56 + crouch);
    ctx.lineTo(6, -53 + crouch);
    ctx.lineTo(-2, -50 + crouch);
    ctx.closePath();
    ctx.fill();

    // cabeza — oreja grande, ojo, testuz blindada
    const headY = -30 + crouch + (aviso ? 5 : 0);
    ctx.fillStyle = COLORS.elefHideDark;
    ctx.beginPath();
    ctx.ellipse(2, headY - 2, 8, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();
    pxG(ctx, 10, headY - 10, 15, 14, flash || COLORS.elefHideHi, flash || COLORS.elefHideDark, COLORS.outline);
    px(ctx, 11, headY - 10, 13, 2, flash || COLORS.rinoArmor);

    const eyeGlow = aviso ? 5 : carga ? 4 : 2.5;
    glow(ctx, 17, headY - 4, eyeGlow, "rgba(255,140,40,0.7)", 1);
    px(ctx, 16, headY - 5, 1.8, 1.8, COLORS.rinoEye);

    // colmillos encadenados
    ctx.strokeStyle = COLORS.elefIvory;
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(24, headY - 2);
    ctx.quadraticCurveTo(30 + (carga ? 4 : 0), headY + 3, 32 + (carga ? 4 : 0), headY - 3);
    ctx.stroke();
    ctx.strokeStyle = COLORS.elefIvoryDark;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(27, headY); ctx.lineTo(29, headY + 2); ctx.stroke();

    // trompa — cuelga y se agita, envuelta en cadena
    const trunkSway = carga ? 2 : Math.sin(state.tiempoPartida * 2.2) * 2;
    ctx.strokeStyle = flash || COLORS.elefHide;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(23, headY + 2);
    ctx.quadraticCurveTo(26 + trunkSway, headY + 12, 22 + trunkSway, headY + 19);
    ctx.stroke();
    if (carga) glow(ctx, 22 + trunkSway, headY + 19, 6, "rgba(255,255,255,0.5)", 0.7);
    ctx.strokeStyle = COLORS.rinoChain;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const cx = 24 + i * (trunkSway * 0.3), cy = headY + 5 + i * 5;
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.stroke();
    }

    if (aviso) glow(ctx, 17, headY - 10, 14, "rgba(255,50,40,0.5)", 0.6 + Math.sin(state.tiempoPartida * 20) * 0.3);

    if (aturdido) {
      const spin = state.tiempoPartida * 6;
      for (let i = 0; i < 3; i++) {
        const a = spin + (i * Math.PI * 2) / 3;
        const sx = 12 + Math.cos(a) * 11, sy = headY - 20 + Math.sin(a) * 3;
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // barra de vida — más ancha, acorde a su tamaño
    const w = 40;
    px(ctx, -w / 2 + 6, -58 + crouch, w, 2.4, "#1a1218");
    px(ctx, -w / 2 + 6, -58 + crouch, w * Math.max(0, en.vida / en.vidaMax), 2.4, COLORS.hpFill);
  });
}

const DRAWERS = { normal: drawNormal, escudo: drawEscudo, arquero: drawArquero, veloz: drawVeloz, inmortal: drawInmortal, explosivo: drawExplosivo, incendiario: drawIncendiario, rinoceronte: drawRinoceronte, elefante: drawElefante };

export function drawEnemy(ctx, en) {
  const phase = Math.abs(en.vx) > 4 ? en.x * 0.6 : Math.sin(state.tiempoPartida * 3 + en.seed) * 0.5;
  const flash = en.hitFlash > 0 ? COLORS.white : null;
  (DRAWERS[en.tipo] || drawNormal)(ctx, en, phase, flash);
}
