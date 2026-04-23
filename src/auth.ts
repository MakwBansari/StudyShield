document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Mock login check
      const email = (document.getElementById('email') as HTMLInputElement).value;
      const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
      
      if (storedUsers[email]) {
        localStorage.setItem('currentUser', email);
        window.location.href = 'dashboard.html';
      } else {
        alert('User not found. Please sign up.');
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Mock signup check
      const email = (document.getElementById('email') as HTMLInputElement).value;
      const name = (document.getElementById('name') as HTMLInputElement).value;
      
      const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
      storedUsers[email] = { name };
      localStorage.setItem('users', JSON.stringify(storedUsers));
      localStorage.setItem('currentUser', email);
      
      window.location.href = 'dashboard.html';
    });
  }
});
