import type { TimeEntry } from '../types';
import { format, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
import { cn } from '../lib/utils';

interface ScheduleTimelineProps {
  days: Date[];
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
}

export function ScheduleTimeline({ days, entries, onEdit }: ScheduleTimelineProps) {
  
  // Hours markers for X-axis (0, 3, 6, 9, 12, 15, 18, 21)
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];

  const getEntryStyle = (entry: TimeEntry) => {
    // Determine color based on type
    if (entry.type === 'work') return 'bg-primary/80 border-primary hover:bg-primary';
    if (entry.isWorkingBreak) return 'bg-blue-400/80 border-blue-400 hover:bg-blue-400';
    return 'bg-orange-400/80 border-orange-400 hover:bg-orange-400'; // Rest break
  };

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
      {/* Header (Time Scale) */}
      <div className="flex border-b bg-muted/30">
        <div className="w-24 flex-shrink-0 p-3 text-xs font-medium text-muted-foreground border-r">
          Date
        </div>
        <div className="flex-1 relative h-8">
          {hours.map(h => (
            <div 
              key={h} 
              className="absolute text-xs text-muted-foreground border-l h-full pl-1"
              style={{ left: `${(h / 24) * 100}%` }}
            >
              {h}:00
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-[600px]">
        {days.map(day => {
          const dayStart = startOfDay(day);
          const dayEnd = endOfDay(day);
          
          // Filter entries for this day row
          // We display entries that START on this day.
          const dayEntries = entries.filter(e => {
             return e.startTime >= dayStart.getTime() && e.startTime < dayEnd.getTime();
          });

          return (
            <div key={day.toISOString()} className="flex border-b last:border-b-0 hover:bg-muted/5 transition-colors">
              {/* Y-Axis Label */}
              <div className="w-24 flex-shrink-0 p-3 text-sm font-medium border-r flex flex-col justify-center bg-background z-10">
                <span className="text-foreground">{format(day, 'EEE')}</span>
                <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
              </div>

              {/* Timeline Row */}
              <div className="flex-1 relative h-14 bg-background/50">
                {/* Vertical Hour Grid Lines */}
                {hours.map(h => (
                    <div 
                    key={h} 
                    className="absolute border-l h-full border-muted/20"
                    style={{ left: `${(h / 24) * 100}%` }}
                    />
                ))}

                {/* Entry Blocks */}
                {dayEntries.map(entry => {
                    const start = new Date(entry.startTime);
                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                    const left = (startMinutes / 1440) * 100;
                    
                    const end = entry.endTime ? new Date(entry.endTime) : new Date(); // If active, show until Now
                    let duration = differenceInMinutes(end, start);
                    // visual minimum width (e.g. 5 mins -> 0.3%)
                    if (duration < 5) duration = 5; 
                    
                    const width = (duration / 1440) * 100;

                    return (
                        <div
                            key={entry.id}
                            onClick={() => onEdit(entry)}
                            className={cn(
                                "absolute h-8 top-3 rounded-sm border cursor-pointer transition-all shadow-sm group",
                                getEntryStyle(entry)
                            )}
                            style={{ 
                                left: `${left}%`, 
                                width: `${width}%`,
                                minWidth: '4px' 
                            }}
                            title={`${format(start, 'HH:mm')} - ${entry.endTime ? format(end, 'HH:mm') : 'Now'} (${entry.type})`}
                        >
                            {/* Hover info or Label if wide enough */}
                            {width > 5 && (
                                <div className="text-[10px] text-white px-1 overflow-hidden whitespace-nowrap truncate leading-8">
                                    {format(start, 'HH:mm')}
                                </div>
                            )}
                        </div>
                    );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
