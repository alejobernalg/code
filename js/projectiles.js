// ---------------------------------------------------------------------
// Proyectiles: jabalinas del jugador y flechas de los arqueros persas
// ---------------------------------------------------------------------
import { W, COLORS, GRAVITY, activePlatforms } from "./config.js";
import { aabb, glow } from "./utils.js";
import { spawnParticles } from "./particles.js";
import { sfx } from "./audio.js";
import { state, damagePlayer } from "./state.js";
import { damageEnemy } from "./enemies.js";

function explodeBomb(p) {
  const player = state.jugador;
  spawnParticles(p.x, p.y, "#ffb13b", 18);
  spawnParticles(p.x, p.y, "#e85328", 10);
  state.screenShake = Math.max(state.screenShake, 0.7);
  if (Math.hypot(player.x - p.x, (player.y - 10) - p.y) < 28) {
    damagePlayer(p.dmg, Math.sign(player.x - p.x) || 1, { blockable: true });
  }
  for (const plat of activePlatforms) {
    if (!plat.destructible || plat.destroyed) continue;
    const nearX = Math.max(plat.x, Math.min(p.x, plat.x + plat.w));
    if (Math.hypot(p.x - nearX, p.y - plat.y) < 26 && --plat.hp <= 0) plat.destroyed = true;
  }
}

/** Colisión por barrido: a alta velocidad la jabalina puede avanzar más que
 *  el ancho de un enemigo en un solo frame, así que se compara el segmento
 *  recorrido este frame contra la caja, no solo el punto final. */
function sweepHitsBox(prevX, x, y, box) {
  const minX = Math.min(prevX, x), maxX = Math.max(prevX, x);
  return maxX > box.left && minX < box.right && y > box.top && y < box.bottom;
}

export function updateProjectiles(dt) {
  if (state.fase !== "playing") return;

  for (let i = state.proyectiles.length - 1; i >= 0; i--) {
    const p = state.proyectiles[i];
    const prevX = p.x;
    p.x += p.vx * dt;

    let consumed = false;

    if (p.tipo === "jabalina") {
      for (const en of state.enemigos) {
        const box = aabb(en);
        if (sweepHitsBox(prevX, p.x, p.y, box)) {
          damageEnemy(en, p.dmg, { bypassShield: false, attackerX: prevX });
          spawnParticles(p.x, p.y, COLORS.white, 5);
          consumed = true;
          break;
        }
      }
    } else if (p.tipo === "flecha") {
      const box = aabb(state.jugador);
      if (sweepHitsBox(prevX, p.x, p.y, box)) {
        sfx.arrowImpact();
        damagePlayer(p.dmg, Math.sign(p.vx) || 1, { blockable: true });
        spawnParticles(p.x, p.y, COLORS.arrow, 4);
        consumed = true;
      }
    } else if (p.tipo === "bomba") {
      p.vy += GRAVITY * dt * 0.55;
      p.y += p.vy * dt;
      p.life -= dt;
      const playerBox = aabb(state.jugador);
      const hitPlayer = p.x > playerBox.left - 3 && p.x < playerBox.right + 3 && p.y > playerBox.top - 3 && p.y < playerBox.bottom + 3;
      const hitPlatform = activePlatforms.some(plat => !plat.destroyed && p.x > plat.x && p.x < plat.x + plat.w && p.y >= plat.y - 2 && p.y <= plat.y + plat.h);
      if (hitPlayer || hitPlatform || p.life <= 0) {
        explodeBomb(p);
        consumed = true;
      }
    }

    if (consumed || p.x < -24 || p.x > W + 24) {
      state.proyectiles.splice(i, 1);
    }
  }
}

function drawJavelin(ctx, p) {
  const dir = Math.sign(p.vx) || 1;
  glow(ctx, p.x - 5 * dir, p.y, 6, "rgba(255,220,150,0.4)", 0.6);
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(p.x - 6 * dir, p.y); ctx.lineTo(p.x + 6 * dir, p.y); ctx.stroke();
  const shaftGrad = ctx.createLinearGradient(p.x - 6 * dir, p.y, p.x + 6 * dir, p.y);
  shaftGrad.addColorStop(0, "rgba(201,178,122,0)");
  shaftGrad.addColorStop(1, COLORS.javelin);
  ctx.strokeStyle = shaftGrad;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(p.x - 6 * dir, p.y); ctx.lineTo(p.x + 6 * dir, p.y); ctx.stroke();
  glow(ctx, p.x + 6 * dir, p.y, 4, "rgba(255,255,255,0.7)", 0.7);
  ctx.fillStyle = COLORS.bladeHi;
  ctx.beginPath();
  ctx.moveTo(p.x + 6 * dir, p.y - 1.6);
  ctx.lineTo(p.x + 10 * dir, p.y);
  ctx.lineTo(p.x + 6 * dir, p.y + 1.6);
  ctx.closePath();
  ctx.fill();
}

function drawFlecha(ctx, p) {
  const dir = Math.sign(p.vx) || 1;
  const trailGrad = ctx.createLinearGradient(p.x - 5 * dir, p.y, p.x + 3 * dir, p.y);
  trailGrad.addColorStop(0, "rgba(224,208,160,0)");
  trailGrad.addColorStop(1, COLORS.arrow);
  ctx.strokeStyle = trailGrad;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(p.x - 5 * dir, p.y); ctx.lineTo(p.x + 3 * dir, p.y); ctx.stroke();
  ctx.fillStyle = COLORS.arrowHead;
  ctx.beginPath();
  ctx.moveTo(p.x + 5 * dir, p.y);
  ctx.lineTo(p.x + 2 * dir, p.y - 1.4);
  ctx.lineTo(p.x + 2 * dir, p.y + 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a3a2a";
  ctx.beginPath();
  ctx.moveTo(p.x - 5 * dir, p.y - 1.2);
  ctx.lineTo(p.x - 3 * dir, p.y);
  ctx.lineTo(p.x - 5 * dir, p.y + 1.2);
  ctx.stroke();
}

function drawBomb(ctx, p) {
  glow(ctx, p.x, p.y, 10, "rgba(255,100,25,0.7)", 0.8);
  ctx.fillStyle = "#401d1d";
  ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffb13b";
  ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
}

export function drawProjectiles(ctx) {
  for (const p of state.proyectiles) {
    if (p.tipo === "jabalina") drawJavelin(ctx, p);
    else if (p.tipo === "bomba") drawBomb(ctx, p);
    else drawFlecha(ctx, p);
  }
}
