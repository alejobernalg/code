// ---------------------------------------------------------------------
// Interfaz: HUD de partida, pantalla de inicio y pantalla de Game Over
// ---------------------------------------------------------------------
import { W, H, COLORS, JAVELIN_MAX, LEVEL_COUNT } from "./config.js";
import { pixelText, px, roundRect, glow } from "./utils.js";
import { state } from "./state.js";
import { drawPlayer } from "./player.js";

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

/** Barra de progreso genérica (fondo + relleno con degradado) — usada tanto
 * para el objetivo dentro del nivel como para el avance de la campaña. */
function drawProgressBar(ctx, x, y, w, h, pct, colorFrom, colorTo) {
  roundRect(ctx, x, y, w, h, h / 2, "rgba(0,0,0,0.45)", "rgba(255,200,140,0.3)");
  const fillW = Math.max(pct > 0 ? h : 0, w * clampPct(pct));
  if (fillW > 0) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, colorFrom);
    g.addColorStop(1, colorTo);
    roundRect(ctx, x, y, fillW, h, h / 2, g);
  }
}

function clampPct(v) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Indicador de campaña: un nodo por nivel (1..LEVEL_COUNT) unidos por una
 * línea que se va rellenando. `completed` = cuántos niveles quedaron atrás
 * (el nivel `i+1` se pinta como superado si `i < completed`). Se usa tanto
 * en la transición "nivel superado" como en la pantalla de selección, así
 * el avance 1→2→3 siempre es visible, no solo el objetivo del nivel actual.
 */
function drawCampaignProgress(ctx, x, y, w, completed, total) {
  const nodeR = 4;
  const step = total > 1 ? w / (total - 1) : 0;
  const pct = total > 1 ? clampPct(completed / (total - 1)) : 1;

  ctx.strokeStyle = "rgba(255,200,140,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();

  if (pct > 0) {
    ctx.strokeStyle = "#8ce8d6";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * pct, y); ctx.stroke();
  }

  for (let i = 0; i < total; i++) {
    const nx = x + step * i;
    const done = i < completed;
    const isNext = i === completed && completed < total;
    ctx.beginPath();
    ctx.arc(nx, y, nodeR, 0, Math.PI * 2);
    ctx.fillStyle = done ? "#8ce8d6" : isNext ? "#ffd25a" : "rgba(255,255,255,0.18)";
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    pixelText(ctx, String(i + 1), nx, y - 3, done || isNext ? COLORS.outline : "#c9b98a", 6, "center");
  }
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

  const isSurvive = state.tipoObjetivo === "sobrevivir";
  const levelW = isSurvive ? 64 : 54, levelX = W / 2 - levelW / 2;
  const levelLabel = isSurvive
    ? `RESISTE ${Math.ceil(Math.max(0, state.objetivoEnemigos - state.enemigosDerrotados))}s`
    : `NIVEL ${state.nivel} · ${state.enemigosDerrotados}/${state.objetivoEnemigos}`;
  panel(ctx, levelX, 2, levelW, 18, 0.5);
  shadowText(ctx, levelLabel, W / 2, 4, "#f0e0c4", 6, "center");
  drawProgressBar(ctx, levelX + 4, 14, levelW - 8, 4,
    state.objetivoEnemigos > 0 ? state.enemigosDerrotados / state.objetivoEnemigos : 0,
    isSurvive ? "#ffb85a" : "#4fd8b8",
    isSurvive ? "#ffe9c4" : "#8ce8d6");

  if (state.enFalange) {
    const pulse = 0.7 + Math.abs(Math.sin(state.tiempoPartida * 8)) * 0.3;
    ctx.globalAlpha = pulse;
    shadowText(ctx, "🛡 MURO DE ESCUDOS", W / 2, 58, "#ffd25a", 7, "center");
    ctx.globalAlpha = 1;
  }

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

  if (state.avisoJefeTimer > 0) {
    const alpha = Math.min(1, state.avisoJefeTimer / 0.5);
    ctx.globalAlpha = alpha;
    panel(ctx, W / 2 - 66, 40, 132, 15, 0.7);
    glow(ctx, W / 2, 47, 34, "rgba(255,140,50,0.4)", 1);
    ctx.globalAlpha = 1;
    shadowText(ctx, state.avisoJefe, W / 2, 43, "#ffb85a", 9, "center");
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

/**
 * Espartano estático de la pantalla de título: reutiliza el sprite real del
 * jugador (siempre en reposo ahí, ya que updatePlayer no corre en fase
 * "start") reescalado y reubicado, en vez de duplicar el dibujo del
 * personaje. Solo lleva la tela de la capa un leve vaivén propio del sprite;
 * el resto de la pose queda completamente quieto.
 */
function drawStaticHero(ctx, cx, feetY, scale) {
  glow(ctx, cx, feetY - 30 * scale, 46, "rgba(255,150,70,0.35)", 1);
  ctx.save();
  ctx.translate(cx, feetY);
  ctx.scale(scale, scale);
  ctx.translate(-state.jugador.x, -state.jugador.y);
  drawPlayer(ctx);
  ctx.restore();
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

  drawStaticHero(ctx, W / 2, 63, 1.5);

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

  shadowText(ctx, "DESBLOQUEA TU CAMINO", W / 2, 20, "#ff7a4a", 12, "center");

  const cols = LEVEL_COUNT, rows = 1;
  const tileW = 56, tileH = 46, gapX = 12, gapY = 10;
  const gridW = cols * tileW + (cols - 1) * gapX;
  const gridH = rows * tileH + (rows - 1) * gapY;
  const startX = W / 2 - gridW / 2;
  const startY = 56;

  for (let i = 0; i < LEVEL_COUNT; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (tileW + gapX);
    const y = startY + row * (tileH + gapY);
    const level = i + 1;
    const unlocked = level <= state.nivelDesbloqueado;
    const selected = level === state.nivelSeleccionado;

    if (selected && unlocked) {
      const pulse = 0.5 + Math.abs(Math.sin(time * 6)) * 0.4;
      glow(ctx, x + tileW / 2, y + tileH / 2, 30, "rgba(255,180,90,0.5)", pulse);
    }

    const grad = ctx.createLinearGradient(0, y, 0, y + tileH);
    if (selected && unlocked) {
      grad.addColorStop(0, COLORS.bronzeHi);
      grad.addColorStop(1, COLORS.bronze);
    } else {
      grad.addColorStop(0, "rgba(60,40,60,0.55)");
      grad.addColorStop(1, "rgba(30,18,30,0.55)");
    }
    roundRect(ctx, x, y, tileW, tileH, 4, grad, selected ? COLORS.shieldRim : "rgba(255,180,110,0.25)");

    shadowText(ctx, unlocked ? String(level) : "🔒", x + tileW / 2, y + tileH / 2 - 6, selected ? COLORS.outline : "#e8d9c4", unlocked ? 10 : 8, "center");
  }

  const barY = startY + gridH + 16;
  drawCampaignProgress(ctx, W / 2 - 40, barY, 80, state.nivelDesbloqueado - 1, LEVEL_COUNT);

  const hintY = barY + 16;
  if (Math.floor(time * 2) % 2 === 0) {
    shadowText(ctx, "←→ ELEGIR NIVEL", W / 2, hintY, "#ffe9c4", 7, "center");
  }
  shadowText(ctx, "ENTER O CLIC PARA JUGAR", W / 2, hintY + 12, "#c9b98a", 7, "center");
}

export function drawLevelCompleteScreen(ctx) {
  ctx.fillStyle = "rgba(3, 14, 18, 0.66)";
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W / 2, H / 2 - 20, 80, "rgba(71, 224, 187, 0.32)", 1);
  panel(ctx, W / 2 - 86, H / 2 - 36, 172, 78, 0.7);
  shadowText(ctx, `NIVEL ${state.nivel} SUPERADO`, W / 2, H / 2 - 28, "#8cf0d8", 11, "center");
  shadowText(ctx, `NIVEL ${state.nivel + 1} DESBLOQUEADO`, W / 2, H / 2 - 10, "#ffe0a0", 8, "center");
  drawCampaignProgress(ctx, W / 2 - 40, H / 2 + 12, 80, state.nivel, LEVEL_COUNT);
  shadowText(ctx, "ENTER PARA CONTINUAR", W / 2, H / 2 + 28, "#f0e6d2", 7, "center");
}

/**
 * Pantalla final tras el nivel 4: distinta a "nivel superado" a propósito
 * — es el cierre de la campaña, con su propio mensaje (con guiño a 300) y
 * una única salida: reiniciar la campaña completa desde el nivel 1. No
 * lleva de vuelta al menú de selección para que el logro se sienta como un
 * final real, no como una parada intermedia más.
 */
export function drawCampaignCompleteScreen(ctx, time) {
  ctx.fillStyle = "rgba(6, 4, 2, 0.7)";
  ctx.fillRect(0, 0, W, H);
  const pulse = 0.75 + Math.abs(Math.sin(time * 2)) * 0.25;
  ctx.globalAlpha = pulse;
  glow(ctx, W / 2, H / 2 - 30, 100, "rgba(255,190,100,0.4)", 1);
  ctx.globalAlpha = 1;

  panel(ctx, W / 2 - 106, H / 2 - 50, 212, 124, 0.75);
  shadowText(ctx, "¡LAS PUERTAS CALIENTES RESISTEN!", W / 2, H / 2 - 44, "#ffd98a", 10, "center");
  shadowText(ctx, "Que el mundo sepa:", W / 2, H / 2 - 27, "#f0e6d2", 7, "center");
  shadowText(ctx, "hombres libres se alzaron ante un imperio", W / 2, H / 2 - 17, "#f0e6d2", 7, "center");
  shadowText(ctx, "y no retrocedieron. Ni un paso.", W / 2, H / 2 - 7, "#f0e6d2", 7, "center");

  shadowText(ctx, `Puntaje final: ${state.puntos}`, W / 2, H / 2 + 6, "#ffe0a0", 7, "center");
  shadowText(ctx, `Mejor puntaje: ${state.mejorPuntaje}`, W / 2, H / 2 + 16, "#c9b98a", 6, "center");

  drawCampaignProgress(ctx, W / 2 - 40, H / 2 + 32, 80, LEVEL_COUNT, LEVEL_COUNT);

  const dots = ".".repeat(1 + Math.floor(time * 2) % 3);
  shadowText(ctx, `CARGANDO NUEVA CAMPAÑA${dots}`, W / 2, H / 2 + 46, "#a898b0", 6, "center");
  if (Math.floor(time * 2) % 2 === 0) {
    shadowText(ctx, "ENTER PARA REVIVIR LA LEYENDA DESDE EL NIVEL 1", W / 2, H / 2 + 58, "#ffe9c4", 7, "center");
  }
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
