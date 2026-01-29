import { useState, useMemo } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth,
  subDays, eachDayOfInterval, 
  format, isWithinInterval
} from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts';
import { cn } from '../lib/utils';
import { ScheduleTimeline } from '../components/ScheduleTimeline';
import { EntryEditor } from '../components/EntryEditor';
import { Calendar, BarChart2, List, Edit2, Trash2, SortAsc, Filter } from 'lucide-react';
import type { TimeEntry } from '../types';

type Period = 'day' | 'week' | 'fortnight' | 'month';
type ViewMode = 'stats' | 'timeline' | 'list';
type SortOrder = 'newest' | 'oldest' | 'duration' | 'duration-desc';

const formatDecimalHours = (decimalHours: number) => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}h ${minutes}m`;
};

export function Reports() {
  const { entries, projects, updateEntry, deleteEntry, tags } = useTimeStore();
  const [period, setPeriod] = useState<Period>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('stats');
  
  const [timelineStartHour, setTimelineStartHour] = useState(6);
  const [timelineEndHour, setTimelineEndHour] = useState(20);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [filterProject, setFilterProject] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'work' | 'break'>('all');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>(undefined);

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setIsEditorOpen(true);
  };

  const handleSaveEntry = (entry: Partial<TimeEntry>) => {
    if (entry.id) {
        updateEntry(entry.id, entry);
    }
  };
  
  // Calculate Range
  const range = useMemo(() => {
    const now = new Date();
    // Assuming "Last X" relative to today.
    // Or "Current Week". Let's do "Current X" for simplicity or "Last X Days".
    // User asked "last day, week, fortnight, month".
    // Let's interpret as "Last 7 days", "Last 14 days", "Last 30 days" or strict calendar periods.
    // Strict calendar periods are usually better for reporting.
    
    switch (period) {
        case 'day': return { start: startOfDay(now), end: endOfDay(now) };
        case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        case 'fortnight': return { start: subDays(now, 14), end: endOfDay(now) }; // Approximation
        case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
       // If entry is running, count it up to now?
       // For historical reports, we usually only care about started entries.
       // We check overlap.
       if (!e.endTime && !isWithinInterval(new Date(), range)) return false; // Future?
       const start = e.startTime;
       const end = e.endTime || Date.now();
       return start <= range.end.getTime() && end >= range.start.getTime();
    });
  }, [entries, range]);

  // Aggregate Data for Bar Chart (Daily Totals)
  const barData = useMemo(() => {
    const days = eachDayOfInterval(range);
    return days.map(day => {
        const dayStart = startOfDay(day).getTime();
        const dayEnd = endOfDay(day).getTime();
        
        const dayEntries = filteredEntries.filter(e => {
            const entStart = e.startTime;
            const entEnd = e.endTime || Date.now();
            return entStart < dayEnd && entEnd > dayStart;
        });

        // Calculate overlap duration for each entry
        const workSeconds = dayEntries
            .filter(e => e.type === 'work' || (e.type === 'break' && e.isWorkingBreak))
            .reduce((acc, e) => {
                const s = Math.max(e.startTime, dayStart);
                const end = Math.min(e.endTime || Date.now(), dayEnd);
                return acc + Math.max(0, (end - s) / 1000);
            }, 0);

        return {
            name: format(day, period === 'day' ? 'HH:mm' : 'EEE d'), // Labels
            workHours: Number((workSeconds / 3600).toFixed(2)),
            fullDate: day
        };
    });
  }, [filteredEntries, range, period]);

  // Aggregate Data for Pie Chart (Projects)
  const pieData = useMemo(() => {
    const projectMap = new Map<string, number>();
    let noProjectSeconds = 0;

    filteredEntries.filter(e => e.type === 'work' || (e.type === 'break' && e.isWorkingBreak)).forEach(e => {
        // Calculate overlap with range
        const s = Math.max(e.startTime, range.start.getTime());
        const end = Math.min(e.endTime || Date.now(), range.end.getTime());
        const seconds = Math.max(0, (end - s) / 1000);

        if (e.projectId) {
            projectMap.set(e.projectId, (projectMap.get(e.projectId) || 0) + seconds);
        } else {
            noProjectSeconds += seconds;
        }
    });

    const data = Array.from(projectMap.entries()).map(([pid, seconds]) => {
        const project = projects.find(p => p.id === pid);
        return {
            name: project?.name || 'Unknown',
            value: Number((seconds / 3600).toFixed(2)),
            color: project?.color || '#999'
        };
    });

    if (noProjectSeconds > 60) { // Only show if significant
        data.push({ name: 'No Project', value: Number((noProjectSeconds / 3600).toFixed(2)), color: '#ccc' });
    }

    return data;
  }, [filteredEntries, range, projects]);

  const totalWorkHours = barData.reduce((acc, d) => acc + d.workHours, 0);

  // List view - apply filters and sort
  const listEntries = useMemo(() => {
    let result = [...filteredEntries];
    
    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(e => e.type === filterType);
    }
    
    // Apply project filter
    if (filterProject) {
      result = result.filter(e => e.projectId === filterProject);
    }
    
    // Apply sort
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return b.startTime - a.startTime;
        case 'oldest':
          return a.startTime - b.startTime;
        case 'duration':
          const aDur = (a.endTime || Date.now()) - a.startTime;
          const bDur = (b.endTime || Date.now()) - b.startTime;
          return aDur - bDur;
        case 'duration-desc':
          const aDur2 = (a.endTime || Date.now()) - a.startTime;
          const bDur2 = (b.endTime || Date.now()) - b.startTime;
          return bDur2 - aDur2;
        default:
          return 0;
      }
    });
    
    return result;
  }, [filteredEntries, filterType, filterProject, sortOrder]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Reports</h1>
            <div className="flex p-1 bg-card border rounded-lg h-10">
                <button
                    onClick={() => setViewMode('stats')}
                    className={cn(
                        "px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                        viewMode === 'stats' ? "bg-primary text-primary-foreground shadow-sm" : "hover:text-primary"
                    )}
                >
                    <BarChart2 size={16} /> Stats
                </button>
                <button
                    onClick={() => setViewMode('timeline')}
                    className={cn(
                        "px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                        viewMode === 'timeline' ? "bg-primary text-primary-foreground shadow-sm" : "hover:text-primary"
                    )}
                >
                    <Calendar size={16} /> Timeline
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                        "px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                        viewMode === 'list' ? "bg-primary text-primary-foreground shadow-sm" : "hover:text-primary"
                    )}
                >
                    <List size={16} /> List
                </button>
            </div>

            {viewMode === 'timeline' && (
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm bg-card border rounded-lg px-2 h-10">
                        <span className="text-muted-foreground text-xs">Range:</span>
                        <select 
                            value={timelineStartHour} 
                            onChange={(e) => setTimelineStartHour(Number(e.target.value))}
                            className="bg-transparent font-medium focus:outline-none"
                        >
                            {Array.from({ length: 24 }, (_, i) => i).map(h => (
                                <option key={h} value={h}>{h}:00</option>
                            ))}
                        </select>
                        <span>-</span>
                        <select 
                            value={timelineEndHour} 
                            onChange={(e) => setTimelineEndHour(Number(e.target.value))}
                            className="bg-transparent font-medium focus:outline-none"
                        >
                            {Array.from({ length: 24 }, (_, i) => i + 1).map(h => (
                                <option key={h} value={h}>{h}:00</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-1 bg-card border rounded-lg p-1">
                        <button
                            onClick={() => { setTimelineStartHour(6); setTimelineEndHour(20); }}
                            className={cn(
                                "px-2 py-1 text-xs rounded transition-colors",
                                timelineStartHour === 6 && timelineEndHour === 20
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:text-primary"
                            )}
                        >
                            6am-8pm
                        </button>
                        <button
                            onClick={() => { setTimelineStartHour(4); setTimelineEndHour(22); }}
                            className={cn(
                                "px-2 py-1 text-xs rounded transition-colors",
                                timelineStartHour === 4 && timelineEndHour === 22
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:text-primary"
                            )}
                        >
                            4am-10pm
                        </button>
                        <button
                            onClick={() => { setTimelineStartHour(0); setTimelineEndHour(24); }}
                            className={cn(
                                "px-2 py-1 text-xs rounded transition-colors",
                                timelineStartHour === 0 && timelineEndHour === 24
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:text-primary"
                            )}
                        >
                            All Day
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex p-1 bg-card border rounded-lg">
            {(['day', 'week', 'fortnight', 'month'] as Period[]).map((p) => (
                <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors",
                        period === p ? "bg-primary text-primary-foreground shadow-sm" : "hover:text-primary"
                    )}
                >
                    {p}
                </button>
            ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
         <div className="bg-card border rounded-xl p-6 shadow-sm">
             <h3 className="text-sm font-medium text-muted-foreground uppercase">Total Hours</h3>
             <p className="text-4xl font-bold mt-2">{formatDecimalHours(totalWorkHours)}</p>
             <p className="text-sm text-muted-foreground mt-1">
                 {format(range.start, 'MMM d')} - {format(range.end, 'MMM d')}
             </p>
         </div>
      </div>

      {viewMode === 'stats' ? (
        <div className="grid gap-8 md:grid-cols-2">
            {/* Bar Chart */}
            <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
                <h3 className="tex-lg font-semibold mb-6">Work Schedule</h3>
                <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatDecimalHours(v)} />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [formatDecimalHours(Number(value)), 'Hours']}
                            />
                            <ReferenceLine 
                                y={7.5} 
                                stroke="hsl(var(--muted-foreground))" 
                                strokeDasharray="3 3" 
                                label={{ value: "Target (7.5h)", position: "insideTopRight", fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                            />
                            <Bar dataKey="workHours" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
                <h3 className="tex-lg font-semibold mb-6">Project Distribution</h3>
                <div className="flex-1 w-full relative">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => [formatDecimalHours(Number(value)), 'Hours']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            No data for this period
                        </div>
                    )}
                </div>
            </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
            {/* Filters and Sort */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-muted-foreground" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as 'all' | 'work' | 'break')}
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                    >
                        <option value="all">All Types</option>
                        <option value="work">Work Only</option>
                        <option value="break">Break Only</option>
                    </select>
                </div>
                <select
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background text-sm"
                >
                    <option value="">All Projects</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2 ml-auto">
                    <SortAsc size={16} className="text-muted-foreground" />
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="duration">Shortest First</option>
                        <option value="duration-desc">Longest First</option>
                    </select>
                </div>
            </div>

            {/* Entries List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {listEntries.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No entries found for this period and filter settings.
                    </div>
                ) : (
                    listEntries.map(entry => {
                        const project = projects.find(p => p.id === entry.projectId);
                        const entryTags = entry.tagIds.map(tid => tags.find(t => t.id === tid)).filter(Boolean);
                        const duration = formatDuration((entry.endTime || Date.now()) - entry.startTime);
                        
                        return (
                            <div 
                                key={entry.id}
                                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                {/* Type Icon */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    entry.type === 'work' 
                                        ? 'bg-primary/20 text-primary' 
                                        : entry.isWorkingBreak 
                                            ? 'bg-blue-400/20 text-blue-400'
                                            : 'bg-orange-400/20 text-orange-400'
                                }`}>
                                    {entry.type === 'work' ? (
                                        <span className="font-bold text-sm">W</span>
                                    ) : (
                                        <span className="font-bold text-sm">B</span>
                                    )}
                                </div>

                                {/* Entry Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium capitalize">{entry.type}</span>
                                        {entry.isWorkingBreak && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-100">
                                                Working
                                            </span>
                                        )}
                                        {project && (
                                            <span 
                                                className="text-xs px-2 py-0.5 rounded-full text-white"
                                                style={{ backgroundColor: project.color }}
                                            >
                                                {project.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span>{format(new Date(entry.startTime), 'MMM d, yyyy HH:mm')}</span>
                                        <span>→</span>
                                        <span>{entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : 'Now'}</span>
                                        <span className="font-medium text-foreground">{duration}</span>
                                    </div>
                                    {entryTags.length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                            {entryTags.map(tag => (
                                                <span 
                                                    key={tag!.id}
                                                    className="text-xs px-2 py-0.5 rounded-full"
                                                    style={{ 
                                                        backgroundColor: `${tag!.color}20`,
                                                        color: tag!.color
                                                    }}
                                                >
                                                    {tag!.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {entry.notes && (
                                        <p className="text-sm text-muted-foreground mt-1 truncate">
                                            {entry.notes}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(entry)}
                                        className="p-2 hover:bg-accent rounded-md transition-colors"
                                        title="Edit entry"
                                    >
                                        <Edit2 size={16} className="text-muted-foreground" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(entry.id)}
                                        className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                                        title="Delete entry"
                                    >
                                        <Trash2 size={16} className="text-destructive" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      ) : (
        <ScheduleTimeline 
            days={eachDayOfInterval(range)}
            entries={filteredEntries}
            onEdit={handleEdit}
            startHour={timelineStartHour}
            endHour={timelineEndHour}
        />
      )}

      <EntryEditor 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        onSave={handleSaveEntry}
        onDelete={(id) => deleteEntry(id)}
        entry={editingEntry}
      />
    </div>
  );
}
