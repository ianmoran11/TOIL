import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TimeEntry, Project, Tag, EntryType } from '../types';

interface TimeStore {
  entries: TimeEntry[];
  projects: Project[];
  tags: Tag[];

  // Actions
  startEntry: (type: EntryType, projectId?: string, tagIds?: string[], targetDuration?: number, isWorkingBreak?: boolean) => void;
  stopEntry: () => void;
  addManualEntry: (entry: Omit<TimeEntry, 'id'>) => void;
  updateEntry: (id: string, updates: Partial<TimeEntry>) => void;
  deleteEntry: (id: string) => void;

  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addTag: (tag: Omit<Tag, 'id'>) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;

  importData: (data: { entries: TimeEntry[]; projects: Project[]; tags: Tag[] }) => void;
  
  // Getters (computed properties are usually just selector functions in Zustand, 
  // but we can have some helpers or just rely on state structure)
}

export const useTimeStore = create<TimeStore>()(
  persist(
    (set, get) => ({
      entries: [],
      projects: [],
      tags: [],

      startEntry: (type, projectId, tagIds = [], targetDuration, isWorkingBreak) => {
        const now = Date.now();
        const { entries } = get();
        
        // Defaults
        let target = targetDuration;
        if (target === undefined) {
           target = type === 'work' ? 25 * 60 : 5 * 60;
        }

        // Find if there is an active entry
        const activeEntryIndex = entries.findIndex(e => e.endTime === null);
        let newEntries = [...entries];

        // Stop the active entry if exists
        if (activeEntryIndex !== -1) {
          const activeEntry = newEntries[activeEntryIndex];
          newEntries[activeEntryIndex] = { ...activeEntry, endTime: now };
        }

        // Create new entry
        const newEntry: TimeEntry = {
          id: crypto.randomUUID(),
          startTime: now,
          endTime: null,
          type,
          projectId,
          tagIds,
          targetDuration: target,
          isWorkingBreak: isWorkingBreak || false,
        };

        newEntries.push(newEntry);
        set({ entries: newEntries });
      },

      stopEntry: () => {
        const now = Date.now();
        const { entries } = get();
        const activeEntryIndex = entries.findIndex(e => e.endTime === null);

        if (activeEntryIndex !== -1) {
          const newEntries = [...entries];
          newEntries[activeEntryIndex] = { ...newEntries[activeEntryIndex], endTime: now };
          set({ entries: newEntries });
        }
      },

      addManualEntry: (entry) => {
        const newEntry = { ...entry, id: crypto.randomUUID() };
        set((state) => ({ entries: [...state.entries, newEntry] }));
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }));
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
      },

      addProject: (project) => {
        const newProject = { ...project, id: crypto.randomUUID() };
        set((state) => ({ projects: [...state.projects, newProject] }));
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      },

      addTag: (tag) => {
        const newTag = { ...tag, id: crypto.randomUUID() };
        set((state) => ({ tags: [...state.tags, newTag] }));
      },

      updateTag: (id, updates) => {
        set((state) => ({
          tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTag: (id) => {
        set((state) => ({
          tags: state.tags.filter((t) => t.id !== id),
        }));
      },

      importData: (data) => {
        // Merge or replace? Usually merge or user choice.
        // For simplicity, we'll append unique ones or just set state if it's a "Restore".
        // Let's assume replace for "Import Backup", simple. 
        // Or actually, let's just spread them in unique.
        // But for now, let's just set them, or maybe the user implementation will handle complexity.
        // Safest is to just replace the whole state if it's a full backup restore.
        // But if importing generic CSV, we need to parse it elsewhere and call addManualEntry.
        // Let's assume importData is for full state restore.
        set({ 
          entries: data.entries || [], 
          projects: data.projects || [], 
          tags: data.tags || [] 
        });
      },
    }),
    {
      name: 'time-tracker-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
