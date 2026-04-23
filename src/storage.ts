export interface StudySession {
  id: string;
  subject: string;
  activity: string;
  topic?: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  questionsSolved?: number;
  unsolvedDoubts?: string;
}

export interface ExtensionEscape {
  timestamp: number;
  subject?: string;
}

export interface SubjectGoal {
  subject: string;
  isActive: boolean;
  hoursTarget: number;
  frequencyDays: number;
  totalSyllabusHours?: number;
  totalQuestions?: number;
}

export interface Settings {
  examDate?: string;
  anthropicApiKey?: string;
  goals?: SubjectGoal[];
  whitelist?: string[];
  blacklist?: string[];
  currentTimerSession?: any;
}

export const StorageAPI = {
  getSessions(): StudySession[] {
    try {
      const email = localStorage.getItem('currentUser');
      const key = email ? `study_sessions_${email}` : 'study_sessions';
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSession(session: StudySession) {
    const email = localStorage.getItem('currentUser');
    const key = email ? `study_sessions_${email}` : 'study_sessions';
    const sessions = this.getSessions();
    sessions.push(session);
    localStorage.setItem(key, JSON.stringify(sessions));
  },

  getSettings(): Settings {
    try {
      const email = localStorage.getItem('currentUser');
      const key = email ? `study_settings_${email}` : 'study_settings';
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveSettings(settings: Settings) {
    const email = localStorage.getItem('currentUser');
    const key = email ? `study_settings_${email}` : 'study_settings';
    const current = this.getSettings();
    localStorage.setItem(key, JSON.stringify({ ...current, ...settings }));
  },

  setExtensionStudying(isStudying: boolean, subject?: string, startTime?: number) {
    const settings = this.getSettings();
    window.postMessage({
      type: 'FROM_PAGE',
      action: 'SET_STUDYING',
      payload: { 
        isStudying, 
        subject, 
        startTime,
        whitelist: settings.whitelist || [],
        blacklist: settings.blacklist || []
      }
    }, '*');
  },

  async getExtensionEscapes(): Promise<ExtensionEscape[]> {
    return new Promise(resolve => {
      const listener = (event: MessageEvent) => {
        if (event.source === window && event.data && event.data.type === 'FROM_EXTENSION' && event.data.action === 'ESCAPES_DATA') {
          window.removeEventListener('message', listener);
          resolve(event.data.payload || []);
        }
      };
      window.addEventListener('message', listener);
      window.postMessage({ type: 'FROM_PAGE', action: 'GET_ESCAPES' }, '*');
      
      // Fallback if extension not present
      setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve([]);
      }, 500);
    });
  },
  
  async getExtensionTotalStudyTime(): Promise<number> {
    return new Promise(resolve => {
      const listener = (event: MessageEvent) => {
        if (event.source === window && event.data && event.data.type === 'FROM_EXTENSION' && event.data.action === 'TOTAL_TIME_DATA') {
          window.removeEventListener('message', listener);
          resolve(event.data.payload);
        }
      };
      window.addEventListener('message', listener);
      window.postMessage({ type: 'FROM_PAGE', action: 'GET_TOTAL_TIME' }, '*');
      
      setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve(0);
      }, 500);
    });
  },
  
  async updateTotalStudyTime(minutes: number) {
    window.postMessage({
      type: 'FROM_PAGE',
      action: 'UPDATE_TOTAL_TIME',
      payload: { minutes }
    }, '*');
  }
};
