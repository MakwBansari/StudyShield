document.addEventListener('DOMContentLoaded', async () => {
  const subjectEl = document.getElementById('subject-name')!;
  const timeEl = document.getElementById('elapsed-time')!;
  const escapesEl = document.getElementById('escape-count')!;

  const data = await chrome.storage.local.get(['subject', 'startTime', 'escapeCount', 'studying']);
  
  if (data.subject) subjectEl.textContent = data.subject;
  if (data.escapeCount) escapesEl.textContent = data.escapeCount.toString();
  
  if (data.startTime && data.studying) {
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
      const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
      const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      timeEl.textContent = `${h}:${m}:${s}`;
    }, 1000);
  }
});
