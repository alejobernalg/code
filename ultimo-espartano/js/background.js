// ---------------------------------------------------------------------
// Escenario: cielo de atardecer, montañas, mar, acantilados y plataformas
// ---------------------------------------------------------------------
import { W, H, PLATFORMS, COLORS } from "./config.js";
import { px, glow } from "./utils.js";

const clouds = [
  { x: 40, y: 26, w: 34, h: 6, speed: 1.2 },
  { x: 150, y: 16, w: 46, h: 7, speed: 0.8 },
  { x: 240, y: 34, w: 30, h: 5, speed: 1.5 }
];

const embers = [];
for (let i = 0; i < 16; i++) {
  embers.push({
    x: Math.random() * W,
    y: Math.random() * H,
    vy: -(6 + Math.random() * 10),
    phase: Math.random() * Math.PI * 2,
    life: Math.random()
  });
}

function drawSky(ctx, horizon) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizon);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(0.45, COLORS.skyMid);
  grad.addColorStop(0.82, COLORS.skyLow);
  grad.addColorStop(1, COLORS.skyGlow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, horizon);

  glow(ctx, W / 2, 92, 66, "rgba(255, 220, 150, 0.55)", 1);

  ctx.fillStyle = COLORS.sun;
  ctx.beginPath(); ctx.arc(W / 2, 92, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.sunCore;
  ctx.beginPath(); ctx.arc(W / 2, 94, 9, 0, Math.PI * 2); ctx.fill();
  glow(ctx, W / 2, 93, 12, "rgba(255,255,255,0.6)", 0.5);
}

function drawClouds(ctx, time) {
  ctx.fillStyle = "rgba(255, 200, 150, 0.15)";
  for (const c of clouds) {
    const x = ((c.x + time * c.speed) % (W + 60)) - 30;
    ctx.beginPath();
    ctx.ellipse(x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.ellipse(x + c.w * 0.35, c.y - 2, c.w / 3, c.h / 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMountains(ctx, baseY) {
  const farGrad = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 6);
  farGrad.addColorStop(0, "#5a3352");
  farGrad.addColorStop(1, COLORS.mountainFar);
  ctx.fillStyle = farGrad;
  ctx.beginPath();
  ctx.moveTo(30, baseY - 6);
  ctx.lineTo(66, baseY - 26);
  ctx.lineTo(104, baseY - 10);
  ctx.lineTo(140, baseY - 30);
  ctx.lineTo(180, baseY - 12);
  ctx.lineTo(220, baseY - 24);
  ctx.lineTo(260, baseY - 8);
  ctx.lineTo(290, baseY - 6);
  ctx.lineTo(290, baseY + 6);
  ctx.lineTo(30, baseY + 6);
  ctx.closePath();
  ctx.fill();

  const nearGrad = ctx.createLinearGradient(0, baseY - 22, 0, baseY + 6);
  nearGrad.addColorStop(0, "#7a3f52");
  nearGrad.addColorStop(0.5, COLORS.mountainNear);
  nearGrad.addColorStop(1, COLORS.mountainNearDark);
  ctx.fillStyle = nearGrad;
  ctx.beginPath();
  ctx.moveTo(44, baseY);
  ctx.lineTo(82, baseY - 20);
  ctx.lineTo(120, baseY - 4);
  ctx.lineTo(150, baseY - 22);
  ctx.lineTo(190, baseY - 4);
  ctx.lineTo(230, baseY - 18);
  ctx.lineTo(266, baseY);
  ctx.lineTo(266, baseY + 6);
  ctx.lineTo(44, baseY + 6);
  ctx.closePath();
  ctx.fill();
  px(ctx, 30, baseY + 4, 260, 3, COLORS.mountainNearDark);
}

function drawSea(ctx, time, y) {
  const grad = ctx.createLinearGradient(0, y, 0, y + 16);
  grad.addColorStop(0, COLORS.seaMid);
  grad.addColorStop(0.4, COLORS.sea);
  grad.addColorStop(1, "#0a0e26");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, W, 16);

  // reflejo cálido del sol sobre el agua
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 4; i++) {
    const w = 20 - i * 4;
    ctx.fillStyle = COLORS.seaGlow;
    ctx.fillRect(W / 2 - w / 2, y + 1 + i * 3, w, 1.5);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.seaLight;
  for (let x = 0; x < W; x += 6) {
    if (Math.sin(x * 0.4 + time * 3) > 0.6) px(ctx, x, y + 6 + ((x * 7) % 7), 3, 1, COLORS.seaLight);
  }
}

function drawCliff(ctx, isLeft) {
  const grad = isLeft
    ? ctx.createLinearGradient(0, 0, 30, 0)
    : ctx.createLinearGradient(W, 0, W - 30, 0);
  grad.addColorStop(0, COLORS.cliffLight);
  grad.addColorStop(0.35, COLORS.cliff);
  grad.addColorStop(1, "#160e1a");
  ctx.fillStyle = grad;
  ctx.beginPath();
  if (isLeft) {
    ctx.moveTo(0, 0); ctx.lineTo(28, 0); ctx.lineTo(18, 40);
    ctx.lineTo(30, 75); ctx.lineTo(16, 115); ctx.lineTo(28, 155);
    ctx.lineTo(14, H); ctx.lineTo(0, H);
    ctx.closePath();
  } else {
    ctx.moveTo(W, 0); ctx.lineTo(W - 28, 0); ctx.lineTo(W - 18, 40);
    ctx.lineTo(W - 30, 75); ctx.lineTo(W - 16, 115); ctx.lineTo(W - 28, 155);
    ctx.lineTo(W - 14, H); ctx.lineTo(W, H);
    ctx.closePath();
  }
  ctx.fill();
  ctx.strokeStyle = COLORS.cliffLight;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  const baseX = isLeft ? 6 : W - 10;
  const dir = isLeft ? 1 : -1;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(baseX + dir * (i % 2) * 3, 8 + i * 26);
    ctx.lineTo(baseX + dir * 8, 24 + i * 26);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.cliffEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBrickPlatform(ctx, plat) {
  const grad = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
  grad.addColorStop(0, COLORS.brickLight);
  grad.addColorStop(0.25, COLORS.brick);
  grad.addColorStop(1, COLORS.brickDark);
  ctx.fillStyle = grad;
  ctx.fillRect(Math.round(plat.x), Math.round(plat.y), Math.round(plat.w), Math.round(plat.h));
  ctx.strokeStyle = COLORS.brickLine;
  ctx.lineWidth = 1;
  const rowH = 6;
  let offset = 0;
  let row = 0;
  for (let y = plat.y; y < plat.y + plat.h; y += rowH) {
    const rh = Math.min(rowH, plat.y + plat.h - y);
    for (let x = plat.x - offset; x < plat.x + plat.w; x += 16) {
      const tone = (Math.floor(x / 16) + row) % 5 === 0 ? COLORS.brickLight
        : (Math.floor(x / 16) + row) % 7 === 0 ? COLORS.brickDark : null;
      if (tone) {
        const cx = Math.max(x + 1, plat.x + 1);
        const cw = Math.min(14, plat.x + plat.w - cx - 1);
        if (cw > 0) px(ctx, cx, y + 1, cw, rh - 1, tone);
      }
    }
    ctx.beginPath(); ctx.moveTo(plat.x, y + 0.5); ctx.lineTo(plat.x + plat.w, y + 0.5); ctx.stroke();
    for (let x = plat.x - offset; x < plat.x + plat.w; x += 16) {
      if (x < plat.x || x > plat.x + plat.w) continue;
      ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + rh); ctx.stroke();
    }
    offset = offset === 0 ? 8 : 0;
    row++;
  }
  // borde superior claro (da sensación de volumen a la plataforma)
  px(ctx, plat.x, plat.y, plat.w, 1, COLORS.brickLight);
  // sombra bajo la plataforma
  if (plat.h < 20) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(plat.x, plat.y + plat.h, plat.w, 4);
  }
}

function drawEmbers(ctx, time, dt) {
  ctx.fillStyle = "#ff8a3a";
  for (const e of embers) {
    e.life -= dt * 0.12;
    if (e.life <= 0) {
      e.life = 1;
      e.x = Math.random() * W;
      e.y = H + 2;
    }
    const y = e.y + e.vy * (1 - e.life) * 6;
    const alpha = Math.sin(e.life * Math.PI);
    ctx.globalAlpha = Math.max(0, alpha * 0.55);
    ctx.fillRect(Math.round(e.x + Math.sin(time + e.phase) * 5), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

export function drawBackground(ctx, time, dt = 0) {
  const horizon = 178;
  drawSky(ctx, horizon);
  drawClouds(ctx, time);
  drawMountains(ctx, 150);
  drawSea(ctx, time, 168);
  drawCliff(ctx, true);
  drawCliff(ctx, false);
  for (const plat of PLATFORMS) drawBrickPlatform(ctx, plat);
  drawEmbers(ctx, time, dt);
}

export function drawVignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
