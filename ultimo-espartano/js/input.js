// ---------------------------------------------------------------------
// Entradas: teclado, ratón y táctil, con detección de flancos (edge)
// ---------------------------------------------------------------------
import { unlockAudio } from "./audio.js";

const held = {};

export const input = {
  left: false, right: false, cDown: false, zDown: false,
  jumpPressed: false, xPressed: false,
  zPressedEdge: false, zReleasedEdge: false,
  confirmPressed: false
};

export function clearEdges() {
  input.jumpPressed = false;
  input.xPressed = false;
  input.zPressedEdge = false;
  input.zReleasedEdge = false;
  input.confirmPressed = false;
}

function syncHeld() {
  input.left = !!held["ArrowLeft"];
  input.right = !!held["ArrowRight"];
  input.cDown = !!held["KeyC"];
  input.zDown = !!held["KeyZ"] || !!held["Mouse"];
}

const PREVENTABLE = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyZ", "KeyX", "KeyC"]);

export function initInput(canvas) {
  window.addEventListener("keydown", (e) => {
    if (PREVENTABLE.has(e.code)) e.preventDefault();
    unlockAudio();
    const already = !!held[e.code];
    held[e.code] = true;
    if (!already) {
      if (e.code === "ArrowUp" || e.code === "Space") input.jumpPressed = true;
      if (e.code === "KeyX") input.xPressed = true;
      if (e.code === "KeyZ") input.zPressedEdge = true;
      if (["Space", "Enter", "KeyZ"].includes(e.code)) input.confirmPressed = true;
    }
    syncHeld();
  });

  window.addEventListener("keyup", (e) => {
    held[e.code] = false;
    if (e.code === "KeyZ") input.zReleasedEdge = true;
    syncHeld();
  });

  canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    unlockAudio();
    held["Mouse"] = true;
    input.zPressedEdge = true;
    input.confirmPressed = true;
    syncHeld();
  });
  window.addEventListener("mouseup", () => {
    held["Mouse"] = false;
    input.zReleasedEdge = true;
    syncHeld();
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    unlockAudio();
    held["Mouse"] = true;
    input.zPressedEdge = true;
    input.confirmPressed = true;
    syncHeld();
  }, { passive: false });
  window.addEventListener("touchend", (e) => {
    e.preventDefault();
    held["Mouse"] = false;
    input.zReleasedEdge = true;
    syncHeld();
  }, { passive: false });
}
