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
}

export const StorageAPI = {
  getSessions(): StudySession[] {
    try {
      const data = localStorage.getItem('study_sessions');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSession(session: StudySession) {
    const sessions = this.getSessions();
    sessions.push(session);
    localStorage.setItem('study_sessions', JSON.stringify(sessions));
  },

  getSettings(): Settings {
    try {
      const data = localStorage.getItem('study_settings');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveSettings(settings: Settings) {
    const current = this.getSettings();
    localStorage.setItem('study_settings', JSON.stringify({ ...current, ...settings }));
  },

  setExtensionStudying(isStudying: boolean, subject?: string, startTime?: number) {
    window.postMessage({
      type: 'FROM_PAGE',
      action: 'SET_STUDYING',
      payload: { isStudying, subject, startTime }
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
