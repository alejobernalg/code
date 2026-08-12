// ---------------------------------------------------------------------
// Evento especial: lluvia de flechas — máquina de estados
// normal -> aviso -> activa -> normal
// ---------------------------------------------------------------------
import { W, H, PLATFORMS, COLORS, RAIN_MIN_INTERVAL, RAIN_MAX_INTERVAL, RAIN_WARNING_TIME, RAIN_DURATION, RAIN_ARROW_RATE, RAIN_BONUS_SCORE } from "./config.js";
import { aabb, rand } from "./utils.js";
import { spawnParticles } from "./particles.js";
import { sfx } from "./audio.js";
import { state, damagePlayer } from "./state.js";
import { damageEnemy } from "./enemies.js";

let spawnAccumulator = 0;

function spawnFallingArrow() {
  state.flechasLluvia.push({ x: rand(16, W - 16), y: -10, vy: rand(190, 250) });
}

function updateFallingArrows(dt) {
  for (let i = state.flechasLluvia.length - 1; i >= 0; i--) {
    const a = state.flechasLluvia[i];
    a.y += a.vy * dt;
    let remove = false;

    const pBox = aabb(state.jugador);
    if (a.x > pBox.left && a.x < pBox.right && a.y > pBox.top && a.y < pBox.bottom) {
      const hit = damagePlayer(1, 0, { blockable: true });
      if (hit) state.lluvia.danoRecibido = true;
      sfx.arrowImpact();
      spawnParticles(a.x, a.y, COLORS.arrow, 4);
      remove = true;
    }

    if (!remove) {
      for (const en of state.enemigos) {
        const eBox = aabb(en);
        if (a.x > eBox.left && a.x < eBox.right && a.y > eBox.top && a.y < eBox.bottom) {
          damageEnemy(en, 1, { bypassShield: true });
          spawnParticles(a.x, a.y, COLORS.white, 4);
          remove = true;
          break;
        }
      }
    }

    if (!remove) {
      for (const plat of PLATFORMS) {
        if (a.x > plat.x && a.x < plat.x + plat.w && a.y >= plat.y - 2 && a.y <= plat.y + 5) {
          spawnParticles(a.x, plat.y, COLORS.arrow, 3);
          remove = true;
          break;
        }
      }
    }

    if (a.y > H + 10) remove = true;
    if (remove) state.flechasLluvia.splice(i, 1);
  }
}

export function updateArrowRain(dt) {
  const r = state.lluvia;
  if (r.bonusTimer > 0) r.bonusTimer -= dt;
  if (state.fase !== "playing") return;

  if (r.fase === "normal") {
    r.timer -= dt;
    if (r.timer <= 0) {
      r.fase = "aviso";
      r.timer = RAIN_WARNING_TIME;
      sfx.warning();
    }
  } else if (r.fase === "aviso") {
    r.timer -= dt;
    if (r.timer <= 0) {
      r.fase = "activa";
      r.timer = RAIN_DURATION;
      r.danoRecibido = false;
      spawnAccumulator = 0;
    }
  } else if (r.fase === "activa") {
    r.timer -= dt;
    spawnAccumulator += dt * RAIN_ARROW_RATE;
    while (spawnAccumulator >= 1) {
      spawnAccumulator -= 1;
      spawnFallingArrow();
    }
    updateFallingArrows(dt);
    if (r.timer <= 0) {
      if (!r.danoRecibido) {
        state.puntos += RAIN_BONUS_SCORE;
        r.bonusTimer = 2.4;
      }
      r.fase = "normal";
      r.timer = rand(RAIN_MIN_INTERVAL, RAIN_MAX_INTERVAL);
      state.flechasLluvia.length = 0;
    }
  }
}

export function drawArrowRainOverlay(ctx) {
  const r = state.lluvia;
  if (r.fase === "aviso") {
    const pulse = 0.15 + Math.abs(Math.sin(state.tiempoPartida * 10)) * 0.15;
    ctx.fillStyle = `rgba(20, 5, 25, ${pulse})`;
    ctx.fillRect(0, 0, W, H);
  } else if (r.fase === "activa") {
    ctx.fillStyle = "rgba(20, 5, 25, 0.22)";
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawFallingArrows(ctx) {
  ctx.strokeStyle = COLORS.arrow;
  ctx.lineWidth = 1.2;
  for (const a of state.flechasLluvia) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 6);
    ctx.lineTo(a.x, a.y + 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.arrowHead;
    ctx.beginPath();
    ctx.moveTo(a.x - 1.4, a.y + 2);
    ctx.lineTo(a.x + 1.4, a.y + 2);
    ctx.lineTo(a.x, a.y + 5);
    ctx.closePath();
    ctx.fill();
  }
}
