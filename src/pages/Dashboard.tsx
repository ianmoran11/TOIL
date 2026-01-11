import { useEffect, useState } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { format, isToday, differenceInSeconds } from 'date-fns';
import { Play, Square, Coffee, Briefcase, Plus, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { EntryEditor } from '../components/EntryEditor';
import type { TimeEntry } from '../types';

// Helper to format duration in HH:MM:SS
const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function Dashboard() {
  const { entries, startEntry, stopEntry, addManualEntry, updateEntry } = useTimeStore();
  const [now, setNow] = useState(Date.now());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>(undefined);

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setIsEditorOpen(true);
  };

  const handleAddNew = () => {
    setEditingEntry(undefined);
    setIsEditorOpen(true);
  };

  const handleSaveEntry = (entry: Partial<TimeEntry>) => {
    if (entry.id) {
      updateEntry(entry.id, entry);
    } else {
      if (entry.startTime && entry.type) {
        addManualEntry({
          startTime: entry.startTime,
          endTime: entry.endTime || null,
          type: entry.type,
          projectId: entry.projectId,
          tagIds: entry.tagIds || [],
          notes: entry.notes
        });
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeEntry = entries.find(e => e.endTime === null);
  
  // Calculate Today's Stats
  const todayEntries = entries.filter(e => isToday(e.startTime));
  
  const calculateTotalSeconds = (type: 'work' | 'break') => {
    return todayEntries
      .filter(e => e.type === type)
      .reduce((acc, entry) => {
        const end = entry.endTime || now;
        return acc + differenceInSeconds(end, entry.startTime);
      }, 0);
  };

  const totalWorkSeconds = calculateTotalSeconds('work');
  const totalBreakSeconds = calculateTotalSeconds('break');
  
  const currentDuration = activeEntry 
    ? differenceInSeconds(now, activeEntry.startTime) 
    : 0;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Main Timer Card */}
      <div className="bg-card border rounded-xl p-8 shadow-sm text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm uppercase tracking-wider font-semibold">
            {activeEntry ? (activeEntry.type === 'work' ? 'Working' : 'On Break') : 'Idle'}
          </h2>
          <div className={cn("text-6xl font-mono font-bold tabular-nums", 
            activeEntry?.type === 'work' ? "text-primary" : 
            activeEntry?.type === 'break' ? "text-orange-500" : "text-muted-foreground"
          )}>
            {formatDuration(currentDuration)}
          </div>
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          {!activeEntry && (
            <>
              <button
                onClick={() => startEntry('work')}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
                aria-label="Start Work"
              >
                <Play size={20} /> Start Work
              </button>
              <button
                onClick={() => startEntry('break')}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/80 transition-colors"
                aria-label="Start Break"
              >
                <Coffee size={20} /> Start Break
              </button>
            </>
          )}

          {activeEntry && (
            <>
              <button
                onClick={stopEntry}
                className="flex items-center gap-2 bg-destructive text-destructive-foreground px-8 py-3 rounded-lg hover:bg-destructive/90 transition-colors"
                aria-label="Stop"
              >
                <Square size={20} /> Stop
              </button>
              
              {activeEntry.type === 'work' && (
                 <button
                 onClick={() => startEntry('break')}
                 className="flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/80 transition-colors"
                 aria-label="Switch to Break"
               >
                 <Coffee size={20} /> Switch to Break
               </button>
              )}

              {activeEntry.type === 'break' && (
                 <button
                 onClick={() => startEntry('work')}
                 className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
                 aria-label="Switch to Work"
               >
                 <Briefcase size={20} /> Switch to Work
               </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-muted-foreground text-sm font-medium">Work Today</h3>
          <p className="text-3xl font-bold mt-2">{formatDuration(totalWorkSeconds)}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-muted-foreground text-sm font-medium">Break Today</h3>
          <p className="text-3xl font-bold mt-2 text-orange-500">{formatDuration(totalBreakSeconds)}</p>
        </div>
      </div>

      {/* Today's List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Today's Activity</h3>
          <button 
             onClick={handleAddNew}
             className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Plus size={16} /> Add Entry
          </button>
        </div>
        
        <div className="space-y-2">
            {todayEntries.length === 0 && <p className="text-muted-foreground">No activity recorded today.</p>}
            {todayEntries.slice().reverse().map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-card border rounded-lg group">
                    <div className="flex items-center gap-3">
                        {entry.type === 'work' ? <Briefcase size={16} className="text-primary"/> : <Coffee size={16} className="text-orange-500"/>}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{entry.type}</span>
                                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  {entry.notes && `- ${entry.notes}`}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {format(entry.startTime, 'HH:mm')} - {entry.endTime ? format(entry.endTime, 'HH:mm') : 'Now'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="font-mono text-sm">
                            {formatDuration(differenceInSeconds(entry.endTime || now, entry.startTime))}
                        </div>
                        <button 
                          onClick={() => handleEdit(entry)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-accent rounded-md transition-opacity"
                        >
                            <Edit2 size={16} className="text-muted-foreground" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      <EntryEditor 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveEntry}
        entry={editingEntry}
      />
    </div>
  );
}
