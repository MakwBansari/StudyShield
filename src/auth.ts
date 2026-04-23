import './common';
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
    const step1 = document.getElementById('signup-step-1');
    const step2 = document.getElementById('signup-step-2');
    const btnToStep2 = document.getElementById('btn-to-step-2');
    const btnBackTo1 = document.getElementById('btn-back-to-step-1');

    btnToStep2?.addEventListener('click', () => {
      const name = (document.getElementById('name') as HTMLInputElement).value;
      const email = (document.getElementById('email') as HTMLInputElement).value;
      const pass = (document.getElementById('password') as HTMLInputElement).value;

      if (!name || !email || !pass) {
        alert('Please fill in all account details.');
        return;
      }
      step1?.classList.add('hidden');
      step2?.classList.remove('hidden');
    });

    btnBackTo1?.addEventListener('click', () => {
      step2?.classList.add('hidden');
      step1?.classList.remove('hidden');
    });

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = (document.getElementById('email') as HTMLInputElement).value;
      const name = (document.getElementById('name') as HTMLInputElement).value;
      const whitelistRaw = (document.getElementById('whitelist-input') as HTMLTextAreaElement).value;
      const blacklistRaw = (document.getElementById('blacklist-input') as HTMLTextAreaElement).value;

      const whitelist = whitelistRaw.split(/[\n,]/).map(s => s.trim()).filter(s => s !== '');
      const blacklist = blacklistRaw.split(/[\n,]/).map(s => s.trim()).filter(s => s !== '');

      if (whitelist.length > 10 || blacklist.length > 10) {
        alert('You can only add up to 10 websites in each list.');
        return;
      }
      
      const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
      storedUsers[email] = { 
        name, 
        preferences: { whitelist, blacklist } 
      };
      localStorage.setItem('users', JSON.stringify(storedUsers));
      localStorage.setItem('currentUser', email);
      
      // Initialize default study settings for the new user
      const defaultSettings = {
        goals: [],
        whitelist: whitelist,
        blacklist: blacklist
      };
      localStorage.setItem(`study_settings_${email}`, JSON.stringify(defaultSettings));
      
      window.location.href = 'dashboard.html';
    });
  }
});
