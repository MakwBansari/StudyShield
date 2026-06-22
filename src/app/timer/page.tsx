"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StorageAPI } from "@/lib/storage";
import { StudySession } from "@/lib/types";

export default function TimerPage() {
  return (
    <Suspense fallback={
      <div className="fullscreen-timer-container">
        <p style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>Initializing study timer...</p>
      </div>
    }>
      <TimerPageContent />
    </Suspense>
  );
}

function TimerPageContent() {
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

  const POMODORO_CYCLE = 55 * 60;
  const POMODORO_STUDY = 45 * 60;

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

  const playAlarm = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playBeep = (time: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(987.77, time); // High-pitched, clear alert tone (B5)
        gain.gain.setValueAtTime(0.8, time); // Loud alert volume (0.8 instead of 0.2)
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3); // Longer decay (0.3s)
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.35);
      };

      for (let i = 0; i < 5; i++) { // 5 distinct beeps
        playBeep(ctx.currentTime + i * 0.5); // Spaced 0.5s apart
      }
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
    const handleUnload = () => {
      StorageAPI.setExtensionStudying(false);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  useEffect(() => {
    let worker: Worker | null = null;

    if (isActive && lastStart !== null) {
      const workerCode = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timerId) clearInterval(timerId);
            timerId = setInterval(() => {
              self.postMessage('tick');
            }, 1000);
          } else if (e.data === 'stop') {
            if (timerId) {
              clearInterval(timerId);
              timerId = null;
            }
          }
        };
      `;
      try {
        const blob = new Blob([workerCode], { type: "application/javascript" });
        worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = () => {
          const elapsed = Math.floor((Date.now() - lastStart) / 1000) + accumulated;
          
          if (isPomodoro) {
            const currentPhase = (elapsed % POMODORO_CYCLE) < POMODORO_STUDY ? "study" : "break";
            if (currentPhase !== phase) {
              if (currentPhase === "break") {
                playAlarm();
              } else {
                playBell();
              }
              setPhase(currentPhase);
            }
          }
          
          setSeconds(elapsed);
        };
        
        worker.postMessage("start");
      } catch (e) {
        console.error("Web Worker error, falling back to setInterval:", e);
        // Fallback to regular setInterval if Web Workers are not supported or blocked
        const intervalId = setInterval(() => {
          const elapsed = Math.floor((Date.now() - lastStart) / 1000) + accumulated;
          if (isPomodoro) {
            const currentPhase = (elapsed % POMODORO_CYCLE) < POMODORO_STUDY ? "study" : "break";
            if (currentPhase !== phase) {
              if (currentPhase === "break") {
                playAlarm();
              } else {
                playBell();
              }
              setPhase(currentPhase);
            }
          }
          setSeconds(elapsed);
        }, 1000);
        
        return () => clearInterval(intervalId);
      }
    }

    return () => {
      if (worker) {
        worker.postMessage("stop");
        worker.terminate();
      }
    };
  }, [isActive, lastStart, accumulated, isPomodoro, phase]);

  // Sync timer instantly on visibility focus to prevent visual lag
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isActive && lastStart !== null) {
        const elapsed = Math.floor((Date.now() - lastStart) / 1000) + accumulated;
        setSeconds(elapsed);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive, lastStart, accumulated]);

  const [ambience, setAmbience] = useState<"none" | "white" | "pink" | "brown" | "library" | "gamma">("none");
  const audioCtxRef = React.useRef<any>(null);
  const noiseSourceRef = React.useRef<any>(null);

  useEffect(() => {
    if (isActive) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const gain = ctx.createGain();
      gain.gain.value = 0.05;

      const nodes: any[] = [];

      if (ambience === "gamma") {
        // Binaural Beats 40Hz Gamma with deep carrier tone for richness
        const merger = ctx.createChannelMerger(2);
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        const gL = ctx.createGain();
        const gR = ctx.createGain();
        
        oscL.type = "sine";
        oscR.type = "sine";
        oscL.frequency.value = 160;
        oscR.frequency.value = 200; // 40Hz difference
        
        gL.gain.value = 0.08;
        gR.gain.value = 0.08;
        
        oscL.connect(gL);
        oscR.connect(gR);
        gL.connect(merger, 0, 0);
        gR.connect(merger, 0, 1);
        
        // Deep backing hum (50Hz) to sit below the beats
        const backOsc = ctx.createOscillator();
        const backGain = ctx.createGain();
        backOsc.type = "sine";
        backOsc.frequency.value = 50;
        backGain.gain.value = 0.04;
        backOsc.connect(backGain);
        backGain.connect(gain);
        
        merger.connect(gain);
        
        oscL.start();
        oscR.start();
        backOsc.start();
        nodes.push(oscL, oscR, backOsc);
      } else if (ambience === "none") {
        // Create an inaudible silent node (oscillator at 1Hz with 0.001 gain)
        // to prevent Chrome/Safari from throttling the background tab
        const osc = ctx.createOscillator();
        const silentGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1, ctx.currentTime);
        silentGain.gain.setValueAtTime(0.001, ctx.currentTime);
        osc.connect(silentGain);
        silentGain.connect(gain);
        osc.start();
        nodes.push(osc);
      } else {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        if (ambience === "white") {
          // True flat-spectrum White Noise
          for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.5;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          noise.loop = true;
          gain.gain.value = 0.02;
          noise.connect(gain);
          noise.start();
          nodes.push(noise);
        } else if (ambience === "pink") {
          // True 1/f Pink Noise (Paul Kellet's refined algorithm)
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            b6 = white * 0.115926;
            output[i] = pink * 0.11; 
          }
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          noise.loop = true;
          gain.gain.value = 0.08;
          noise.connect(gain);
          noise.start();
          nodes.push(noise);
        } else if (ambience === "brown") {
          // True 1/f^2 Brown Noise (red noise integration)
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; 
          }
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          noise.loop = true;
          gain.gain.value = 0.15;
          noise.connect(gain);
          noise.start();
          nodes.push(noise);
        } else if (ambience === "library") {
          // Library Atmosphere: Deep ventilation hum + procedural typing clicks + paper page turns
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.015 * white)) / 1.015;
            lastOut = output[i];
            output[i] *= 3.5;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          noise.loop = true;

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 150; // Deep air vent rumble

          gain.gain.value = 0.12;
          noise.connect(filter);
          filter.connect(gain);
          noise.start();
          nodes.push(noise);

          // Page flip synthesizer
          const playPageFlip = () => {
            const pbSize = 0.5 * ctx.sampleRate;
            const pb = ctx.createBuffer(1, pbSize, ctx.sampleRate);
            const pd = pb.getChannelData(0);
            for (let i = 0; i < pbSize; i++) {
              pd[i] = Math.random() * 2 - 1;
            }
            const pNoise = ctx.createBufferSource();
            pNoise.buffer = pb;

            const pFilter = ctx.createBiquadFilter();
            pFilter.type = "bandpass";
            pFilter.frequency.setValueAtTime(700 + Math.random() * 200, ctx.currentTime);
            pFilter.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.4);
            pFilter.Q.setValueAtTime(2.0, ctx.currentTime);

            const pGain = ctx.createGain();
            pGain.gain.setValueAtTime(0.001, ctx.currentTime);
            pGain.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 0.1);
            pGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.48);

            pNoise.connect(pFilter);
            pFilter.connect(pGain);
            pGain.connect(ctx.destination);

            pNoise.start();
            pNoise.stop(ctx.currentTime + 0.5);
          };

          // Keyboard typing simulation (irregular bursts)
          const typingInterval = setInterval(() => {
            if (Math.random() > 0.45) {
              const keysCount = Math.floor(Math.random() * 3) + 1;
              for (let k = 0; k < keysCount; k++) {
                const delay = k * (0.12 + Math.random() * 0.08);
                setTimeout(() => {
                  try {
                    if (audioCtxRef.current && ambience === "library") {
                      const osc = ctx.createOscillator();
                      const clickGain = ctx.createGain();
                      const clickFilter = ctx.createBiquadFilter();

                      osc.type = "triangle";
                      osc.frequency.setValueAtTime(500 + Math.random() * 300, ctx.currentTime);

                      clickFilter.type = "bandpass";
                      clickFilter.frequency.setValueAtTime(1000, ctx.currentTime);
                      clickFilter.Q.setValueAtTime(6.0, ctx.currentTime);

                      clickGain.gain.setValueAtTime(0.003 + Math.random() * 0.003, ctx.currentTime);
                      clickGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

                      osc.connect(clickFilter);
                      clickFilter.connect(clickGain);
                      clickGain.connect(ctx.destination);
                      osc.start();
                      osc.stop(ctx.currentTime + 0.03);
                    }
                  } catch {}
                }, delay * 1000);
              }
            }
          }, 2000);

          // Page turning simulation (very sparse)
          const pageInterval = setInterval(() => {
            if (Math.random() > 0.65) {
              try {
                playPageFlip();
              } catch {}
            }
          }, 7000);

          (window as any)._audioIntervals = [typingInterval, pageInterval];
        }
      }

      gain.connect(ctx.destination);
      noiseSourceRef.current = nodes;
    } else {
      cleanupAudio();
    }
    
    return cleanupAudio;
  }, [ambience, isActive]);

  const cleanupAudio = () => {
    if (noiseSourceRef.current) {
      noiseSourceRef.current.forEach((n: any) => {
        try { n.stop(); } catch(e) {}
      });
      noiseSourceRef.current = null;
    }
    if ((window as any)._audioIntervals) {
      (window as any)._audioIntervals.forEach((id: any) => clearInterval(id));
      (window as any)._audioIntervals = null;
    }
    if ((window as any)._audioInterval) {
      clearInterval((window as any)._audioInterval);
      (window as any)._audioInterval = null;
    }
  };

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

        <div className="ambience-controls">
          <p>Study Ambience</p>
          <div className="ambience-toggles">
            <button className={`btn-small ${ambience === "none" ? "active" : ""}`} onClick={() => setAmbience("none")}>Off</button>
            <button className={`btn-small ${ambience === "white" ? "active" : ""}`} onClick={() => setAmbience("white")}>White</button>
            <button className={`btn-small ${ambience === "pink" ? "active" : ""}`} onClick={() => setAmbience("pink")}>Pink</button>
            <button className={`btn-small ${ambience === "brown" ? "active" : ""}`} onClick={() => setAmbience("brown")}>Brown</button>
            <button className={`btn-small ${ambience === "library" ? "active" : ""}`} onClick={() => setAmbience("library")}>📚 Library</button>
            <button className={`btn-small ${ambience === "gamma" ? "active" : ""}`} onClick={() => setAmbience("gamma")}>🧠 40Hz Gamma</button>
          </div>
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

        .ambience-controls {
          margin-top: 2.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }
        
        .ambience-controls p {
          font-size: 0.8rem;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 0.8rem;
        }

        .ambience-toggles {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .ambience-toggles .btn-small {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          cursor: pointer;
        }

        .ambience-toggles .btn-small.active {
          background: var(--bg-card-hover);
          color: var(--accent);
          border-color: var(--accent);
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
