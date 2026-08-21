// ---------------------------------------------------------------------
// Estado central del juego (única fuente de verdad)
// ---------------------------------------------------------------------
import { W, GROUND_Y, PLAYER_HW, PLAYER_H, PLAYER_LIVES, JAVELIN_MAX, COMBO_WINDOW, RAIN_MIN_INTERVAL, RAIN_MAX_INTERVAL, PLAYER_INVULN_TIME, LEVEL_COUNT, LEVEL_TRANSITION_TIME, COLORS, LEVELS, setActiveLevel, FALANGE_SCORE_TICK, FALANGE_TICK_INTERVAL } from "./config.js";
import { rand as randUtil, platformUnder } from "./utils.js";
import { particles, spawnParticles } from "./particles.js";
import { sfx } from "./audio.js";

const BEST_SCORE_KEY = "ultimo_espartano_best_score";
const UNLOCKED_LEVEL_KEY = "ultimo_espartano_unlocked_level";

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

function loadUnlockedLevel() {
  try { return Math.min(LEVEL_COUNT, Math.max(1, Number(localStorage.getItem(UNLOCKED_LEVEL_KEY)) || 1)); }
  catch (e) { return 1; }
}

function persistUnlockedLevel(v) {
  try { localStorage.setItem(UNLOCKED_LEVEL_KEY, String(v)); } catch (e) { /* almacenamiento no disponible */ }
}

function clampNivel(n) {
  return Math.min(LEVEL_COUNT, Math.max(1, n));
}

export function moveLevelSelection(delta) {
  state.nivelSeleccionado = Math.min(state.nivelDesbloqueado, clampNivel(state.nivelSeleccionado + delta));
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
    bashInvulnTimer: 0,
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
  nivelDesbloqueado: loadUnlockedLevel(),
  enemigosDerrotados: 0,
  objetivoEnemigos: LEVELS[0].objective,
  tipoObjetivo: LEVELS[0].tipoObjetivo || "derrotas",
  enFalange: false,
  falangeTimer: 0,
  puntos: 0,
  mejorPuntaje: loadBestScore(),
  vidas: PLAYER_LIVES,
  comboActual: 0,
  comboTimer: 0,
  tiempoPartida: 0,
  screenShake: 0,
  transicionTimer: 0, // fundido a negro al entrar a un nivel (ver resetState)

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
  proximoInmortal: 42,
  rinoTimer: 1.4,
  jefeGenerado: false,
  avisoJefe: null,
  avisoJefeTimer: 0
};

export function resetState(nivel = state.nivelSeleccionado) {
  state.fase = "playing";
  state.nivel = clampNivel(nivel);
  state.nivelSeleccionado = state.nivel;
  const def = LEVELS[state.nivel - 1] || LEVELS[0];
  state.objetivoEnemigos = def.objective;
  state.tipoObjetivo = def.tipoObjetivo || "derrotas";
  state.enemigosDerrotados = 0;
  setActiveLevel(state.nivel);
  state.puntos = 0;
  state.vidas = PLAYER_LIVES;
  state.comboActual = 0;
  state.comboTimer = 0;
  state.tiempoPartida = 0;
  state.screenShake = 0;
  state.enFalange = false;
  state.falangeTimer = 0;
  state.transicionTimer = LEVEL_TRANSITION_TIME;
  state.jugador = freshPlayer();
  state.enemigos = [];
  state.proyectiles = [];
  state.flechasLluvia = [];
  state.lluvia = { fase: "normal", timer: randUtil(RAIN_MIN_INTERVAL, RAIN_MAX_INTERVAL), danoRecibido: false, bonusTimer: 0 };
  state.spawnTimer = 1.2;
  // En el nivel 4 (45 s en total) el Inmortal debe aparecer bien antes del
  // amanecer para que haya tiempo real de enfrentarlo; el valor por defecto
  // (42 s) lo dejaría entrar casi al terminar el nivel.
  state.proximoInmortal = state.tipoObjetivo === "sobrevivir" ? 28 : 42;
  state.rinoTimer = 1.4;
  state.jefeGenerado = false;
  state.avisoJefe = null;
  state.avisoJefeTimer = 0;
  particles.length = 0;

  if (state.tipoObjetivo === "sobrevivir") announceBoss("¡RESISTE HASTA EL AMANECER!", 3);
}

export function announceBoss(nombre, duration = 2.4) {
  state.avisoJefe = nombre;
  state.avisoJefeTimer = duration;
}

export function registerEnemyDefeat() {
  // El nivel 4 no cuenta bajas — su objetivo es de tiempo (ver updateMeta),
  // y ambos modos comparten el campo `enemigosDerrotados` para reutilizar
  // la misma barra de progreso del HUD. Sin esta guarda, cada enemigo
  // derrotado empujaría ese contador y podría disparar completeLevel()
  // antes de que se cumpla el tiempo real de supervivencia.
  if (state.tipoObjetivo === "sobrevivir") return;
  state.enemigosDerrotados++;
  if (state.enemigosDerrotados >= state.objetivoEnemigos) completeLevel();
}

export function completeLevel() {
  if (state.fase !== "playing") return;
  const next = Math.min(LEVEL_COUNT, state.nivel + 1);
  if (next > state.nivelDesbloqueado) {
    state.nivelDesbloqueado = next;
    persistUnlockedLevel(next);
  }
  const esFinal = state.nivel >= LEVEL_COUNT;
  if (esFinal && state.puntos > state.mejorPuntaje) {
    state.mejorPuntaje = state.puntos;
    persistBestScore(state.mejorPuntaje);
  }
  state.fase = esFinal ? "campaignComplete" : "levelComplete";
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
  if (state.fase !== "playing" || p.estado === "dead" || p.invulnTimer > 0 || p.bashInvulnTimer > 0) return false;

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

  if (state.fase === "playing" && state.tipoObjetivo === "sobrevivir") {
    // Falange: quieto y cubierto sobre el promontorio marcado, el jugador
    // suma resistencia poco a poco — recompensa sostener la línea, no solo
    // cazar enemigos como en el resto de niveles.
    const plat = platformUnder(state.jugador.x, state.jugador.y);
    state.enFalange = !!(plat && plat.falange && state.jugador.cubriendose);
    if (state.enFalange) {
      state.falangeTimer += dt;
      while (state.falangeTimer >= FALANGE_TICK_INTERVAL) {
        state.falangeTimer -= FALANGE_TICK_INTERVAL;
        state.puntos += FALANGE_SCORE_TICK;
      }
    } else {
      state.falangeTimer = 0;
    }

    state.enemigosDerrotados = Math.min(state.objetivoEnemigos, state.tiempoPartida);
    if (state.tiempoPartida >= state.objetivoEnemigos) completeLevel();
  }

  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.comboActual = 0;
  }
  if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt * 3.2);
  if (state.avisoJefeTimer > 0) state.avisoJefeTimer -= dt;
}
