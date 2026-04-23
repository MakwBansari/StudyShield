export interface SubjectDef {
  name: string;
  weightage: number; // Out of 100 marks
}

export const GATE_SUBJECTS: SubjectDef[] = [
  { name: 'General Aptitude', weightage: 15 },
  { name: 'Engineering Mathematics', weightage: 6 },
  { name: 'Discrete Mathematics', weightage: 7 },
  { name: 'Digital Logic', weightage: 5 },
  { name: 'Computer Organization & Architecture', weightage: 8 },
  { name: 'Programming & Data Structures', weightage: 10 },
  { name: 'Algorithms', weightage: 8 },
  { name: 'Theory of Computation', weightage: 8 },
  { name: 'Compiler Design', weightage: 4 },
  { name: 'Operating System', weightage: 10 },
  { name: 'Databases', weightage: 8 },
  { name: 'Computer Networks', weightage: 11 }
];

export function getSpacedRepetitionIntervals(): number[] {
  // Ebbinghaus intervals in days: 1, 3, 7, 14, 30
  return [1, 3, 7, 14, 30];
}

export function isRevisionDue(lastStudiedDate: number, intervalDays: number): boolean {
  const now = Date.now();
  const diffDays = (now - lastStudiedDate) / (1000 * 60 * 60 * 24);
  // It's due if the difference is greater than or equal to the interval
  return diffDays >= intervalDays;
}
