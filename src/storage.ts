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
  unsolvedQuestions?: number;
  source?: string;
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
  cheatsheet?: string;
}

export interface MockTest {
  id: string;
  date: string;
  name: string;
  totalMarks: number;
  subjectBreakdown: Record<string, number>;
}

export interface Settings {
  examDate?: string;
  anthropicApiKey?: string;
  goals?: SubjectGoal[];
  whitelist?: string[];
  blacklist?: string[];
  currentTimerSession?: any;
  targetScore?: number;
  preferredStartTime?: string;
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
      if (data) return JSON.parse(data);

      // Default settings
      const defaults = {
        whitelist: ['localhost', 'nptel.ac.in', 'gateoverflow.in', 'geeksforgeeks.org', 'youtube.com', 'drive.google.com', 'ankiweb.net', 'github.com'],
        blacklist: ['facebook.com', 'instagram.com', 'twitter.com', 'reddit.com', 'netflix.com']
      };

      // Check if we have userData preferences to use as fallback
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      if (email && users[email] && users[email].preferences) {
        return { ...defaults, ...users[email].preferences };
      }
      
      return defaults;
    } catch {
      return { whitelist: [], blacklist: [] };
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
  },

  getMockTests(): MockTest[] {
    try {
      const email = localStorage.getItem('currentUser');
      const key = email ? `mock_tests_${email}` : 'mock_tests';
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMockTest(test: MockTest) {
    const email = localStorage.getItem('currentUser');
    const key = email ? `mock_tests_${email}` : 'mock_tests';
    const tests = this.getMockTests();
    tests.push(test);
    localStorage.setItem(key, JSON.stringify(tests));
  }
};
