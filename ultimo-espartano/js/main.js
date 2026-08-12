// ---------------------------------------------------------------------
// Punto de entrada: arma el canvas, conecta módulos y corre el bucle
// ---------------------------------------------------------------------
import { W, H } from "./config.js";
import { state, resetState, updateMeta } from "./state.js";
import { input, initInput, clearEdges } from "./input.js";
import { updatePlayer, drawPlayer } from "./player.js";
import { updateEnemies, updateSpawner, drawEnemy } from "./enemies.js";
import { updateProjectiles, drawProjectiles } from "./projectiles.js";
import { updateArrowRain, drawArrowRainOverlay, drawFallingArrows } from "./arrowRain.js";
import { drawBackground, drawVignette } from "./background.js";
import { updateParticles, drawParticles } from "./particles.js";
import { drawHUD, drawStartScreen, drawGameOverScreen } from "./hud.js";
import { toggleMute, sfx } from "./audio.js";

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

initInput(canvas);

const muteBtn = document.getElementById("muteBtn");
muteBtn.addEventListener("click", () => {
  const isMuted = toggleMute();
  muteBtn.textContent = isMuted ? "🔇" : "🔊";
});

let animTime = 0;

function update(dt) {
  animTime += dt;

  if (state.fase !== "playing" && input.confirmPressed) {
    resetState();
    sfx.start();
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

  if (state.fase !== "start") {
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
