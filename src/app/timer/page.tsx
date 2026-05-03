"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StorageAPI } from "@/lib/storage";
import { StudySession } from "@/lib/types";

export default function TimerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subject, setSubject] = useState("Subject");
  const [activity, setActivity] = useState("Activity");
  const [topic, setTopic] = useState("");
  const [isPomodoro, setIsPomodoro] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<"study" | "break">("study");
  const [cheatsheet, setCheatsheet] = useState("");

  const [activeStartTime, setActiveStartTime] = useState(0);
  const [lastStart, setLastStart] = useState<number | null>(null);
  const [accumulated, setAccumulated] = useState(0);

  const POMODORO_STUDY = 45 * 60;
  const POMODORO_BREAK = 10 * 60;

  const playBell = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 1.5);
      
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 2);
    } catch (e) {
      console.error("Audio API error:", e);
    }
  };

  useEffect(() => {
    const sub = searchParams.get("subject") || "General Aptitude";
    const act = searchParams.get("activity") || "Theory";
    const top = searchParams.get("topic") || "";
    const pomo = searchParams.get("pomodoro") === "true";

    setSubject(sub);
    setActivity(act);
    setTopic(top);
    setIsPomodoro(pomo);
    setActiveStartTime(Date.now());

    // Load cheatsheet
    const settings = StorageAPI.getSettings();
    const goal = settings.goals?.find(g => g.subject === sub);
    if (goal?.cheatsheet) {
      setCheatsheet(goal.cheatsheet);
    }

    setIsActive(true);
    setLastStart(Date.now());
    StorageAPI.setExtensionStudying(true, sub, Date.now());
  }, [searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && lastStart !== null) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - lastStart) / 1000) + accumulated;
        
        if (isPomodoro) {
          const limit = phase === "study" ? POMODORO_STUDY : POMODORO_BREAK;
          if (elapsed >= limit) {
            playBell();
            setPhase(p => p === "study" ? "break" : "study");
            setLastStart(Date.now());
            setAccumulated(0);
            setSeconds(0);
            return;
          }
        }
        
        setSeconds(elapsed);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, lastStart, accumulated]);

  const formatTime = () => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePauseResume = () => {
    if (isActive) {
      if (lastStart !== null) {
        setAccumulated(prev => prev + Math.floor((Date.now() - lastStart) / 1000));
      }
      setLastStart(null);
    } else {
      setLastStart(Date.now());
    }
    const newActive = !isActive;
    setIsActive(newActive);
    StorageAPI.setExtensionStudying(newActive, subject, Date.now());
  };

  const handleStop = () => {
    setIsActive(false);
    StorageAPI.setExtensionStudying(false);

    const durationMins = Math.max(1, Math.floor(seconds / 60));
    router.push(`/timer/complete?subject=${encodeURIComponent(subject)}&activity=${encodeURIComponent(activity)}&topic=${encodeURIComponent(topic)}&duration=${durationMins}`);
  };

  return (
    <div className="fullscreen-timer-container">
      <div className="timer-wrapper">
        <div className={`timer-radial-glow ${isActive ? "active" : ""}`}></div>
        
        <div className="timer-meta">
          <span className="timer-subject">{subject}</span>
          <span className="timer-activity" style={phase === "break" ? { background: "var(--danger)", color: "#fff" } : {}}>{phase === "break" ? "BREAK TIME" : activity}</span>
          {topic && <p className="timer-topic">Topic: {topic}</p>}
        </div>

        <div className="timer-clock">{formatTime()}</div>

        <div className="timer-controls-row">
          <button onClick={handlePauseResume} className="btn btn-primary btn-large">
            {isActive ? "PAUSE" : "RESUME"}
          </button>
          <button onClick={handleStop} className="btn btn-secondary btn-large" style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}>
            STOP
          </button>
        </div>

        {cheatsheet && (
          <div className="cheatsheet-widget card">
            <h3>Quick Revision Cheatsheet</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "1rem" }}>
              {cheatsheet}
            </pre>
          </div>
        )}
      </div>

      <style jsx global>{`
        .fullscreen-timer-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: var(--bg-color);
          padding: 2rem;
        }

        .timer-wrapper {
          position: relative;
          max-width: 600px;
          width: 100%;
          text-align: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 3.5rem;
          box-shadow: var(--shadow);
          z-index: 1;
        }

        .timer-radial-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(245, 166, 35, 0.15) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.8s ease;
          pointer-events: none;
          z-index: -1;
        }

        .timer-radial-glow.active {
          opacity: 1;
          animation: pulseTimer 3s infinite ease-in-out;
        }

        @keyframes pulseTimer {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }

        .timer-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .timer-subject {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.5px;
        }

        .timer-activity {
          font-size: 0.9rem;
          background: var(--accent);
          color: #000;
          padding: 4px 12px;
          border-radius: 20px;
          align-self: center;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .timer-topic {
          font-size: 1.1rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
        }

        .timer-clock {
          font-family: var(--font-mono);
          font-size: 6rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 2rem 0;
          text-shadow: 0 0 20px rgba(245, 166, 35, 0.2);
        }

        .timer-controls-row {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          margin-top: 1rem;
        }

        .btn-large {
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
          font-weight: 700;
          border-radius: 12px;
          min-width: 150px;
        }

        .cheatsheet-widget {
          margin-top: 3rem;
          text-align: left;
          background: var(--bg-card-hover);
        }

        .cheatsheet-widget h3 {
          font-size: 1rem;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
}
