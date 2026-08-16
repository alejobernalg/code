// ---------------------------------------------------------------------
// Jugador: física, entrada, ataques, bloqueo, animación y sprite
// ---------------------------------------------------------------------
import {
  MOVE_SPEED, JUMP_VELOCITY, MELEE_RANGE, MELEE_COOLDOWN,
  CHARGE_HOLD_TIME, CHARGE_COOLDOWN, CHARGE_RADIUS,
  JAVELIN_MAX, JAVELIN_RECHARGE, JAVELIN_SPEED,
  BASH_RADIUS, BASH_FORCE, BASH_INVULN, COLORS
} from "./config.js";
import { applyPhysics, px, pxG, glow } from "./utils.js";
import { spawnParticles } from "./particles.js";
import { sfx } from "./audio.js";
import { state } from "./state.js";
import { input } from "./input.js";
import { damageEnemy, knockbackEnemy } from "./enemies.js";

const ATTACK_LOCK_STATES = new Set(["melee", "charge", "hurt"]);

// A esta distancia el enemigo está prácticamente encima del jugador: no tiene
// sentido exigir que esté "de frente" (el signo de dx es ruidoso ahí y antes
// hacía que golpes a quemarropa fallaran sin motivo aparente).
const POINT_BLANK_RANGE = 10;

function meleeHitEnemies(range, dmg, bypassShield) {
  const p = state.jugador;
  for (const en of state.enemigos) {
    const dx = en.x - p.x;
    if (Math.abs(dx) > range) continue;
    if (Math.abs(en.y - p.y) > p.h + 6) continue;
    if (!bypassShield && Math.abs(dx) > POINT_BLANK_RANGE && Math.sign(dx) !== p.direccion) continue;
    damageEnemy(en, dmg, { bypassShield, attackerX: p.x });
  }
}

function doMeleeAttack() {
  const p = state.jugador;
  p.estado = "melee";
  p.estadoTimer = 0.22;
  p.meleeCooldown = MELEE_COOLDOWN;
  sfx.melee();
  meleeHitEnemies(MELEE_RANGE, 1, false);
}

function doChargedAttack() {
  const p = state.jugador;
  p.estado = "charge";
  p.estadoTimer = 0.4;
  p.chargeReady = false;
  p.chargeCooldown = CHARGE_COOLDOWN;
  p.zHoldTime = 0;
  state.screenShake = 1;
  sfx.chargeRelease();
  spawnParticles(p.x, p.y - p.h * 0.5, COLORS.bronzeLight, 10);
  meleeHitEnemies(CHARGE_RADIUS, 1, true);
}

/**
 * Empujón de escudo al SOLTAR la cobertura: aparta a los enemigos que se
 * amontonaron mientras el jugador estaba inmóvil cubriéndose y le da una
 * breve ventana de invulnerabilidad para que no lo golpeen en el instante
 * en que baja el escudo. Sin esto, cubrirse era una trampa: te protegía
 * pero dejaba a los enemigos pegados a vos, listos para golpearte apenas
 * soltabas C.
 */
function doShieldBash() {
  const p = state.jugador;
  sfx.block();
  state.screenShake = Math.max(state.screenShake, 0.6);
  spawnParticles(p.x, p.y - p.h * 0.5, COLORS.shieldRim, 12);
  p.invulnTimer = Math.max(p.invulnTimer, BASH_INVULN);

  for (const en of state.enemigos) {
    const dx = en.x - p.x;
    if (Math.abs(dx) > BASH_RADIUS) continue;
    if (Math.abs(en.y - p.y) > p.h + 10) continue;
    const dir = Math.sign(dx) || p.direccion;
    knockbackEnemy(en, dir, BASH_FORCE);
  }
}

function throwJavelin() {
  const p = state.jugador;
  p.jabalinasDisponibles--;
  p.estado = "ranged";
  p.estadoTimer = 0.18;
  sfx.javelin();
  state.proyectiles.push({
    tipo: "jabalina",
    x: p.x + p.direccion * 8, y: p.y - p.h * 0.6,
    vx: JAVELIN_SPEED * p.direccion,
    dmg: 2
  });
}

export function updatePlayer(dt) {
  const p = state.jugador;
  if (state.fase !== "playing" || p.estado === "dead") return;

  if (p.invulnTimer > 0) p.invulnTimer -= dt;
  if (p.meleeCooldown > 0) p.meleeCooldown -= dt;
  if (p.chargeCooldown > 0) {
    p.chargeCooldown -= dt;
    if (p.chargeCooldown <= 0) p.chargeReady = true;
  }
  if (p.jabalinasDisponibles < JAVELIN_MAX) {
    p.jabalinaTimer += dt;
    if (p.jabalinaTimer >= JAVELIN_RECHARGE) {
      p.jabalinaTimer = 0;
      p.jabalinasDisponibles++;
    }
  }

  const locked = ATTACK_LOCK_STATES.has(p.estado) && p.estadoTimer > 0;
  const estabaCubriendose = p.cubriendose;
  p.cubriendose = input.cDown && p.onGround && !locked;
  if (estabaCubriendose && !p.cubriendose) doShieldBash();

  if (!p.cubriendose && !locked) {
    let mv = 0;
    if (input.left) mv -= 1;
    if (input.right) mv += 1;
    p.vx = mv * MOVE_SPEED;
    if (mv !== 0) p.direccion = mv > 0 ? 1 : -1;
  } else {
    p.vx = 0;
  }

  if (input.jumpPressed && p.onGround && !p.cubriendose && !locked) {
    p.vy = JUMP_VELOCITY;
    p.onGround = false;
    sfx.jump();
  }

  applyPhysics(p, dt);

  if (input.zPressedEdge && !p.cubriendose && p.meleeCooldown <= 0 && !locked) {
    doMeleeAttack();
  }

  if (input.zDown && !p.cubriendose) {
    p.zHoldTime += dt;
    if (p.zHoldTime >= CHARGE_HOLD_TIME && p.chargeReady) doChargedAttack();
  } else {
    p.zHoldTime = 0;
  }

  if (input.xPressed && !p.cubriendose && !locked && p.jabalinasDisponibles > 0) {
    throwJavelin();
  }

  if (p.estadoTimer > 0) {
    p.estadoTimer -= dt;
  }
  if (p.estadoTimer <= 0) {
    if (p.cubriendose) p.estado = "block";
    else if (!p.onGround) p.estado = "jump";
    else if (p.vx !== 0) p.estado = "walk";
    else p.estado = "idle";
  }

  p.walkFrame += dt * 8;
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

export function drawPlayer(ctx) {
  const p = state.jugador;
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 16) % 2 === 0 && p.estado !== "dead") return;

  const facingRight = p.direccion === 1;
  const walking = p.estado === "walk";
  // La entrada es la fuente inmediata de verdad: así la postura defensiva
  // aparece desde el primer fotograma, sin esperar el cambio de estado.
  const blocking = p.cubriendose;
  const phase = walking ? p.walkFrame : Math.sin(state.tiempoPartida * 3) * 0.4;
  const dead = p.estado === "dead";

  withFacing(ctx, p.x, p.y, facingRight, () => {
    if (dead) {
      ctx.save();
      ctx.rotate(Math.PI / 2.1);
      ctx.globalAlpha = 0.85;
    }

    // sombra de contacto con resplandor suave (ambient occlusion moderno)
    glow(ctx, 0, 2, 8, "rgba(0,0,0,0.5)", 0.6);

    // piernas — degradado en vez de color plano
    if (p.estado === "jump") {
      pxG(ctx, -3, -10, 3, 6, COLORS.skinHi, COLORS.skinShade, COLORS.outline);
      pxG(ctx, 1, -12, 3, 8, COLORS.skinHi, COLORS.skin, COLORS.outline);
    } else if (blocking) {
      // Base amplia y baja: es una postura firme de escudo, no la pose de
      // retroceso que usa el estado "hurt".
      pxG(ctx, -4, -7, 3, 7, COLORS.skinHi, COLORS.skinShade, COLORS.outline);
      pxG(ctx, 2, -7, 3, 7, COLORS.skinHi, COLORS.skin, COLORS.outline);
    } else {
      const swing = walking ? Math.sin(phase) * 3 : 0;
      pxG(ctx, -2 - swing * 0.3, -8, 3, 8, COLORS.skinHi, COLORS.skin, COLORS.outline);
      pxG(ctx, 1 + swing * 0.3, -8, 3, 8, COLORS.skinHi, COLORS.skinShade, COLORS.outline);
    }
    pxG(ctx, -2, -6, 3, 4, COLORS.bronze, COLORS.bronzeDark, COLORS.outline);
    pxG(ctx, 1, -6, 3, 4, COLORS.bronzeHi, COLORS.bronze, COLORS.outline);

    // capa con degradado (más luz arriba, sombra al final de la tela)
    const capeGrad = ctx.createLinearGradient(-9, -18, -8, -4);
    capeGrad.addColorStop(0, COLORS.spartanRedLight);
    capeGrad.addColorStop(1, COLORS.spartanRedDark);
    ctx.fillStyle = capeGrad;
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.lineTo(-9 - (blocking ? 0 : Math.sin(state.tiempoPartida * 5) * 2), -12);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-4, -6);
    ctx.closePath();
    ctx.fill();

    // torso — degradado bronce con brillo especular arriba
    const flashTop = p.estado === "hurt" ? COLORS.white : COLORS.bronzeHi;
    const flashBot = p.estado === "hurt" ? COLORS.white : COLORS.bronzeDark;
    pxG(ctx, -4, -19, 9, 11, flashTop, flashBot, COLORS.outline);
    for (let i = -3; i <= 3; i += 2) px(ctx, i, -9, 1.5, 4, i % 4 === 0 ? COLORS.spartanRed : COLORS.bronzeDark);
    // filo de luz en el borde superior (rim light)
    ctx.strokeStyle = COLORS.rimLight;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-4, -19); ctx.lineTo(5, -19); ctx.stroke();

    // cabeza y casco
    px(ctx, -1, -25, 4, 4, COLORS.skinHi);
    pxG(ctx, -3, -28, 7, 5, COLORS.bronzeHi, COLORS.bronzeDark, COLORS.outline);
    px(ctx, 1, -25, 1.5, 4, COLORS.outline);
    ctx.strokeStyle = COLORS.spartanRedHi;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-3, -30);
    ctx.quadraticCurveTo(2, -34, 7, -27);
    ctx.stroke();

    // escudo — bronce pulido con brillo especular, más grande y al frente al cubrirse
    // Escudo adelantado y mayor al defender: tapa el torso y la cara, dando
    // una silueta de guardia inequívoca.
    const shieldX = blocking ? 9 : 7;
    const shieldR = blocking ? 10 : 6.5;
    drawShield(ctx, shieldX, -16, shieldR);
    if (blocking) {
      spawnBlockGleam(ctx, shieldX, -16);
      pxG(ctx, 1, -17, 4, 3, COLORS.skinHi, COLORS.skinShade, COLORS.outline);
    }

    // arma según el estado — el sprite es más corto que el alcance real del
    // golpe (MELEE_RANGE/CHARGE_RADIUS en config.js) a propósito: se ve más
    // ágil sin cambiar la distancia a la que efectivamente conecta.
    if (p.estado === "melee") {
      const t = 1 - Math.max(0, p.estadoTimer) / 0.22;
      const lunge = Math.sin(t * Math.PI) * 12;
      drawSpear(ctx, shieldX - 2, -18, 18 + lunge, false, t > 0.15 && t < 0.9);
    } else if (p.estado === "charge") {
      const t = 1 - Math.max(0, p.estadoTimer) / 0.4;
      for (let trail = 3; trail >= 1; trail--) {
        ctx.save();
        ctx.globalAlpha = 0.22 * (4 - trail) / 3;
        ctx.translate(2, -16);
        ctx.rotate((t - trail * 0.06) * Math.PI * 5);
        drawSpear(ctx, 0, 0, 24, true, false);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(2, -16);
      ctx.rotate(t * Math.PI * 5);
      drawSpear(ctx, 0, 0, 24, true, true);
      ctx.restore();
    } else if (p.estado === "ranged") {
      drawSpear(ctx, shieldX - 2, -18, 10, false, false);
    } else if (!blocking) {
      drawSpear(ctx, shieldX - 2, -18, 18, false, false);
    }

    if (dead) ctx.restore();
  });
}

function drawShield(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.5, x, y, r);
  g.addColorStop(0, COLORS.spartanRedHi);
  g.addColorStop(0.55, COLORS.spartanRed);
  g.addColorStop(1, COLORS.spartanRedDark);
  ctx.fillStyle = COLORS.outline;
  ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COLORS.shieldRim;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  // brillo especular
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.lambda;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.55); ctx.lineTo(x - r * 0.35, y + r * 0.45);
  ctx.moveTo(x, y - r * 0.55); ctx.lineTo(x + r * 0.35, y + r * 0.45);
  ctx.stroke();
}

function drawSpear(ctx, x, y, len, centered = false, tipGlow = false) {
  const startX = centered ? x - len / 2 : x;
  const shaftGrad = ctx.createLinearGradient(startX, y, startX + len, y);
  shaftGrad.addColorStop(0, "#9a7a48");
  shaftGrad.addColorStop(1, COLORS.javelin);
  ctx.fillStyle = shaftGrad;
  ctx.fillRect(startX, y - 0.8, len, 1.6);
  if (tipGlow) glow(ctx, startX + len, y, 6, "rgba(255,255,255,0.7)", 0.8);
  ctx.fillStyle = COLORS.bladeHi;
  ctx.beginPath();
  ctx.moveTo(startX + len, y - 1.8);
  ctx.lineTo(startX + len + 5, y);
  ctx.lineTo(startX + len, y + 1.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.bladeSilver;
  ctx.beginPath();
  ctx.moveTo(startX + len, y - 1);
  ctx.lineTo(startX + len + 3, y);
  ctx.lineTo(startX + len, y + 1);
  ctx.closePath();
  ctx.fill();
}

let gleamPhase = 0;
function spawnBlockGleam(ctx, x, y) {
  gleamPhase += 0.2;
  ctx.strokeStyle = `rgba(255,224,138,${0.3 + Math.sin(gleamPhase) * 0.2})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 11, -0.6, 0.6);
  ctx.stroke();
}
