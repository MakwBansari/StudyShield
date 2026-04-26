import { StorageAPI, StudySession } from './storage';
import { GATE_SUBJECTS } from './subjects';

export const StatsUI = {
  renderDashboard(sessions: StudySession[]) {
    this.renderTimeline(sessions);
    this.renderRevisionPanel(sessions);
    this.renderWeeklyPerformance(sessions);
  },

  renderStatsTab(sessions: StudySession[]) {
    this.renderWeeklyChart(sessions);
    this.renderStreak(sessions);
    this.renderHeatmap(sessions);
    this.calculateFocusScore(sessions);
    this.renderDistractionLog();
    this.renderWeakHourInsights(sessions);
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
  },

  renderWeeklyPerformance(sessions: StudySession[]) {
    const gridEl = document.getElementById('weekly-performance-grid');
    const summaryEl = document.getElementById('weekly-summary-stats');
    if (!gridEl) return;

    // Last 7 days
    const days: { date: string, dayName: string }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toLocaleDateString('en-CA'),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }

    const sessionStats: Record<string, { hours: number, qs: number }> = {};
    let totalWeekHours = 0;
    let totalWeekQs = 0;

    sessions.forEach(s => {
      // Only count if within the last 7 days
      if (days.some(d => d.date === s.date)) {
        if (!sessionStats[s.date]) sessionStats[s.date] = { hours: 0, qs: 0 };
        const hrs = (s.durationMinutes / 60);
        sessionStats[s.date].hours += hrs;
        sessionStats[s.date].qs += (s.questionsSolved || 0);
        
        totalWeekHours += hrs;
        totalWeekQs += (s.questionsSolved || 0);
      }
    });

    if (summaryEl) {
      summaryEl.innerHTML = `
        <span style="color: var(--accent);">${totalWeekHours.toFixed(1)}h Studied</span>
        <span style="color: #10b981;">${totalWeekQs} Qs Solved</span>
      `;
    }

    gridEl.innerHTML = days.map(d => {
      const stats = sessionStats[d.date] || { hours: 0, qs: 0 };
      const isToday = d.date === now.toLocaleDateString('en-CA');
      const isHighPerformer = stats.hours >= 6;
      
      const pct = Math.min(100, (stats.hours / 8) * 100);

      return `
        <div class="weekly-card ${isToday ? 'active-day' : ''} ${isHighPerformer ? 'high-performer' : ''}">
          <div class="day-label">${d.dayName}</div>
          <div class="date-label">${d.date.split('-').slice(1).join('/')}</div>
          <div class="hour-val">${stats.hours.toFixed(1)}<span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500; margin-left: 2px;">h</span></div>
          <div class="qs-val">${stats.qs} Questions</div>
          <div class="mini-progress">
            <div class="mini-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderWeakHourInsights(sessions: StudySession[]) {
    const insightEl = document.getElementById('weak-hour-insight');
    if (!insightEl) return;

    if (sessions.length < 5) {
      insightEl.innerHTML = '<h4>Need more data</h4>Keep studying to unlock personalized focus insights.';
      return;
    }

    // Analyze average duration by hour of day (0-23)
    const hourStats: Record<number, { count: number, totalMinutes: number }> = {};
    for (let i = 0; i < 24; i++) hourStats[i] = { count: 0, totalMinutes: 0 };

    sessions.forEach(s => {
      const hour = new Date(s.startTime).getHours();
      hourStats[hour].count++;
      hourStats[hour].totalMinutes += s.durationMinutes;
    });

    let worstHour = -1;
    let minAvg = Infinity;
    let bestHour = -1;
    let maxAvg = 0;

    for (let i = 0; i < 24; i++) {
      if (hourStats[i].count > 0) {
        const avg = hourStats[i].totalMinutes / hourStats[i].count;
        if (avg < minAvg) { worstHour = i; minAvg = avg; }
        if (avg > maxAvg) { bestHour = i; maxAvg = avg; }
      }
    }

    if (worstHour === -1) {
      insightEl.innerHTML = '<h4>Stable Focus</h4>You seem to have consistent focus across all your sessions!';
      return;
    }

    const worstStr = `${worstHour}:00 - ${worstHour + 1}:00`;
    const bestStr = `${bestHour}:00 - ${bestHour + 1}:00`;

    insightEl.innerHTML = `
      <h4>Focus Pattern Detected</h4>
      <p>Your focus is <strong>weakest</strong> between <strong>${worstStr}</strong> (average ${minAvg.toFixed(0)}m session). 
      Avoid scheduling heavy GATE subjects like OS or Algorithms during this time.</p>
      <p style="margin-top: 0.5rem;">Your <strong>Peak Performance</strong> is at <strong>${bestStr}</strong>. Use this for your hardest topics!</p>
    `;
  },

  renderMockTrendChart(mockTests: any[]) {
    const chartEl = document.getElementById('mock-trend-chart');
    if (!chartEl) return;

    if (mockTests.length === 0) {
      chartEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding-top: 100px;">No mock tests logged yet.</p>';
      return;
    }

    const sortedTests = [...mockTests].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Simple SVG Line Chart
    const width = 800;
    const height = 300;
    const padding = 40;
    const maxMarks = 100; // GATE is out of 100
    
    const points = sortedTests.map((t, i) => {
      const x = padding + (i * (width - 2 * padding)) / (Math.max(1, sortedTests.length - 1));
      const y = height - padding - (t.totalMarks / maxMarks) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    const polyline = `<polyline fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${points}" />`;
    
    // Add points
    const circles = sortedTests.map((t, i) => {
      const x = padding + (i * (width - 2 * padding)) / (Math.max(1, sortedTests.length - 1));
      const y = height - padding - (t.totalMarks / maxMarks) * (height - 2 * padding);
      return `<circle cx="${x}" cy="${y}" r="6" fill="var(--bg-card)" stroke="var(--accent)" stroke-width="2" />
              <text x="${x}" y="${y - 15}" text-anchor="middle" fill="var(--text-main)" font-size="12" font-weight="bold">${t.totalMarks}</text>
              <text x="${x}" y="${height - 10}" text-anchor="middle" fill="var(--text-muted)" font-size="10">${t.name}</text>`;
    }).join('');

    // Target Line (e.g. 70 marks)
    const targetY = height - padding - (70 / maxMarks) * (height - 2 * padding);
    const targetLine = `<line x1="${padding}" y1="${targetY}" x2="${width - padding}" y2="${targetY}" stroke="rgba(16, 185, 129, 0.3)" stroke-width="2" stroke-dasharray="5,5" />
                        <text x="${width - padding + 5}" y="${targetY + 4}" fill="#10b981" font-size="10">Target: 70+</text>`;

    chartEl.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <!-- Grid lines -->
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border)" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="var(--border)" stroke-width="1" />
        ${targetLine}
        ${polyline}
        ${circles}
      </svg>
    `;
  }
};
