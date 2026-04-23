import { StorageAPI } from './storage';
import { GATE_SUBJECTS } from './subjects';
import { Timer } from './timer';
import { StatsUI } from './stats';
import { generateStudyPlan } from './ai';

document.addEventListener('DOMContentLoaded', () => {
  // Check extension
  if (typeof chrome === 'undefined' || !chrome.storage) {
    document.getElementById('ext-warning')?.classList.remove('hidden');
  }

  // --- TAB SWITCHING ---
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabs = document.querySelectorAll('.tab-content');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      tabs.forEach(t => t.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = `tab-${(btn as HTMLElement).dataset.tab}`;
      document.getElementById(targetId)?.classList.add('active');

      if (targetId === 'tab-stats') {
        StatsUI.renderStatsTab(StorageAPI.getSessions());
      }
    });
  });

  // --- INITIALIZE UI ---
  const subjSelect = document.getElementById('timer-subject') as HTMLSelectElement;
  const subjList = document.getElementById('subjects-list');
  const weakSelect = document.getElementById('ai-weak-subjects') as HTMLSelectElement;

  const settings = StorageAPI.getSettings();
  let goals = settings.goals || GATE_SUBJECTS.map(s => ({
    subject: s.name,
    isActive: s.name === 'General Aptitude' || s.name === 'Engineering Mathematics', // Default some to true
    hoursTarget: 3,
    frequencyDays: 1
  }));

  const goalsList = document.getElementById('goals-list')!;
  
  // Clear lists
  subjList!.innerHTML = '';

  GATE_SUBJECTS.forEach((subj, index) => {
    // Populate dropdowns
    const opt1 = document.createElement('option');
    opt1.value = subj.name;
    opt1.textContent = subj.name;
    subjSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = subj.name;
    opt2.textContent = subj.name;
    weakSelect.appendChild(opt2);

    // Get Goal
    const goal = goals.find(g => g.subject === subj.name) || goals[0];

    // Populate Goals Tab
    const goalDiv = document.createElement('div');
    goalDiv.style.display = 'flex';
    goalDiv.style.alignItems = 'center';
    goalDiv.style.gap = '1rem';
    goalDiv.style.background = 'var(--bg-color)';
    goalDiv.style.padding = '1rem';
    goalDiv.style.borderRadius = '8px';
    goalDiv.style.border = '1px solid var(--border)';
    
    goalDiv.innerHTML = `
      <label style="flex: 1; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
        <input type="checkbox" id="goal-active-${index}" ${goal.isActive ? 'checked' : ''}>
        <span style="font-weight: 500;">${subj.name}</span>
      </label>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <input type="number" id="goal-hours-${index}" class="input" value="${goal.hoursTarget}" min="1" max="24" style="width: 70px; margin: 0;"> hrs
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        every <input type="number" id="goal-freq-${index}" class="input" value="${goal.frequencyDays}" min="1" max="30" style="width: 70px; margin: 0;"> days
      </div>
    `;
    goalsList.appendChild(goalDiv);

    // Populate Dashboard Subject Progress (only if active)
    if (goal.isActive) {
      // Calculate progress in rolling window
      const sessions = StorageAPI.getSessions();
      const now = Date.now();
      const windowMs = goal.frequencyDays * 24 * 60 * 60 * 1000;
      const relevantSessions = sessions.filter(s => s.subject === subj.name && (now - s.startTime) <= windowMs);
      const totalMinutes = relevantSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const totalHours = totalMinutes / 60;
      const pct = Math.min(100, (totalHours / goal.hoursTarget) * 100);

      const div = document.createElement('div');
      div.className = 'subject-item';
      div.innerHTML = `
        <div>
          <span class="subj-name">${subj.name}</span>
          <span class="subj-weight">${subj.weightage}m</span>
        </div>
        <div class="subj-progress">
          <span>${totalHours.toFixed(1)}h / ${goal.hoursTarget}h (${goal.frequencyDays}d)</span>
          <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
        </div>
      `;
      subjList?.appendChild(div);
    }
  });

  document.getElementById('btn-save-goals')?.addEventListener('click', () => {
    const newGoals = GATE_SUBJECTS.map((subj, index) => ({
      subject: subj.name,
      isActive: (document.getElementById(`goal-active-${index}`) as HTMLInputElement).checked,
      hoursTarget: parseFloat((document.getElementById(`goal-hours-${index}`) as HTMLInputElement).value) || 3,
      frequencyDays: parseInt((document.getElementById(`goal-freq-${index}`) as HTMLInputElement).value, 10) || 1
    }));
    StorageAPI.saveSettings({ goals: newGoals });
    alert('Goals saved successfully!');
    location.reload(); // Reload to refresh dashboard targets
  });
  if (settings.examDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dateStr = settings.examDate.replace(/\//g, '-');
    let parts = dateStr.split('-');
    let year, month, day;
    
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        [year, month, day] = parts.map(Number);
      } else {
        // DD-MM-YYYY or MM-DD-YYYY (assuming DD-MM-YYYY for GATE/India)
        [day, month, year] = parts.map(Number);
      }
      const targetDate = new Date(year, month - 1, day);
      const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      document.getElementById('countdown-days')!.textContent = Math.max(0, diffDays).toString();
    } else {
      // fallback
      const targetDate = new Date(settings.examDate);
      const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      document.getElementById('countdown-days')!.textContent = Math.max(0, diffDays).toString();
    }
    (document.getElementById('ai-exam-date') as HTMLInputElement).value = settings.examDate;
  }
  if (settings.anthropicApiKey) {
    (document.getElementById('ai-api-key') as HTMLInputElement).value = settings.anthropicApiKey;
  }

  document.getElementById('set-exam-date-btn')?.addEventListener('click', () => {
    const date = prompt('Enter GATE Exam Date (YYYY-MM-DD):', settings.examDate || '');
    if (date) {
      StorageAPI.saveSettings({ examDate: date });
      location.reload();
    }
  });

  // Render initial dashboard
  StatsUI.renderDashboard(StorageAPI.getSessions());

  // Timer logic moved to timer-page.ts

  const btnStart = document.getElementById('btn-start') as HTMLButtonElement;
  const pomodoroCheck = document.getElementById('pomodoro-mode') as HTMLInputElement;

  btnStart.addEventListener('click', () => {
    const subject = subjSelect.value;
    const activity = (document.getElementById('timer-activity') as HTMLSelectElement).value;
    const topic = (document.getElementById('timer-topic') as HTMLInputElement).value;
    const pomodoro = pomodoroCheck.checked;

    // Bulletproof: save to localStorage
    const current = StorageAPI.getSettings();
    StorageAPI.saveSettings({ ...current, currentTimerSession: { subject, activity, topic, pomodoro } });

    const url = new URL('timer.html', window.location.href);
    url.searchParams.set('subject', subject);
    url.searchParams.set('activity', activity);
    url.searchParams.set('topic', topic);
    url.searchParams.set('pomodoro', pomodoro.toString());

    window.location.href = url.toString();
  });

  // --- CSV EXPORT ---
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const sessions = StorageAPI.getSessions();
    const header = "Date,Subject,Activity,Topic,Duration (Mins)\n";
    const csv = sessions.map(s => `${s.date},"${s.subject}","${s.activity}","${s.topic || ''}",${s.durationMinutes}`).join('\n');
    
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gate_sessions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- AI PLANNER ---
  document.getElementById('btn-generate-plan')?.addEventListener('click', async () => {
    const apiKey = (document.getElementById('ai-api-key') as HTMLInputElement).value;
    const selectedOptions = Array.from((document.getElementById('ai-weak-subjects') as HTMLSelectElement).selectedOptions);
    const weakSubjects = selectedOptions.map(o => o.value);
    const examDate = (document.getElementById('ai-exam-date') as HTMLInputElement).value;
    const dailyHours = parseInt((document.getElementById('ai-daily-hours') as HTMLInputElement).value, 10);

    if (apiKey) StorageAPI.saveSettings({ anthropicApiKey: apiKey });
    
    const outputEl = document.getElementById('ai-plan-output')!;
    outputEl.classList.remove('hidden');
    outputEl.innerHTML = '<p>Generating plan...</p>';

    try {
      const planRes = await generateStudyPlan(apiKey, weakSubjects, examDate, dailyHours);
      if (planRes && planRes.plan) {
        outputEl.innerHTML = planRes.plan.map((d: any) => `
          <div class="ai-day">
            <h4>Day ${d.day}: ${d.focus}</h4>
            <ul>
              ${d.tasks.map((t: string) => `<li>${t}</li>`).join('')}
            </ul>
          </div>
        `).join('');
      } else {
        outputEl.innerHTML = '<p>Unexpected response format.</p>';
      }
    } catch (e: any) {
      outputEl.innerHTML = `<p style="color: var(--danger)">Error: ${e.message}</p>`;
    }
  });

});
