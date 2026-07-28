import { StudySession, Settings, MockTest, ExtensionEscape } from "./types";

const isClient = typeof window !== "undefined";

type StoredUser = {
  name: string;
  email: string;
  password: string;
  preferences?: Partial<Settings>;
};

export const StorageAPI = {
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  },

  getUsers(): Record<string, StoredUser> {
    if (!isClient) return {};
    try {
      const raw = localStorage.getItem("users");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  saveUsers(users: Record<string, StoredUser>) {
    if (!isClient) return;
    localStorage.setItem("users", JSON.stringify(users));
  },

  registerUser(input: { name: string; email: string; password: string; preferences?: Partial<Settings> }): { ok: boolean; message?: string } {
    if (!isClient) return { ok: false, message: "Client storage unavailable." };
    const email = this.normalizeEmail(input.email);
    const name = input.name.trim();
    const password = input.password;

    if (!email || !password) {
      return { ok: false, message: "Email and password are required." };
    }

    const users = this.getUsers();
    if (users[email]) {
      return { ok: false, message: "An account already exists with this email." };
    }

    users[email] = {
      name,
      email,
      password,
      preferences: input.preferences || {}
    };
    this.saveUsers(users);
    return { ok: true };
  },

  authenticateUser(emailInput: string, password: string): { ok: boolean; message?: string } {
    if (!isClient) return { ok: false, message: "Client storage unavailable." };
    const email = this.normalizeEmail(emailInput);
    const users = this.getUsers();
    const account = users[email];

    if (!account) {
      const legacyUser = localStorage.getItem("user");
      if (legacyUser) {
        try {
          const parsed = JSON.parse(legacyUser);
          if (this.normalizeEmail(parsed?.email || "") === email) {
            users[email] = {
              name: parsed?.name || "",
              email,
              password,
              preferences: this.getSettings()
            };
            this.saveUsers(users);
            return { ok: true };
          }
        } catch {
          return { ok: false, message: "No account found for this email. Please sign up first." };
        }
      }
      return { ok: false, message: "No account found for this email. Please sign up first." };
    }

    if (account.password !== password) {
      return { ok: false, message: "Invalid password." };
    }

    return { ok: true };
  },

  setCurrentUser(emailInput: string) {
    if (!isClient) return;
    const email = this.normalizeEmail(emailInput);
    localStorage.setItem("currentUser", email);
    const users = this.getUsers();
    const account = users[email];
    localStorage.setItem("user", JSON.stringify({ email, name: account?.name || "" }));

    const legacyKeys = ["study_sessions", "study_settings", "mock_tests", "mistakes"];
    legacyKeys.forEach((baseKey) => {
      const scopedKey = `${baseKey}_${email}`;
      const scoped = localStorage.getItem(scopedKey);
      const legacy = localStorage.getItem(baseKey);
      if (!scoped && legacy) {
        localStorage.setItem(scopedKey, legacy);
      }
    });
  },

  clearCurrentUser() {
    if (!isClient) return;
    localStorage.removeItem("currentUser");
    localStorage.removeItem("user");
  },

  getCurrentUser(): string | null {
    if (!isClient) return null;
    const explicit = localStorage.getItem("currentUser");
    if (explicit) return this.normalizeEmail(explicit);

    // Legacy compatibility: recover from old "user" session object.
    const legacyUser = localStorage.getItem("user");
    if (!legacyUser) return null;
    try {
      const parsed = JSON.parse(legacyUser);
      if (parsed?.email) {
        const recovered = this.normalizeEmail(parsed.email);
        localStorage.setItem("currentUser", recovered);
        return recovered;
      }
    } catch {
      return null;
    }
    return null;
  },

  getCurrentUserProfile(): { name?: string; email?: string } | null {
    if (!isClient) return null;
    const email = this.getCurrentUser();
    if (!email) return null;

    const users = this.getUsers();
    const account = users[email];
    if (account) {
      localStorage.setItem("user", JSON.stringify({ email, name: account.name || "" }));
      return { email, name: account.name || "" };
    }

    return { email };
  },

  updateCurrentUserName(name: string) {
    if (!isClient) return;
    const email = this.getCurrentUser();
    if (!email) return;

    const users = this.getUsers();
    const existing = users[email];
    if (!existing) return;
    users[email] = { ...existing, name };
    this.saveUsers(users);
    localStorage.setItem("user", JSON.stringify({ email, name }));
  },

  syncExtensionSettings() {
    if (!isClient) return;
    const settings = this.getSettings();
    window.postMessage({
      type: "FROM_PAGE",
      action: "UPDATE_SETTINGS",
      payload: {
        whitelist: settings.whitelist || [],
        blacklist: settings.blacklist || []
      }
    }, "*");
  },

  resetCurrentUserData() {
    if (!isClient) return;
    const email = this.getCurrentUser();
    if (!email) return;
    localStorage.removeItem(`study_sessions_${email}`);
    localStorage.removeItem(`study_settings_${email}`);
    localStorage.removeItem(`mock_tests_${email}`);
    localStorage.removeItem(`mistakes_${email}`);
  },

  logout() {
    if (!isClient) return;
    this.setExtensionStudying(false);
    this.clearCurrentUser();
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
    const updated = { ...current, ...settings };
    localStorage.setItem(key, JSON.stringify(updated));

    if (email) {
      const users = this.getUsers();
      const existing = users[email];
      if (existing) {
        users[email] = { ...existing, preferences: updated };
        this.saveUsers(users);
      }
    }

    // Also notify extension so it updates Chrome storage rules instantly
    this.syncExtensionSettings();
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
  },

  getMistakes(): import('./types').Mistake[] {
    if (!isClient) return [];
    try {
      const email = this.getCurrentUser();
      const key = email ? `mistakes_${email}` : "mistakes";
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMistake(mistake: import('./types').Mistake) {
    if (!isClient) return;
    const email = this.getCurrentUser();
    const key = email ? `mistakes_${email}` : "mistakes";
    const mistakes = this.getMistakes();
    mistakes.push(mistake);
    localStorage.setItem(key, JSON.stringify(mistakes));
  },

  deleteMistake(id: string) {
    if (!isClient) return;
    const email = this.getCurrentUser();
    const key = email ? `mistakes_${email}` : "mistakes";
    let mistakes = this.getMistakes();
    mistakes = mistakes.filter(m => m.id !== id);
    localStorage.setItem(key, JSON.stringify(mistakes));
  }
};
