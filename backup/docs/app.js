"use strict";
(() => {
  // src/common.ts
  document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "theme-toggle-btn";
    toggleBtn.innerHTML = savedTheme === "dark" ? "\u2600\uFE0F" : "\u{1F319}";
    toggleBtn.title = "Toggle Light/Dark Mode";
    document.body.appendChild(toggleBtn);
    toggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      toggleBtn.innerHTML = newTheme === "dark" ? "\u2600\uFE0F" : "\u{1F319}";
    });
    const revealElements = document.querySelectorAll(".reveal");
    const revealOnScroll = () => {
      const windowHeight = window.innerHeight;
      revealElements.forEach((el) => {
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
          el.classList.add("active");
        }
      });
    };
    window.addEventListener("scroll", revealOnScroll);
    revealOnScroll();
  });

  // src/storage.ts
  var StorageAPI = {
    getSessions() {
      try {
        const email = localStorage.getItem("currentUser");
        const key = email ? `study_sessions_${email}` : "study_sessions";
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },
    saveSession(session) {
      const email = localStorage.getItem("currentUser");
      const key = email ? `study_sessions_${email}` : "study_sessions";
      const sessions = this.getSessions();
      sessions.push(session);
      localStorage.setItem(key, JSON.stringify(sessions));
    },
    getSettings() {
      try {
        const email = localStorage.getItem("currentUser");
        const key = email ? `study_settings_${email}` : "study_settings";
        const data = localStorage.getItem(key);
        if (data)
          return JSON.parse(data);
        const defaults = {
          whitelist: ["localhost", "nptel.ac.in", "gateoverflow.in", "geeksforgeeks.org", "youtube.com", "drive.google.com", "ankiweb.net", "github.com"],
          blacklist: ["facebook.com", "instagram.com", "twitter.com", "reddit.com", "netflix.com"]
        };
        const users = JSON.parse(localStorage.getItem("users") || "{}");
        if (email && users[email] && users[email].preferences) {
          return { ...defaults, ...users[email].preferences };
        }
        return defaults;
      } catch {
        return { whitelist: [], blacklist: [] };
      }
    },
    saveSettings(settings) {
      const email = localStorage.getItem("currentUser");
      const key = email ? `study_settings_${email}` : "study_settings";
      const current = this.getSettings();
      localStorage.setItem(key, JSON.stringify({ ...current, ...settings }));
    },
    setExtensionStudying(isStudying, subject, startTime) {
      const settings = this.getSettings();
      window.postMessage({
        type: "FROM_PAGE",
        action: "SET_STUDYING",
        payload: {
          isStudying,
          subject,
          startTime,
          whitelist: settings.whitelist || [],
          blacklist: settings.blacklist || []
        }
      }, "*");
    },
    async getExtensionEscapes() {
      return new Promise((resolve) => {
        const listener = (event) => {
          if (event.source === window && event.data && event.data.type === "FROM_EXTENSION" && event.data.action === "ESCAPES_DATA") {
            window.removeEventListener("message", listener);
            resolve(event.data.payload || []);
          }
        };
        window.addEventListener("message", listener);
        window.postMessage({ type: "FROM_PAGE", action: "GET_ESCAPES" }, "*");
        setTimeout(() => {
          window.removeEventListener("message", listener);
          resolve([]);
        }, 500);
      });
    },
    async getExtensionTotalStudyTime() {
      return new Promise((resolve) => {
        const listener = (event) => {
          if (event.source === window && event.data && event.data.type === "FROM_EXTENSION" && event.data.action === "TOTAL_TIME_DATA") {
            window.removeEventListener("message", listener);
            resolve(event.data.payload);
          }
        };
        window.addEventListener("message", listener);
        window.postMessage({ type: "FROM_PAGE", action: "GET_TOTAL_TIME" }, "*");
        setTimeout(() => {
          window.removeEventListener("message", listener);
          resolve(0);
        }, 500);
      });
    },
    async updateTotalStudyTime(minutes) {
      window.postMessage({
        type: "FROM_PAGE",
        action: "UPDATE_TOTAL_TIME",
        payload: { minutes }
      }, "*");
    },
    getMockTests() {
      try {
        const email = localStorage.getItem("currentUser");
        const key = email ? `mock_tests_${email}` : "mock_tests";
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },
    saveMockTest(test) {
      const email = localStorage.getItem("currentUser");
      const key = email ? `mock_tests_${email}` : "mock_tests";
      const tests = this.getMockTests();
      tests.push(test);
      localStorage.setItem(key, JSON.stringify(tests));
    }
  };

  // src/subjects.ts
  var GATE_SUBJECTS = [
    { name: "General Aptitude", weightage: 15 },
    { name: "Engineering Mathematics", weightage: 6 },
    { name: "Discrete Mathematics", weightage: 7 },
    { name: "Digital Logic", weightage: 5 },
    { name: "Computer Organization & Architecture", weightage: 8 },
    { name: "Programming & Data Structures", weightage: 10 },
    { name: "Algorithms", weightage: 8 },
    { name: "Theory of Computation", weightage: 8 },
    { name: "Compiler Design", weightage: 4 },
    { name: "Operating System", weightage: 10 },
    { name: "Databases", weightage: 8 },
    { name: "Computer Networks", weightage: 11 }
  ];
  function getSpacedRepetitionIntervals() {
    return [1, 3, 7, 14, 30];
  }
  function getDueRevisions(sessions) {
    const topicMap = /* @__PURE__ */ new Map();
    sessions.forEach((s) => {
      if (s.topic && s.topic.trim() !== "") {
        const key = `${s.subject}:::${s.topic}`;
        if (!topicMap.has(key) || s.startTime > topicMap.get(key).lastStudied) {
          topicMap.set(key, { subject: s.subject, lastStudied: s.startTime });
        }
      }
    });
    const due = [];
    const intervals = getSpacedRepetitionIntervals();
    const now = Date.now();
    topicMap.forEach((val, key) => {
      const diffDays = Math.floor((now - val.lastStudied) / (1e3 * 60 * 60 * 24));
      const topic = key.split(":::")[1];
      if (diffDays > 0 && intervals.some((interval) => diffDays === interval || diffDays === interval + 1)) {
        due.push({ subject: val.subject, topic, daysAgo: diffDays });
      }
    });
    return due;
  }

  // src/stats.ts
  var StatsUI = {
    renderDashboard(sessions) {
      this.renderTimeline(sessions);
      this.renderRevisionPanel(sessions);
      this.renderWeeklyPerformance(sessions);
    },
    renderStatsTab(sessions) {
      this.renderWeeklyChart(sessions);
      this.renderStreak(sessions);
      this.renderHeatmap(sessions);
      this.calculateFocusScore(sessions);
      this.renderDistractionLog();
      this.renderWeakHourInsights(sessions);
    },
    renderTimeline(sessions) {
      const timelineEl = document.getElementById("session-timeline");
      if (!timelineEl)
        return;
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todaySessions = sessions.filter((s) => s.date === today).reverse();
      if (todaySessions.length === 0) {
        timelineEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No sessions logged today yet.</p>';
        return;
      }
      timelineEl.innerHTML = todaySessions.map((s) => {
        const start = new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return `
        <div class="timeline-item">
          <div class="tl-time">${start} (${s.durationMinutes}m)</div>
          <div class="tl-details">
            <span class="tl-subject">${s.subject}</span>
            <span class="tl-activity">${s.activity}</span>
          </div>
          ${s.topic ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Topic: ${s.topic}</div>` : ""}
        </div>
      `;
      }).join("");
    },
    renderRevisionPanel(sessions) {
      const revListEl = document.getElementById("revision-list");
      if (!revListEl)
        return;
      const topicMap = /* @__PURE__ */ new Map();
      sessions.forEach((s) => {
        if (s.topic && s.topic.trim() !== "") {
          const existing = topicMap.get(s.topic);
          if (!existing || existing.date < s.startTime) {
            topicMap.set(s.topic, { subject: s.subject, date: s.startTime });
          }
        }
      });
      const now = Date.now();
      const intervals = [1, 3, 7, 14, 30];
      const dueTopics = [];
      topicMap.forEach((val, topic) => {
        const diffDays = (now - val.date) / (1e3 * 60 * 60 * 24);
        let isDue = false;
        let targetInterval = 0;
        for (const i of intervals) {
          if (diffDays >= i && diffDays < i + 1.5) {
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
      revListEl.innerHTML = dueTopics.map((dt) => `
      <div class="revision-item">
        <div class="revision-topic">${dt.topic}</div>
        <div class="revision-meta">${dt.subject} \u2022 ${dt.interval} day review</div>
      </div>
    `).join("");
    },
    renderWeeklyChart(sessions) {
      const chartEl = document.getElementById("weekly-chart");
      if (!chartEl)
        return;
      const now = Date.now();
      const weekSessions = sessions.filter((s) => now - s.startTime <= 7 * 24 * 60 * 60 * 1e3);
      const subjectHours = {};
      GATE_SUBJECTS.forEach((s) => subjectHours[s.name] = 0);
      weekSessions.forEach((s) => {
        if (subjectHours[s.subject] !== void 0) {
          subjectHours[s.subject] += s.durationMinutes / 60;
        }
      });
      let maxHours = 0;
      Object.values(subjectHours).forEach((h) => {
        if (h > maxHours)
          maxHours = h;
      });
      if (maxHours === 0)
        maxHours = 1;
      chartEl.innerHTML = Object.keys(subjectHours).filter((subj) => subjectHours[subj] > 0).map((subj) => {
        const hours = subjectHours[subj];
        const pct = hours / maxHours * 100;
        return `
          <div class="chart-row">
            <div class="chart-label" title="${subj}">${subj}</div>
            <div class="chart-bar-container">
              <div class="chart-bar" style="width: ${pct}%"></div>
            </div>
            <div class="chart-val">${hours.toFixed(1)}h</div>
          </div>
        `;
      }).join("");
      if (chartEl.innerHTML === "") {
        chartEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No data for this week.</p>';
      }
    },
    renderStreak(sessions) {
      const streakEl = document.getElementById("streak-count");
      if (!streakEl)
        return;
      const dates = Array.from(new Set(sessions.map((s) => s.date))).sort().reverse();
      if (dates.length === 0) {
        streakEl.textContent = "0";
        return;
      }
      let streak = 0;
      let currentDate = /* @__PURE__ */ new Date();
      currentDate.setHours(0, 0, 0, 0);
      const todayStr = currentDate.toISOString().split("T")[0];
      let expectedDate = new Date(currentDate);
      if (dates[0] !== todayStr) {
        expectedDate.setDate(expectedDate.getDate() - 1);
        const yesterdayStr = expectedDate.toISOString().split("T")[0];
        if (dates[0] !== yesterdayStr) {
          streakEl.textContent = "0";
          return;
        }
      }
      for (const d of dates) {
        const dateObj = new Date(d);
        if (d === expectedDate.toISOString().split("T")[0]) {
          streak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
      streakEl.textContent = streak.toString();
    },
    renderHeatmap(sessions) {
      const tbody = document.querySelector("#heatmap-table tbody");
      if (!tbody)
        return;
      const subjectHours = {};
      GATE_SUBJECTS.forEach((s) => subjectHours[s.name] = 0);
      sessions.forEach((s) => {
        if (subjectHours[s.subject] !== void 0) {
          subjectHours[s.subject] += s.durationMinutes / 60;
        }
      });
      const totalHours = Object.values(subjectHours).reduce((a, b) => a + b, 0);
      tbody.innerHTML = GATE_SUBJECTS.map((subj) => {
        const hours = subjectHours[subj.name];
        const pctTime = totalHours > 0 ? hours / totalHours * 100 : 0;
        const pctWeight = subj.weightage;
        let statusHtml = "";
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
        if (b.includes("Needs Attention"))
          return 1;
        if (a.includes("Needs Attention"))
          return -1;
        if (b.includes("investing"))
          return 1;
        return -1;
      }).join("");
    },
    async renderDistractionLog() {
      const distEl = document.getElementById("distraction-summary");
      if (!distEl)
        return;
      const escapes = await StorageAPI.getExtensionEscapes();
      const count = escapes.length;
      if (count === 0) {
        distEl.textContent = `You had 0 distractions. Excellent focus!`;
        return;
      }
      const subjectCounts = {};
      escapes.forEach((e) => {
        const s = e.subject || "Unknown";
        subjectCounts[s] = (subjectCounts[s] || 0) + 1;
      });
      let worstSubj = Object.keys(subjectCounts)[0];
      for (const s in subjectCounts) {
        if (subjectCounts[s] > subjectCounts[worstSubj])
          worstSubj = s;
      }
      distEl.innerHTML = `You tried to escape <strong>${count} times</strong> \u2014 mostly during <strong>${worstSubj}</strong>. Consider shorter sessions.`;
    },
    calculateFocusScore(sessions) {
      const scoreEl = document.getElementById("focus-score");
      const detailsEl = document.getElementById("focus-score-details");
      if (!scoreEl || !detailsEl)
        return;
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todaySessions = sessions.filter((s) => s.date === today);
      const totalMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const totalHours = totalMinutes / 60;
      let ptsHours = Math.min(40, totalHours * 10);
      let ptsGoal = Math.min(30, totalHours / 4 * 30);
      const streakStr = document.getElementById("streak-count")?.textContent || "0";
      const streak = parseInt(streakStr, 10) || 0;
      let ptsStreak = Math.min(10, streak * 2);
      StorageAPI.getExtensionEscapes().then((escapes) => {
        const todayEscapes = escapes.filter((e) => {
          const d = new Date(e.timestamp).toISOString().split("T")[0];
          return d === today;
        });
        const escapeCount = todayEscapes.length;
        let ptsPenalty = escapeCount * 5;
        let ptsDistractions = Math.max(0, 20 - ptsPenalty);
        let finalScore = Math.max(0, Math.min(100, ptsHours + ptsGoal + ptsStreak + ptsDistractions));
        let grade = "C";
        if (finalScore >= 90)
          grade = "A+";
        else if (finalScore >= 80)
          grade = "A";
        else if (finalScore >= 65)
          grade = "B";
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
    renderWeeklyPerformance(sessions) {
      const gridEl = document.getElementById("weekly-performance-grid");
      const summaryEl = document.getElementById("weekly-summary-stats");
      if (!gridEl)
        return;
      const days = [];
      const now = /* @__PURE__ */ new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        days.push({
          date: d.toLocaleDateString("en-CA"),
          dayName: d.toLocaleDateString("en-US", { weekday: "short" })
        });
      }
      const sessionStats = {};
      let totalWeekHours = 0;
      let totalWeekQs = 0;
      sessions.forEach((s) => {
        if (days.some((d) => d.date === s.date)) {
          if (!sessionStats[s.date])
            sessionStats[s.date] = { hours: 0, qs: 0 };
          const hrs = s.durationMinutes / 60;
          sessionStats[s.date].hours += hrs;
          sessionStats[s.date].qs += s.questionsSolved || 0;
          totalWeekHours += hrs;
          totalWeekQs += s.questionsSolved || 0;
        }
      });
      if (summaryEl) {
        summaryEl.innerHTML = `
        <span style="color: var(--accent);">${totalWeekHours.toFixed(1)}h Studied</span>
        <span style="color: #10b981;">${totalWeekQs} Qs Solved</span>
      `;
      }
      gridEl.innerHTML = days.map((d) => {
        const stats = sessionStats[d.date] || { hours: 0, qs: 0 };
        const isToday = d.date === now.toLocaleDateString("en-CA");
        const isHighPerformer = stats.hours >= 6;
        const pct = Math.min(100, stats.hours / 8 * 100);
        return `
        <div class="weekly-card ${isToday ? "active-day" : ""} ${isHighPerformer ? "high-performer" : ""}">
          <div class="day-label">${d.dayName}</div>
          <div class="date-label">${d.date.split("-").slice(1).join("/")}</div>
          <div class="hour-val">${stats.hours.toFixed(1)}<span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500; margin-left: 2px;">h</span></div>
          <div class="qs-val">${stats.qs} Questions</div>
          <div class="mini-progress">
            <div class="mini-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
      }).join("");
    },
    renderWeakHourInsights(sessions) {
      const insightEl = document.getElementById("weak-hour-insight");
      if (!insightEl)
        return;
      if (sessions.length < 5) {
        insightEl.innerHTML = "<h4>Need more data</h4>Keep studying to unlock personalized focus insights.";
        return;
      }
      const hourStats = {};
      for (let i = 0; i < 24; i++)
        hourStats[i] = { count: 0, totalMinutes: 0 };
      sessions.forEach((s) => {
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
          if (avg < minAvg) {
            worstHour = i;
            minAvg = avg;
          }
          if (avg > maxAvg) {
            bestHour = i;
            maxAvg = avg;
          }
        }
      }
      if (worstHour === -1) {
        insightEl.innerHTML = "<h4>Stable Focus</h4>You seem to have consistent focus across all your sessions!";
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
    renderMockTrendChart(mockTests) {
      const chartEl = document.getElementById("mock-trend-chart");
      if (!chartEl)
        return;
      if (mockTests.length === 0) {
        chartEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding-top: 100px;">No mock tests logged yet.</p>';
        return;
      }
      const sortedTests = [...mockTests].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const width = 800;
      const height = 300;
      const padding = 40;
      const maxMarks = 100;
      const points = sortedTests.map((t, i) => {
        const x = padding + i * (width - 2 * padding) / Math.max(1, sortedTests.length - 1);
        const y = height - padding - t.totalMarks / maxMarks * (height - 2 * padding);
        return `${x},${y}`;
      }).join(" ");
      const polyline = `<polyline fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${points}" />`;
      const circles = sortedTests.map((t, i) => {
        const x = padding + i * (width - 2 * padding) / Math.max(1, sortedTests.length - 1);
        const y = height - padding - t.totalMarks / maxMarks * (height - 2 * padding);
        return `<circle cx="${x}" cy="${y}" r="6" fill="var(--bg-card)" stroke="var(--accent)" stroke-width="2" />
              <text x="${x}" y="${y - 15}" text-anchor="middle" fill="var(--text-main)" font-size="12" font-weight="bold">${t.totalMarks}</text>
              <text x="${x}" y="${height - 10}" text-anchor="middle" fill="var(--text-muted)" font-size="10">${t.name}</text>`;
      }).join("");
      const targetY = height - padding - 70 / maxMarks * (height - 2 * padding);
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

  // src/ai.ts
  async function generateStudyPlan(apiKey, weakSubjects, examDate, dailyHours, currentProgress) {
    if (!apiKey || weakSubjects.length === 0 || !examDate) {
      throw new Error("Please fill all required fields and provide an API key.");
    }
    const prompt2 = `You are a GATE CS exam coach. Generate a detailed day-by-day study plan in JSON format for the next 7 days.
  The student has weak subjects: ${weakSubjects.join(", ")}.
  Exam Date: ${examDate}.
  Available daily study hours: ${dailyHours} hours.
  
  Current Progress Context:
  ${JSON.stringify(currentProgress, null, 2)}
  (Use this to avoid assigning topics they have heavily studied recently unless it's their weak subject)

  Return ONLY valid JSON in this structure:
  {
    "plan": [
      {
        "day": 1,
        "focus": "Subject Name",
        "tasks": ["Task 1", "Task 2"]
      }
    ]
  }`;
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
          // Required for client-side fetch to Anthropic
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          // Updated to a valid model since sonnet-4 doesn't exist yet
          max_tokens: 1500,
          system: "You are a GATE CS exam coach. Generate ONLY JSON.",
          messages: [{ role: "user", content: prompt2 }]
        })
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error: ${response.status} - ${err}`);
      }
      const data = await response.json();
      const textContent = data.content[0].text;
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(textContent);
    } catch (err) {
      console.error("AI Gen error", err);
      throw err;
    }
  }

  // src/app.ts
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof chrome === "undefined" || !chrome.storage) {
      document.getElementById("ext-warning")?.classList.remove("hidden");
    }
    const navBtns = document.querySelectorAll(".nav-btn");
    const tabs = document.querySelectorAll(".tab-content");
    navBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        navBtns.forEach((b) => b.classList.remove("active"));
        tabs.forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        const targetId = `tab-${btn.dataset.tab}`;
        document.getElementById(targetId)?.classList.add("active");
        const pageTitle = document.getElementById("page-title");
        if (pageTitle) {
          pageTitle.textContent = btn.textContent;
        }
        if (targetId === "tab-stats") {
          StatsUI.renderStatsTab(StorageAPI.getSessions());
        }
      });
    });
    const settings = StorageAPI.getSettings();
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
      window.location.href = "login.html";
      return;
    }
    const userDisplay = document.getElementById("user-name-display");
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    const userData = users[currentUser];
    if (userData) {
      if (userDisplay)
        userDisplay.textContent = userData.name;
      if (profileName)
        profileName.textContent = userData.name;
      if (profileEmail)
        profileEmail.textContent = currentUser;
    }
    document.getElementById("btn-logout")?.addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });
    const NotificationService = {
      async requestPermission() {
        if ("Notification" in window && Notification.permission !== "granted") {
          await Notification.requestPermission();
        }
      },
      send(title, body) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body, icon: "./favicon.ico" });
        }
      }
    };
    NotificationService.requestPermission();
    const profileWhitelist = document.getElementById("profile-whitelist");
    const profileBlacklist = document.getElementById("profile-blacklist");
    if (userData && userData.preferences) {
      if (profileWhitelist)
        profileWhitelist.value = (userData.preferences.whitelist || []).join("\n");
      if (profileBlacklist)
        profileBlacklist.value = (userData.preferences.blacklist || []).join("\n");
      const profileStartTime = document.getElementById("profile-start-time");
      if (profileStartTime)
        profileStartTime.value = settings.preferredStartTime || "10:00";
    } else {
      const generalSettings = StorageAPI.getSettings();
      if (profileWhitelist)
        profileWhitelist.value = (generalSettings.whitelist || []).join("\n");
      if (profileBlacklist)
        profileBlacklist.value = (generalSettings.blacklist || []).join("\n");
      const profileStartTime = document.getElementById("profile-start-time");
      if (profileStartTime)
        profileStartTime.value = generalSettings.preferredStartTime || "10:00";
    }
    document.getElementById("btn-save-profile-settings")?.addEventListener("click", () => {
      const whitelist = profileWhitelist.value.split("\n").map((s) => s.trim()).filter((s) => s !== "");
      const blacklist = profileBlacklist.value.split("\n").map((s) => s.trim()).filter((s) => s !== "");
      const preferredStartTime = document.getElementById("profile-start-time").value;
      if (whitelist.length > 20 || blacklist.length > 20) {
        alert("You can only add up to 20 websites in each list.");
        return;
      }
      StorageAPI.saveSettings({ whitelist, blacklist, preferredStartTime });
      if (currentUser) {
        const users2 = JSON.parse(localStorage.getItem("users") || "{}");
        if (users2[currentUser]) {
          users2[currentUser].preferences = { whitelist, blacklist, preferredStartTime };
          localStorage.setItem("users", JSON.stringify(users2));
        }
      }
      alert("Focus settings updated successfully!");
      location.reload();
    });
    document.getElementById("btn-reset-data")?.addEventListener("click", () => {
      if (confirm("Are you SURE you want to delete all study data? This cannot be undone.")) {
        localStorage.removeItem("study_sessions");
        localStorage.removeItem("study_settings");
        alert("Data reset successfully.");
        location.reload();
      }
    });
    const subjSelect = document.getElementById("timer-subject");
    const subjList = document.getElementById("subjects-list");
    const weakSelect = document.getElementById("ai-weak-subjects");
    let goals = settings.goals && settings.goals.length > 0 ? settings.goals : GATE_SUBJECTS.map((s) => ({
      subject: s.name,
      isActive: true,
      // Default to all active to show subjects on dashboard
      hoursTarget: 5,
      frequencyDays: 7,
      totalSyllabusHours: 50,
      totalQuestions: 200,
      cheatsheet: ""
    }));
    const goalsList = document.getElementById("goals-list");
    subjList.innerHTML = "";
    GATE_SUBJECTS.forEach((subj, index) => {
      const goal = goals.find((g) => g.subject === subj.name) || {
        subject: subj.name,
        isActive: false,
        hoursTarget: 3,
        frequencyDays: 7,
        cheatsheet: ""
      };
      if (goal.isActive) {
        const allSubjSessions = StorageAPI.getSessions().filter((s) => s.subject === subj.name);
        const totalQs = allSubjSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
        if (!goal.totalQuestions || totalQs < goal.totalQuestions) {
          const opt1 = document.createElement("option");
          opt1.value = subj.name;
          opt1.textContent = subj.name;
          subjSelect.appendChild(opt1);
        }
      }
      const opt2 = document.createElement("option");
      opt2.value = subj.name;
      opt2.textContent = subj.name;
      weakSelect.appendChild(opt2);
      const goalDiv = document.createElement("div");
      goalDiv.className = "goal-item";
      goalDiv.innerHTML = `
      <label class="goal-info">
        <input type="checkbox" id="goal-active-${index}" ${goal.isActive ? "checked" : ""}>
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
            <input type="number" id="goal-total-hrs-${index}" class="input" value="${goal.totalSyllabusHours || ""}" min="1" placeholder="-">
          </div>
          <div class="goal-input-group">
            <span>Tot. Qs:</span>
            <input type="number" id="goal-total-qs-${index}" class="input" value="${goal.totalQuestions || ""}" min="1" placeholder="-">
          </div>
        </div>
        <div class="goal-row" style="margin-top: 0.5rem;">
          <textarea id="goal-cheat-${index}" class="input" style="height: 60px; font-size: 0.8rem; flex: 1; resize: vertical;" placeholder="Pinned Formulas / Key Concepts (e.g. Master Theorem: T(n) = aT(n/b) + f(n))">${goal.cheatsheet || ""}</textarea>
        </div>
      </div>
    `;
      goalsList.appendChild(goalDiv);
      if (goal.isActive) {
        const sessions2 = StorageAPI.getSessions();
        const now = Date.now();
        const windowMs = goal.frequencyDays * 24 * 60 * 60 * 1e3;
        const relevantSessions = sessions2.filter((s) => s.subject === subj.name && now - s.startTime <= windowMs);
        const totalMinutes = relevantSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        const totalHours = totalMinutes / 60;
        const allSubjSessions = sessions2.filter((s) => s.subject === subj.name);
        const totalQs = allSubjSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
        const pct = Math.min(100, totalHours / goal.hoursTarget * 100);
        if (goal.totalQuestions && totalQs >= goal.totalQuestions) {
        }
        const div = document.createElement("div");
        div.className = "subject-item";
        if (goal.totalQuestions && totalQs >= goal.totalQuestions) {
          div.classList.add("completed");
        }
        div.innerHTML = `
        <div class="subject-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <span class="subj-name" style="font-size: 1.2rem; font-weight: 700;">${subj.name} ${totalQs >= (goal.totalQuestions || Infinity) ? "\u2705" : ""}</span>
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
              <span style="font-weight: 600;">${totalQs} / ${goal.totalQuestions || "-"} Qs</span>
            </div>
            <div class="progress-bar" style="height: 8px; background: var(--bg-color); border-radius: 4px; overflow: hidden;">
              <div class="progress-fill" style="width: ${goal.totalQuestions ? Math.min(100, totalQs / goal.totalQuestions * 100) : 0}%; height: 100%; background: #10b981; border-radius: 4px;"></div>
            </div>
          </div>
        </div>
      `;
        subjList?.appendChild(div);
      }
    });
    document.getElementById("btn-save-goals")?.addEventListener("click", () => {
      const newGoals = GATE_SUBJECTS.map((subj, index) => ({
        subject: subj.name,
        isActive: document.getElementById(`goal-active-${index}`).checked,
        hoursTarget: parseFloat(document.getElementById(`goal-hours-${index}`).value) || 3,
        frequencyDays: parseInt(document.getElementById(`goal-freq-${index}`).value, 10) || 1,
        totalSyllabusHours: parseFloat(document.getElementById(`goal-total-hrs-${index}`).value) || void 0,
        totalQuestions: parseInt(document.getElementById(`goal-total-qs-${index}`).value, 10) || void 0,
        cheatsheet: document.getElementById(`goal-cheat-${index}`).value
      }));
      StorageAPI.saveSettings({ goals: newGoals });
      alert("Goals saved successfully!");
      location.reload();
    });
    const sidebarWhitelistUl = document.querySelector(".whitelist-panel ul");
    if (sidebarWhitelistUl) {
      const latestSettings = StorageAPI.getSettings();
      const currentWhitelist = latestSettings.whitelist || [];
      if (currentWhitelist.length > 0) {
        sidebarWhitelistUl.innerHTML = currentWhitelist.map((site) => `<li>${site}</li>`).join("");
      } else {
        sidebarWhitelistUl.innerHTML = "<li>None set</li>";
      }
    }
    if (settings.examDate) {
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      let dateStr = settings.examDate.replace(/\//g, "-");
      let parts = dateStr.split("-");
      let year, month, day;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          [year, month, day] = parts.map(Number);
        } else {
          [day, month, year] = parts.map(Number);
        }
        const targetDate = new Date(year, month - 1, day);
        const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
        document.getElementById("countdown-days").textContent = Math.max(0, diffDays).toString();
      } else {
        const targetDate = new Date(settings.examDate);
        const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
        document.getElementById("countdown-days").textContent = Math.max(0, diffDays).toString();
      }
      document.getElementById("ai-exam-date").value = settings.examDate;
      const currentGoals = settings.goals || [];
      let totalTargetHours = 0;
      currentGoals.forEach((g) => {
        if (g.isActive && g.totalSyllabusHours) {
          totalTargetHours += g.totalSyllabusHours;
        }
      });
      if (totalTargetHours === 0)
        totalTargetHours = 800;
      const totalStudiedMinutes = StorageAPI.getSessions().reduce((acc, s) => acc + s.durationMinutes, 0);
      const totalStudiedHours = totalStudiedMinutes / 60;
      const pacePct = Math.min(100, totalStudiedHours / totalTargetHours * 100);
      const paceEl = document.getElementById("countdown-pace");
      if (paceEl) {
        paceEl.textContent = `Pace: ${pacePct.toFixed(1)}% covered`;
      }
    }
    if (settings.anthropicApiKey) {
      document.getElementById("ai-api-key").value = settings.anthropicApiKey;
    }
    document.getElementById("set-exam-date-btn")?.addEventListener("click", () => {
      const date = prompt("Enter GATE Exam Date (YYYY-MM-DD):", settings.examDate || "");
      if (date) {
        StorageAPI.saveSettings({ examDate: date });
        location.reload();
      }
    });
    const sessions = StorageAPI.getSessions();
    StatsUI.renderDashboard(sessions);
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
    const quoteEl = document.getElementById("motivation-quote");
    const authorEl = document.getElementById("motivation-author");
    if (quoteEl) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      quoteEl.textContent = `"${randomQuote}"`;
      if (authorEl)
        authorEl.style.display = "none";
    }
    const dueRevisions = getDueRevisions(sessions);
    const revList = document.getElementById("revision-list");
    if (dueRevisions.length > 0) {
      revList.innerHTML = dueRevisions.map((r) => `
      <div style="padding: 0.5rem; background: rgba(245, 166, 35, 0.1); border-left: 3px solid var(--accent); margin-bottom: 0.5rem;">
        <div style="font-weight: 500; color: var(--accent);">${r.subject}</div>
        <div style="font-size: 0.9rem;">Topic: ${r.topic}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Studied ${r.daysAgo} days ago</div>
      </div>
    `).join("");
    } else {
      revList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No topics due for revision today. Great job!</p>';
    }
    const completedSubjectsToRevise = [];
    const nowMs = Date.now();
    settings.goals?.forEach((goal) => {
      const subjSessions = sessions.filter((s) => s.subject === goal.subject);
      if (subjSessions.length === 0)
        return;
      const totalQs = subjSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
      const totalHrs = subjSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60;
      const isCompleted = goal.isActive === false && (goal.totalQuestions && totalQs >= goal.totalQuestions || goal.totalSyllabusHours && totalHrs >= goal.totalSyllabusHours);
      if (isCompleted) {
        const lastStudied = Math.max(...subjSessions.map((s) => s.startTime));
        const daysSince = (nowMs - lastStudied) / (1e3 * 60 * 60 * 24);
        if (daysSince >= 7) {
          completedSubjectsToRevise.push(goal.subject);
        }
      }
    });
    if (completedSubjectsToRevise.length > 0) {
      setTimeout(() => {
        alert(`\u{1F514} REVISION REMINDER!

You have completed the following subjects, but haven't reviewed them in over 7 days:
- ${completedSubjectsToRevise.join("\n- ")}

Consider scheduling a short revision session to keep them fresh!`);
      }, 1e3);
    }
    const btnStart = document.getElementById("btn-start");
    const pomodoroCheck = document.getElementById("pomodoro-mode");
    btnStart.addEventListener("click", () => {
      const subject = subjSelect.value;
      const activity = document.getElementById("timer-activity").value;
      const topic = document.getElementById("timer-topic").value;
      const pomodoro = pomodoroCheck.checked;
      if (!topic || topic.trim() === "") {
        alert("Please enter a topic name for spaced repetition tracking before starting the timer.");
        return;
      }
      const current = StorageAPI.getSettings();
      StorageAPI.saveSettings({ ...current, currentTimerSession: { subject, activity, topic, pomodoro } });
      const url = new URL("timer.html", window.location.href);
      url.searchParams.set("subject", subject);
      url.searchParams.set("activity", activity);
      url.searchParams.set("topic", topic);
      url.searchParams.set("pomodoro", pomodoro.toString());
      window.location.href = url.toString();
    });
    document.getElementById("btn-export-csv")?.addEventListener("click", () => {
      const sessions2 = StorageAPI.getSessions();
      const header = "Date,Subject,Activity,Topic,Duration (Mins)\n";
      const csv = sessions2.map((s) => `${s.date},"${s.subject}","${s.activity}","${s.topic || ""}",${s.durationMinutes}`).join("\n");
      const blob = new Blob([header + csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gate_sessions_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
    const mockSubjectContainer = document.getElementById("mock-subject-scores");
    if (mockSubjectContainer) {
      mockSubjectContainer.innerHTML = GATE_SUBJECTS.map((s, i) => `
      <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem;">${s.name}</label>
        <input type="number" id="mock-subj-${i}" class="input" placeholder="Marks" step="0.5" style="padding: 0.4rem; width: 100%;">
      </div>
    `).join("");
    }
    document.getElementById("form-mock-test")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("mock-name").value;
      const date = document.getElementById("mock-date").value;
      const breakdown = {};
      let total = 0;
      GATE_SUBJECTS.forEach((s, i) => {
        const val = parseFloat(document.getElementById(`mock-subj-${i}`).value) || 0;
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
    StatsUI.renderMockTrendChart(StorageAPI.getMockTests());
    setInterval(() => {
      const now = /* @__PURE__ */ new Date();
      const sessions2 = StorageAPI.getSessions();
      const today = now.toLocaleDateString("en-CA");
      const todaySessions = sessions2.filter((s) => s.date === today);
      const totalMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      if (totalMinutes >= 210 && totalMinutes < 215) {
        const alreadyNotified = localStorage.getItem(`notify_goal_${today}`);
        if (!alreadyNotified) {
          NotificationService.send("Elite Progress!", "You are just 30 minutes away from your 4-hour daily goal! Keep going.");
          localStorage.setItem(`notify_goal_${today}`, "true");
        }
      }
      const prefTime = settings.preferredStartTime || "10:00";
      const [prefHour, prefMin] = prefTime.split(":").map(Number);
      const prefDate = new Date(now);
      prefDate.setHours(prefHour, prefMin, 0, 0);
      if (now >= prefDate && todaySessions.length === 0) {
        const alreadyNotified = localStorage.getItem(`notify_start_${today}`);
        if (!alreadyNotified) {
          NotificationService.send("Start Studying!", `It's past your preferred start time (${prefTime}). Let's get to work!`);
          localStorage.setItem(`notify_start_${today}`, "true");
        }
      }
    }, 6e4);
    document.getElementById("btn-generate-plan")?.addEventListener("click", async () => {
      const apiKey = document.getElementById("ai-api-key").value;
      const selectedOptions = Array.from(document.getElementById("ai-weak-subjects").selectedOptions);
      const weakSubjects = selectedOptions.map((o) => o.value);
      const examDate = document.getElementById("ai-exam-date").value;
      const dailyHours = parseInt(document.getElementById("ai-daily-hours").value, 10);
      if (apiKey)
        StorageAPI.saveSettings({ anthropicApiKey: apiKey });
      const outputEl = document.getElementById("ai-plan-output");
      outputEl.classList.remove("hidden");
      outputEl.innerHTML = "<p>Generating personalized plan...</p>";
      const sessionsData = StorageAPI.getSessions();
      const progress = {};
      sessionsData.forEach((s) => {
        if (!progress[s.subject])
          progress[s.subject] = { hours: 0, qs: 0 };
        progress[s.subject].hours += s.durationMinutes / 60;
        progress[s.subject].qs += s.questionsSolved || 0;
      });
      try {
        const planRes = await generateStudyPlan(apiKey, weakSubjects, examDate, dailyHours, progress);
        if (planRes && planRes.plan) {
          outputEl.innerHTML = planRes.plan.map((d) => `
          <div class="ai-day">
            <h4>Day ${d.day}: ${d.focus}</h4>
            <ul>
              ${d.tasks.map((t) => `<li>${t}</li>`).join("")}
            </ul>
          </div>
        `).join("");
        } else {
          outputEl.innerHTML = "<p>Unexpected response format.</p>";
        }
      } catch (e) {
        outputEl.innerHTML = `<p style="color: var(--danger)">Error: ${e.message}</p>`;
      }
    });
  });
})();
//# sourceMappingURL=app.js.map
