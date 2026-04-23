document.addEventListener('DOMContentLoaded', () => {
  // --- THEME TOGGLE ---
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'theme-toggle-btn';
  toggleBtn.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';
  toggleBtn.title = 'Toggle Light/Dark Mode';
  document.body.appendChild(toggleBtn);

  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    toggleBtn.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
  });

  // --- SCROLL REVEAL ANIMATION ---
  const revealElements = document.querySelectorAll('.reveal');
  
  const revealOnScroll = () => {
    const windowHeight = window.innerHeight;
    revealElements.forEach(el => {
      const elementTop = el.getBoundingClientRect().top;
      const elementVisible = 150;
      if (elementTop < windowHeight - elementVisible) {
        el.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // Initial check
});
