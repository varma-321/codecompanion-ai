import { useState } from 'react';
import { Plus, Search, Trash2, FileCode, Pencil, Check, X } from 'lucide-react';
import { DbProblem, createProblem, deleteProblem as dbDeleteProblem, updateProblem as dbUpdateProblem, DEFAULT_CODE } from '@/lib/supabase';
import { useUser } from '@/lib/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

interface ProblemExplorerProps {
  problems: DbProblem[];
  activeProblemId: string | null;
  onSelect: (problem: DbProblem) => void;
  onRefresh: () => void;
}

const ProblemExplorer = ({ problems, activeProblemId, onSelect, onRefresh }: ProblemExplorerProps) => {
  const { authUser } = useUser();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = problems.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!authUser) return;
    try {
      const problem = await createProblem(authUser.id, 'New Problem', DEFAULT_CODE);
      onRefresh();
      onSelect(problem);
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dbDeleteProblem(id);
      onRefresh();
    } catch { /* silent */ }
  };

  const handleRenameStart = (p: DbProblem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditTitle(p.title);
  };

  const handleRenameConfirm = async (id: string) => {
    if (editTitle.trim()) {
      try {
        await dbUpdateProblem(id, { title: editTitle.trim() });
        onRefresh();
      } catch { /* silent */ }
    }
    setEditingId(null);
  };

  return (
    <div className="flex h-full flex-col bg-ide-sidebar">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Problems
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreate}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="px-2 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No problems yet. Click + to create one.
          </p>
        )}
        {filtered.map(p => (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
              activeProblemId === p.id ? 'bg-ide-active text-accent-foreground' : 'hover:bg-ide-hover'
            }`}
          >
            <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              {editingId === p.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRenameConfirm(p.id)}
                    className="h-5 text-xs"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                  <button onClick={(e) => { e.stopPropagation(); handleRenameConfirm(p.id); }}>
                    <Check className="h-3 w-3 text-success" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="truncate text-xs font-medium">{p.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}
                  </div>
                </>
              )}
            </div>
            {editingId !== p.id && (
              <div className="hidden items-center gap-0.5 group-hover:flex">
                <button onClick={(e) => handleRenameStart(p, e)} className="rounded p-0.5 hover:bg-secondary">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button onClick={(e) => handleDelete(p.id, e)} className="rounded p-0.5 hover:bg-secondary">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProblemExplorer;
