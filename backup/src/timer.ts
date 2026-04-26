import { StorageAPI } from './storage';

export class Timer {
  private intervalId: number | null = null;
  private secondsElapsed = 0;
  private isPomodoro = false;
  private pomodoroPhase: 'study' | 'break' = 'study';
  private pomodoroTimeLimit = 25 * 60; // 25 mins
  private breakTimeLimit = 5 * 60; // 5 mins
  
  private displayEl: HTMLElement;
  private glowEl: HTMLElement;
  private startSessionTime: number = 0;
  
  public onStopCallback?: (durationSecs: number, phase: 'study' | 'break') => void;
  public onPomodoroPhaseChange?: (newPhase: 'study' | 'break') => void;

  constructor(displayElId: string, glowElId: string) {
    this.displayEl = document.getElementById(displayElId)!;
    this.glowEl = document.getElementById(glowElId)!;
  }

  setPomodoroMode(enabled: boolean) {
    this.isPomodoro = enabled;
  }

  start() {
    if (this.intervalId) return;
    if (this.secondsElapsed === 0) {
      this.startSessionTime = Date.now();
      this.pomodoroPhase = 'study';
    }
    
    this.glowEl.classList.add('active');
    
    this.intervalId = window.setInterval(() => {
      this.secondsElapsed++;
      this.updateDisplay();

      // Check 4-hour limit roughly, or pomodoro
      if (this.isPomodoro) {
        const limit = this.pomodoroPhase === 'study' ? this.pomodoroTimeLimit : this.breakTimeLimit;
        if (this.secondsElapsed >= limit) {
          this.playBell();
          this.stop(); // auto-stop session
          // Swap phase
          this.pomodoroPhase = this.pomodoroPhase === 'study' ? 'break' : 'study';
          if (this.onPomodoroPhaseChange) {
            this.onPomodoroPhaseChange(this.pomodoroPhase);
          }
        }
      } else {
        // Just standard tracking, maybe alert at 4h
        if (this.secondsElapsed === 4 * 60 * 60) {
          this.playBell();
        }
      }
    }, 1000);
  }

  pause() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.glowEl.classList.remove('active');
  }

  stop() {
    this.pause();
    const duration = this.secondsElapsed;
    const phase = this.pomodoroPhase;
    
    if (this.onStopCallback && duration > 0) {
      this.onStopCallback(duration, phase);
    }
    
    this.secondsElapsed = 0;
    this.updateDisplay();
    this.pomodoroPhase = 'study';
  }

  private updateDisplay() {
    const h = Math.floor(this.secondsElapsed / 3600);
    const m = Math.floor((this.secondsElapsed % 3600) / 60);
    const s = this.secondsElapsed % 60;
    
    this.displayEl.textContent = 
      `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private playBell() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 1.5); // C4
      
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 2);
    } catch (e) {
      console.error('Audio API error:', e);
    }
  }
}
