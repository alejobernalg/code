// ---------------------------------------------------------------------
// Estado central del juego (única fuente de verdad)
// ---------------------------------------------------------------------
import { W, GROUND_Y, PLAYER_HW, PLAYER_H, PLAYER_LIVES, JAVELIN_MAX, COMBO_WINDOW, RAIN_MIN_INTERVAL, RAIN_MAX_INTERVAL, PLAYER_INVULN_TIME, LEVEL_COUNT, COLORS } from "./config.js";
import { rand as randUtil } from "./utils.js";
import { particles, spawnParticles } from "./particles.js";
import { sfx } from "./audio.js";

const BEST_SCORE_KEY = "ultimo_espartano_best_score";

function loadBestScore() {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

function persistBestScore(v) {
  try { localStorage.setItem(BEST_SCORE_KEY, String(v)); } catch (e) { /* almacenamiento no disponible */ }
}

function clampNivel(n) {
  return Math.min(LEVEL_COUNT, Math.max(1, n));
}

export function moveLevelSelection(delta) {
  state.nivelSeleccionado = clampNivel(state.nivelSeleccionado + delta);
}

function freshPlayer() {
  return {
    x: W / 2, y: GROUND_Y,
    vx: 0, vy: 0,
    hw: PLAYER_HW, h: PLAYER_H,
    onGround: true,
    direccion: 1,
    estado: "idle",       // idle | walk | jump | melee | charge | ranged | block | hurt | dead
    estadoTimer: 0,
    cubriendose: false,
    invulnTimer: 0,
    meleeCooldown: 0,
    zHeld: false,
    zHoldTime: 0,
    chargeReady: true,
    chargeCooldown: 0,
    jabalinasDisponibles: JAVELIN_MAX,
    jabalinaTimer: 0,
    walkFrame: 0
  };
}

export const state = {
  fase: "start", // start | levelSelect | playing | gameover
  nivel: 1,
  nivelSeleccionado: 1,
  puntos: 0,
  mejorPuntaje: loadBestScore(),
  vidas: PLAYER_LIVES,
  comboActual: 0,
  comboTimer: 0,
  tiempoPartida: 0,
  screenShake: 0,

  jugador: freshPlayer(),
  enemigos: [],
  proyectiles: [],
  flechasLluvia: [],

  lluvia: {
    fase: "normal", // normal | aviso | activa
    timer: randUtil(RAIN_MIN_INTERVAL, RAIN_MAX_INTERVAL),
    danoRecibido: false,
    bonusTimer: 0
  },

  spawnTimer: 1.2,
  proximoInmortal: 42
};

export function resetState(nivel = state.nivelSeleccionado) {
  state.fase = "playing";
  state.nivel = clampNivel(nivel);
  state.nivelSeleccionado = state.nivel;
  state.puntos = 0;
  state.vidas = PLAYER_LIVES;
  state.comboActual = 0;
  state.comboTimer = 0;
  state.tiempoPartida = 0;
  state.screenShake = 0;
  state.jugador = freshPlayer();
  state.enemigos = [];
  state.proyectiles = [];
  state.flechasLluvia = [];
  state.lluvia = { fase: "normal", timer: randUtil(RAIN_MIN_INTERVAL, RAIN_MAX_INTERVAL), danoRecibido: false, bonusTimer: 0 };
  state.spawnTimer = 1.2;
  state.proximoInmortal = 42;
  particles.length = 0;
}

export function awardScore(basePoints) {
  if (state.comboTimer > 0) state.comboActual++;
  else state.comboActual = 1;
  state.comboTimer = COMBO_WINDOW;
  const mult = state.comboActual;
  state.puntos += basePoints * mult;
  return mult;
}

export function endGame() {
  state.fase = "gameover";
  if (state.puntos > state.mejorPuntaje) {
    state.mejorPuntaje = state.puntos;
    persistBestScore(state.mejorPuntaje);
  }
}

/**
 * Aplica daño al jugador respetando el bloqueo con escudo. Usada por
 * enemigos, proyectiles y la lluvia de flechas — nunca por player.js
 * directamente, así se evita una dependencia circular entre módulos.
 */
export function damagePlayer(amount = 1, knockbackDir = 0, { blockable = true } = {}) {
  const p = state.jugador;
  if (state.fase !== "playing" || p.estado === "dead" || p.invulnTimer > 0) return false;

  if (blockable && p.cubriendose) {
    sfx.block();
    spawnParticles(p.x + knockbackDir * 6, p.y - p.h * 0.6, COLORS.blockSpark, 5);
    return false;
  }

  state.vidas -= amount;
  p.invulnTimer = PLAYER_INVULN_TIME;
  p.vx = knockbackDir * 95;
  p.vy = -150;
  p.onGround = false;
  p.estado = "hurt";
  p.estadoTimer = 0.4;
  state.screenShake = 1;
  state.comboActual = 0;
  state.comboTimer = 0;
  sfx.hurt();
  spawnParticles(p.x, p.y - p.h * 0.6, COLORS.spartanRed, 8);

  if (state.vidas <= 0) {
    state.vidas = 0;
    p.estado = "dead";
    p.estadoTimer = 999;
    sfx.gameOver();
    endGame();
  }
  return true;
}

export function updateMeta(dt) {
  state.tiempoPartida += dt;
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.comboActual = 0;
  }
  if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt * 3.2);
}
