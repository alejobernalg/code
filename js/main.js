// ---------------------------------------------------------------------
// Punto de entrada: arma el canvas, conecta módulos y corre el bucle
// ---------------------------------------------------------------------
import { W, H, LEVEL_TRANSITION_TIME } from "./config.js";
import { state, resetState, updateMeta, moveLevelSelection } from "./state.js";
import { input, initInput, initTouchControls, clearEdges } from "./input.js";
import { updatePlayer, drawPlayer } from "./player.js";
import { updateEnemies, updateSpawner, drawEnemy } from "./enemies.js";
import { updateProjectiles, drawProjectiles } from "./projectiles.js";
import { updateArrowRain, drawArrowRainOverlay, drawFallingArrows } from "./arrowRain.js";
import { drawBackground, drawVignette } from "./background.js";
import { updateParticles, drawParticles } from "./particles.js";
import { drawHUD, drawStartScreen, drawLevelSelectScreen, drawGameOverScreen, drawLevelCompleteScreen, drawCampaignCompleteScreen } from "./hud.js";
import { toggleMute, sfx, setOnUnlock, unlockAudio } from "./audio.js";

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

initInput(canvas);
initTouchControls(document.getElementById("touchControls"));

const muteBtn = document.getElementById("muteBtn");
muteBtn.addEventListener("click", () => {
  const isMuted = toggleMute();
  muteBtn.textContent = isMuted ? "🔇" : "🔊";
});

// Grito de guerra de fondo en la pantalla de título: arranca en cuanto el
// audio se desbloquea (requiere un gesto del usuario) y se repite mientras
// siga en la fase "start" — deja de sonar solo en cuanto el jugador avanza.
function scheduleSpartanChant() {
  if (state.fase !== "start") return;
  sfx.spartanCry();
  setTimeout(scheduleSpartanChant, 8000);
}
setOnUnlock(scheduleSpartanChant);

// Intento inmediato al cargar: en la mayoría de los navegadores el audio
// seguirá bloqueado hasta el primer gesto (política de autoplay, no algo
// que se pueda saltear desde código), pero de paso deja el clip ya
// descargado y decodificado para que suene sin demora en cuanto sí se
// desbloquee con esa primera interacción.
unlockAudio();

let animTime = 0;

function update(dt) {
  animTime += dt;

  if (state.fase === "start") {
    if (input.confirmPressed) {
      state.fase = "levelSelect";
      sfx.start();
    }
  } else if (state.fase === "levelSelect") {
    if (input.leftPressedEdge) { moveLevelSelection(-1); sfx.menuMove(); }
    if (input.rightPressedEdge) { moveLevelSelection(1); sfx.menuMove(); }
    if (input.confirmPressed) {
      resetState(state.nivelSeleccionado);
      sfx.start();
    }
  } else if (state.fase === "gameover") {
    if (input.confirmPressed) state.fase = "levelSelect";
  } else if (state.fase === "levelComplete") {
    // Solo se llega aquí cuando queda nivel siguiente: el final de la
    // campaña usa su propia fase ("campaignComplete"), ver completeLevel().
    if (input.confirmPressed) {
      resetState(state.nivel + 1);
      sfx.start();
    }
  } else if (state.fase === "campaignComplete") {
    if (input.confirmPressed) {
      resetState(1);
      sfx.start();
    }
  }

  updateMeta(dt);
  updatePlayer(dt);
  updateSpawner(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateArrowRain(dt);
  updateParticles(dt);

  if (state.transicionTimer > 0) state.transicionTimer = Math.max(0, state.transicionTimer - dt);

  clearEdges();
}

function render(dt) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (state.screenShake > 0.02) {
    const s = state.screenShake;
    ctx.translate((Math.random() - 0.5) * 4 * s, (Math.random() - 0.5) * 4 * s);
  }

  drawBackground(ctx, animTime, dt);

  if (state.fase === "playing" || state.fase === "gameover" || state.fase === "levelComplete" || state.fase === "campaignComplete") {
    const drawables = [{ y: state.jugador.y, draw: () => drawPlayer(ctx) }];
    for (const en of state.enemigos) drawables.push({ y: en.y, draw: () => drawEnemy(ctx, en) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();

    drawProjectiles(ctx);
    drawFallingArrows(ctx);
    drawArrowRainOverlay(ctx);
    drawParticles(ctx);
  }
  ctx.restore();

  drawVignette(ctx);

  if (state.fase === "playing") drawHUD(ctx);
  else if (state.fase === "start") drawStartScreen(ctx, animTime);
  else if (state.fase === "levelSelect") drawLevelSelectScreen(ctx, animTime);
  else if (state.fase === "gameover") drawGameOverScreen(ctx);
  else if (state.fase === "levelComplete") drawLevelCompleteScreen(ctx);
  else if (state.fase === "campaignComplete") drawCampaignCompleteScreen(ctx, animTime);

  // Fundido de entrada: se dispara cada vez que resetState() arranca un
  // nivel (desde el menú o al continuar tras completar el anterior), para
  // que el cambio no se sienta como un corte seco de pantalla.
  if (state.transicionTimer > 0) {
    ctx.save();
    ctx.globalAlpha = state.transicionTimer / LEVEL_TRANSITION_TIME;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

let last = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts;
  update(dt);
  render(dt);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
