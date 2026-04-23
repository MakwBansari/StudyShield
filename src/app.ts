import './common';
import { StorageAPI } from './storage';
import { GATE_SUBJECTS, getDueRevisions } from './subjects';
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

      // Update page title
      const pageTitle = document.getElementById('page-title');
      if (pageTitle) {
        pageTitle.textContent = btn.textContent;
      }

      if (targetId === 'tab-stats') {
        StatsUI.renderStatsTab(StorageAPI.getSessions());
      }
    });
  });

  // --- AUTH GUARD & LOGOUT ---
  const currentUser = localStorage.getItem('currentUser');
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const userDisplay = document.getElementById('user-name-display');
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  
  const users = JSON.parse(localStorage.getItem('users') || '{}');
  const userData = users[currentUser];

  if (userData) {
    if (userDisplay) userDisplay.textContent = userData.name;
    if (profileName) profileName.textContent = userData.name;
    if (profileEmail) profileEmail.textContent = currentUser;
  }

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  });

  document.getElementById('btn-reset-data')?.addEventListener('click', () => {
    if (confirm('Are you SURE you want to delete all study data? This cannot be undone.')) {
      localStorage.removeItem('study_sessions');
      localStorage.removeItem('study_settings');
      alert('Data reset successfully.');
      location.reload();
    }
  });


  // --- INITIALIZE UI ---
  const subjSelect = document.getElementById('timer-subject') as HTMLSelectElement;
  const subjList = document.getElementById('subjects-list');
  const weakSelect = document.getElementById('ai-weak-subjects') as HTMLSelectElement;

  const settings = StorageAPI.getSettings();
  let goals = settings.goals && settings.goals.length > 0 ? settings.goals : GATE_SUBJECTS.map(s => ({
    subject: s.name,
    isActive: true, // Default to all active to show subjects on dashboard
    hoursTarget: 5,
    frequencyDays: 7,
    totalSyllabusHours: 50,
    totalQuestions: 200
  }));


  const goalsList = document.getElementById('goals-list')!;
  
  // Clear lists
  subjList!.innerHTML = '';

  GATE_SUBJECTS.forEach((subj, index) => {
    // Get Goal
    const goal = goals.find(g => g.subject === subj.name) || goals[0];

    // Populate dropdowns
    if (goal.isActive) {
      const allSubjSessions = StorageAPI.getSessions().filter(s => s.subject === subj.name);
      const totalQs = allSubjSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
      
      // Only show in timer if not completed
      if (!goal.totalQuestions || totalQs < goal.totalQuestions) {
        const opt1 = document.createElement('option');
        opt1.value = subj.name;
        opt1.textContent = subj.name;
        subjSelect.appendChild(opt1);
      }
    }


    const opt2 = document.createElement('option');
    opt2.value = subj.name;
    opt2.textContent = subj.name;
    weakSelect.appendChild(opt2);

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
      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="number" id="goal-hours-${index}" class="input" value="${goal.hoursTarget}" min="1" max="24" style="width: 60px; margin: 0; padding: 0.25rem;"> hrs
          / <input type="number" id="goal-freq-${index}" class="input" value="${goal.frequencyDays}" min="1" max="30" style="width: 60px; margin: 0; padding: 0.25rem;"> days
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">
          Tot. Hrs: <input type="number" id="goal-total-hrs-${index}" class="input" value="${goal.totalSyllabusHours || ''}" min="1" placeholder="-" style="width: 60px; margin: 0; padding: 0.25rem;">
          Tot. Qs: <input type="number" id="goal-total-qs-${index}" class="input" value="${goal.totalQuestions || ''}" min="1" placeholder="-" style="width: 60px; margin: 0; padding: 0.25rem;">
        </div>
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
      
      const allSubjSessions = sessions.filter(s => s.subject === subj.name);
      const totalQs = allSubjSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
      
      const pct = Math.min(100, (totalHours / goal.hoursTarget) * 100);

      // Auto-deactivation logic
      if (goal.totalQuestions && totalQs >= goal.totalQuestions) {
        // Subject is completed!
        // We don't automatically save settings here to avoid side effects during render,
        // but we show a badge and don't count it for active studying if needed.
      }

      const div = document.createElement('div');
      div.className = 'subject-item';
      if (goal.totalQuestions && totalQs >= goal.totalQuestions) {
        div.classList.add('completed');
      }
      
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="subj-name">${subj.name} ${totalQs >= (goal.totalQuestions || Infinity) ? '✅' : ''}</span>
          <span class="subj-weight">${subj.weightage}m</span>
        </div>
        <div class="subj-progress">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.25rem;">
            <span>${totalHours.toFixed(1)}h / ${goal.hoursTarget}h (${goal.frequencyDays}d)</span>
            <span>Qs: ${totalQs} / ${goal.totalQuestions || '-'}</span>
          </div>
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
      frequencyDays: parseInt((document.getElementById(`goal-freq-${index}`) as HTMLInputElement).value, 10) || 1,
      totalSyllabusHours: parseFloat((document.getElementById(`goal-total-hrs-${index}`) as HTMLInputElement).value) || undefined,
      totalQuestions: parseInt((document.getElementById(`goal-total-qs-${index}`) as HTMLInputElement).value, 10) || undefined
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

    // Pace calculation
    const currentGoals = settings.goals || [];
    let totalTargetHours = 0;
    currentGoals.forEach(g => {
      if (g.isActive && g.totalSyllabusHours) {
        totalTargetHours += g.totalSyllabusHours;
      }
    });
    if (totalTargetHours === 0) totalTargetHours = 800; // Fallback

    const totalStudiedMinutes = StorageAPI.getSessions().reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalStudiedHours = totalStudiedMinutes / 60;
    const pacePct = Math.min(100, (totalStudiedHours / totalTargetHours) * 100);

    const paceEl = document.getElementById('countdown-pace');
    if (paceEl) {
      paceEl.textContent = `Pace: ${pacePct.toFixed(1)}% covered`;
    }
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
  const sessions = StorageAPI.getSessions();
  StatsUI.renderDashboard(sessions);

  // Render Revisions
  const dueRevisions = getDueRevisions(sessions);
  const revList = document.getElementById('revision-list')!;
  if (dueRevisions.length > 0) {
    revList.innerHTML = dueRevisions.map(r => `
      <div style="padding: 0.5rem; background: rgba(245, 166, 35, 0.1); border-left: 3px solid var(--accent); margin-bottom: 0.5rem;">
        <div style="font-weight: 500; color: var(--accent);">${r.subject}</div>
        <div style="font-size: 0.9rem;">Topic: ${r.topic}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Studied ${r.daysAgo} days ago</div>
      </div>
    `).join('');
  } else {
    revList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No topics due for revision today. Great job!</p>';
  }

  // --- COMPLETED SUBJECT REVISION ALERT ---
  const completedSubjectsToRevise: string[] = [];
  const nowMs = Date.now();
  
  settings.goals?.forEach(goal => {
    // Determine if it's completed
    const subjSessions = sessions.filter(s => s.subject === goal.subject);
    if (subjSessions.length === 0) return;
    
    const totalQs = subjSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
    const totalHrs = subjSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60;
    
    const isCompleted = goal.isActive === false && (
      (goal.totalQuestions && totalQs >= goal.totalQuestions) || 
      (goal.totalSyllabusHours && totalHrs >= goal.totalSyllabusHours)
    );

    if (isCompleted) {
      // Find last studied date
      const lastStudied = Math.max(...subjSessions.map(s => s.startTime));
      const daysSince = (nowMs - lastStudied) / (1000 * 60 * 60 * 24);
      
      // If it's been more than 7 days, trigger a revision alert
      if (daysSince >= 7) {
        completedSubjectsToRevise.push(goal.subject);
      }
    }
  });

  if (completedSubjectsToRevise.length > 0) {
    // Use a slight timeout so it doesn't block the UI rendering immediately
    setTimeout(() => {
      alert(`🔔 REVISION REMINDER!\n\nYou have completed the following subjects, but haven't reviewed them in over 7 days:\n- ${completedSubjectsToRevise.join('\n- ')}\n\nConsider scheduling a short revision session to keep them fresh!`);
    }, 1000);
  }

  // Timer logic moved to timer-page.ts

  const btnStart = document.getElementById('btn-start') as HTMLButtonElement;
  const pomodoroCheck = document.getElementById('pomodoro-mode') as HTMLInputElement;

  btnStart.addEventListener('click', () => {
    const subject = subjSelect.value;
    const activity = (document.getElementById('timer-activity') as HTMLSelectElement).value;
    const topic = (document.getElementById('timer-topic') as HTMLInputElement).value;
    const pomodoro = pomodoroCheck.checked;

    if (!topic || topic.trim() === '') {
      alert('Please enter a topic name for spaced repetition tracking before starting the timer.');
      return;
    }

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
    outputEl.innerHTML = '<p>Generating personalized plan...</p>';

    const sessionsData = StorageAPI.getSessions();
    const progress: any = {};
    sessionsData.forEach(s => {
      if (!progress[s.subject]) progress[s.subject] = { hours: 0, qs: 0 };
      progress[s.subject].hours += (s.durationMinutes / 60);
      progress[s.subject].qs += (s.questionsSolved || 0);
    });

    try {
      const planRes = await generateStudyPlan(apiKey, weakSubjects, examDate, dailyHours, progress);
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
