"use client";

import React, { useState } from "react";
import { GATE_SUBJECTS } from "@/lib/subjects";
import { StorageAPI } from "@/lib/storage";
import { generateStudyPlan } from "@/lib/ai";
import { StudySession, Settings } from "@/lib/types";

export default function AIView({ sessions, settings }: { sessions: StudySession[], settings: Settings }) {
  const [apiKey, setApiKey] = useState(settings.anthropicApiKey || "");
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [examDate, setExamDate] = useState(settings.examDate || "");
  const [dailyHours, setDailyHours] = useState(4);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (apiKey) StorageAPI.saveSettings({ anthropicApiKey: apiKey });
      
      const progress: any = {};
      sessions.forEach(s => {
        if (!progress[s.subject]) progress[s.subject] = { hours: 0, qs: 0 };
        progress[s.subject].hours += (s.durationMinutes / 60);
        progress[s.subject].qs += (s.questionsSolved || 0);
      });

      const res = await generateStudyPlan(apiKey, weakSubjects, examDate, dailyHours, progress);
      setPlan(res.plan);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card ai-card">
      <h2>AI Study Plan Generator</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Generate a structured day-by-day study plan based on your weak subjects and available time.
      </p>
      
      <div className="ai-form">
        <label>Anthropic API Key (stored locally)</label>
        <input 
          type="password" 
          className="input" 
          value={apiKey} 
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..." 
        />
        
        <label>Weak Subjects (select multiple)</label>
        <select 
          multiple 
          className="input" 
          style={{ height: "120px" }}
          value={weakSubjects}
          onChange={(e) => setWeakSubjects(Array.from(e.target.selectedOptions, o => o.value))}
        >
          {GATE_SUBJECTS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        
        <label>Exam Date</label>
        <input 
          type="date" 
          className="input" 
          value={examDate} 
          onChange={(e) => setExamDate(e.target.value)} 
        />
        
        <label>Daily Study Hours Available</label>
        <input 
          type="number" 
          className="input" 
          value={dailyHours} 
          onChange={(e) => setDailyHours(parseInt(e.target.value))} 
          min="1" 
          max="16" 
        />

        <button 
          onClick={handleGenerate} 
          className="btn btn-primary" 
          style={{ width: "100%", marginTop: "1rem" }}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Plan"}
        </button>
      </div>

      {plan && (
        <div className="ai-plan-output">
          {plan.map((d: any) => (
            <div key={d.day} className="ai-day">
              <h4>Day {d.day}: {d.focus}</h4>
              <ul>
                {d.tasks.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .ai-form label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem; }
        .ai-plan-output { 
          margin-top: 2rem; 
          padding: 1.5rem; 
          background: var(--bg-card-hover); 
          border-radius: 12px; 
          border: 1px solid var(--border); 
        }
        .ai-day { margin-bottom: 1.5rem; }
        .ai-day h4 { color: var(--accent); margin-bottom: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;}
        .ai-day ul { list-style-type: disc; margin-left: 1.5rem; font-size: 0.9rem; }
      `}</style>
    </div>
  );
}
