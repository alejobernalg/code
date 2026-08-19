// ---------------------------------------------------------------------
// Escenario: cielo de atardecer, montañas, mar, acantilados y plataformas
// ---------------------------------------------------------------------
import { W, H, activePlatforms, COLORS } from "./config.js";
import { px, glow, lerp, rand, clamp } from "./utils.js";
import { state } from "./state.js";

const clouds = [
  { x: 40, y: 26, w: 34, h: 6, speed: 1.2 },
  { x: 150, y: 16, w: 46, h: 7, speed: 0.8 },
  { x: 240, y: 34, w: 30, h: 5, speed: 1.5 }
];

const duskDust = [];
for (let i = 0; i < 22; i++) {
  duskDust.push({
    x: Math.random() * W,
    y: 20 + Math.random() * 150,
    speed: 8 + Math.random() * 16,
    drift: Math.random() * Math.PI * 2,
    size: Math.random() < 0.3 ? 2 : 1
  });
}

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

function drawCave(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#050d19");
  g.addColorStop(0.5, "#0a2631");
  g.addColorStop(1, "#06141c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, 72, 84, 70, "rgba(48, 204, 183, 0.24)", 1);
  glow(ctx, 250, 130, 58, "rgba(38, 150, 190, 0.18)", 1);
  ctx.fillStyle = "#071018";
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(40, 0); ctx.lineTo(52, 34); ctx.lineTo(84, 12); ctx.lineTo(120, 48);
  ctx.lineTo(160, 20); ctx.lineTo(198, 46); ctx.lineTo(236, 8); ctx.lineTo(276, 38); ctx.lineTo(W, 18);
  ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#0c3840";
  for (let x = 18; x < W; x += 34) {
    const h = 18 + ((x * 13) % 28);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 12, h); ctx.lineTo(x + 22, 0); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = "rgba(96, 225, 200, 0.48)";
  for (let i = 0; i < 18; i++) {
    const x = (i * 47 + 19) % W, y = 40 + ((i * 31) % 128);
    if (Math.sin(time * 1.8 + i) > 0.15) px(ctx, x, y, 1, 1, "#76e6d0");
  }
  ctx.fillStyle = "#041017";
  ctx.beginPath(); ctx.moveTo(0, 220); ctx.lineTo(25, 184); ctx.lineTo(58, 205); ctx.lineTo(95, 188); ctx.lineTo(136, 210); ctx.lineTo(176, 190); ctx.lineTo(220, 207); ctx.lineTo(266, 181); ctx.lineTo(W, 204); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
}

function drawCavePlatform(ctx, plat) {
  if (plat.destroyed) return;
  const g = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
  g.addColorStop(0, "#58c4bb"); g.addColorStop(0.15, "#1d7377"); g.addColorStop(1, "#092c38");
  ctx.fillStyle = g; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  px(ctx, plat.x, plat.y, plat.w, 1, "#9df4df");
  ctx.strokeStyle = "#06202b"; ctx.lineWidth = 1;
  for (let x = plat.x + 10; x < plat.x + plat.w; x += 13) { ctx.beginPath(); ctx.moveTo(x, plat.y); ctx.lineTo(x - 4, plat.y + plat.h); ctx.stroke(); }
  if (plat.destructible) px(ctx, plat.x + plat.w / 2 - 2, plat.y + 2, 4, 1, "#d4fff0");
}

/**
 * Nivel 2 — cañón polvoriento: paredes de roca cerrándose sobre un corredor
 * angosto, luz de atardecer filtrada por una bruma dorada densa (sin sol
 * nítido como en Termópilas: aquí apenas es un resplandor difuso) y el
 * fondo poblado de siluetas de guerra lejanas, fiel al tono de una carga
 * de bestias de guerra sobre el desierto.
 */
function drawCanyonSky(ctx, horizon) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizon);
  grad.addColorStop(0, "#2a1a12");
  grad.addColorStop(0.35, "#5a3420");
  grad.addColorStop(0.7, COLORS.duskAmber);
  grad.addColorStop(1, COLORS.duskHaze);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, horizon);
  glow(ctx, W / 2, horizon - 10, 90, "rgba(240, 190, 120, 0.4)", 1);
}

function drawCanyonWalls(ctx, baseY) {
  const wallGrad = ctx.createLinearGradient(0, 0, 0, baseY + 10);
  wallGrad.addColorStop(0, "#1c130e");
  wallGrad.addColorStop(1, "#0e0906");
  ctx.fillStyle = wallGrad;
  // pared izquierda
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(46, 0); ctx.lineTo(34, 30); ctx.lineTo(50, 58);
  ctx.lineTo(30, 92); ctx.lineTo(44, 130); ctx.lineTo(26, baseY + 10);
  ctx.lineTo(0, baseY + 10); ctx.closePath(); ctx.fill();
  // pared derecha
  ctx.beginPath();
  ctx.moveTo(W, 0); ctx.lineTo(W - 46, 0); ctx.lineTo(W - 34, 30); ctx.lineTo(W - 50, 58);
  ctx.lineTo(W - 30, 92); ctx.lineTo(W - 44, 130); ctx.lineTo(W - 26, baseY + 10);
  ctx.lineTo(W, baseY + 10); ctx.closePath(); ctx.fill();

  ctx.strokeStyle = "rgba(230,170,100,0.28)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(4, 10 + i * 24); ctx.lineTo(30, 4 + i * 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 4, 10 + i * 24); ctx.lineTo(W - 30, 4 + i * 24); ctx.stroke();
  }

  // siluetas de guerra distantes, apenas visibles en la bruma
  ctx.fillStyle = "rgba(20,12,8,0.55)";
  for (let x = 60; x < W - 60; x += 26) {
    const h = 8 + ((x * 7) % 6);
    ctx.fillRect(x, baseY - h, 2, h);
  }
}

function drawCanyonFloor(ctx, y) {
  const grad = ctx.createLinearGradient(0, y, 0, H);
  grad.addColorStop(0, "#4a3018");
  grad.addColorStop(0.3, "#2a1a0e");
  grad.addColorStop(1, "#140c06");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, W, H - y);
  ctx.fillStyle = "rgba(230,170,100,0.15)";
  for (let x = 0; x < W; x += 18) {
    if ((x * 13) % 7 < 3) px(ctx, x, y + 3 + ((x * 5) % 10), 6, 1, "rgba(230,170,100,0.15)");
  }
}

function drawDuskDust(ctx, time, dt) {
  ctx.fillStyle = "#e0b878";
  for (const d of duskDust) {
    d.x -= d.speed * dt;
    if (d.x < -4) d.x = W + 4;
    const y = d.y + Math.sin(time * 1.4 + d.drift) * 6;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(Math.round(d.x), Math.round(y), d.size, d.size);
  }
  ctx.globalAlpha = 1;
}

function drawRockLedge(ctx, plat) {
  const g = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
  g.addColorStop(0, "#8a6440");
  g.addColorStop(0.3, "#5c4028");
  g.addColorStop(1, "#2a1c10");
  ctx.fillStyle = g;
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  px(ctx, plat.x, plat.y, plat.w, 1, "#c9955a");
  ctx.fillStyle = "rgba(20,12,6,0.4)";
  for (let x = plat.x + 6; x < plat.x + plat.w; x += 11) {
    const h = 2 + ((x * 3) % 3);
    ctx.fillRect(x, plat.y + 1, 4, h);
  }
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(plat.x, plat.y + plat.h, plat.w, 4);
}

function drawCanyon(ctx, time, dt) {
  const horizon = 150;
  drawCanyonSky(ctx, horizon);
  drawCanyonWalls(ctx, 158);
  drawDuskDust(ctx, time, dt);
  drawCanyonFloor(ctx, 176);
}

/**
 * Nivel 4 — última noche en las Puertas Calientes: el objetivo es de tiempo,
 * no de bajas (ver `tipoObjetivo` en state.js), así que el cielo tormentoso
 * se va aclarando hacia el dorado del amanecer en proporción directa al
 * progreso (`dawnPct`) — el fondo mismo cuenta cuánto falta para ganar.
 */
const lightning = { timer: rand(1.5, 3.5), flash: 0 };

function drawLastStandSky(ctx, horizon, dawnPct) {
  const topNight = [8, 8, 20], topDawn = [58, 24, 46];
  const lowNight = [24, 20, 44], lowDawn = [255, 150, 78];
  const top = topNight.map((c, i) => Math.round(lerp(c, topDawn[i], dawnPct)));
  const low = lowNight.map((c, i) => Math.round(lerp(c, lowDawn[i], dawnPct)));
  const grad = ctx.createLinearGradient(0, 0, 0, horizon);
  grad.addColorStop(0, `rgb(${top.join(",")})`);
  grad.addColorStop(1, `rgb(${low.join(",")})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, horizon);
  if (dawnPct > 0.05) glow(ctx, W / 2, horizon, 50 + dawnPct * 55, `rgba(255,180,90,${0.15 + dawnPct * 0.4})`, 1);
}

function drawStormRidge(ctx, baseY, dawnPct) {
  const top = [Math.round(lerp(20, 90, dawnPct)), Math.round(lerp(14, 50, dawnPct)), Math.round(lerp(28, 40, dawnPct))];
  const g = ctx.createLinearGradient(0, baseY - 40, 0, baseY + 10);
  g.addColorStop(0, `rgb(${top.join(",")})`);
  g.addColorStop(1, "#050308");
  ctx.fillStyle = g;
  const ridge = [[0, -4], [36, -34], [70, -10], [108, -40], [150, -14], [190, -36], [230, -10], [268, -30], [W, -6]];
  ctx.beginPath();
  ctx.moveTo(0, baseY + 10);
  for (const [x, dy] of ridge) ctx.lineTo(x, baseY + dy);
  ctx.lineTo(W, baseY + 10);
  ctx.closePath();
  ctx.fill();
  if (dawnPct > 0.15) {
    ctx.strokeStyle = `rgba(255,190,110,${(dawnPct - 0.15) * 0.6})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY + ridge[0][1]);
    for (const [x, dy] of ridge) ctx.lineTo(x, baseY + dy);
    ctx.stroke();
  }
}

function drawRain(ctx) {
  ctx.strokeStyle = "rgba(180,200,230,0.22)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const x = (i * 53 + state.tiempoPartida * 60) % (W + 40) - 20;
    const y = (i * 37 + state.tiempoPartida * 130) % H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + 11);
    ctx.stroke();
  }
}

/** La tormenta amaina según se acerca el amanecer: los relámpagos se espacian más. */
function drawLightning(ctx, dt, dawnPct) {
  lightning.timer -= dt;
  if (lightning.timer <= 0) {
    lightning.flash = Math.random() < 0.55 ? 0.32 : 0;
    lightning.timer = rand(1.8, 4 + dawnPct * 6);
  }
  if (lightning.flash > 0) {
    ctx.fillStyle = `rgba(220,230,255,${lightning.flash})`;
    ctx.fillRect(0, 0, W, H);
    lightning.flash = Math.max(0, lightning.flash - dt * 2.2);
  }
}

function drawStormFloor(ctx, y, dawnPct) {
  const top = [Math.round(lerp(20, 70, dawnPct)), Math.round(lerp(16, 36, dawnPct)), Math.round(lerp(22, 28, dawnPct))];
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, `rgb(${top.join(",")})`);
  g.addColorStop(1, "#050304");
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, H - y);
}

function drawLastStand(ctx, time, dt, dawnPct) {
  const horizon = 168;
  drawLastStandSky(ctx, horizon, dawnPct);
  drawStormRidge(ctx, 150, dawnPct);
  drawRain(ctx);
  drawLightning(ctx, dt, dawnPct);
  drawStormFloor(ctx, horizon, dawnPct);
}

function drawStormLedge(ctx, plat, dawnPct) {
  const g = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
  g.addColorStop(0, "#5a6478");
  g.addColorStop(0.35, "#333c4c");
  g.addColorStop(1, "#14161e");
  ctx.fillStyle = g;
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  px(ctx, plat.x, plat.y, plat.w, 1, "rgba(200,210,230,0.55)");
  ctx.fillStyle = "rgba(10,10,16,0.4)";
  for (let x = plat.x + 6; x < plat.x + plat.w; x += 10) px(ctx, x, plat.y + 1, 3, 2 + ((x * 3) % 3), "rgba(10,10,16,0.4)");
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(plat.x, plat.y + plat.h, plat.w, 4);

  // La posición de falange: un estandarte espartano clavado marca el punto
  // que conviene sostener (ver mecánica de `falange` en state.js).
  if (plat.falange) {
    const cx = plat.x + plat.w / 2;
    glow(ctx, cx, plat.y - 14, 22, `rgba(255,120,80,${0.25 + dawnPct * 0.25})`, 1);
    px(ctx, cx - 1, plat.y - 24, 2, 24, "#8a5a20");
    ctx.fillStyle = COLORS.spartanRed;
    ctx.beginPath();
    ctx.moveTo(cx, plat.y - 24);
    ctx.lineTo(cx + 12, plat.y - 19);
    ctx.lineTo(cx, plat.y - 14);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawBackground(ctx, time, dt = 0) {
  if (state.nivel === 4) {
    const dawnPct = clamp(state.tiempoPartida / (state.objetivoEnemigos || 1), 0, 1);
    drawLastStand(ctx, time, dt, dawnPct);
    for (const plat of activePlatforms) drawStormLedge(ctx, plat, dawnPct);
    return;
  }
  if (state.nivel === 3) {
    drawCave(ctx, time);
    for (const plat of activePlatforms) drawCavePlatform(ctx, plat);
    return;
  }
  if (state.nivel === 2) {
    drawCanyon(ctx, time, dt);
    for (const plat of activePlatforms) if (!plat.destroyed) drawRockLedge(ctx, plat);
    return;
  }
  const horizon = 178;
  drawSky(ctx, horizon);
  drawClouds(ctx, time);
  drawMountains(ctx, 150);
  drawSea(ctx, time, 168);
  drawCliff(ctx, true);
  drawCliff(ctx, false);
  for (const plat of activePlatforms) if (!plat.destroyed) drawBrickPlatform(ctx, plat);
  drawEmbers(ctx, time, dt);
}

export function drawVignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
