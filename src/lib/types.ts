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
  notes?: string;
}

export interface ExtensionEscape {
  timestamp: number;
  subject?: string;
}

export type SubjectState = "not_studied" | "ongoing" | "completed";

export interface Mistake {
  id: string;
  subject: string;
  topic: string;
  description: string;
  correctConcept: string;
  timestamp: number;
}

export interface SubjectGoal {
  subject: string;
  isActive: boolean;
  hoursTarget: number;
  frequencyDays: number;
  totalSyllabusHours?: number;
  totalQuestions?: number;
  cheatsheet?: string;
  state?: SubjectState;
  completionDate?: number; // Timestamp when marked completed
  revisionHistory?: number[]; // Timestamps of when notes were revised
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
  lastBriefingDate?: string; // YYYY-MM-DD to show daily briefing once
  lastRevisionNotesDate?: string; // YYYY-MM-DD to show revision notes once
}
