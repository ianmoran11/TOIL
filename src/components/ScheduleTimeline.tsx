import type { TimeEntry } from '../types';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '../lib/utils';

interface ScheduleTimelineProps {
  days: Date[];
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  startHour?: number;
  endHour?: number;
}

export function ScheduleTimeline({ days, entries, onEdit, startHour = 6, endHour = 20 }: ScheduleTimelineProps) {
  
  const totalHours = endHour - startHour;
  // Generate markers every 3 hours, ensuring we include start but fit within range
  // Or just every hour or every 2 hours depending on density?
  // Let's do every 2 hours if range is small, or 3 if large.
  // 6am to 8pm is 14 hours.
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
      if ((h - startHour) % 2 === 0) hours.push(h); // Every 2 hours
  }

  const getEntryStyle = (entry: TimeEntry) => {
    // Determine color based on type
    if (entry.type === 'work') return 'bg-primary/80 border-primary hover:bg-primary';
    if (entry.isWorkingBreak) return 'bg-blue-400/80 border-blue-400 hover:bg-blue-400';
    return 'bg-orange-400/80 border-orange-400 hover:bg-orange-400'; // Rest break
  };

  const getPercent = (hour: number, minute: number = 0) => {
      const totalMinutes = totalHours * 60;
      const currentMinutes = (hour - startHour) * 60 + minute;
      return (currentMinutes / totalMinutes) * 100;
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
              style={{ left: `${getPercent(h)}%` }}
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
                
                {/* 9am-5pm Shaded Background */}
                {Math.max(9, startHour) < Math.min(17, endHour) && (
                    <div 
                        className="absolute h-full bg-muted/30 pointer-events-none"
                        style={{
                            left: `${getPercent(Math.max(9, startHour))}%`,
                            width: `${getPercent(Math.min(17, endHour)) - getPercent(Math.max(9, startHour))}%`
                        }} 
                    />
                )}

                {/* Vertical Hour Grid Lines */}
                {hours.map(h => (
                    <div 
                    key={h} 
                    className="absolute border-l h-full border-muted/20"
                    style={{ left: `${getPercent(h)}%` }}
                    />
                ))}

                {/* Entry Blocks */}
                {dayEntries.map(entry => {
                    const startDate = new Date(entry.startTime);
                    const endDate = entry.endTime ? new Date(entry.endTime) : new Date();
                    
                    // Position relative to view range
                    const startRawH = startDate.getHours() + startDate.getMinutes() / 60;
                    const endRawH = endDate.getHours() + endDate.getMinutes() / 60;
                    
                    // Clip visuals to view range (basic clipping)
                    if (endRawH < startHour || startRawH > endHour) return null;

                    const left = getPercent(startRawH);
                    const right = getPercent(endRawH);
                    let width = right - left;
                    
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
                                width: `${Math.max(width, 0.5)}%`, // min width
                                minWidth: '4px' 
                            }}
                            title={`${format(startDate, 'HH:mm')} - ${entry.endTime ? format(endDate, 'HH:mm') : 'Now'} (${entry.type})`}
                        >
                            {width > 2 && (
                                <div className="text-[10px] text-white px-1 overflow-hidden whitespace-nowrap truncate leading-8">
                                    {format(startDate, 'HH:mm')}
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
