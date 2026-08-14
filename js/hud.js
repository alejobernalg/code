// ---------------------------------------------------------------------
// Interfaz: HUD de partida, pantalla de inicio y pantalla de Game Over
// ---------------------------------------------------------------------
import { W, H, COLORS, JAVELIN_MAX, LEVEL_COUNT } from "./config.js";
import { pixelText, px, roundRect, glow } from "./utils.js";
import { state } from "./state.js";

function shadowText(ctx, text, x, y, color, size = 8, align = "left") {
  pixelText(ctx, text, x + 1, y + 1, "rgba(0,0,0,0.6)", size, align);
  pixelText(ctx, text, x, y, color, size, align);
}

function panel(ctx, x, y, w, h, alpha = 0.55) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(28, 14, 34, ${alpha})`);
  g.addColorStop(1, `rgba(10, 5, 16, ${alpha})`);
  roundRect(ctx, x, y, w, h, 4, g, "rgba(255,180,110,0.25)");
}

function drawHelmetIcon(ctx, x, y) {
  const g = ctx.createLinearGradient(0, y, 0, y + 6);
  g.addColorStop(0, COLORS.bronzeHi);
  g.addColorStop(1, COLORS.bronzeDark);
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(x - 1, y + 1, 10, 6);
  ctx.fillRect(x, y - 1, 8, 5);
  ctx.fillStyle = g;
  ctx.fillRect(x, y + 2, 8, 4);
  ctx.fillRect(x + 1, y, 6, 3);
  ctx.strokeStyle = COLORS.spartanRedHi;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 1);
  ctx.quadraticCurveTo(x + 4, y - 3, x + 7, y - 1);
  ctx.stroke();
}

export function drawHUD(ctx) {
  panel(ctx, 2, 2, 82, 20);
  shadowText(ctx, `PUNTOS ${state.puntos}`, 6, 4, "#ffe9c4", 7, "left");
  shadowText(ctx, `MEJOR ${state.mejorPuntaje}`, 6, 13, "#c9b98a", 6, "left");

  const levelW = 34;
  panel(ctx, W / 2 - levelW / 2, 2, levelW, 10, 0.5);
  shadowText(ctx, `NIVEL ${state.nivel}`, W / 2, 4, "#f0e0c4", 6, "center");

  const livesW = state.vidas > 0 ? state.vidas * 12 + 8 : 0;
  if (livesW > 0) panel(ctx, W - livesW - 4, 2, livesW, 12);
  for (let i = 0; i < state.vidas; i++) drawHelmetIcon(ctx, W - 14 - i * 12, 4);

  // jabalinas disponibles — pips con brillo
  const jw = JAVELIN_MAX * 7 + 6;
  panel(ctx, W - jw - 4, 17, jw, 9, 0.45);
  for (let i = 0; i < JAVELIN_MAX; i++) {
    const filled = i < state.jugador.jabalinasDisponibles;
    const x = W - 10 - i * 7;
    if (filled) glow(ctx, x + 2, 21, 4, COLORS.javelin, 0.5);
    px(ctx, x, 19.5, 4, 2, filled ? COLORS.javelin : "#3a2f26");
  }

  if (state.comboActual > 1 && state.comboTimer > 0) {
    const alpha = Math.min(1, state.comboTimer / 0.4);
    const scale = 1 + Math.min(0.3, (0.4 - state.comboTimer) * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, 6);
    ctx.scale(scale, scale);
    shadowText(ctx, `COMBO x${state.comboActual}`, 0, 0, "#ffd25a", 9, "center");
    ctx.restore();
  }

  if (state.lluvia.fase === "aviso") {
    const pulse = 0.55 + Math.abs(Math.sin(state.tiempoPartida * 10)) * 0.35;
    ctx.globalAlpha = pulse;
    panel(ctx, W / 2 - 52, 18, 104, 13, 0.7);
    glow(ctx, W / 2, 24, 30, "rgba(255,60,40,0.35)", 1);
    ctx.globalAlpha = 1;
    shadowText(ctx, "⚠ ¡LLUVIA DE FLECHAS! ⚠", W / 2, 21, COLORS.warning, 7, "center");
  }

  if (state.lluvia.bonusTimer > 0) {
    ctx.globalAlpha = Math.min(1, state.lluvia.bonusTimer / 0.5);
    shadowText(ctx, "¡SIN DAÑO! +200", W / 2, 34, "#7fe08a", 8, "center");
    ctx.globalAlpha = 1;
  }

  if (state.screenShake > 0.05) {
    ctx.fillStyle = `rgba(180,20,20,${state.screenShake * 0.12})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Casco corintio grande con cresta — emblema de la pantalla de título. */
function drawEmblem(ctx, cx, cy, time) {
  const bob = Math.sin(time * 1.4) * 1.5;
  cy += bob;
  glow(ctx, cx, cy - 2, 42, "rgba(255,150,70,0.4)", 1);

  const crestOuter = ctx.createLinearGradient(cx, cy - 36, cx, cy - 4);
  crestOuter.addColorStop(0, COLORS.spartanRedHi);
  crestOuter.addColorStop(1, COLORS.spartanRedDark);
  ctx.strokeStyle = crestOuter;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 17, cy - 3);
  ctx.quadraticCurveTo(cx, cy - 36, cx + 17, cy - 3);
  ctx.stroke();
  ctx.strokeStyle = COLORS.spartanRedLight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 5);
  ctx.quadraticCurveTo(cx, cy - 29, cx + 14, cy - 5);
  ctx.stroke();

  const domeGrad = ctx.createLinearGradient(0, cy - 15, 0, cy + 9);
  domeGrad.addColorStop(0, COLORS.bronzeHi);
  domeGrad.addColorStop(0.6, COLORS.bronze);
  domeGrad.addColorStop(1, COLORS.bronzeDark);
  roundRect(ctx, cx - 18, cy - 16, 36, 24, 11, COLORS.outline);
  roundRect(ctx, cx - 16, cy - 14, 32, 20, 10, domeGrad);

  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(cx - 2.5, cy - 14, 5, 17);
  ctx.fillStyle = "#0a0508";
  ctx.fillRect(cx - 13.5, cy - 5, 8, 4.5);
  ctx.fillRect(cx + 5.5, cy - 5, 8, 4.5);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx - 8, cy - 9, 4.5, 2.2, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

const CONTROLS = [
  { key: "←→", label: "MOVERSE" },
  { key: "↑ / ESPACIO", label: "SALTAR" },
  { key: "Z", label: "ATACAR (MANTÉN = GIRO)" },
  { key: "X", label: "LANZAR JABALINA" },
  { key: "C", label: "CUBRIRSE CON ESCUDO" }
];

function drawKeyRow(ctx, x, y, key, label) {
  const chipW = 50, chipH = 10;
  const chipGrad = ctx.createLinearGradient(0, y, 0, y + chipH);
  chipGrad.addColorStop(0, COLORS.bronzeHi);
  chipGrad.addColorStop(1, COLORS.bronzeDark);
  roundRect(ctx, x, y, chipW, chipH, 3, chipGrad, COLORS.outline);
  pixelText(ctx, key, x + chipW / 2, y + 2, COLORS.outline, 6, "center");
  pixelText(ctx, label, x + chipW + 8, y + 2, "#f0e0c4", 7, "left");
}

export function drawStartScreen(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(10, 4, 16, 0.5)");
  g.addColorStop(0.5, "rgba(10, 4, 16, 0.68)");
  g.addColorStop(1, "rgba(4, 2, 8, 0.88)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  drawEmblem(ctx, W / 2, 46, time);

  shadowText(ctx, "EL ÚLTIMO ESPARTANO", W / 2, 66, "#ff7a4a", 14, "center");
  shadowText(ctx, "Defiende el paso de las Termópilas", W / 2, 84, COLORS.white, 7, "center");

  ctx.strokeStyle = "rgba(255,180,110,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2 - 70, 95); ctx.lineTo(W / 2 + 70, 95); ctx.stroke();

  const panelX = W / 2 - 98, panelY = 100, panelW = 196, rowH = 13;
  panel(ctx, panelX, panelY, panelW, CONTROLS.length * rowH + 8, 0.45);
  CONTROLS.forEach((c, i) => drawKeyRow(ctx, panelX + 14, panelY + 6 + i * rowH, c.key, c.label));

  const ctaY = panelY + CONTROLS.length * rowH + 16;
  if (Math.floor(time * 2) % 2 === 0) {
    glow(ctx, W / 2, ctaY + 3, 60, "rgba(255,210,90,0.3)", 1);
    shadowText(ctx, "PRESIONA CUALQUIER TECLA O CLIC PARA EMPEZAR", W / 2, ctaY, "#ffe9c4", 8, "center");
  }
  shadowText(ctx, `Mejor puntaje: ${state.mejorPuntaje}`, W / 2, H - 14, "#a898b0", 7, "center");
}

export function drawLevelSelectScreen(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(10, 4, 16, 0.55)");
  g.addColorStop(0.5, "rgba(10, 4, 16, 0.7)");
  g.addColorStop(1, "rgba(4, 2, 8, 0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  shadowText(ctx, "ELIGE TU NIVEL", W / 2, 20, "#ff7a4a", 12, "center");

  const cols = 5, rows = 2;
  const tileW = 42, tileH = 36, gapX = 8, gapY = 10;
  const gridW = cols * tileW + (cols - 1) * gapX;
  const gridH = rows * tileH + (rows - 1) * gapY;
  const startX = W / 2 - gridW / 2;
  const startY = 42;

  for (let i = 0; i < LEVEL_COUNT; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (tileW + gapX);
    const y = startY + row * (tileH + gapY);
    const level = i + 1;
    const selected = level === state.nivelSeleccionado;

    if (selected) {
      const pulse = 0.5 + Math.abs(Math.sin(time * 6)) * 0.4;
      glow(ctx, x + tileW / 2, y + tileH / 2, 30, "rgba(255,180,90,0.5)", pulse);
    }

    const grad = ctx.createLinearGradient(0, y, 0, y + tileH);
    if (selected) {
      grad.addColorStop(0, COLORS.bronzeHi);
      grad.addColorStop(1, COLORS.bronze);
    } else {
      grad.addColorStop(0, "rgba(60,40,60,0.55)");
      grad.addColorStop(1, "rgba(30,18,30,0.55)");
    }
    roundRect(ctx, x, y, tileW, tileH, 4, grad, selected ? COLORS.shieldRim : "rgba(255,180,110,0.25)");

    shadowText(ctx, String(level), x + tileW / 2, y + tileH / 2 - 6, selected ? COLORS.outline : "#e8d9c4", 10, "center");
  }

  const hintY = startY + gridH + 14;
  if (Math.floor(time * 2) % 2 === 0) {
    shadowText(ctx, "←→ ELEGIR NIVEL", W / 2, hintY, "#ffe9c4", 7, "center");
  }
  shadowText(ctx, "ENTER O CLIC PARA JUGAR", W / 2, hintY + 12, "#c9b98a", 7, "center");
}

export function drawGameOverScreen(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(10, 4, 16, 0.6)");
  g.addColorStop(1, "rgba(4, 2, 8, 0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  glow(ctx, W / 2, H / 2 - 38, 80, "rgba(200,40,30,0.3)", 1);
  shadowText(ctx, "HAN CAÍDO LAS TERMÓPILAS", W / 2, H / 2 - 42, "#e85c3a", 11, "center");

  panel(ctx, W / 2 - 80, H / 2 - 20, 160, 34, 0.4);
  shadowText(ctx, `Puntaje final: ${state.puntos}`, W / 2, H / 2 - 15, COLORS.white, 8, "center");
  shadowText(ctx, `Mejor puntaje: ${state.mejorPuntaje}`, W / 2, H / 2 - 1, "#c9b98a", 8, "center");

  shadowText(ctx, "Molṑn labe.", W / 2, H / 2 + 20, "#8a7a9a", 7, "center");
  shadowText(ctx, "Clic o [ENTER] para elegir nivel", W / 2, H / 2 + 38, "#d9b98a", 7, "center");
}
