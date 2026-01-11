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
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { cn } from '../lib/utils'; // Keep as internal import for now

type Period = 'day' | 'week' | 'fortnight' | 'month';

export function Reports() {
  const { entries, projects } = useTimeStore();
  const [period, setPeriod] = useState<Period>('week');
  
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
            .filter(e => e.type === 'work')
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

    filteredEntries.filter(e => e.type === 'work').forEach(e => {
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Reports</h1>
        
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
             <p className="text-4xl font-bold mt-2">{totalWorkHours.toFixed(2)}h</p>
             <p className="text-sm text-muted-foreground mt-1">
                 {format(range.start, 'MMM d')} - {format(range.end, 'MMM d')}
             </p>
         </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
         {/* Bar Chart */}
         <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
            <h3 className="tex-lg font-semibold mb-6">Work Schedule</h3>
            <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                        <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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
                            <Tooltip />
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
    </div>
  );
}
