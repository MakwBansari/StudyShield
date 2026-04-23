import { Timer } from './timer';
import './common';
import { StorageAPI } from './storage';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionSettings = StorageAPI.getSettings().currentTimerSession || {};
  
  const rawSubject = urlParams.get('subject') || sessionSettings.subject;
  const subject = rawSubject ? decodeURIComponent(rawSubject) : 'Subject';
  const activity = urlParams.get('activity') || sessionSettings.activity || 'Activity';
  const topic = urlParams.get('topic') || sessionSettings.topic || '';
  const pomodoro = urlParams.get('pomodoro') === 'true' || sessionSettings.pomodoro === true;

  document.getElementById('timer-subject-display')!.textContent = subject;
  
  const topicDisplay = document.getElementById('timer-topic-display')!;
  if (topic) {
    topicDisplay.textContent = `Topic: ${topic}`;
  } else {
    topicDisplay.style.display = 'none';
  }

  const displayElId = 'timer-display';
  const glowEl = document.getElementById('timer-glow') as HTMLElement;
  const timer = new Timer(displayElId, displayElId);
  (timer as any).glowEl = glowEl; // Pass glow el explicitly

  if (pomodoro) {
    timer.setPomodoroMode(true);
  }

  const btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
  const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;

  const activeStartTime = Date.now();

  // Auto-start timer when page loads
  timer.start();
  
  // Delay slightly to ensure extension content script is fully ready
  setTimeout(() => {
    StorageAPI.setExtensionStudying(true, subject, activeStartTime);
  }, 200);

  btnPause.addEventListener('click', () => {
    if (btnPause.textContent === 'PAUSE') {
      timer.pause();
      btnPause.textContent = 'RESUME';
    } else {
      timer.start();
      btnPause.textContent = 'PAUSE';
    }
  });

  btnStop.addEventListener('click', () => {
    timer.stop();
  });

  timer.onStopCallback = (durationSecs, phase) => {
    if (phase === 'study' && durationSecs > 60) {
      const durationMins = Math.round(durationSecs / 60);
      
      const qs = prompt('How many questions did you solve this session?', '0');
      const doubts = prompt('Any unsolved doubts or notes?', '');

      const session = {
        id: Date.now().toString(),
        subject,
        activity,
        topic,
        startTime: activeStartTime,
        endTime: Date.now(),
        durationMinutes: durationMins,
        date: new Date().toISOString().split('T')[0],
        questionsSolved: parseInt(qs || '0', 10),
        unsolvedDoubts: doubts || undefined
      };
      StorageAPI.saveSession(session);
      StorageAPI.updateTotalStudyTime(session.durationMinutes);

      // Check if target is hit
      const settings = StorageAPI.getSettings();
      const goals = settings.goals || [];
      const goal = goals.find(g => g.subject === subject);
      
      if (goal && goal.isActive) {
        const windowMs = goal.frequencyDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        // Calculate new total
        const allSessions = StorageAPI.getSessions();
        const relevantSessions = allSessions.filter(s => s.subject === subject && (now - s.startTime) <= windowMs);
        const totalMinutes = relevantSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        const totalHours = totalMinutes / 60;
        
        if (totalHours >= goal.hoursTarget) {
          alert(`Congratulations! You've hit your target of ${goal.hoursTarget} hours for ${subject} in this ${goal.frequencyDays}-day window! Time to change subjects!`);
        }

        // Check total questions syllabus goal
        if (goal.totalQuestions) {
          const subjSessions = allSessions.filter(s => s.subject === subject);
          const totalQsSolved = subjSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
          
          if (totalQsSolved >= goal.totalQuestions) {
            alert(`Amazing! You've solved a total of ${totalQsSolved} questions, reaching your target of ${goal.totalQuestions} for ${subject}! This subject has been automatically marked as complete (deactivated).`);
            goal.isActive = false;
            StorageAPI.saveSettings({ goals });
          }
        }
      }
    }

    StorageAPI.setExtensionStudying(false);
    
    // Redirect back to dashboard
    window.location.href = 'dashboard.html';
  };
});
