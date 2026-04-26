"use strict";
(() => {
  // src/timer.ts
  var Timer = class {
    constructor(displayElId, glowElId) {
      this.intervalId = null;
      this.secondsElapsed = 0;
      this.isPomodoro = false;
      this.pomodoroPhase = "study";
      this.pomodoroTimeLimit = 25 * 60;
      // 25 mins
      this.breakTimeLimit = 5 * 60;
      this.startSessionTime = 0;
      this.displayEl = document.getElementById(displayElId);
      this.glowEl = document.getElementById(glowElId);
    }
    setPomodoroMode(enabled) {
      this.isPomodoro = enabled;
    }
    start() {
      if (this.intervalId)
        return;
      if (this.secondsElapsed === 0) {
        this.startSessionTime = Date.now();
        this.pomodoroPhase = "study";
      }
      this.glowEl.classList.add("active");
      this.intervalId = window.setInterval(() => {
        this.secondsElapsed++;
        this.updateDisplay();
        if (this.isPomodoro) {
          const limit = this.pomodoroPhase === "study" ? this.pomodoroTimeLimit : this.breakTimeLimit;
          if (this.secondsElapsed >= limit) {
            this.playBell();
            this.stop();
            this.pomodoroPhase = this.pomodoroPhase === "study" ? "break" : "study";
            if (this.onPomodoroPhaseChange) {
              this.onPomodoroPhaseChange(this.pomodoroPhase);
            }
          }
        } else {
          if (this.secondsElapsed === 4 * 60 * 60) {
            this.playBell();
          }
        }
      }, 1e3);
    }
    pause() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.glowEl.classList.remove("active");
    }
    stop() {
      this.pause();
      const duration = this.secondsElapsed;
      const phase = this.pomodoroPhase;
      if (this.onStopCallback && duration > 0) {
        this.onStopCallback(duration, phase);
      }
      this.secondsElapsed = 0;
      this.updateDisplay();
      this.pomodoroPhase = "study";
    }
    updateDisplay() {
      const h = Math.floor(this.secondsElapsed / 3600);
      const m = Math.floor(this.secondsElapsed % 3600 / 60);
      const s = this.secondsElapsed % 60;
      this.displayEl.textContent = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    playBell() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext)
          return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 2);
      } catch (e) {
        console.error("Audio API error:", e);
      }
    }
  };

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

  // src/timer-page.ts
  document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionSettings = StorageAPI.getSettings().currentTimerSession || {};
    const rawSubject = urlParams.get("subject") || sessionSettings.subject;
    const subject = rawSubject ? decodeURIComponent(rawSubject) : "Subject";
    const activity = urlParams.get("activity") || sessionSettings.activity || "Activity";
    const topic = urlParams.get("topic") || sessionSettings.topic || "";
    const pomodoro = urlParams.get("pomodoro") === "true" || sessionSettings.pomodoro === true;
    document.getElementById("timer-subject-display").textContent = subject;
    const topicDisplay = document.getElementById("timer-topic-display");
    if (topic) {
      topicDisplay.textContent = `Topic: ${topic}`;
    } else {
      topicDisplay.style.display = "none";
    }
    const settings = StorageAPI.getSettings();
    const goal = settings.goals?.find((g) => g.subject === subject);
    const cheatEl = document.getElementById("cheatsheet-content");
    if (cheatEl && goal?.cheatsheet && goal.cheatsheet.trim() !== "") {
      cheatEl.textContent = goal.cheatsheet;
    }
    const displayElId = "timer-display";
    const glowEl = document.getElementById("timer-glow");
    const timer = new Timer(displayElId, displayElId);
    timer.glowEl = glowEl;
    if (pomodoro) {
      timer.setPomodoroMode(true);
    }
    const btnPause = document.getElementById("btn-pause");
    const btnStop = document.getElementById("btn-stop");
    const activeStartTime = Date.now();
    timer.start();
    setTimeout(() => {
      StorageAPI.setExtensionStudying(true, subject, activeStartTime);
    }, 200);
    btnPause.addEventListener("click", () => {
      if (btnPause.textContent === "PAUSE") {
        timer.pause();
        btnPause.textContent = "RESUME";
      } else {
        timer.start();
        btnPause.textContent = "PAUSE";
      }
    });
    btnStop.addEventListener("click", () => {
      timer.stop();
    });
    timer.onStopCallback = (durationSecs, phase) => {
      if (phase === "study" && durationSecs > 60) {
        const durationMins = Math.round(durationSecs / 60);
        const qsSolved = prompt("Number of questions SOLVED correctly?", "0");
        const qsUnsolved = prompt("Number of questions UNSOLVED/INCORRECT?", "0");
        const source = prompt("Source of questions (e.g. PYQ, Test Series, Book)?", "General Study");
        const doubts = prompt("Any specific doubts or concepts to revisit?", "");
        const session = {
          id: Date.now().toString(),
          subject,
          activity,
          topic,
          startTime: activeStartTime,
          endTime: Date.now(),
          durationMinutes: durationMins,
          date: (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA"),
          questionsSolved: parseInt(qsSolved || "0", 10),
          unsolvedQuestions: parseInt(qsUnsolved || "0", 10),
          source: source || "General Study",
          unsolvedDoubts: doubts || void 0
        };
        StorageAPI.saveSession(session);
        StorageAPI.updateTotalStudyTime(session.durationMinutes);
        const settings2 = StorageAPI.getSettings();
        const goals = settings2.goals || [];
        const goal2 = goals.find((g) => g.subject === subject);
        if (goal2 && goal2.isActive) {
          const windowMs = goal2.frequencyDays * 24 * 60 * 60 * 1e3;
          const now = Date.now();
          const allSessions = StorageAPI.getSessions();
          const relevantSessions = allSessions.filter((s) => s.subject === subject && now - s.startTime <= windowMs);
          const totalMinutes = relevantSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
          const totalHours = totalMinutes / 60;
          if (totalHours >= goal2.hoursTarget) {
            alert(`Congratulations! You've hit your target of ${goal2.hoursTarget} hours for ${subject} in this ${goal2.frequencyDays}-day window! Time to change subjects!`);
          }
          if (goal2.totalQuestions) {
            const subjSessions = allSessions.filter((s) => s.subject === subject);
            const totalQsSolved = subjSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
            if (totalQsSolved >= goal2.totalQuestions) {
              alert(`Amazing! You've solved a total of ${totalQsSolved} questions, reaching your target of ${goal2.totalQuestions} for ${subject}! This subject has been automatically marked as complete (deactivated).`);
              goal2.isActive = false;
              StorageAPI.saveSettings({ goals });
            }
          }
        }
      }
      StorageAPI.setExtensionStudying(false);
      window.location.href = "dashboard.html";
    };
  });
})();
//# sourceMappingURL=timer-page.js.map
