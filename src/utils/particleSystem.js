/**
 * High-performance HTML5 Canvas VFX & Particle Engine for RPG Spell Caster
 */

// Landmark connection pairs for drawing hand skeleton
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Palm base
];

export class Particle {
  constructor(x, y, color, speed = 2, size = 4, life = 30) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const velocity = (Math.random() * 0.7 + 0.3) * speed;
    this.vx = Math.cos(angle) * velocity;
    this.vy = Math.sin(angle) * velocity;
    this.color = color;
    this.size = Math.random() * size + 2;
    this.maxLife = life;
    this.life = life;
    this.decay = Math.random() * 0.02 + 0.96;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.decay;
    this.vy *= this.decay;
    this.life--;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Fireball {
  constructor(startX, startY, targetX, targetY, onHit) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.onHit = onHit;
    this.radius = 24;
    this.trail = [];
    this.isDead = false;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 18;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    this.angle = Math.atan2(dy, dx);
  }

  update(particles) {
    if (this.isDead) return false;

    this.x += this.vx;
    this.y += this.vy;

    // Emit fire and smoke trail
    for (let i = 0; i < 4; i++) {
      const offsetX = (Math.random() - 0.5) * 16;
      const offsetY = (Math.random() - 0.5) * 16;
      const color = Math.random() > 0.4 ? '#ff4500' : (Math.random() > 0.5 ? '#ffa500' : '#ffe066');
      particles.push(new Particle(this.x + offsetX, this.y + offsetY, color, 3, 6, 20));
    }

    // Check hit distance (enemy center)
    const distToTarget = Math.hypot(this.targetX - this.x, this.targetY - this.y);
    if (distToTarget < 38) {
      this.isDead = true;
      if (this.onHit) this.onHit(this.targetX, this.targetY);

      // Hit burst
      for (let i = 0; i < 35; i++) {
        const color = Math.random() > 0.3 ? '#ef4444' : (Math.random() > 0.5 ? '#f97316' : '#fde047');
        particles.push(new Particle(this.targetX, this.targetY, color, 8, 8, 35));
      }
      return false;
    }

    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#ff3700';

    // Outer glow
    const grad = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, this.radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#fff275');
    grad.addColorStop(0.5, '#ff5722');
    grad.addColorStop(0.85, '#dc2626');
    grad.addColorStop(1, 'rgba(153, 27, 27, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Hot inner core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class EnemyAttack {
  constructor(startX, startY, targetX, targetY, onHitPlayer) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.onHitPlayer = onHitPlayer;
    this.radius = 16;
    this.isDead = false;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 7;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  update(particles, isShieldActive, shieldCenter) {
    if (this.isDead) return false;

    this.x += this.vx;
    this.y += this.vy;

    // Void bolt trail
    for (let i = 0; i < 2; i++) {
      const color = Math.random() > 0.4 ? '#a855f7' : '#6366f1';
      particles.push(new Particle(this.x, this.y, color, 2, 4, 18));
    }

    // Check collision with player shield
    if (isShieldActive && shieldCenter) {
      const distToShield = Math.hypot(this.x - shieldCenter.x, this.y - shieldCenter.y);
      if (distToShield < 120) {
        this.isDead = true;
        // Shield block spark
        for (let i = 0; i < 30; i++) {
          particles.push(new Particle(this.x, this.y, '#38bdf8', 6, 6, 25));
        }
        return { blocked: true, x: this.x, y: this.y };
      }
    }

    // Check if reached player area (bottom of screen)
    if (this.y >= this.targetY - 30) {
      this.isDead = true;
      if (this.onHitPlayer) this.onHitPlayer();
      for (let i = 0; i < 20; i++) {
        particles.push(new Particle(this.x, this.y, '#9333ea', 5, 5, 20));
      }
      return { blocked: false, x: this.x, y: this.y };
    }

    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#a855f7';

    const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius);
    grad.addColorStop(0, '#f5d0fe');
    grad.addColorStop(0.4, '#a855f7');
    grad.addColorStop(0.8, '#4c1d95');
    grad.addColorStop(1, 'rgba(76, 29, 149, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class FloatingText {
  constructor(text, x, y, color = '#facc15', size = 26) {
    this.text = text;
    this.x = x + (Math.random() - 0.5) * 20;
    this.y = y;
    this.color = color;
    this.size = size;
    this.life = 45;
    this.maxLife = 45;
    this.vy = -1.8;
  }

  update() {
    this.y += this.vy;
    this.life--;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${this.size}px 'Cinzel', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text shadow outline
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#020617';
    ctx.strokeText(this.text, this.x, this.y);

    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

/**
 * Draw Energy Shield on Hand
 */
export function drawEnergyShield(ctx, handCoords, time) {
  if (!handCoords || handCoords.length < 21) return;

  const wrist = handCoords[0];
  const thumbTip = handCoords[4];
  const indexTip = handCoords[8];
  const middleTip = handCoords[12];
  const ringTip = handCoords[16];
  const pinkyTip = handCoords[20];
  const pinkyMcp = handCoords[17];
  const middleMcp = handCoords[9];

  // Shield center
  const cx = (wrist.x + middleMcp.x) / 2;
  const cy = (wrist.y + middleMcp.y) / 2;

  ctx.save();

  // 1. Draw glowing translucent polygon perimeter over hand
  ctx.beginPath();
  ctx.moveTo(wrist.x, wrist.y);
  ctx.lineTo(thumbTip.x, thumbTip.y);
  ctx.lineTo(indexTip.x, indexTip.y);
  ctx.lineTo(middleTip.x, middleTip.y);
  ctx.lineTo(ringTip.x, ringTip.y);
  ctx.lineTo(pinkyTip.x, pinkyTip.y);
  ctx.lineTo(pinkyMcp.x, pinkyMcp.y);
  ctx.closePath();

  const shieldGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 130);
  shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
  shieldGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.25)');
  shieldGrad.addColorStop(1, 'rgba(3, 105, 161, 0.08)');

  ctx.fillStyle = shieldGrad;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 20;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#7dd3fc';
  ctx.stroke();

  // 2. Draw rotating arcane rune shield circle around palm
  const radius = 95;
  const rotation = (time * 0.002) % (Math.PI * 2);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner rotating ring
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-rotation);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hexagram / Aegis star
  const points = 6;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const a = (i * Math.PI * 2) / points;
    const px = Math.cos(a) * (radius * 0.45);
    const py = Math.sin(a) * (radius * 0.45);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // "AEGIS SHIELD" glowing label
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bae6fd';
  ctx.fillText('AEGIS BARRIER ACTIVE', cx, cy - radius - 12);

  ctx.restore();
}

/**
 * Draw Pinch hold timer progress ring
 */
export function drawPinchHold(ctx, pinchPoint, progress) {
  if (!pinchPoint || progress <= 0) return;

  const { x, y } = pinchPoint;
  const radius = 28;

  ctx.save();

  // Glowing base ring
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Charge progress arc
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * Math.min(1, progress);

  ctx.beginPath();
  ctx.arc(x, y, radius, startAngle, endAngle);
  ctx.strokeStyle = progress >= 1 ? '#4ade80' : '#c084fc';
  ctx.lineWidth = 5;
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 12;
  ctx.stroke();

  // Center spark
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = progress >= 1 ? '#4ade80' : '#f472b6';
  ctx.fill();

  // Label
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(progress >= 1 ? 'OPENING...' : `HOLD: ${Math.round(progress * 100)}%`, x, y + radius + 18);

  ctx.restore();
}

/**
 * Draw subtle hand skeleton tracking overlay
 */
export function drawHandSkeleton(ctx, handCoords, gestureType) {
  if (!handCoords || handCoords.length < 21) return;

  ctx.save();

  // Pick color based on gesture
  let strokeColor = 'rgba(148, 163, 184, 0.4)';
  let jointColor = 'rgba(203, 213, 225, 0.6)';

  if (gestureType === 'FIST') {
    strokeColor = 'rgba(239, 68, 68, 0.7)';
    jointColor = 'rgba(252, 165, 165, 0.9)';
  } else if (gestureType === 'OPEN_PALM') {
    strokeColor = 'rgba(56, 189, 248, 0.7)';
    jointColor = 'rgba(186, 230, 253, 0.9)';
  } else if (gestureType === 'PINCH') {
    strokeColor = 'rgba(192, 132, 252, 0.7)';
    jointColor = 'rgba(233, 213, 255, 0.9)';
  }

  // Draw bone lines
  ctx.lineWidth = 2;
  ctx.strokeStyle = strokeColor;
  ctx.beginPath();
  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const p1 = handCoords[startIdx];
    const p2 = handCoords[endIdx];
    if (p1 && p2) {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
  }
  ctx.stroke();

  // Draw joint nodes
  ctx.fillStyle = jointColor;
  for (const pt of handCoords) {
    if (pt) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
