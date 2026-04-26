"use client";

import React from "react";
import { StudySession, Settings } from "@/lib/types";
import { GATE_SUBJECTS } from "@/lib/subjects";

interface StatsViewProps {
  sessions: StudySession[];
  settings: Settings;
}

export default function StatsView({ sessions, settings }: StatsViewProps) {
  const calculateDailyScore = () => {
    const today = new Date().toISOString().split("T")[0];
    const todaySessions = sessions.filter(s => s.date === today);
    const totalMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    
    if (totalMinutes > 300) return "A+";
    if (totalMinutes > 240) return "A";
    if (totalMinutes > 180) return "B";
    if (totalMinutes > 120) return "C";
    if (totalMinutes > 60) return "D";
    return "F";
  };

  const getWeeklyHoursBySubject = () => {
    const subjectHours: Record<string, number> = {};
    GATE_SUBJECTS.forEach(s => subjectHours[s.name] = 0);
    
    sessions.forEach(s => {
      if (subjectHours[s.subject] !== undefined) {
        subjectHours[s.subject] += s.durationMinutes / 60;
      }
    });

    return Object.entries(subjectHours)
      .sort(([, a], [, b]) => b - a)
      .filter(([, h]) => h > 0);
  };

  const weeklyBySubj = getWeeklyHoursBySubject();

  return (
    <div className="stats-grid">
      <div className="card score-card">
        <h3>Daily Focus Score</h3>
        <div className="score-display">{calculateDailyScore()}</div>
      </div>
      
      <div className="card streak-card">
        <h3>Study Streak</h3>
        <div className="streak-display">1 Day</div>
      </div>

      <div className="card chart-card full-width">
        <h3>Total Hours per Subject</h3>
        <div className="horizontal-chart">
          {weeklyBySubj.map(([subj, hours]) => (
            <div key={subj} className="chart-row">
              <div className="chart-label">{subj}</div>
              <div className="chart-bar-container">
                <div 
                  className="chart-bar" 
                  style={{ width: `${Math.min(100, (hours / 20) * 100)}%` }}
                ></div>
              </div>
              <div className="chart-val">{hours.toFixed(1)}h</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .score-display { 
          font-size: 4rem; 
          font-weight: 800; 
          color: var(--accent); 
          text-align: center;
          margin-top: 1rem;
        }
        .streak-display { 
          font-size: 3rem; 
          font-weight: 700; 
          text-align: center;
          margin-top: 1rem;
        }
        .horizontal-chart {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }
        .chart-row {
          display: flex;
          align-items: center;
        }
        .chart-label { width: 150px; font-size: 0.85rem; }
        .chart-bar-container { 
          flex: 1; 
          height: 12px; 
          background: var(--bg-card-hover); 
          border-radius: 6px; 
          margin: 0 1.5rem; 
          overflow: hidden;
        }
        .chart-bar { height: 100%; background: var(--accent); }
        .chart-val { width: 50px; font-family: var(--font-mono); font-size: 0.85rem; text-align: right; }
      `}</style>
    </div>
  );
}
