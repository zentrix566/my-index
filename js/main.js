class PageRouter {
  constructor() {
    this.pages = document.querySelectorAll('.page');
    this.navLinks = document.querySelectorAll('.nav-links a');
    this.init();
  }

  init() {
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetPage = link.getAttribute('data-page');
        const target = targetPage ? document.getElementById(targetPage) : null;

        if (!target) {
          return;
        }

        e.preventDefault();
        this.navigateTo(targetPage);
        
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        menuToggle?.classList.remove('active');
        navLinks?.classList.remove('active');
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
      if (pageName === 'home') {
        history.pushState(null, '', window.location.pathname);
      } else {
        window.location.hash = pageName;
      }
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
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
  }

  document.querySelectorAll('.year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  document.querySelectorAll('.stat-number').forEach(stat => {
    const finalNumber = parseInt(stat.textContent);
    if (Number.isNaN(finalNumber)) {
      return;
    }
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
