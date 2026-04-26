"use client";

import React from "react";
import MotivationQuote from "./MotivationQuote";
import Timer from "./Timer";
import { StudySession, Settings } from "@/lib/types";
import { GATE_SUBJECTS, getDueRevisions } from "@/lib/subjects";

interface DashboardViewProps {
  sessions: StudySession[];
  settings: Settings;
}

export default function DashboardView({ sessions, settings }: DashboardViewProps) {
  const dueRevisions = getDueRevisions(sessions);

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

  return (
    <section className="tab-dashboard">
      <MotivationQuote />

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

          <div className="card session-log-card" style={{ marginTop: "1.5rem" }}>
            <div className="card-header">
              <h3>Recent Sessions</h3>
            </div>
            <div className="session-timeline">
              {sessions.slice(-5).reverse().map((s, i) => (
                <div key={i} className="timeline-item">
                  <div className="tl-time">{s.date}</div>
                  <div className="tl-details">
                    <span className="tl-subject">{s.subject}</span>
                    <span className="tl-activity">{s.activity}</span>
                  </div>
                </div>
              ))}
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
      `}</style>
    </section>
  );
}
