"use client";

import React, { useEffect, useState } from "react";
import { Settings, SubjectGoal } from "@/lib/types";

interface MorningBriefingProps {
  settings: Settings;
  onDismiss: (action: "revise" | "study") => void;
  activeSubject?: string;
  examDate?: string;
}

export default function MorningBriefing({ settings, onDismiss, activeSubject, examDate }: MorningBriefingProps) {
  const [tasks, setTasks] = useState<{ overdue: any[], today: any[], tomorrow: any[] } | null>(null);

  useEffect(() => {
    // Only process if we have goals
    if (!settings.goals) return;

    const completedSubjects = settings.goals.filter(g => g.state === "completed");
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const overdue: any[] = [];
    const today: any[] = [];
    const tomorrowList: any[] = [];

    completedSubjects.forEach(sub => {
      const completionDate = sub.completionDate || Date.now(); // fallback to now if missing
      const history = sub.revisionHistory || [];
      
      let nextRound = history.length + 1;
      let dueDate = new Date(completionDate);
      
      if (history.length === 0) {
        dueDate.setDate(dueDate.getDate() + 1); // Round 1
      } else if (history.length === 1) {
        dueDate = new Date(history[0]);
        dueDate.setDate(dueDate.getDate() + 3); // Round 2
      } else if (history.length === 2) {
        dueDate = new Date(history[1]);
        dueDate.setDate(dueDate.getDate() + 7); // Round 3
      } else {
        dueDate = new Date(history[history.length - 1]);
        dueDate.setDate(dueDate.getDate() + 15); // Round 4+
      }

      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const task = {
        subject: sub.subject,
        round: nextRound,
        diffDays
      };

      if (diffDays > 0) {
        overdue.push(task);
      } else if (diffDays === 0) {
        today.push(task);
      } else if (diffDays === -1) {
        tomorrowList.push(task);
      }
    });

    setTasks({ overdue, today, tomorrow: tomorrowList });
  }, [settings]);

  if (!tasks) return null;

  const daysToExam = examDate ? Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : '--';

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div className="briefing-overlay animate-fade-in">
      <div className="briefing-card">
        <h1 className="briefing-title">☀️ GATE BRIEFING — {todayStr}</h1>
        <hr className="divider" />
        
        <div className="task-list">
          {tasks.overdue.map(t => (
            <div key={t.subject} className="task overdue">
              <span className="dot red">🔴</span>
              <span className="label">URGENT</span>
              <span className="desc">{t.subject} — Round {t.round} overdue by {t.diffDays} day{t.diffDays > 1 ? 's' : ''}</span>
            </div>
          ))}
          
          {tasks.today.map(t => (
            <div key={t.subject} className="task today">
              <span className="dot yellow">🟡</span>
              <span className="label">TODAY</span>
              <span className="desc">{t.subject} — Round {t.round} due (Notes & Mistakes)</span>
            </div>
          ))}

          {tasks.tomorrow.map(t => (
            <div key={t.subject} className="task tomorrow">
              <span className="dot green">🟢</span>
              <span className="label">TOMORROW</span>
              <span className="desc">{t.subject} — Round {t.round}</span>
            </div>
          ))}

          {tasks.overdue.length === 0 && tasks.today.length === 0 && tasks.tomorrow.length === 0 && (
            <div className="task empty">
              <span className="dot green">🟢</span>
              <span className="label">ALL CLEAR</span>
              <span className="desc">No revisions due today. Keep pushing!</span>
            </div>
          )}
        </div>

        <div className="footer-info">
          <p>New study: <strong>{activeSubject || "None"}</strong> (your active subject)</p>
          <p>Exam in: <strong>{daysToExam} days</strong></p>
        </div>

        <hr className="divider" />

        <div className="actions">
          <button className="btn btn-primary" onClick={() => onDismiss('revise')} disabled={tasks.overdue.length === 0 && tasks.today.length === 0}>
            Start with Revision
          </button>
          <button className="btn btn-secondary" onClick={() => onDismiss('study')}>
            Go to {activeSubject || "Notes"}
          </button>
        </div>
      </div>
    </div>
  );
}
