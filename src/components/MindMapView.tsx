"use client";

import React, { useState } from "react";
import { Settings, SubjectGoal } from "@/lib/types";
import { StorageAPI } from "@/lib/storage";

interface MindMapViewProps {
  settings: Settings;
  onUpdate: () => void;
}

const ALL_SUBJECTS = [
  "Programming & Data Structures",
  "Algorithms",
  "Theory of Computation",
  "Compiler Design",
  "Operating Systems",
  "Database Management Systems",
  "Computer Networks",
  "Digital Logic",
  "Computer Organization & Architecture",
  "Discrete Mathematics",
  "Engineering Mathematics",
  "General Aptitude"
];

// Layout positions (x, y percentages)
const NODE_POSITIONS: Record<string, { top: string, left: string }> = {
  "Programming & Data Structures": { top: "20%", left: "50%" },
  "Algorithms": { top: "35%", left: "65%" },
  "Theory of Computation": { top: "50%", left: "80%" },
  "Compiler Design": { top: "65%", left: "65%" },
  "Operating Systems": { top: "80%", left: "50%" },
  "Database Management Systems": { top: "65%", left: "35%" },
  "Computer Networks": { top: "50%", left: "20%" },
  "Digital Logic": { top: "35%", left: "35%" },
  "Computer Organization & Architecture": { top: "50%", left: "50%" },
  "Discrete Mathematics": { top: "20%", left: "20%" },
  "Engineering Mathematics": { top: "20%", left: "80%" },
  "General Aptitude": { top: "80%", left: "20%" },
};

const EDGES = [
  ["Engineering Mathematics", "Discrete Mathematics"],
  ["Discrete Mathematics", "Programming & Data Structures"],
  ["Discrete Mathematics", "Theory of Computation"],
  ["Programming & Data Structures", "Algorithms"],
  ["Digital Logic", "Computer Organization & Architecture"],
  ["Theory of Computation", "Compiler Design"],
  ["Operating Systems", "Computer Networks"],
  ["Database Management Systems", "Computer Networks"]
];

export default function MindMapView({ settings, onUpdate }: MindMapViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const getSubjectStatus = (subject: string) => {
    const goal = settings.goals?.find(g => g.subject === subject);
    if (!goal || !goal.state || goal.state === "not_studied") return { status: "not_studied", color: "rgba(255,255,255,0.3)", label: "Not Studied" };
    if (goal.state === "ongoing") return { status: "ongoing", color: "#00d2ff", label: "Ongoing" };
    
    // It's completed. Let's check revision.
    const history = goal.revisionHistory || [];
    if (history.length >= 4) return { status: "mastered", color: "#1dd1a1", label: "Mastered" };
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const completionDate = goal.completionDate || Date.now();
    let dueDate = new Date(completionDate);
    
    if (history.length === 0) dueDate.setDate(dueDate.getDate() + 1);
    else if (history.length === 1) { dueDate = new Date(history[0]); dueDate.setDate(dueDate.getDate() + 3); }
    else if (history.length === 2) { dueDate = new Date(history[1]); dueDate.setDate(dueDate.getDate() + 7); }
    else { dueDate = new Date(history[2]); dueDate.setDate(dueDate.getDate() + 15); }
    
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return { status: "overdue", color: "#ff7675", label: `Overdue (${diffDays} days)` };
    if (diffDays === 0) return { status: "due", color: "#feca57", label: "Due Today" };
    
    return { status: "learned", color: "#a29bfe", label: `Learned (Next: ${dueDate.toLocaleDateString()})` };
  };

  const handleLogRevision = (subject: string) => {
    const goals = settings.goals ? [...settings.goals] : [];
    const idx = goals.findIndex(g => g.subject === subject);
    if (idx >= 0) {
      const history = goals[idx].revisionHistory || [];
      goals[idx].revisionHistory = [...history, Date.now()];
      StorageAPI.saveSettings({ goals });
      onUpdate();
    }
  };

  const handleMarkState = (subject: string, state: "ongoing" | "completed" | "not_studied") => {
    let goals = settings.goals ? [...settings.goals] : [];
    const idx = goals.findIndex(g => g.subject === subject);
    if (idx >= 0) {
      goals[idx].state = state;
      if (state === "completed" && !goals[idx].completionDate) {
        goals[idx].completionDate = Date.now();
      }
    } else {
      goals.push({
        subject, isActive: false, hoursTarget: 0, frequencyDays: 0, state,
        completionDate: state === "completed" ? Date.now() : undefined
      });
    }
    StorageAPI.saveSettings({ goals });
    onUpdate();
  };

  return (
    <div className="mindmap-container animate-fade-in">
      <div className="map-area">
        {/* SVG Layer for Connections */}
        <svg className="connections-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {EDGES.map(([from, to], i) => {
            const start = NODE_POSITIONS[from];
            const end = NODE_POSITIONS[to];
            if (!start || !end) return null;
            
            const fromStatus = getSubjectStatus(from);
            const toStatus = getSubjectStatus(to);
            const isCompleted = fromStatus.status !== "not_studied" && toStatus.status !== "not_studied";
            
            return (
              <line 
                key={i}
                x1={start.left} y1={start.top}
                x2={end.left} y2={end.top}
                stroke={isCompleted ? "var(--accent)" : "rgba(255,255,255,0.1)"}
                strokeWidth={isCompleted ? "2" : "1"}
                strokeDasharray={isCompleted ? "0" : "5,5"}
                filter={isCompleted ? "url(#glow)" : ""}
                style={{ transition: 'all 0.5s ease' }}
              />
            );
          })}
        </svg>
        
        {ALL_SUBJECTS.map((subject, idx) => {
          const { status, color } = getSubjectStatus(subject);
          const pos = NODE_POSITIONS[subject] || { top: "50%", left: "50%" };
          
          return (
            <div 
              key={subject} 
              className={`node ${status}`}
              style={{ 
                top: pos.top, 
                left: pos.left, 
                borderColor: color, 
                boxShadow: `0 0 20px ${color}33, inset 0 0 10px ${color}22`,
                animationDelay: `${idx * 0.1}s`
              }}
              onClick={() => setSelectedSubject(subject)}
            >
              <div className="node-label">{subject}</div>
              {status !== 'not_studied' && (
                <div className="status-dot" style={{ backgroundColor: color }}></div>
              )}
            </div>
          );
        })}
      </div>

      <div className="legend">
        <div className="legend-item"><span className="dot" style={{background: 'rgba(255,255,255,0.3)'}}></span> Not Studied</div>
        <div className="legend-item"><span className="dot" style={{background: '#00d2ff', boxShadow: '0 0 8px #00d2ff'}}></span> Ongoing</div>
        <div className="legend-item"><span className="dot" style={{background: '#a29bfe', boxShadow: '0 0 8px #a29bfe'}}></span> Completed</div>
        <div className="legend-item"><span className="dot" style={{background: '#feca57', boxShadow: '0 0 8px #feca57'}}></span> Due Today</div>
        <div className="legend-item"><span className="dot fading" style={{background: '#ff7675'}}></span> Overdue</div>
        <div className="legend-item"><span className="dot" style={{background: '#1dd1a1', boxShadow: '0 0 8px #1dd1a1'}}></span> Mastered</div>
      </div>

      {selectedSubject && (
        <div className="modal-overlay" onClick={() => setSelectedSubject(null)}>
          <div className="modal-content animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedSubject}</h3>
              <button className="close-btn" onClick={() => setSelectedSubject(null)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="status-badge" style={{ backgroundColor: getSubjectStatus(selectedSubject).color + '22', color: getSubjectStatus(selectedSubject).color, borderColor: getSubjectStatus(selectedSubject).color }}>
                {getSubjectStatus(selectedSubject).label}
              </div>
              
              <div className="history">
                <h4>Revision History:</h4>
                <ul>
                  {(settings.goals?.find(g => g.subject === selectedSubject)?.revisionHistory || []).map((ts, i) => (
                    <li key={i}>
                      <span className="round">R{i + 1}</span>
                      <span className="date">{new Date(ts).toLocaleString()}</span>
                    </li>
                  ))}
                  {(settings.goals?.find(g => g.subject === selectedSubject)?.revisionHistory || []).length === 0 && <li className="empty">No revisions yet.</li>}
                </ul>
              </div>

              <div className="actions">
                <button className="btn btn-primary full-width" onClick={() => handleLogRevision(selectedSubject)}>
                  Log Revision Session Now
                </button>
                <div className="state-toggles">
                  <button className={settings.goals?.find(g => g.subject === selectedSubject)?.state === 'not_studied' ? 'active' : ''} onClick={() => handleMarkState(selectedSubject, 'not_studied')}>Reset</button>
                  <button className={settings.goals?.find(g => g.subject === selectedSubject)?.state === 'ongoing' ? 'active' : ''} onClick={() => handleMarkState(selectedSubject, 'ongoing')}>Ongoing</button>
                  <button className={settings.goals?.find(g => g.subject === selectedSubject)?.state === 'completed' ? 'active' : ''} onClick={() => handleMarkState(selectedSubject, 'completed')}>Completed</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

