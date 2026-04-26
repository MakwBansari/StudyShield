"use client";

import { useState, useEffect, useRef } from "react";

export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPomodoro, setIsPomodoro] = useState(false);
  const [phase, setPhase] = useState<"study" | "break">("study");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const POMODORO_STUDY = 25 * 60;
  const POMODORO_BREAK = 5 * 60;

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
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          const nextS = s + 1;
          if (isPomodoro) {
            const limit = phase === "study" ? POMODORO_STUDY : POMODORO_BREAK;
            if (nextS >= limit) {
              playBell();
              setPhase(phase === "study" ? "break" : "study");
              return 0;
            }
          }
          return nextS;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPomodoro, phase]);

  const start = () => setIsActive(true);
  const pause = () => setIsActive(false);
  const reset = () => {
    setIsActive(false);
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
