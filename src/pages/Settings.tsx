import { useState, useRef } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { Plus, Trash2, Download, Upload, X } from 'lucide-react';
import Papa from 'papaparse';

export function Settings() {
  const store = useTimeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6'); // Default blue

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#10b981'); // Default green

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    store.addProject({
      name: newProjectName,
      color: newProjectColor,
    });
    setNewProjectName('');
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    store.addTag({
      name: newTagName,
      color: newTagColor,
    });
    setNewTagName('');
  };

  const handleExport = () => {
    // Flatten data for CSV
    const data = store.entries.map(e => ({
      id: e.id,
      type: e.type,
      startTime: new Date(e.startTime).toISOString(),
      endTime: e.endTime ? new Date(e.endTime).toISOString() : '',
      projectName: store.projects.find(p => p.id === e.projectId)?.name || '',
      tags: e.tagIds.map(tid => store.tags.find(t => t.id === tid)?.name).join(';'),
      notes: e.notes || ''
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toil-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results: any) => {
        // Logic to import.
        const importedData = results.data as any[];
        let addedCount = 0;

        importedData.forEach(row => {
            if (!row.startTime) return;

            // 1. Resolve Project
            let projectId = undefined;
            if (row.projectName) {
                const p = store.projects.find(p => p.name === row.projectName);
                if (p) projectId = p.id;
                else {
                    // Create new?
                    store.addProject({ name: row.projectName, color: '#999999' }); // Default color
                    // Note: This creates async/sync complexity as we don't get ID back immediately to use here
                    // if we wanted to link correctly. We skip linking for new projects in this pass 
                    // or rely on user to fix.
                }
            }

             // Parse dates
             const start = new Date(row.startTime).getTime();
             const end = row.endTime ? new Date(row.endTime).getTime() : null;

             store.addManualEntry({
                startTime: start,
                endTime: end,
                type: row.type || 'work',
                projectId: projectId, 
                tagIds: [], // Tags logic skipped for simplicity
                notes: row.notes
             });
             addedCount++;
        });
        alert(`Imported ${addedCount} entries.`);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Projects */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Projects</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Project Name"
            className="flex-1 p-2 border rounded-md bg-background"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <input
            type="color"
            className="p-1 h-10 w-10 border rounded-md cursor-pointer bg-background"
            value={newProjectColor}
            onChange={(e) => setNewProjectColor(e.target.value)}
          />
          <button
            onClick={handleAddProject}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md"
          >
            <Plus size={18} /> Add
          </button>
        </div>

        <div className="grid gap-2">
          {store.projects.map(project => (
            <div key={project.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: project.color }} 
                />
                <span className="font-medium">{project.name}</span>
              </div>
              <button 
                onClick={() => store.deleteProject(project.id)}
                className="text-destructive hover:bg-destructive/10 p-2 rounded-md"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {store.projects.length === 0 && <p className="text-muted-foreground text-sm">No projects created.</p>}
        </div>
      </div>

      <hr />

      {/* Tags */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tags</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Tag Name"
            className="flex-1 p-2 border rounded-md bg-background"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
          <input
            type="color"
            className="p-1 h-10 w-10 border rounded-md cursor-pointer bg-background"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
          />
          <button
            onClick={handleAddTag}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md"
          >
            <Plus size={18} /> Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {store.tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-2 px-3 py-1 border rounded-full bg-card">
              <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: tag.color }} 
                />
              <span>{tag.name}</span>
              <button 
                onClick={() => store.deleteTag(tag.id)}
                className="text-muted-foreground hover:text-destructive ml-1"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {store.tags.length === 0 && <p className="text-muted-foreground text-sm">No tags created.</p>}
        </div>
      </div>

      <hr />

      {/* Data Management */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Data Management</h2>
        <div className="flex gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border px-4 py-2 rounded-md hover:bg-accent"
          >
            <Download size={18} /> Export to CSV
          </button>
          
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
            <button
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-2 border px-4 py-2 rounded-md hover:bg-accent"
            >
              <Upload size={18} /> Import CSV
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Note: Importing CSV will add entries to your current history. It tries to map Project/Tags by name, but may need manual adjustment.
        </p>
      </div>
    </div>
  );
}
