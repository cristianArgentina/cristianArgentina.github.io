// loader-wake-up-backend.js

export function initLoaderArt() {
  const loaderArt = document.createElement('div');
  loaderArt.id = 'loader-art';
  loaderArt.innerHTML = `
    <canvas id="particle-canvas"></canvas>
    <div class="loader-text">Despertando los productos… ✨</div>
  `;
  document.body.appendChild(loaderArt);

  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Partículas dinámicas
  const particles = [];
  const PARTICLE_COUNT = 120;

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
      this.size = Math.random() * 3 + 1;
      this.color = `hsl(${Math.random()*360}, 70%, 60%)`;
      this.alpha = Math.random() * 0.5 + 0.5;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.reset();
      }
    }
    draw() {
      ctx.fillStyle = `hsla(${Math.random()*360}, 70%, 60%, ${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  // Pinceladas animadas
  const strokes = [];
  const STROKE_COUNT = 8;

  class Stroke {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.length = Math.random() * 150 + 50;
      this.angle = Math.random() * Math.PI * 2;
      this.speed = Math.random() * 0.5 + 0.2;
      this.color = `hsla(${Math.random()*360}, 80%, 60%, 0.3)`;
    }
    update() {
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      if (this.x < -50 || this.x > canvas.width+50 || this.y < -50 || this.y > canvas.height+50) {
        this.reset();
      }
    }
    draw() {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.angle) * this.length, this.y + Math.sin(this.angle) * this.length);
      ctx.stroke();
    }
  }

  for (let i = 0; i < STROKE_COUNT; i++) {
    strokes.push(new Stroke());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    strokes.forEach(s => { s.update(); s.draw(); });
    requestAnimationFrame(animate);
  }

  animate();

  // Función para ocultar loader
  return function hideLoaderArt() {
    loaderArt.style.display = 'none';
  };
}
