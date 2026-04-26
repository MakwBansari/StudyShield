"use client";

import React, { useState } from "react";
import { GATE_SUBJECTS } from "@/lib/subjects";
import { StorageAPI } from "@/lib/storage";
import { MockTest } from "@/lib/types";

export default function MockView({ tests, onUpdate }: { tests: MockTest[], onUpdate: () => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});

  const handleScoreChange = (subj: string, val: string) => {
    setScores({ ...scores, [subj]: parseFloat(val) || 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalMarks = Object.values(scores).reduce((acc, v) => acc + v, 0);
    StorageAPI.saveMockTest({
      id: crypto.randomUUID(),
      name,
      date,
      totalMarks,
      subjectBreakdown: scores,
    });
    alert(`Test saved! Total: ${totalMarks.toFixed(2)}`);
    setName("");
    setDate("");
    setScores({});
    onUpdate();
  };

  return (
    <div className="stats-grid">
      <div className="card full-width">
        <h3>Log New Mock Test</h3>
        <form onSubmit={handleSubmit} className="mock-form">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label>Test Name</label>
              <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label>Date</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          
          <div className="subject-scores-grid">
            {GATE_SUBJECTS.map(s => (
              <div key={s.name} className="score-input">
                <label>{s.name}</label>
                <input 
                  type="number" 
                  step="0.25" 
                  className="input" 
                  value={scores[s.name] || ""} 
                  onChange={(e) => handleScoreChange(s.name, e.target.value)} 
                />
              </div>
            ))}
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ marginTop: "1.5rem", width: "100%" }}>Save Mock Test</button>
        </form>
      </div>

      <div className="card full-width">
        <h3>Performance Trend</h3>
        <div className="trend-list">
          {tests.length > 0 ? (
            tests.slice(-5).reverse().map(t => (
              <div key={t.id} className="trend-item">
                <span>{t.date} - {t.name}</span>
                <span className="trend-score">{t.totalMarks.toFixed(2)} Marks</span>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No mock tests logged yet.</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .mock-form label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; }
        .subject-scores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .score-input { background: var(--bg-card-hover); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); }
        .trend-item { 
          display: flex; 
          justify-content: space-between; 
          padding: 1rem; 
          border-bottom: 1px solid var(--border);
        }
        .trend-score { font-weight: 700; color: var(--accent); }
      `}</style>
    </div>
  );
}
