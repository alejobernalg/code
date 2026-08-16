// ---------------------------------------------------------------------
// Utilidades: dibujo pixel-art, matemáticas y física de plataformas
// ---------------------------------------------------------------------
import { W, H, GRAVITY, activePlatforms, clamp } from "./config.js";

export { clamp };

export function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function pxO(ctx, x, y, w, h, color, outline) {
  const rx = Math.round(x), ry = Math.round(y), rw = Math.round(w), rh = Math.round(h);
  ctx.fillStyle = outline || "#140c10";
  ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
  ctx.fillStyle = color;
  ctx.fillRect(rx, ry, rw, rh);
}

/** Rectángulo con degradado vertical (claro→oscuro) + contorno — reemplazo "moderno" de pxO. */
export function pxG(ctx, x, y, w, h, colorTop, colorBottom, outline) {
  const rx = Math.round(x), ry = Math.round(y), rw = Math.round(w), rh = Math.round(h);
  ctx.fillStyle = outline || "#140c10";
  ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
  const g = ctx.createLinearGradient(0, ry, 0, ry + rh);
  g.addColorStop(0, colorTop);
  g.addColorStop(1, colorBottom);
  ctx.fillStyle = g;
  ctx.fillRect(rx, ry, rw, rh);
}

/** Resplandor suave radial — para brillos de arma, chispas de impacto y luces ambiente. */
export function glow(ctx, x, y, r, color, alpha = 0.55) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Rectángulo con esquinas redondeadas (para paneles de HUD modernos). */
export function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

export function circO(ctx, cx, cy, r, color, outline) {
  ctx.fillStyle = outline || "#140c10";
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function pixelText(ctx, text, x, y, color, size = 8, align = "left") {
  ctx.font = `${size}px 'Courier New', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

/** Caja de colisión ancla en (x,y) = pies, centrada horizontalmente. */
export function aabb(entity) {
  return {
    left: entity.x - entity.hw,
    right: entity.x + entity.hw,
    top: entity.y - entity.h,
    bottom: entity.y
  };
}

export function aabbOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Física simple de plataformas de una sola cara (sólidas solo desde arriba).
 * Requiere que entity tenga {x,y,vx,vy,hw,h,onGround}.
 */
export function applyPhysics(entity, dt, { gravity = true } = {}) {
  if (gravity) entity.vy += GRAVITY * dt;

  entity.x += entity.vx * dt;
  entity.x = clamp(entity.x, entity.hw, W - entity.hw);

  const prevBottom = entity.y;
  entity.y += entity.vy * dt;
  entity.onGround = false;

  for (const plat of activePlatforms) {
    if (plat.destroyed) continue;
    const withinX = entity.x + entity.hw > plat.x && entity.x - entity.hw < plat.x + plat.w;
    if (!withinX) continue;
    const platTop = plat.y;
    if (entity.vy >= 0 && prevBottom <= platTop + 0.6 && entity.y >= platTop) {
      entity.y = platTop;
      entity.vy = 0;
      entity.onGround = true;
    }
  }

  if (entity.y > H) {
    entity.y = H;
    entity.vy = 0;
    entity.onGround = true;
  }
}

/** Encuentra la plataforma que soporta la posición dada (o null si está en el aire). */
export function platformUnder(x, y) {
  for (const plat of activePlatforms) {
    if (plat.destroyed) continue;
    if (x > plat.x && x < plat.x + plat.w && Math.abs(y - plat.y) < 1.5) return plat;
  }
  return null;
}
