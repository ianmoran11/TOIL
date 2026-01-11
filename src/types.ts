export interface Project {
  id: string;
  name: string;
  color: string;
  isArchived?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export type EntryType = 'work' | 'break';

export interface TimeEntry {
  id: string;
  startTime: number;
  endTime: number | null; // null means currently running
  type: EntryType;
  projectId?: string;
  tagIds: string[];
  notes?: string;
  targetDuration?: number; // in seconds
  isWorkingBreak?: boolean;
}

export interface DayStats {
  date: string; // YYYY-MM-DD
  totalWorkMs: number;
  totalBreakMs: number;
  entries: TimeEntry[];
}
