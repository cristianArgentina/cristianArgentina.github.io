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

  const particles = [];
  const PARTICLE_COUNT = 100;

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.size = Math.random() * 3 + 1;
      this.color = `hsl(${Math.random()*360}, 70%, 60%)`;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.reset();
      }
    }
    draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }

  animate();

  return function hideLoaderArt() {
    loaderArt.style.display = 'none';
  };
}
