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
