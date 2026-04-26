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

  // --- INITIALIZE SETTINGS ---
  const settings = StorageAPI.getSettings();

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

  // --- NOTIFICATION SERVICE ---
  const NotificationService = {
    async requestPermission() {
      if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
    },
    send(title: string, body: string) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: './favicon.ico' });
      }
    }
  };
  NotificationService.requestPermission();

  // --- POPULATE PROFILE SETTINGS ---
  const profileWhitelist = document.getElementById('profile-whitelist') as HTMLTextAreaElement;
  const profileBlacklist = document.getElementById('profile-blacklist') as HTMLTextAreaElement;
  
  if (userData && userData.preferences) {
    if (profileWhitelist) profileWhitelist.value = (userData.preferences.whitelist || []).join('\n');
    if (profileBlacklist) profileBlacklist.value = (userData.preferences.blacklist || []).join('\n');
    const profileStartTime = document.getElementById('profile-start-time') as HTMLInputElement;
    if (profileStartTime) profileStartTime.value = settings.preferredStartTime || '10:00';
  } else {
    // Fallback to general settings if preferences not on user object
    const generalSettings = StorageAPI.getSettings();
    if (profileWhitelist) profileWhitelist.value = (generalSettings.whitelist || []).join('\n');
    if (profileBlacklist) profileBlacklist.value = (generalSettings.blacklist || []).join('\n');
    const profileStartTime = document.getElementById('profile-start-time') as HTMLInputElement;
    if (profileStartTime) profileStartTime.value = generalSettings.preferredStartTime || '10:00';
  }

  document.getElementById('btn-save-profile-settings')?.addEventListener('click', () => {
    const whitelist = profileWhitelist.value.split('\n').map(s => s.trim()).filter(s => s !== '');
    const blacklist = profileBlacklist.value.split('\n').map(s => s.trim()).filter(s => s !== '');
    const preferredStartTime = (document.getElementById('profile-start-time') as HTMLInputElement).value;

    if (whitelist.length > 20 || blacklist.length > 20) {
      alert('You can only add up to 20 websites in each list.');
      return;
    }

    // Save to general settings
    StorageAPI.saveSettings({ whitelist, blacklist, preferredStartTime });

    // Also update user object for consistency
    if (currentUser) {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      if (users[currentUser]) {
        users[currentUser].preferences = { whitelist, blacklist, preferredStartTime };
        localStorage.setItem('users', JSON.stringify(users));
      }
    }

    alert('Focus settings updated successfully!');
    location.reload(); // Refresh to update sidebar
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

  let goals = settings.goals && settings.goals.length > 0 ? settings.goals : GATE_SUBJECTS.map(s => ({
    subject: s.name,
    isActive: true, // Default to all active to show subjects on dashboard
    hoursTarget: 5,
    frequencyDays: 7,
    totalSyllabusHours: 50,
    totalQuestions: 200,
    cheatsheet: ''
  }));


  const goalsList = document.getElementById('goals-list')!;
  
  // Clear lists
  subjList!.innerHTML = '';

  GATE_SUBJECTS.forEach((subj, index) => {
    // Get Goal
    const goal = goals.find(g => g.subject === subj.name) || { 
      subject: subj.name, 
      isActive: false, 
      hoursTarget: 3, 
      frequencyDays: 7,
      cheatsheet: ''
    };

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
    goalDiv.className = 'goal-item';
    
    goalDiv.innerHTML = `
      <label class="goal-info">
        <input type="checkbox" id="goal-active-${index}" ${goal.isActive ? 'checked' : ''}>
        <span>${subj.name}</span>
      </label>
      <div class="goal-controls">
        <div class="goal-row">
          <div class="goal-input-group">
            <input type="number" id="goal-hours-${index}" class="input" value="${goal.hoursTarget}" min="1" max="24"> 
            <span>hrs</span>
          </div>
          <span>/</span>
          <div class="goal-input-group">
            <input type="number" id="goal-freq-${index}" class="input" value="${goal.frequencyDays}" min="1" max="30"> 
            <span>days</span>
          </div>
        </div>
        <div class="goal-row">
          <div class="goal-input-group">
            <span>Tot. Hrs:</span>
            <input type="number" id="goal-total-hrs-${index}" class="input" value="${goal.totalSyllabusHours || ''}" min="1" placeholder="-">
          </div>
          <div class="goal-input-group">
            <span>Tot. Qs:</span>
            <input type="number" id="goal-total-qs-${index}" class="input" value="${goal.totalQuestions || ''}" min="1" placeholder="-">
          </div>
        </div>
        <div class="goal-row" style="margin-top: 0.5rem;">
          <textarea id="goal-cheat-${index}" class="input" style="height: 60px; font-size: 0.8rem; flex: 1; resize: vertical;" placeholder="Pinned Formulas / Key Concepts (e.g. Master Theorem: T(n) = aT(n/b) + f(n))">${goal.cheatsheet || ''}</textarea>
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
        <div class="subject-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <span class="subj-name" style="font-size: 1.2rem; font-weight: 700;">${subj.name} ${totalQs >= (goal.totalQuestions || Infinity) ? '✅' : ''}</span>
          <span class="subj-weight" style="background: var(--accent); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${subj.weightage} Marks</span>
        </div>
        
        <div class="subj-stats" style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div class="stat-group">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
              <span style="color: var(--text-muted);">Weekly Hours</span>
              <span style="font-weight: 600;">${totalHours.toFixed(1)} / ${goal.hoursTarget}h</span>
            </div>
            <div class="progress-bar" style="height: 8px; background: var(--bg-color); border-radius: 4px; overflow: hidden;">
              <div class="progress-fill" style="width: ${pct}%; height: 100%; background: var(--accent); border-radius: 4px;"></div>
            </div>
          </div>

          <div class="stat-group">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
              <span style="color: var(--text-muted);">Syllabus Questions</span>
              <span style="font-weight: 600;">${totalQs} / ${goal.totalQuestions || '-'} Qs</span>
            </div>
            <div class="progress-bar" style="height: 8px; background: var(--bg-color); border-radius: 4px; overflow: hidden;">
              <div class="progress-fill" style="width: ${goal.totalQuestions ? Math.min(100, (totalQs / goal.totalQuestions) * 100) : 0}%; height: 100%; background: #10b981; border-radius: 4px;"></div>
            </div>
          </div>
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
      totalQuestions: parseInt((document.getElementById(`goal-total-qs-${index}`) as HTMLInputElement).value, 10) || undefined,
      cheatsheet: (document.getElementById(`goal-cheat-${index}`) as HTMLTextAreaElement).value
    }));
    StorageAPI.saveSettings({ goals: newGoals });
    alert('Goals saved successfully!');
    location.reload(); // Reload to refresh dashboard targets
  });

  // --- UPDATE SIDEBAR WHITELIST ---
  const sidebarWhitelistUl = document.querySelector('.whitelist-panel ul');
  if (sidebarWhitelistUl) {
    // Get fresh settings to ensure we have the latest after any saves
    const latestSettings = StorageAPI.getSettings();
    const currentWhitelist = latestSettings.whitelist || [];
    if (currentWhitelist.length > 0) {
      sidebarWhitelistUl.innerHTML = currentWhitelist.map((site: string) => `<li>${site}</li>`).join('');
    } else {
      sidebarWhitelistUl.innerHTML = '<li>None set</li>';
    }
  }
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

  // --- MOTIVATION QUOTES ---
  const quotes = [
    "No cap, your consistency is looking fine today. Keep going.",
    "Manifesting that AIR < 100 for you. Stay on the grind.",
    "Go off, study king. Secure the bag (and the rank).",
    "Main character energy activated. Time to lock in.",
    "The grind don't stop, literally. You've got this.",
    "Stop scrolling TikTok, start scrolling your notes.",
    "Delulu is the only solulu until you actually study.",
    "Sending you positive vibes and high marks only.",
    "Imagine the flex when you get that IIT call. Study now.",
    "You're doing amazing, sweetie. Don't quit now."
  ];

  const quoteEl = document.getElementById('motivation-quote');
  const authorEl = document.getElementById('motivation-author');
  if (quoteEl) {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    quoteEl.textContent = `"${randomQuote}"`;
    if (authorEl) authorEl.style.display = 'none'; // GenZ quotes don't need authors
  }

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

  // --- MOCK TEST LOGGING ---
  const mockSubjectContainer = document.getElementById('mock-subject-scores');
  if (mockSubjectContainer) {
    mockSubjectContainer.innerHTML = GATE_SUBJECTS.map((s, i) => `
      <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem;">${s.name}</label>
        <input type="number" id="mock-subj-${i}" class="input" placeholder="Marks" step="0.5" style="padding: 0.4rem; width: 100%;">
      </div>
    `).join('');
  }

  document.getElementById('form-mock-test')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('mock-name') as HTMLInputElement).value;
    const date = (document.getElementById('mock-date') as HTMLInputElement).value;
    
    const breakdown: Record<string, number> = {};
    let total = 0;
    GATE_SUBJECTS.forEach((s, i) => {
      const val = parseFloat((document.getElementById(`mock-subj-${i}`) as HTMLInputElement).value) || 0;
      breakdown[s.name] = val;
      total += val;
    });

    StorageAPI.saveMockTest({
      id: Date.now().toString(),
      name,
      date,
      totalMarks: total,
      subjectBreakdown: breakdown
    });

    alert(`Test saved successfully! Total Marks: ${total.toFixed(2)}`);
    location.reload();
  });
  
  // Render Mock trend
  StatsUI.renderMockTrendChart(StorageAPI.getMockTests());

  // --- SMART NOTIFICATIONS CHECKS ---
  setInterval(() => {
    const now = new Date();
    const sessions = StorageAPI.getSessions();
    
    // Get true local YYYY-MM-DD
    const today = now.toLocaleDateString('en-CA'); 
    
    const todaySessions = sessions.filter(s => s.date === today);
    const totalMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    // Goal: 4 hours (240 mins)
    // Notify at 3.5 hours (210 mins)
    if (totalMinutes >= 210 && totalMinutes < 215) {
      const alreadyNotified = localStorage.getItem(`notify_goal_${today}`);
      if (!alreadyNotified) {
        NotificationService.send("Elite Progress!", "You are just 30 minutes away from your 4-hour daily goal! Keep going.");
        localStorage.setItem(`notify_goal_${today}`, 'true');
      }
    }

    // Study Start reminder
    const prefTime = settings.preferredStartTime || '10:00';
    const [prefHour, prefMin] = prefTime.split(':').map(Number);
    const prefDate = new Date(now);
    prefDate.setHours(prefHour, prefMin, 0, 0);

    if (now >= prefDate && todaySessions.length === 0) {
      const alreadyNotified = localStorage.getItem(`notify_start_${today}`);
      if (!alreadyNotified) {
        NotificationService.send("Start Studying!", `It's past your preferred start time (${prefTime}). Let's get to work!`);
        localStorage.setItem(`notify_start_${today}`, 'true');
      }
    }
  }, 60000); // Check every minute

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
