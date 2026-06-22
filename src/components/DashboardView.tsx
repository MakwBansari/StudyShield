"use client";

import React, { useState } from "react";
import MotivationQuote from "./MotivationQuote";
import Timer from "./Timer";
import { StudySession, Settings } from "@/lib/types";
import { GATE_SUBJECTS, getDueRevisions } from "@/lib/subjects";

interface DashboardViewProps {
  sessions: StudySession[];
  settings: Settings;
  userName?: string;
}

export default function DashboardView({ sessions, settings, userName }: DashboardViewProps) {
  const dueRevisions = getDueRevisions(sessions);

  const [timeFilter, setTimeFilter] = useState("weekly");
  const [subjectFilter, setSubjectFilter] = useState("All");

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

  // Filtered sessions logic
  const filteredSessions = sessions.filter(s => {
    // Subject filter
    if (subjectFilter !== "All" && s.subject !== subjectFilter) {
      return false;
    }

    // Time filter
    const now = Date.now();
    const sessionTime = s.startTime;
    
    const localNow = new Date();
    const startOfToday = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate()).getTime();

    if (timeFilter === "daily") {
      return sessionTime >= startOfToday;
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
      return true; // All time
    }
    
    return true;
  });

  const totalMins = filteredSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHours = totalMins / 60;
  const totalQs = filteredSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
  const sessionCount = filteredSessions.length;

  // Subject-wise metrics logic
  const getSubjectMetrics = (subjectName: string) => {
    const localNow = new Date();
    const startOfToday = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate()).getTime();
    
    const dW = new Date();
    dW.setDate(dW.getDate() - 6);
    const startOfWeekly = new Date(dW.getFullYear(), dW.getMonth(), dW.getDate()).getTime();
    
    const dM = new Date();
    dM.setDate(dM.getDate() - 29);
    const startOfMonthly = new Date(dM.getFullYear(), dM.getMonth(), dM.getDate()).getTime();
    
    const dY = new Date();
    dY.setDate(dY.getDate() - 364);
    const startOfYearly = new Date(dY.getFullYear(), dY.getMonth(), dY.getDate()).getTime();

    const subjSessions = sessions.filter(s => s.subject === subjectName);

    const getStats = (list: typeof sessions) => {
      const mins = list.reduce((acc, s) => acc + s.durationMinutes, 0);
      const qs = list.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
      return { hours: mins / 60, questions: qs };
    };

    return {
      daily: getStats(subjSessions.filter(s => s.startTime >= startOfToday)),
      weekly: getStats(subjSessions.filter(s => s.startTime >= startOfWeekly)),
      monthly: getStats(subjSessions.filter(s => s.startTime >= startOfMonthly)),
      yearly: getStats(subjSessions.filter(s => s.startTime >= startOfYearly)),
      total: getStats(subjSessions)
    };
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
          <div className="card revision-card">
            <h3>Due for Revision</h3>
            <div className="revision-list">
              {dueRevisions.length > 0 ? (
                dueRevisions.map((r, i) => (
                  <div key={i} className="revision-item">
                    <div className="revision-subject">{r.subject}</div>
                    <div className="revision-topic">Topic: {r.topic}</div>
                    <div className="revision-meta">Studied {r.daysAgo} days ago</div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No topics due for revision today. Great job!</p>
              )}
            </div>
          </div>

          {/* Interactive Activity Log Card */}
          <div className="card activity-log-card" style={{ marginTop: "1.5rem" }}>
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
                      <div style={{ fontSize: "0.75rem", color: "var(--success)", marginTop: "0.2rem", fontWeight: 500 }}>
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
