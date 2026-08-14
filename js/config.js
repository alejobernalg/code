// ---------------------------------------------------------------------
// Configuración global: resolución, física, plataformas, paleta y balance
// ---------------------------------------------------------------------

export const W = 320;
export const H = 224;

// -- niveles --
export const LEVEL_COUNT = 10;

// -- física --
export const GRAVITY = 780;
export const MOVE_SPEED = 85;
export const JUMP_VELOCITY = -300;
export const FAST_MOVE_MULT = 1.55;

// -- plataformas (una sola pantalla, sin scroll, estilo Mario Bros) --
// cada una es sólida solo por arriba (se puede saltar a través desde abajo)
export const PLATFORMS = [
  { x: 0, y: 200, w: 320, h: 24, tier: 0 },     // suelo
  { x: 14, y: 150, w: 108, h: 8, tier: 1 },     // plataforma media izquierda
  { x: 198, y: 150, w: 108, h: 8, tier: 1 },    // plataforma media derecha
  { x: 108, y: 100, w: 104, h: 8, tier: 2 }     // plataforma superior
];
export const GROUND_Y = 200;

// -- jugador --
export const PLAYER_HW = 6;
export const PLAYER_H = 22;
export const PLAYER_LIVES = 3;
export const PLAYER_INVULN_TIME = 1.1;
export const MELEE_RANGE = 42;
export const MELEE_COOLDOWN = 0.32;
export const CHARGE_HOLD_TIME = 1.0;
export const CHARGE_COOLDOWN = 1.5;
export const CHARGE_RADIUS = 46;
export const JAVELIN_MAX = 3;
export const JAVELIN_RECHARGE = 4.5;
export const JAVELIN_SPEED = 280;

// -- empujón de escudo (al soltar C) --
export const BASH_RADIUS = 34;
export const BASH_FORCE = 160;
export const BASH_INVULN = 0.45;

// -- lluvia de flechas --
export const RAIN_MIN_INTERVAL = 28;
export const RAIN_MAX_INTERVAL = 45;
export const RAIN_WARNING_TIME = 1.8;
export const RAIN_DURATION = 2.6;
export const RAIN_ARROW_RATE = 10; // flechas por segundo aprox.
export const RAIN_BONUS_SCORE = 200;

// -- combo --
export const COMBO_WINDOW = 2.0;

// -- puntuación --
export const SCORES = {
  normal: 50,
  escudo: 100,
  arquero: 75,
  veloz: 60,
  inmortal: 500
};

// -- colores --
export const COLORS = {
  skyTop: "#2a0f38",
  skyMid: "#a3311c",
  skyLow: "#ff8c1a",
  skyGlow: "#ffd27a",
  sun: "#fff3c4",
  sunCore: "#fffdf0",
  mountainFar: "#3d1f36",
  mountainNear: "#5c2a3a",
  mountainNearDark: "#431f2c",
  sea: "#141c3e",
  seaMid: "#1c2a52",
  seaLight: "#3a5a92",
  seaGlow: "#ffb877",
  cliff: "#221826",
  cliffLight: "#332030",
  cliffEdge: "#0f0812",

  brick: "#4a4560",
  brickLight: "#5b5573",
  brickLine: "#302c44",
  brickDark: "#211e30",

  bronze: "#d69a42",
  bronzeHi: "#ffe0a0",
  bronzeLight: "#f0c26a",
  bronzeDark: "#8a5a20",
  spartanRed: "#b8302a",
  spartanRedDark: "#7a1e1e",
  spartanRedLight: "#e0524a",
  spartanRedHi: "#ff7a5a",
  skin: "#d9a06a",
  skinHi: "#f0c090",
  skinShade: "#b57a4c",
  lambda: "#241418",
  shieldRim: "#e8c98a",
  outline: "#140c10",
  rimLight: "rgba(255, 214, 150, 0.65)",

  persianTunic: "#3f6b45",
  persianTunicHi: "#5f9a68",
  persianTunicDark: "#294a2e",
  persianTrouser: "#c9a15a",
  persianTrouserDark: "#8a6a34",
  wicker: "#caa15a",
  wickerDark: "#8a6a34",
  bladeSilver: "#dfe4ea",
  bladeHi: "#ffffff",
  archerCloth: "#5a3a7a",
  archerClothHi: "#8a5fb0",
  archerClothDark: "#3a2258",
  turban: "#e8d9a0",
  immortalRobe: "#1f2f4a",
  immortalRobeHi: "#3a5580",
  immortalRobeDark: "#12203a",
  immortalGold: "#e8c23a",
  immortalGoldDark: "#a67f1a",
  immortalMask: "#2a2a30",
  velozCloth: "#7a2a2a",
  velozClothHi: "#b0453a",
  velozClothDark: "#4a1818",

  arrow: "#e0d0a0",
  arrowHead: "#c8c8c8",
  javelin: "#c9b27a",
  white: "#f0e6d2",
  hpFill: "#c0332a",
  blockSpark: "#ffe08a",
  warning: "#ff3a3a"
};

// -- definiciones de enemigos --
export const ENEMY_DEFS = {
  normal:   { vida: 1, velocidad: 34, dmg: 1, hw: 6, h: 20, score: SCORES.normal },
  escudo:   { vida: 2, velocidad: 26, dmg: 1, hw: 7, h: 21, score: SCORES.escudo },
  arquero:  { vida: 1, velocidad: 24, dmg: 1, hw: 6, h: 20, score: SCORES.arquero, arrowSpeed: 130, keepDist: 95, fleeDist: 45 },
  veloz:    { vida: 1, velocidad: 62, dmg: 1, hw: 5, h: 19, score: SCORES.veloz },
  inmortal: { vida: 5, velocidad: 20, dmg: 1, hw: 9, h: 26, score: SCORES.inmortal, knockback: 140 }
};

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
