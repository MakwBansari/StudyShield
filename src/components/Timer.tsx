"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTimer } from "@/hooks/useTimer";
import { GATE_SUBJECTS } from "@/lib/subjects";
import { StorageAPI } from "@/lib/storage";
import { Settings } from "@/lib/types";

interface TimerProps {
  settings?: Settings;
}

export default function Timer({ settings }: TimerProps) {
  const router = useRouter();
  const { 
    isActive, 
    isPomodoro, 
    phase, 
    setIsPomodoro, 
    start, 
    pause, 
    reset, 
    formatTime,
    seconds 
  } = useTimer();

  const activeSubjects = settings?.goals 
    ? settings.goals.filter(g => g.isActive).map(g => g.subject)
    : [];

  const subjectsToShow = activeSubjects.length > 0 ? activeSubjects : GATE_SUBJECTS.map(s => s.name);

  const [subject, setSubject] = useState(() => {
    return activeSubjects.length > 0 ? activeSubjects[0] : GATE_SUBJECTS[0].name;
  });
  const [activity, setActivity] = useState("Theory");
  const [topic, setTopic] = useState("");

  const handleStart = () => {
    router.push(`/timer?subject=${encodeURIComponent(subject)}&activity=${encodeURIComponent(activity)}&topic=${encodeURIComponent(topic)}&pomodoro=${isPomodoro}`);
  };

  const handlePause = () => {
    pause();
    StorageAPI.setExtensionStudying(false);
  };

  const handleStop = () => {
    if (seconds > 0) {
      StorageAPI.saveSession({
        id: crypto.randomUUID(),
        subject,
        activity,
        topic,
        startTime: Date.now() - seconds * 1000,
        endTime: Date.now(),
        durationMinutes: Math.floor(seconds / 60),
        date: new Date().toISOString().split("T")[0],
      });
    }
    reset();
    StorageAPI.setExtensionStudying(false);
  };

  return (
    <div className="card timer-card">
      <div className={`timer-glow ${isActive ? "active" : ""}`}></div>
      <div className="timer-display">{formatTime()}</div>
      
      <div className="timer-controls">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <select 
            className="input" 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)}
          >
            {subjectsToShow.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          
          <select 
            className="input" 
            value={activity} 
            onChange={(e) => setActivity(e.target.value)}
          >
            <option value="Theory">Theory</option>
            <option value="Notes">Notes</option>
            <option value="PYQs">PYQs</option>
            <option value="Revision">Revision</option>
            <option value="Problem Solving">Problem Solving</option>
            <option value="Mock Test">Mock Test</option>
          </select>

          <input 
            type="text" 
            className="input" 
            placeholder="Topic note (compulsory for spaced repetition)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          
          <div className="pomodoro-toggle">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={isPomodoro} 
                onChange={(e) => setIsPomodoro(e.target.checked)} 
              />
              Pomodoro Mode (25m / 5m)
            </label>
          </div>

          <div className="btn-group">
            {!isActive ? (
              <button onClick={handleStart} className="btn btn-primary">START</button>
            ) : (
              <button onClick={handlePause} className="btn btn-secondary">PAUSE</button>
            )}
            {seconds > 0 && (
              <button onClick={handleStop} className="btn btn-danger">STOP</button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .timer-card {
          position: relative;
          text-align: center;
          overflow: hidden;
          padding: 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
        }

        .timer-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(245, 166, 35, 0.2) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
        }

        .timer-glow.active {
          opacity: 1;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }

        .timer-display {
          font-family: var(--font-mono);
          font-size: 4rem;
          font-weight: 700;
          margin: 2rem 0;
          position: relative;
          z-index: 1;
          color: var(--text-main);
        }

        .timer-controls {
          position: relative;
          z-index: 1;
          text-align: left;
        }

        .btn-group {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn-group .btn {
          flex: 1;
          padding: 0.75rem;
        }

        .input {
          width: 100%;
          background: var(--bg-card-hover);
          border: 1px solid var(--border);
          color: var(--text-main);
          padding: 0.6rem 1rem;
          border-radius: 8px;
        }

        .pomodoro-toggle {
          margin: 0.5rem 0;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
