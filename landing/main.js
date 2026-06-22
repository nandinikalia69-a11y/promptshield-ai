/**
 * PromptShield AI — Landing Page JavaScript
 * Particles, animations, counters, scroll effects
 */

// ─── Particle System ──────────────────────────────────────────────────────────
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animFrame;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 1.8 + 0.3;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.color = Math.random() > 0.5 ? '#00d4ff' : '#7b2ff7';
    this.life = 0;
    this.maxLife = Math.random() * 300 + 200;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life++;
    if (this.life > this.maxLife || this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
      this.reset();
    }
  }
  draw() {
    const lifeRatio = this.life / this.maxLife;
    const alpha = this.opacity * Math.sin(lifeRatio * Math.PI);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2,'0');
    ctx.fill();
  }
}

function initParticles() {
  particles = Array.from({ length: 120 }, () => new Particle());
}

function drawConnections() {
  const maxDist = 140;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const alpha = (1 - dist / maxDist) * 0.12;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  drawConnections();
  animFrame = requestAnimationFrame(animateParticles);
}

// ─── Navbar Scroll ────────────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

// ─── Scroll Reveal ────────────────────────────────────────────────────────────
function initReveal() {
  const revealEls = document.querySelectorAll(
    '.problem-card, .feat-card, .layer-card, .impact-card, .team-card, .timeline-item, .flow-step, .arch-node, .section-title, .section-sub, .section-badge'
  );
  revealEls.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 6) * 0.07}s`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => observer.observe(el));
}

// ─── Animated Counters ────────────────────────────────────────────────────────
function animateCounters() {
  const counters = document.querySelectorAll('.stat-n[data-target]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const target = parseInt(e.target.dataset.target, 10);
        const duration = 1500;
        const start = performance.now();
        const update = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          e.target.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

// ─── Smooth Scroll ────────────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ─── Demo Card Typewriter ─────────────────────────────────────────────────────
function initDemoAnimation() {
  const demoInput = document.querySelector('.demo-input');
  const demoBadge = document.querySelector('.demo-badge');
  if (!demoInput || !demoBadge) return;

  // Pulse critical badge
  setInterval(() => {
    demoBadge.style.opacity = demoBadge.style.opacity === '0.4' ? '1' : '0.4';
  }, 800);
}

// ─── Architecture Animated Flow ───────────────────────────────────────────────
function initArchAnimation() {
  const nodes = document.querySelectorAll('.arch-node');
  nodes.forEach((node, i) => {
    node.style.animationDelay = `${i * 0.15}s`;
    node.style.animation = 'fadeInUp 0.5s ease both';
    node.style.animationDelay = `${i * 0.12}s`;
  });
}

// ─── Hamburger ────────────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
hamburger?.addEventListener('click', () => {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  if (navLinks.style.display === 'flex') {
    navLinks.style.display = 'none';
  } else {
    navLinks.style.display = 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '68px';
    navLinks.style.left = '0'; navLinks.style.right = '0';
    navLinks.style.background = 'rgba(3,7,18,0.98)';
    navLinks.style.padding = '16px 24px 24px';
    navLinks.style.gap = '16px';
    navLinks.style.borderBottom = '1px solid rgba(255,255,255,0.07)';
    navLinks.style.backdropFilter = 'blur(20px)';
    navLinks.style.zIndex = '999';
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  initParticles();
  animateParticles();
  initReveal();
  animateCounters();
  initDemoAnimation();
  initArchAnimation();
});

window.addEventListener('resize', () => {
  resizeCanvas();
  cancelAnimationFrame(animFrame);
  animateParticles();
}, { passive: true });
