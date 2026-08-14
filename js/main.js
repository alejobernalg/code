// ---------------------------------------------------------------------
// Punto de entrada: arma el canvas, conecta módulos y corre el bucle
// ---------------------------------------------------------------------
import { W, H } from "./config.js";
import { state, resetState, updateMeta, moveLevelSelection } from "./state.js";
import { input, initInput, initTouchControls, clearEdges } from "./input.js";
import { updatePlayer, drawPlayer } from "./player.js";
import { updateEnemies, updateSpawner, drawEnemy } from "./enemies.js";
import { updateProjectiles, drawProjectiles } from "./projectiles.js";
import { updateArrowRain, drawArrowRainOverlay, drawFallingArrows } from "./arrowRain.js";
import { drawBackground, drawVignette } from "./background.js";
import { updateParticles, drawParticles } from "./particles.js";
import { drawHUD, drawStartScreen, drawLevelSelectScreen, drawGameOverScreen } from "./hud.js";
import { toggleMute, sfx } from "./audio.js";

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
  }

  updateMeta(dt);
  updatePlayer(dt);
  updateSpawner(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateArrowRain(dt);
  updateParticles(dt);

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

  if (state.fase === "playing" || state.fase === "gameover") {
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
