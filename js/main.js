class ParticleCanvas {
  constructor() {
    this.canvas = document.getElementById('canvas-bg');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 100;
    this.mouse = { x: null, y: null };
    this.init();
    this.animate();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.x;
      this.mouse.y = e.y;
    });

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        color: `rgba(${99 + Math.random() * 40}, ${102 + Math.random() * 100}, ${241 + Math.random() * 50}, ${0.15 + Math.random() * 0.2})`
      });
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x < 0 || particle.x > this.canvas.width) particle.speedX *= -1;
      if (particle.y < 0 || particle.y > this.canvas.height) particle.speedY *= -1;

      const dx = this.mouse.x - particle.x;
      const dy = this.mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 150) {
        const force = (150 - distance) / 150;
        particle.x -= dx * force * 0.02;
        particle.y -= dy * force * 0.02;
      }

      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
    });

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(99, 102, 241, ${(100 - distance) / 500})`;
          this.ctx.lineWidth = (100 - distance) / 200;
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }
  }

  animate() {
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

class CustomCursor {
  constructor() {
    this.dot = document.querySelector('.cursor-dot');
    this.outline = document.querySelector('.cursor-outline');
    this.init();
  }

  init() {
    if (window.innerWidth < 768) return;
    
    document.addEventListener('mousemove', (e) => {
      this.dot.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      this.outline.style.transform = `translate(${e.clientX - 16}px, ${e.clientY - 16}px)`;
    });

    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.outline.style.transform += ' scale(1.5)';
        this.outline.style.borderColor = 'var(--accent)';
      });
      el.addEventListener('mouseleave', () => {
        this.outline.style.transform = this.outline.style.transform.replace(' scale(1.5)', '');
        this.outline.style.borderColor = 'var(--primary)';
      });
    });
  }
}

class PageRouter {
  constructor() {
    this.pages = document.querySelectorAll('.page');
    this.navLinks = document.querySelectorAll('.nav-links a');
    this.init();
  }

  init() {
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('data-page');
        this.navigateTo(targetPage);
        
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });

    const hash = window.location.hash.slice(1) || 'home';
    this.navigateTo(hash, false);

    window.addEventListener('popstate', (e) => {
      const hash = window.location.hash.slice(1) || 'home';
      this.navigateTo(hash, false);
    });
  }

  navigateTo(pageName, pushState = true) {
    this.pages.forEach(page => {
      page.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.classList.remove('active');
    });

    const targetPage = document.getElementById(pageName);
    const targetLink = document.querySelector(`[data-page="${pageName}"]`);

    if (targetPage) {
      targetPage.classList.add('active');
    }

    if (targetLink) {
      targetLink.classList.add('active');
    }

    if (pushState) {
      window.location.hash = pageName;
    }

    if (pageName === 'home') {
      window.location.hash = '';
    }

    this.animateSkills(pageName);
  }

  animateSkills(pageName) {
    if (pageName === 'about') {
      setTimeout(() => {
        document.querySelectorAll('.skill-progress').forEach(progress => {
          progress.style.animationPlayState = 'running';
        });
      }, 300);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PageRouter();

  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
  }

  document.querySelectorAll('.stat-number').forEach(stat => {
    const finalNumber = parseInt(stat.textContent);
    let current = 0;
    const increment = finalNumber / 50;
    const interval = setInterval(() => {
      current += increment;
      if (current >= finalNumber) {
        stat.textContent = finalNumber + '+';
        clearInterval(interval);
      } else {
        stat.textContent = Math.floor(current);
      }
    }, 20);
  });
});
