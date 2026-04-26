import { StudySession } from "./types";

export interface SubjectDef {
  name: string;
  weightage: number; // Out of 100 marks
}

export const GATE_SUBJECTS: SubjectDef[] = [
  { name: "General Aptitude", weightage: 15 },
  { name: "Engineering Mathematics", weightage: 6 },
  { name: "Discrete Mathematics", weightage: 7 },
  { name: "Digital Logic", weightage: 5 },
  { name: "Computer Organization & Architecture", weightage: 8 },
  { name: "Programming & Data Structures", weightage: 10 },
  { name: "Algorithms", weightage: 8 },
  { name: "Theory of Computation", weightage: 8 },
  { name: "Compiler Design", weightage: 4 },
  { name: "Operating System", weightage: 10 },
  { name: "Databases", weightage: 8 },
  { name: "Computer Networks", weightage: 11 }
];

export function getSpacedRepetitionIntervals(): number[] {
  // Ebbinghaus intervals in days: 1, 3, 7, 14, 30
  return [1, 3, 7, 14, 30];
}

export function isRevisionDue(lastStudiedDate: number, intervalDays: number): boolean {
  const now = Date.now();
  const diffDays = (now - lastStudiedDate) / (1000 * 60 * 60 * 24);
  return diffDays >= intervalDays;
}

export interface RevisionTopic {
  subject: string;
  topic: string;
  daysAgo: number;
}

export function getDueRevisions(sessions: StudySession[]): RevisionTopic[] {
  const topicMap = new Map<string, { subject: string, lastStudied: number }>();
  
  sessions.forEach(s => {
    if (s.topic && s.topic.trim() !== "") {
      const key = `${s.subject}:::${s.topic}`;
      const existing = topicMap.get(key);
      if (!existing || s.startTime > existing.lastStudied) {
        topicMap.set(key, { subject: s.subject, lastStudied: s.startTime });
      }
    }
  });

  const due: RevisionTopic[] = [];
  const intervals = getSpacedRepetitionIntervals();
  const now = Date.now();

  topicMap.forEach((val, key) => {
    const diffDays = Math.floor((now - val.lastStudied) / (1000 * 60 * 60 * 24));
    const topic = key.split(":::")[1];
    
    if (diffDays > 0 && intervals.some(interval => diffDays === interval || diffDays === interval + 1)) {
      due.push({ subject: val.subject, topic, daysAgo: diffDays });
    }
  });

  return due;
}
