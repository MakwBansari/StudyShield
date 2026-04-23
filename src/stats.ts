import { StorageAPI, StudySession } from './storage';
import { GATE_SUBJECTS } from './subjects';

export const StatsUI = {
  renderDashboard(sessions: StudySession[]) {
    this.renderTimeline(sessions);
    this.renderRevisionPanel(sessions);
  },

  renderStatsTab(sessions: StudySession[]) {
    this.renderWeeklyChart(sessions);
    this.renderStreak(sessions);
    this.renderHeatmap(sessions);
    this.calculateFocusScore(sessions);
    this.renderDistractionLog();
  },

  renderTimeline(sessions: StudySession[]) {
    const timelineEl = document.getElementById('session-timeline');
    if (!timelineEl) return;
    
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === today).reverse(); // newest first
    
    if (todaySessions.length === 0) {
      timelineEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No sessions logged today yet.</p>';
      return;
    }

    timelineEl.innerHTML = todaySessions.map(s => {
      const start = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="timeline-item">
          <div class="tl-time">${start} (${s.durationMinutes}m)</div>
          <div class="tl-details">
            <span class="tl-subject">${s.subject}</span>
            <span class="tl-activity">${s.activity}</span>
          </div>
          ${s.topic ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Topic: ${s.topic}</div>` : ''}
        </div>
      `;
    }).join('');
  },

  renderRevisionPanel(sessions: StudySession[]) {
    const revListEl = document.getElementById('revision-list');
    if (!revListEl) return;

    // Build unique topics last studied date
    const topicMap = new Map<string, { subject: string, date: number }>();
    sessions.forEach(s => {
      if (s.topic && s.topic.trim() !== '') {
        // Keep the latest study date for a topic
        const existing = topicMap.get(s.topic);
        if (!existing || existing.date < s.startTime) {
          topicMap.set(s.topic, { subject: s.subject, date: s.startTime });
        }
      }
    });

    const now = Date.now();
    const intervals = [1, 3, 7, 14, 30]; // Ebbinghaus
    const dueTopics: any[] = [];

    topicMap.forEach((val, topic) => {
      const diffDays = (now - val.date) / (1000 * 60 * 60 * 24);
      // Find the next interval we have passed
      let isDue = false;
      let targetInterval = 0;
      for (const i of intervals) {
        if (diffDays >= i && diffDays < i + 1.5) { // Rough window for due
          isDue = true;
          targetInterval = i;
        }
      }
      if (isDue) {
        dueTopics.push({ topic, subject: val.subject, interval: targetInterval });
      }
    });

    if (dueTopics.length === 0) {
      revListEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">All caught up!</p>';
      return;
    }

    revListEl.innerHTML = dueTopics.map(dt => `
      <div class="revision-item">
        <div class="revision-topic">${dt.topic}</div>
        <div class="revision-meta">${dt.subject} • ${dt.interval} day review</div>
      </div>
    `).join('');
  },

  renderWeeklyChart(sessions: StudySession[]) {
    const chartEl = document.getElementById('weekly-chart');
    if (!chartEl) return;

    // Filter to last 7 days
    const now = Date.now();
    const weekSessions = sessions.filter(s => (now - s.startTime) <= 7 * 24 * 60 * 60 * 1000);
    
    const subjectHours: Record<string, number> = {};
    GATE_SUBJECTS.forEach(s => subjectHours[s.name] = 0);
    
    weekSessions.forEach(s => {
      if (subjectHours[s.subject] !== undefined) {
        subjectHours[s.subject] += s.durationMinutes / 60;
      }
    });

    // Find max hours for scaling
    let maxHours = 0;
    Object.values(subjectHours).forEach(h => { if (h > maxHours) maxHours = h; });
    if (maxHours === 0) maxHours = 1;

    chartEl.innerHTML = Object.keys(subjectHours)
      .filter(subj => subjectHours[subj] > 0)
      .map(subj => {
        const hours = subjectHours[subj];
        const pct = (hours / maxHours) * 100;
        return `
          <div class="chart-row">
            <div class="chart-label" title="${subj}">${subj}</div>
            <div class="chart-bar-container">
              <div class="chart-bar" style="width: ${pct}%"></div>
            </div>
            <div class="chart-val">${hours.toFixed(1)}h</div>
          </div>
        `;
      }).join('');
      
    if (chartEl.innerHTML === '') {
      chartEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No data for this week.</p>';
    }
  },

  renderStreak(sessions: StudySession[]) {
    const streakEl = document.getElementById('streak-count');
    if (!streakEl) return;

    // Get unique dates sorted descending
    const dates = Array.from(new Set(sessions.map(s => s.date))).sort().reverse();
    if (dates.length === 0) {
      streakEl.textContent = '0';
      return;
    }

    let streak = 0;
    let currentDate = new Date();
    // Reset to start of day for accurate day diff
    currentDate.setHours(0,0,0,0);
    
    const todayStr = currentDate.toISOString().split('T')[0];
    let expectedDate = new Date(currentDate);

    // If today is not in logs, check if yesterday is, otherwise streak is 0
    if (dates[0] !== todayStr) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const yesterdayStr = expectedDate.toISOString().split('T')[0];
      if (dates[0] !== yesterdayStr) {
        streakEl.textContent = '0';
        return;
      }
    }

    for (const d of dates) {
      const dateObj = new Date(d);
      if (d === expectedDate.toISOString().split('T')[0]) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    streakEl.textContent = streak.toString();
  },

  renderHeatmap(sessions: StudySession[]) {
    const tbody = document.querySelector('#heatmap-table tbody');
    if (!tbody) return;

    const subjectHours: Record<string, number> = {};
    GATE_SUBJECTS.forEach(s => subjectHours[s.name] = 0);
    
    sessions.forEach(s => {
      if (subjectHours[s.subject] !== undefined) {
        subjectHours[s.subject] += s.durationMinutes / 60;
      }
    });

    const totalHours = Object.values(subjectHours).reduce((a, b) => a + b, 0);

    tbody.innerHTML = GATE_SUBJECTS.map(subj => {
      const hours = subjectHours[subj.name];
      const pctTime = totalHours > 0 ? (hours / totalHours) * 100 : 0;
      const pctWeight = subj.weightage; // Weightage is out of 100
      
      let statusHtml = '';
      if (hours === 0) {
        statusHtml = '<span class="heatmap-warn">Needs Attention</span>';
      } else if (pctTime > pctWeight + 5) {
        statusHtml = '<span class="heatmap-warn" style="color:var(--danger)">Over-investing</span>';
      } else if (pctTime < pctWeight - 5) {
        statusHtml = '<span class="heatmap-warn" style="color:var(--danger)">Under-investing</span>';
      } else {
        statusHtml = '<span class="heatmap-ok" style="color:var(--success)">On Track</span>';
      }

      return `
        <tr>
          <td>${subj.name}</td>
          <td>${subj.weightage}%</td>
          <td>${hours.toFixed(1)}h (${pctTime.toFixed(1)}%)</td>
          <td>${statusHtml}</td>
        </tr>
      `;
    }).sort((a, b) => {
      if (b.includes('Needs Attention')) return 1;
      if (a.includes('Needs Attention')) return -1;
      if (b.includes('investing')) return 1;
      return -1;
    }).join('');
  },

  async renderDistractionLog() {
    const distEl = document.getElementById('distraction-summary');
    if (!distEl) return;
    
    const escapes = await StorageAPI.getExtensionEscapes();
    const count = escapes.length;
    
    if (count === 0) {
      distEl.textContent = `You had 0 distractions. Excellent focus!`;
      return;
    }

    const subjectCounts: Record<string, number> = {};
    escapes.forEach(e => {
      const s = e.subject || 'Unknown';
      subjectCounts[s] = (subjectCounts[s] || 0) + 1;
    });

    let worstSubj = Object.keys(subjectCounts)[0];
    for (const s in subjectCounts) {
      if (subjectCounts[s] > subjectCounts[worstSubj]) worstSubj = s;
    }

    distEl.innerHTML = `You tried to escape <strong>${count} times</strong> — mostly during <strong>${worstSubj}</strong>. Consider shorter sessions.`;
  },

  calculateFocusScore(sessions: StudySession[]) {
    const scoreEl = document.getElementById('focus-score');
    const detailsEl = document.getElementById('focus-score-details');
    if (!scoreEl || !detailsEl) return;

    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === today);
    const totalMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalHours = totalMinutes / 60;

    // Formula: hours studied (40pts) + goal completion % (30pts) − 5pts per distraction + streak (10pts)
    // Goal is 4 hours/day generally for the total. Let's cap at 40pts (10pts/hour)
    let ptsHours = Math.min(40, totalHours * 10);
    
    // Goal completion: let's assume 4 hours is 100%
    let ptsGoal = Math.min(30, (totalHours / 4) * 30);
    
    // Streak bonus
    const streakStr = document.getElementById('streak-count')?.textContent || '0';
    const streak = parseInt(streakStr, 10) || 0;
    let ptsStreak = Math.min(10, streak * 2);

    StorageAPI.getExtensionEscapes().then(escapes => {
      // Filter escapes to today
      const todayEscapes = escapes.filter(e => {
        const d = new Date(e.timestamp).toISOString().split('T')[0];
        return d === today;
      });
      const escapeCount = todayEscapes.length;
      
      let ptsPenalty = escapeCount * 5; // 20 pts base, -5 per escape
      let ptsDistractions = Math.max(0, 20 - ptsPenalty);
      
      let finalScore = Math.max(0, Math.min(100, ptsHours + ptsGoal + ptsStreak + ptsDistractions));
      
      let grade = 'C';
      if (finalScore >= 90) grade = 'A+';
      else if (finalScore >= 80) grade = 'A';
      else if (finalScore >= 65) grade = 'B';
      
      scoreEl.textContent = grade;
      detailsEl.innerHTML = `
        <div style="font-size:0.9rem; text-align:left;">
          <div>Hours: +${ptsHours.toFixed(0)}/40</div>
          <div>Goals: +${ptsGoal.toFixed(0)}/30</div>
          <div>Focus: +${ptsDistractions.toFixed(0)}/20 (${escapeCount} escapes)</div>
          <div>Streak: +${ptsStreak}/10</div>
        </div>
      `;
    });
  }
};
