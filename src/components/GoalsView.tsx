"use client";

import React, { useState } from "react";
import { GATE_SUBJECTS } from "@/lib/subjects";
import { StorageAPI } from "@/lib/storage";
import { Settings, SubjectGoal } from "@/lib/types";

interface GoalsViewProps {
  settings: Settings;
  onUpdate: () => void;
}

export default function GoalsView({ settings, onUpdate }: GoalsViewProps) {
  const [goals, setGoals] = useState<SubjectGoal[]>(
    settings.goals && settings.goals.length > 0 
      ? settings.goals 
      : GATE_SUBJECTS.map(s => ({
          subject: s.name,
          isActive: false,
          hoursTarget: 5,
          frequencyDays: 7,
          totalSyllabusHours: 50,
          totalQuestions: 200,
          cheatsheet: ""
        }))
  );

  const handleToggle = (index: number) => {
    const newGoals = [...goals];
    newGoals[index].isActive = !newGoals[index].isActive;
    setGoals(newGoals);
  };

  const handleInputChange = (index: number, field: keyof SubjectGoal, value: any) => {
    const newGoals = [...goals];
    (newGoals[index] as any)[field] = value;
    setGoals(newGoals);
  };

  const handleSave = () => {
    StorageAPI.saveSettings({ goals });
    alert("Goals saved successfully!");
    onUpdate();
  };

  return (
    <div className="card goals-card">
      <h2>Set Custom Subject Goals</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Define which subjects you are actively studying, target hours per session, and how frequently.
      </p>
      
      <div className="goals-list">
        {goals.map((goal, i) => (
          <div key={goal.subject} className="goal-item">
            <label className="goal-info">
              <input 
                type="checkbox" 
                checked={goal.isActive} 
                onChange={() => handleToggle(i)} 
              />
              <span>{goal.subject}</span>
            </label>
            <div className="goal-controls">
              <div className="goal-row">
                <div className="goal-input-group">
                  <input 
                    type="number" 
                    className="input" 
                    value={goal.hoursTarget} 
                    onChange={(e) => handleInputChange(i, "hoursTarget", parseFloat(e.target.value))}
                    min="1" 
                  /> 
                  <span>hrs</span>
                </div>
                <span>/</span>
                <div className="goal-input-group">
                  <input 
                    type="number" 
                    className="input" 
                    value={goal.frequencyDays} 
                    onChange={(e) => handleInputChange(i, "frequencyDays", parseInt(e.target.value))}
                    min="1" 
                  /> 
                  <span>days</span>
                </div>
              </div>
              <div className="goal-row">
                <div className="goal-input-group">
                  <span>Tot. Hrs:</span>
                  <input 
                    type="number" 
                    className="input" 
                    value={goal.totalSyllabusHours || ""} 
                    onChange={(e) => handleInputChange(i, "totalSyllabusHours", parseFloat(e.target.value))}
                    placeholder="-" 
                  />
                </div>
                <div className="goal-input-group">
                  <span>Tot. Qs:</span>
                  <input 
                    type="number" 
                    className="input" 
                    value={goal.totalQuestions || ""} 
                    onChange={(e) => handleInputChange(i, "totalQuestions", parseInt(e.target.value))}
                    placeholder="-" 
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button onClick={handleSave} className="btn btn-primary" style={{ marginTop: "1.5rem", width: "100%" }}>
        Save Goals
      </button>

      <style jsx>{`
        .goal-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-card-hover);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          margin-bottom: 1rem;
          gap: 2rem;
        }
        .goal-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
        }
        .goal-info span {
          font-size: 1.2rem;
          font-weight: 600;
        }
        .goal-controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-width: 300px;
        }
        .goal-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .goal-input-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }
        .goal-input-group .input {
          width: 70px;
          margin: 0;
          padding: 0.4rem;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
