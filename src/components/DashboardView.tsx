"use client";

import React, { useState } from "react";
import MotivationQuote from "./MotivationQuote";
import Timer from "./Timer";
import { StudySession, Settings } from "@/lib/types";
import { GATE_SUBJECTS } from "@/lib/subjects";

interface DashboardViewProps {
  sessions: StudySession[];
  settings: Settings;
  userName?: string;
}

const getSubjectColor = (subjectName: string) => {
  const colors: Record<string, string> = {
    "Engineering Mathematics": "#eab308", // warm yellow
    "Discrete Mathematics": "#fbbf24", // warm amber-yellow
    "Digital Logic": "#ca8a04", // gold-yellow
    "Computer Organization & Architecture": "#f5a623", // accent amber
    "Programming & Data Structures": "#10b981", // emerald
    "Algorithms": "#06b6d4", // cyan
    "Theory of Computation": "#f59e0b", // amber
    "Compiler Design": "#f97316", // orange
    "Operating Systems": "#0d9488", // teal
    "Databases": "#84cc16", // lime
    "Computer Networks": "#d97706", // dark amber
    "General Aptitude": "#14b8a6", // teal/cyan
  };
  return colors[subjectName] || "#f5a623"; // default amber
};

export default function DashboardView({ sessions, settings, userName }: DashboardViewProps) {
  const [timeFilter, setTimeFilter] = useState("weekly");
  const [subjectFilter, setSubjectFilter] = useState("All");

  // Timeline-specific filter states
  const [timelineTimeframe, setTimelineTimeframe] = useState<"today" | "yesterday" | "weekly" | "monthly" | "yearly">("today");
  const [timelineSubject, setTimelineSubject] = useState("all");
  const [timelineTopic, setTimelineTopic] = useState("");
  const [timelineHasQuestions, setTimelineHasQuestions] = useState(false);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [selectedDaySummary, setSelectedDaySummary] = useState<{ date: string; hours: number; questions: number; subjects: string[] } | null>(null);

  const getWeeklyPerformance = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const offsetToSat = (dayOfWeek + 1) % 7;
    
    const sat = new Date(today);
    sat.setDate(today.getDate() - offsetToSat);

    const weekDays = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
    const todayStr = today.toISOString().split("T")[0];

    const hasSessions = sessions && sessions.length > 0;
    const mockHours = [4.5, 6.2, 5.0, 7.5, 4.0, 8.2, 3.5];
    const mockQuestions = [25, 40, 15, 55, 30, 60, 20];

    return [...Array(7)].map((_, i) => {
      const d = new Date(sat);
      d.setDate(sat.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const isToday = dateStr === todayStr;

      if (!hasSessions) {
        const isFuture = dateStr > todayStr;
        return { 
          date: dateStr, 
          hours: isFuture ? 0 : mockHours[i], 
          questions: isFuture ? 0 : mockQuestions[i], 
          dayName: weekDays[i],
          isToday 
        };
      }

      const daySessions = sessions.filter(s => s.date === dateStr);
      const hours = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60;
      const questions = daySessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);

      return { 
        date: dateStr, 
        hours, 
        questions, 
        dayName: weekDays[i],
        isToday 
      };
    });
  };

  const weeklyPerf = getWeeklyPerformance();
  const totalWeeklyHours = weeklyPerf.reduce((acc, d) => acc + d.hours, 0);
  const totalWeeklyQuestions = weeklyPerf.reduce((acc, d) => acc + d.questions, 0);

  // Filtered sessions logic for standard Activity Log
  const filteredSessions = sessions.filter(s => {
    if (subjectFilter !== "All" && s.subject !== subjectFilter) {
      return false;
    }

    const sessionTime = s.startTime;
    const localNow = new Date();
    const startOfToday = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const startOfYesterday = startOfToday - oneDayMs;

    if (timeFilter === "daily") {
      return sessionTime >= startOfToday;
    } else if (timeFilter === "yesterday") {
      return sessionTime >= startOfYesterday && sessionTime < startOfToday;
    } else if (timeFilter === "weekly") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const startOfWeekly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return sessionTime >= startOfWeekly;
    } else if (timeFilter === "monthly") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      const startOfMonthly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return sessionTime >= startOfMonthly;
    } else if (timeFilter === "yearly") {
      const d = new Date();
      d.setDate(d.getDate() - 364);
      const startOfYearly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return sessionTime >= startOfYearly;
    } else if (timeFilter === "upto_today") {
      return true;
    }
    
    return true;
  });

  const totalHours = filteredSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60;
  const totalQs = filteredSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
  const sessionCount = filteredSessions.length;

  // Filtered sessions logic for interactive timeline
  const getTimelineFilteredSessions = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    return sessions.filter(s => {
      // 1. Timeframe filter
      if (timelineTimeframe === "today") {
        if (s.endTime < startOfToday) return false;
      } else if (timelineTimeframe === "yesterday") {
        const startOfYesterday = startOfToday - oneDayMs;
        if (s.endTime < startOfYesterday || s.startTime >= startOfToday) return false;
      } else if (timelineTimeframe === "weekly") {
        const startOfWeekly = startOfToday - 7 * oneDayMs;
        if (s.endTime < startOfWeekly) return false;
      } else if (timelineTimeframe === "monthly") {
        const startOfMonthly = startOfToday - 30 * oneDayMs;
        if (s.endTime < startOfMonthly) return false;
      } else if (timelineTimeframe === "yearly") {
        const startOfYearly = startOfToday - 365 * oneDayMs;
        if (s.endTime < startOfYearly) return false;
      }

      // 2. Subject filter
      if (timelineSubject !== "all" && s.subject !== timelineSubject) return false;

      // 3. Topic filter
      if (timelineTopic.trim() !== "") {
        if (!s.topic || !s.topic.toLowerCase().includes(timelineTopic.toLowerCase())) return false;
      }

      // 4. Questions filter
      if (timelineHasQuestions) {
        if (!s.questionsSolved || s.questionsSolved <= 0) return false;
      }

      return true;
    });
  };

  const timelineFiltered = getTimelineFilteredSessions();

  // Helper to render the 24h timeline bar for a single day
  const render24HourBar = (dayStart: number, daySessions: StudySession[]) => {
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const segments: {
      id: string;
      left: number;
      width: number;
      color: string;
      session: StudySession;
      intervalStart: number;
      intervalEnd: number;
    }[] = [];

    daySessions.forEach(session => {
      const list = session.intervals && session.intervals.length > 0
        ? session.intervals
        : [{ start: session.startTime, end: session.endTime }];

      list.forEach((interval, idx) => {
        const start = Math.max(dayStart, interval.start);
        const end = Math.min(dayEnd, interval.end);
        
        if (start < end) {
          const left = ((start - dayStart) / (24 * 60 * 60 * 1000)) * 100;
          const width = ((end - start) / (24 * 60 * 60 * 1000)) * 100;
          
          segments.push({
            id: `${session.id}-${idx}`,
            left,
            width,
            color: getSubjectColor(session.subject),
            session,
            intervalStart: start,
            intervalEnd: end
          });
        }
      });
    });

    return (
      <div className="timeline-bar-track">
        {/* Simplified grid lines at 6 AM (25%), 12 PM (50%), 6 PM (75%) */}
        {[25, 50, 75].map((pos) => (
          <div 
            key={pos} 
            className="timeline-grid-line" 
            style={{ left: `${pos}%` }} 
          />
        ))}
        
        {/* Active segments */}
        {segments.map(seg => {
          const isSelected = selectedSession?.id === seg.session.id;
          return (
            <div
              key={seg.id}
              className="timeline-segment"
              style={{
                left: `${seg.left}%`,
                width: `${Math.max(0.8, seg.width)}%`,
                backgroundColor: seg.color,
                color: seg.color,
                boxShadow: isSelected ? "0 0 10px currentColor" : "none",
                transform: isSelected ? "scaleY(1.15)" : "none",
                filter: isSelected ? "brightness(1.25)" : "none"
              }}
              onClick={() => {
                setSelectedSession(prev => prev?.id === seg.session.id ? null : seg.session);
                setSelectedDaySummary(null);
              }}
            />
          );
        })}
      </div>
    );
  };

  const renderTimeAxisLabels = () => (
    <div className="timeline-axis-labels">
      <span>12 AM</span>
      <span>6 AM</span>
      <span>12 PM</span>
      <span>6 PM</span>
      <span>12 AM</span>
    </div>
  );

  const renderMonthlyGrid = (filtered: StudySession[]) => {
    const last30Days = [...Array(30)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const daySessions = filtered.filter(s => s.startTime < dayEnd && s.endTime > dayStart);
      const totalMinutes = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const totalQuestions = daySessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
      const subjects = Array.from(new Set(daySessions.map(s => s.subject)));

      return {
        dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        totalMinutes,
        totalQuestions,
        subjects,
        hasData: daySessions.length > 0
      };
    });

    return (
      <div className="timeline-blocks-row">
        {last30Days.map((day, idx) => {
          const hours = day.totalMinutes / 60;
          const color = day.hasData ? getSubjectColor(day.subjects[0]) : "transparent";
          const isSelected = selectedDaySummary?.date === day.dateLabel;

          return (
            <div
              key={idx}
              className="timeline-block-item"
              style={{
                backgroundColor: day.hasData ? `${color}22` : "rgba(255, 255, 255, 0.02)",
                borderColor: isSelected ? "var(--accent)" : (day.hasData ? color : "var(--border)"),
                transform: isSelected ? "translateY(-2px)" : "none",
                boxShadow: isSelected ? "0 4px 10px rgba(245, 166, 35, 0.25)" : "none"
              }}
              onClick={() => {
                const summary = {
                  date: day.dateLabel,
                  hours,
                  questions: day.totalQuestions,
                  subjects: day.subjects
                };
                setSelectedDaySummary(prev => prev?.date === summary.date ? null : summary);
                setSelectedSession(null);
              }}
            >
              <span 
                className="timeline-block-label"
                style={(day.hasData || isSelected) ? { color: "#fff" } : {}}
              >
                {day.dateLabel.split(" ")[1]}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderYearlyGrid = (filtered: StudySession[]) => {
    const last12Months = [...Array(12)].map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthStart = new Date(year, month, 1).getTime();
      const monthEnd = new Date(year, month + 1, 1).getTime();

      const monthSessions = filtered.filter(s => s.startTime < monthEnd && s.endTime > monthStart);
      const totalMinutes = monthSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const totalQuestions = monthSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
      const subjects = Array.from(new Set(monthSessions.map(s => s.subject)));

      return {
        label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        totalMinutes,
        totalQuestions,
        subjects,
        hasData: monthSessions.length > 0
      };
    });

    return (
      <div className="timeline-blocks-row">
        {last12Months.map((m, idx) => {
          const hours = m.totalMinutes / 60;
          const color = m.hasData ? getSubjectColor(m.subjects[0]) : "transparent";
          const isSelected = selectedDaySummary?.date === m.label;

          return (
            <div
              key={idx}
              className="timeline-block-item"
              style={{
                backgroundColor: m.hasData ? `${color}22` : "rgba(255, 255, 255, 0.02)",
                borderColor: isSelected ? "var(--accent)" : (m.hasData ? color : "var(--border)"),
                height: "36px",
                transform: isSelected ? "translateY(-2px)" : "none",
                boxShadow: isSelected ? "0 4px 10px rgba(245, 166, 35, 0.25)" : "none"
              }}
              onClick={() => {
                const summary = {
                  date: m.label,
                  hours,
                  questions: m.totalQuestions,
                  subjects: m.subjects
                };
                setSelectedDaySummary(prev => prev?.date === summary.date ? null : summary);
                setSelectedSession(null);
              }}
            >
              <span 
                className="timeline-block-label"
                style={{ fontSize: "0.75rem", color: (m.hasData || isSelected) ? "#fff" : "var(--text-muted)" }}
              >
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimelineGraph = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (timelineTimeframe === "today") {
      return (
        <div className="timeline-list">
          <div className="timeline-row">
            <div className="timeline-day-title">Today</div>
            <div className="timeline-bar-container-outer">
              {render24HourBar(startOfToday, timelineFiltered)}
            </div>
          </div>
          {renderTimeAxisLabels()}
        </div>
      );
    }

    if (timelineTimeframe === "yesterday") {
      const startOfYesterday = startOfToday - oneDayMs;
      return (
        <div className="timeline-list">
          <div className="timeline-row">
            <div className="timeline-day-title">Yesterday</div>
            <div className="timeline-bar-container-outer">
              {render24HourBar(startOfYesterday, timelineFiltered)}
            </div>
          </div>
          {renderTimeAxisLabels()}
        </div>
      );
    }

    if (timelineTimeframe === "weekly") {
      const days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const dayEnd = dayStart + oneDayMs;
        const daySessions = timelineFiltered.filter(s => s.startTime < dayEnd && s.endTime > dayStart);
        const label = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
        return { dayStart, label, sessions: daySessions };
      });

      return (
        <div className="timeline-list">
          {days.map((day, idx) => (
            <div key={idx} className="timeline-row">
              <div className="timeline-day-title">{day.label}</div>
              <div className="timeline-bar-container-outer">
                {render24HourBar(day.dayStart, day.sessions)}
              </div>
            </div>
          ))}
          {renderTimeAxisLabels()}
        </div>
      );
    }

    if (timelineTimeframe === "monthly") {
      return renderMonthlyGrid(timelineFiltered);
    }

    if (timelineTimeframe === "yearly") {
      return renderYearlyGrid(timelineFiltered);
    }

    return null;
  };

  return (
    <section className="tab-dashboard animate-fade-in">
      <MotivationQuote userName={userName} />

      {/* Weekly Performance Bar Chart */}
      <div className="card full-width" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>
            Weekly Performance
          </h3>
          <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
            <span>Total: {totalWeeklyHours.toFixed(1)}h</span>
            <span>Questions: {totalWeeklyQuestions}</span>
            <span>Avg: {(totalWeeklyHours / 7).toFixed(1)}h/day</span>
          </div>
        </div>
        <div className="weekly-grid">
          {weeklyPerf.map((day, i) => (
            <div key={i} className={`day-box ${day.isToday ? 'today' : ''}`}>
              <div className="day-questions">
                {day.questions} Q
              </div>
              <div className="day-bar-container">
                <div 
                  className="day-bar" 
                  style={{ height: `${Math.min(100, (day.hours / 8) * 100)}%` }}
                >
                  <span className="bar-hours">{day.hours.toFixed(1)}h</span>
                </div>
              </div>
              <div className="day-label">
                <div className="day-name">{day.dayName}</div>
                <div className="day-date">{day.date.split("-")[2]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="timer-section">
          <Timer settings={settings} />
          
          <div className="card subjects-card" style={{ marginTop: "1.5rem" }}>
            <h3>Active Subjects & Targets</h3>
            <div className="subjects-list">
              {GATE_SUBJECTS.map(subj => {
                const goal = settings.goals?.find(g => g.subject === subj.name);
                if (!goal?.isActive) return null;

                const subjSessions = sessions.filter(s => s.subject === subj.name);
                const totalMinutes = subjSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
                const totalHours = totalMinutes / 60;
                const pct = Math.min(100, (totalHours / (goal.hoursTarget || 1)) * 100);

                return (
                  <div key={subj.name} className="subject-item">
                    <div className="subject-header">
                      <span className="subj-name">{subj.name}</span>
                      <span className="subj-weight">{subj.weightage} Marks</span>
                    </div>
                    <div className="stat-group">
                      <div className="stat-label">
                        <span>Progress</span>
                        <span>{totalHours.toFixed(1)} / {goal.hoursTarget}h</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="logs-section">
          {/* Interactive Activity Log Card */}
          <div className="card activity-log-card">
            <div className="card-header" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <h3 style={{ margin: 0 }}>My Activity Log</h3>
              </div>
              
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "120px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.3rem" }}>Timeframe</label>
                  <select 
                    className="input" 
                    value={timeFilter} 
                    onChange={(e) => setTimeFilter(e.target.value)}
                    style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", background: "var(--bg-card-hover)", border: "1px solid var(--border)", width: "100%" }}
                  >
                    <option value="daily">Daily (Today)</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="weekly">Weekly (Last 7 Days)</option>
                    <option value="monthly">Monthly (Last 30 Days)</option>
                    <option value="yearly">Yearly (Last 365 Days)</option>
                    <option value="upto_today">Upto Today (All Time)</option>
                  </select>
                </div>
                
                <div style={{ flex: 1, minWidth: "140px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.3rem" }}>Subject</label>
                  <select 
                    className="input" 
                    value={subjectFilter} 
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", background: "var(--bg-card-hover)", border: "1px solid var(--border)", width: "100%" }}
                  >
                    <option value="All">All Subjects</option>
                    {GATE_SUBJECTS.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="activity-stats-summary" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{ padding: "0.75rem", background: "var(--bg-card-hover)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>Studied</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent)" }}>{totalHours.toFixed(1)}h</div>
              </div>
              <div style={{ padding: "0.75rem", background: "var(--bg-card-hover)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>Solved</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--success)" }}>{totalQs} Qs</div>
              </div>
              <div style={{ padding: "0.75rem", background: "var(--bg-card-hover)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>Sessions</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>{sessionCount}</div>
              </div>
            </div>

            <div className="session-timeline" style={{ maxHeight: "280px", overflowY: "auto", paddingRight: "5px" }}>
              {filteredSessions.length > 0 ? (
                filteredSessions.slice().reverse().map((s, i) => (
                  <div key={i} className="timeline-item" style={{ paddingBottom: "1.2rem" }}>
                    <div className="tl-time" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{s.date}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {s.durationMinutes} mins
                      </span>
                    </div>
                    <div className="tl-details" style={{ marginTop: "0.25rem" }}>
                      <span className="tl-subject" style={{ fontWeight: 600 }}>{s.subject}</span>
                      <span className="tl-activity" style={{ marginLeft: "0.5rem", fontSize: "0.7rem", padding: "2px 6px", borderRadius: "10px", background: "var(--bg-card-hover)", border: "1px solid var(--border)" }}>{s.activity}</span>
                    </div>
                    {s.topic && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", fontStyle: "italic" }}>
                        Topic: {s.topic}
                      </div>
                    )}
                    {s.questionsSolved !== undefined && s.questionsSolved > 0 && (
                      <div style={{ fontSize: "0.75rem", color: "var(--success)", marginTop: "0.2" + "rem", fontWeight: 500 }}>
                        ✓ Solved {s.questionsSolved} questions
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0" }}>
                  No sessions logged matching selected filters.
                </p>
              )}
            </div>
          </div>

          {/* Interactive Activity Timeline Card (repositioned under Activity Log) */}
          <div className="timeline-card">
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 1rem 0", color: "var(--text-main)" }}>
              Study Session Timeline
            </h3>
            
            <div className="timeline-filters-row">
              <div className="timeline-filter-group">
                <label>Timeframe</label>
                <select
                  className="timeline-input timeline-select-timeframe"
                  value={timelineTimeframe}
                  onChange={(e) => setTimelineTimeframe(e.target.value as any)}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="timeline-filter-group">
                <label>Subject</label>
                <select
                  className="timeline-input timeline-select-subject"
                  value={timelineSubject}
                  onChange={(e) => setTimelineSubject(e.target.value)}
                >
                  <option value="all">All Subjects</option>
                  {GATE_SUBJECTS.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="timeline-filter-group" style={{ flex: 1, minWidth: "120px" }}>
                <label>Topic</label>
                <input
                  type="text"
                  className="timeline-input"
                  style={{ width: "100%" }}
                  placeholder="Filter topic notes..."
                  value={timelineTopic}
                  onChange={(e) => setTimelineTopic(e.target.value)}
                />
              </div>

              <label className="timeline-checkbox-label">
                <input
                  type="checkbox"
                  className="timeline-checkbox"
                  checked={timelineHasQuestions}
                  onChange={(e) => setTimelineHasQuestions(e.target.checked)}
                />
                With Questions
              </label>
            </div>

            {/* Timeline Visualization */}
            <div style={{ padding: "0.25rem 0" }}>
              {renderTimelineGraph()}
            </div>

            {/* Interactive details box (toggled by click instead of hover) */}
            <div className="timeline-details-panel">
              {selectedSession ? (
                <div className="timeline-details-grid">
                  <div className="timeline-details-header">
                    <span className="timeline-details-subj"># {selectedSession.subject}</span>
                    <span className="timeline-details-time">
                      {new Date(selectedSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSession.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    {selectedSession.topic && (
                      <p style={{ margin: '0 0 0.3rem 0' }}>
                        <strong>Topic:</strong> {selectedSession.topic}
                      </p>
                    )}
                    <p style={{ margin: '0 0 0.3rem 0' }}>
                      <strong>Duration:</strong> {selectedSession.durationMinutes}m ({selectedSession.activity})
                    </p>
                    {(selectedSession.questionsSolved !== undefined || selectedSession.unsolvedQuestions !== undefined) && (
                      <p style={{ margin: '0 0 0.3rem 0' }}>
                        <strong>Questions:</strong> {selectedSession.questionsSolved || 0} solved, {selectedSession.unsolvedQuestions || 0} incorrect
                      </p>
                    )}
                    {selectedSession.notes && (
                      <p style={{ margin: '0.3rem 0 0 0', fontStyle: 'italic', fontSize: '0.8rem', borderLeft: '2px solid var(--border)', paddingLeft: '0.4rem', color: 'var(--text-muted)' }}>
                        "{selectedSession.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ) : selectedDaySummary ? (
                <div className="timeline-details-grid">
                  <div className="timeline-details-header">
                    <span className="timeline-details-subj" style={{ color: 'var(--accent)' }}>{selectedDaySummary.date}</span>
                    <span className="timeline-details-time">{selectedDaySummary.hours.toFixed(1)}h studied</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <p style={{ margin: '0 0 0.3rem 0' }}>
                      <strong>Questions Solved:</strong> {selectedDaySummary.questions} Qs
                    </p>
                    <p style={{ margin: '0' }}>
                      <strong>Subjects:</strong> {selectedDaySummary.subjects.join(', ') || 'None'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="timeline-details-empty">
                  Click a colored timeline segment or grid block to view detailed logs here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .weekly-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1rem;
          height: 150px;
          align-items: flex-end;
        }
        .day-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          justify-content: flex-end;
        }
        .day-bar-container {
          width: 100%;
          background: var(--bg-card-hover);
          border-radius: 4px;
          height: 100px;
          position: relative;
          overflow: hidden;
        }
        .day-bar {
          position: absolute;
          bottom: 0;
          width: 100%;
          background: var(--accent);
          transition: height 0.3s ease;
        }
        .day-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .subject-item {
          background-color: var(--bg-color);
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid var(--border);
          margin-bottom: 0.75rem;
        }
        .subject-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .subj-name { font-weight: 700; }
        .subj-weight { 
          font-size: 0.75rem; 
          background: var(--accent); 
          padding: 2px 6px; 
          border-radius: 4px; 
          color: #fff;
        }
        .stat-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          margin-bottom: 0.4rem;
          color: var(--text-muted);
        }
        .progress-bar {
          height: 6px;
          background: var(--bg-card-hover);
          border-radius: 3px;
        }
        .progress-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 3px;
        }
        .revision-item {
          padding: 0.75rem;
          background: rgba(245, 166, 35, 0.1);
          border-left: 3px solid var(--accent);
          margin-bottom: 0.5rem;
        }
        .revision-subject { font-weight: 600; color: var(--accent); }
        .revision-topic { font-size: 0.9rem; margin-top: 0.2rem; }
        .revision-meta { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; }
        .timeline-item {
          padding: 0.75rem;
          border-left: 2px solid var(--border);
          margin-left: 0.5rem;
          position: relative;
        }
        .timeline-item::before {
          content: '';
          position: absolute;
          left: -6px;
          top: 15px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent);
        }
        .tl-time { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); }
        .tl-details { margin-top: 0.25rem; }
        .tl-subject { font-weight: 500; }
        .tl-activity { 
          font-size: 0.75rem; 
          background: var(--border); 
          padding: 1px 5px; 
          border-radius: 3px; 
          margin-left: 0.5rem; 
        }
        .hover-row:hover {
          background: var(--bg-card-hover) !important;
        }
      `}</style>
    </section>
  );
}
