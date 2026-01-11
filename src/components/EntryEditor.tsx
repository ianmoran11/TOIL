import { useState, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import type { TimeEntry, EntryType } from '../types';
import { format } from 'date-fns';
import { X } from 'lucide-react';

interface EntryEditorProps {
  entry?: TimeEntry; // If provided, edit mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<TimeEntry>) => void;
}

export function EntryEditor({ entry, isOpen, onClose, onSave }: EntryEditorProps) {
  const { projects, tags } = useTimeStore();

  const [type, setType] = useState<EntryType>('work');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setType(entry.type);
        setStartTime(format(entry.startTime, "yyyy-MM-dd'T'HH:mm"));
        setEndTime(entry.endTime ? format(entry.endTime, "yyyy-MM-dd'T'HH:mm") : '');
        setProjectId(entry.projectId || '');
        setTagIds(entry.tagIds || []);
        setNotes(entry.notes || '');
      } else {
        // Reset for new entry
        setType('work');
        setStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setEndTime(format(new Date(), "yyyy-MM-dd'T'HH:mm")); // Default to now for ease
        setProjectId('');
        setTagIds([]);
        setNotes('');
      }
    }
  }, [isOpen, entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse dates
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : null;

    if (end && end < start) {
      alert("End time cannot be before start time");
      return;
    }

    onSave({
      id: entry?.id, // undefined for new
      type,
      startTime: start,
      endTime: end,
      projectId: projectId || undefined,
      tagIds,
      notes
    });
    onClose();
  };

  const toggleTag = (id: string) => {
    setTagIds(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{entry ? 'Edit Entry' : 'Add Manual Entry'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          
          {/* Type Selection */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input 
                type="radio" 
                checked={type === 'work'} 
                onChange={() => setType('work')}
                className="accent-primary"
              />
              <span>Work</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="radio" 
                checked={type === 'break'} 
                onChange={() => setType('break')}
                className="accent-primary"
              />
              <span>Break</span>
            </label>
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Time</label>
              <input 
                type="datetime-local" 
                required
                className="w-full p-2 border rounded-md bg-background"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Time</label>
              <input 
                type="datetime-local" 
                className="w-full p-2 border rounded-md bg-background"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">Leave empty if active</span>
            </div>
          </div>

          {/* Project Selection */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Project</label>
            <select 
              className="w-full p-2 border rounded-md bg-background"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">No Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 && <span className="text-xs text-muted-foreground">No tags defined via Settings.</span>}
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    tagIds.includes(tag.id) 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'hover:bg-accent border-transparent bg-secondary'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <textarea 
              className="w-full p-2 border rounded-md bg-background min-h-[80px]"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Description of work..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-accent"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Save
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
