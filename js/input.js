// ---------------------------------------------------------------------
// Entradas: teclado, ratón y táctil, con detección de flancos (edge)
// ---------------------------------------------------------------------
import { unlockAudio } from "./audio.js";

const held = {};

export const input = {
  left: false, right: false, cDown: false, zDown: false,
  jumpPressed: false, xPressed: false,
  zPressedEdge: false, zReleasedEdge: false,
  confirmPressed: false,
  leftPressedEdge: false, rightPressedEdge: false
};

export function clearEdges() {
  input.jumpPressed = false;
  input.xPressed = false;
  input.zPressedEdge = false;
  input.zReleasedEdge = false;
  input.confirmPressed = false;
  input.leftPressedEdge = false;
  input.rightPressedEdge = false;
}

function syncHeld() {
  input.left = !!held["ArrowLeft"];
  input.right = !!held["ArrowRight"];
  input.cDown = !!held["KeyC"];
  input.zDown = !!held["KeyZ"] || !!held["Mouse"];
}

const PREVENTABLE = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyZ", "KeyX", "KeyC"]);

function pressCode(code) {
  const already = !!held[code];
  held[code] = true;
  if (!already) {
    if (code === "ArrowUp" || code === "Space") input.jumpPressed = true;
    if (code === "KeyX") input.xPressed = true;
    if (code === "KeyZ") input.zPressedEdge = true;
    if (code === "ArrowLeft") input.leftPressedEdge = true;
    if (code === "ArrowRight") input.rightPressedEdge = true;
    if (["Space", "Enter", "KeyZ"].includes(code)) input.confirmPressed = true;
  }
  syncHeld();
}

function releaseCode(code) {
  held[code] = false;
  if (code === "KeyZ") input.zReleasedEdge = true;
  syncHeld();
}

export function initInput(canvas) {
  // Desbloqueo de audio ante CUALQUIER primer gesto en la página, no solo
  // sobre el canvas — un clic en el botón de sonido, en el margen, etc.
  // también cuenta. Sin esto, si el primer gesto cae fuera del canvas
  // (p. ej. el botón de silenciar) el audio nunca se desbloqueaba.
  document.addEventListener("pointerdown", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });

  window.addEventListener("keydown", (e) => {
    if (PREVENTABLE.has(e.code)) e.preventDefault();
    unlockAudio();
    pressCode(e.code);
  });

  window.addEventListener("keyup", (e) => {
    releaseCode(e.code);
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

// -- controles táctiles en pantalla (móvil/tablet) --
export const isTouchDevice =
  "ontouchstart" in window || navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;

export function initTouchControls(root) {
  if (!isTouchDevice) return;
  document.body.classList.add("touch");

  const buttons = root.querySelectorAll("[data-code]");
  buttons.forEach((btn) => {
    const code = btn.dataset.code;

    const press = (e) => {
      e.preventDefault();
      unlockAudio();
      if (e.pointerId !== undefined) btn.setPointerCapture(e.pointerId);
      btn.classList.add("active");
      pressCode(code);
      navigator.vibrate?.(8);
    };
    const release = (e) => {
      e.preventDefault();
      btn.classList.remove("active");
      releaseCode(code);
    };

    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });
}
