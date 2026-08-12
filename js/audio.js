// ---------------------------------------------------------------------
// Audio 8-bit generado con Web Audio API (sin archivos externos)
// ---------------------------------------------------------------------

let ctx = null;
let masterGain = null;
let noiseBuffer = null;
let ambientStarted = false;
let ambientTimer = null;
export let muted = false;

function buildNoiseBuffer() {
  const len = ctx.sampleRate * 0.3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Debe llamarse tras un gesto del usuario (click/tecla) para desbloquear audio. */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.32;
    masterGain.connect(ctx.destination);
    noiseBuffer = buildNoiseBuffer();
  }
  if (ctx.state === "suspended") ctx.resume();
  if (!ambientStarted) {
    ambientStarted = true;
    scheduleAmbient();
  }
}

export function toggleMute() {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.32;
  return muted;
}

function tone(freq, dur, type = "square", opts = {}) {
  if (!ctx) return;
  const { vol = 0.25, sweep = 0, delay = 0 } = opts;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, freq), t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + sweep), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noiseBurst(dur, vol = 0.2, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(gain);
  gain.connect(masterGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function scheduleAmbient() {
  if (!ctx) return;
  tone(70, 0.22, "sine", { vol: 0.12 });
  noiseBurst(0.05, 0.05);
  const next = 620 + Math.random() * 260;
  ambientTimer = setTimeout(scheduleAmbient, next);
}

export const sfx = {
  melee() { tone(190, 0.08, "square", { sweep: -70, vol: 0.28 }); },
  meleeHit() { noiseBurst(0.06, 0.22); tone(140, 0.06, "square", { vol: 0.2 }); },
  charge() { tone(120, 0.9, "sawtooth", { sweep: 260, vol: 0.16 }); },
  chargeRelease() {
    noiseBurst(0.18, 0.3);
    tone(520, 0.22, "sawtooth", { sweep: -300, vol: 0.28 });
  },
  javelin() { tone(560, 0.12, "sawtooth", { sweep: 240, vol: 0.22 }); },
  bow() { tone(700, 0.07, "triangle", { sweep: -200, vol: 0.14 }); },
  jump() { tone(380, 0.12, "square", { sweep: 200, vol: 0.18 }); },
  block() { tone(260, 0.09, "triangle", { vol: 0.22 }); },
  enemyDown(big = false) {
    tone(big ? 200 : 300, 0.08, "square", { vol: 0.24 });
    tone(big ? 90 : 150, 0.14, "square", { vol: 0.22, delay: 0.06 });
  },
  hurt() { tone(120, 0.2, "sawtooth", { sweep: -50, vol: 0.35 }); },
  warning() {
    tone(440, 0.22, "square", { vol: 0.3 });
    tone(440, 0.22, "square", { vol: 0.3, delay: 0.3 });
    tone(330, 0.35, "square", { vol: 0.3, delay: 0.6 });
  },
  arrowImpact() { noiseBurst(0.05, 0.12); },
  combo(step) { tone(440 + step * 70, 0.09, "square", { vol: 0.22 }); },
  gameOver() {
    tone(300, 0.2, "sawtooth", { vol: 0.28 });
    tone(220, 0.25, "sawtooth", { vol: 0.26, delay: 0.2 });
    tone(140, 0.4, "sawtooth", { vol: 0.24, delay: 0.42 });
  },
  start() { tone(300, 0.1, "square", { vol: 0.25 }); tone(500, 0.14, "square", { vol: 0.25, delay: 0.1 }); }
};
