// ---------------------------------------------------------------------
// Sistema simple de partículas (impactos, sangre estilizada, chispas)
// ---------------------------------------------------------------------
export const particles = [];

export function spawnParticles(x, y, color, n = 6) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 70,
      vy: -Math.random() * 50 - 10,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color
    });
  }
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 140 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.globalAlpha = 1;
}
