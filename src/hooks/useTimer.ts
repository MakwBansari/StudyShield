"use client";

import { useState, useEffect, useRef } from "react";

export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPomodoro, setIsPomodoro] = useState(false);
  const [phase, setPhase] = useState<"study" | "break">("study");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [accumulatedTime, setAccumulatedTime] = useState(0);

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
    if (isActive && startTime !== null) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000) + accumulatedTime;
        
        if (isPomodoro) {
          const limit = phase === "study" ? POMODORO_STUDY : POMODORO_BREAK;
          if (elapsed >= limit) {
            playBell();
            setPhase(p => p === "study" ? "break" : "study");
            setStartTime(Date.now());
            setAccumulatedTime(0);
            setSeconds(0);
            return;
          }
        }
        
        setSeconds(elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPomodoro, phase, startTime, accumulatedTime]);

  const start = () => {
    setStartTime(Date.now());
    setIsActive(true);
  };
  const pause = () => {
    if (startTime !== null) {
      setAccumulatedTime(prev => prev + Math.floor((Date.now() - startTime) / 1000));
    }
    setStartTime(null);
    setIsActive(false);
  };
  const reset = () => {
    setIsActive(false);
    setStartTime(null);
    setAccumulatedTime(0);
    setSeconds(0);
    setPhase("study");
  };

  const formatTime = () => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return {
    seconds,
    isActive,
    isPomodoro,
    phase,
    setIsPomodoro,
    start,
    pause,
    reset,
    formatTime,
  };
}
