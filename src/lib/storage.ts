import { StudySession, Settings, MockTest, ExtensionEscape } from "./types";

const isClient = typeof window !== "undefined";

export const StorageAPI = {
  getCurrentUser(): string | null {
    if (!isClient) return null;
    return localStorage.getItem("currentUser");
  },

  getSessions(): StudySession[] {
    if (!isClient) return [];
    try {
      const email = this.getCurrentUser();
      const key = email ? `study_sessions_${email}` : "study_sessions";
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSession(session: StudySession) {
    if (!isClient) return;
    const email = this.getCurrentUser();
    const key = email ? `study_sessions_${email}` : "study_sessions";
    const sessions = this.getSessions();
    sessions.push(session);
    localStorage.setItem(key, JSON.stringify(sessions));
  },

  getSettings(): Settings {
    const defaults: Settings = {
      whitelist: ["localhost", "nptel.ac.in", "gateoverflow.in", "geeksforgeeks.org", "youtube.com", "drive.google.com", "ankiweb.net", "github.com"],
      blacklist: ["facebook.com", "instagram.com", "twitter.com", "reddit.com", "netflix.com"],
      goals: [],
    };

    if (!isClient) return defaults;

    try {
      const email = this.getCurrentUser();
      const key = email ? `study_settings_${email}` : "study_settings";
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);

      const users = JSON.parse(localStorage.getItem("users") || "{}");
      if (email && users[email] && users[email].preferences) {
        return { ...defaults, ...users[email].preferences };
      }
      
      return defaults;
    } catch {
      return defaults;
    }
  },

  saveSettings(settings: Partial<Settings>) {
    if (!isClient) return;
    const email = this.getCurrentUser();
    const key = email ? `study_settings_${email}` : "study_settings";
    const current = this.getSettings();
    localStorage.setItem(key, JSON.stringify({ ...current, ...settings }));
  },

  setExtensionStudying(isStudying: boolean, subject?: string, startTime?: number) {
    if (!isClient) return;
    const settings = this.getSettings();
    window.postMessage({
      type: "FROM_PAGE",
      action: "SET_STUDYING",
      payload: { 
        isStudying, 
        subject, 
        startTime,
        whitelist: settings.whitelist || [],
        blacklist: settings.blacklist || []
      }
    }, "*");
  },

  async getExtensionEscapes(): Promise<ExtensionEscape[]> {
    if (!isClient) return [];
    return new Promise(resolve => {
      const listener = (event: MessageEvent) => {
        if (event.source === window && event.data && event.data.type === "FROM_EXTENSION" && event.data.action === "ESCAPES_DATA") {
          window.removeEventListener("message", listener);
          resolve(event.data.payload || []);
        }
      };
      window.addEventListener("message", listener);
      window.postMessage({ type: "FROM_PAGE", action: "GET_ESCAPES" }, "*");
      
      setTimeout(() => {
        window.removeEventListener("message", listener);
        resolve([]);
      }, 500);
    });
  },

  getMockTests(): MockTest[] {
    if (!isClient) return [];
    try {
      const email = this.getCurrentUser();
      const key = email ? `mock_tests_${email}` : "mock_tests";
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMockTest(test: MockTest) {
    if (!isClient) return;
    const email = this.getCurrentUser();
    const key = email ? `mock_tests_${email}` : "mock_tests";
    const tests = this.getMockTests();
    tests.push(test);
    localStorage.setItem(key, JSON.stringify(tests));
  }
};
