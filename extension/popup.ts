document.addEventListener('DOMContentLoaded', async () => {
  const statusBox = document.getElementById('status-box')!;
  const statusText = document.getElementById('status-text')!;
  const todayTotal = document.getElementById('today-total')!;
  const btnEmergency = document.getElementById('btn-emergency') as HTMLButtonElement;
  const breakStatus = document.getElementById('break-status')!;
  const breakTime = document.getElementById('break-time')!;

  // Load state
  const data = await chrome.storage.local.get(['studying', 'todayTotalMinutes', 'breakEndTime']);
  
  todayTotal.textContent = (data.todayTotalMinutes || 0).toString();

  let isStudying = !!data.studying;
  let breakEnd = data.breakEndTime || 0;

  function updateUI() {
    const now = Date.now();
    if (breakEnd > now) {
      statusText.textContent = 'Emergency Break';
      statusBox.classList.remove('active');
      btnEmergency.disabled = true;
      breakStatus.classList.remove('hidden');
      
      const left = Math.floor((breakEnd - now) / 1000);
      const m = Math.floor(left / 60).toString().padStart(2, '0');
      const s = (left % 60).toString().padStart(2, '0');
      breakTime.textContent = `${m}:${s}`;
      
    } else if (isStudying) {
      statusText.textContent = 'Focusing...';
      statusBox.classList.add('active');
      btnEmergency.disabled = false;
      breakStatus.classList.add('hidden');
    } else {
      statusText.textContent = 'Not Studying';
      statusBox.classList.remove('active');
      btnEmergency.disabled = true;
      breakStatus.classList.add('hidden');
    }
  }

  setInterval(updateUI, 1000);
  updateUI();

  btnEmergency.addEventListener('click', async () => {
    const end = Date.now() + 5 * 60 * 1000;
    await chrome.storage.local.set({ breakEndTime: end });
    breakEnd = end;
    
    // Temporarily disable rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1] // Our block rule is ID 1
    });

    // Re-enable after 5 mins
    setTimeout(async () => {
      const current = await chrome.storage.local.get(['studying']);
      if (current.studying) {
        // Need to recreate rule like in background.ts
        // A simpler way: we just set studying back to true to trigger storage listener
        await chrome.storage.local.set({ studying: false });
        setTimeout(() => chrome.storage.local.set({ studying: true }), 100);
      }
    }, 5 * 60 * 1000);
    
    updateUI();
  });
});
