import { useState, useEffect, useCallback } from 'react';
import { StickyNote, Save, Loader2, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAutosave } from '@/hooks/use-autosave';

interface NotesPanelProps {
  notes: string;
  onSave: (notes: string) => Promise<void>;
}

const NotesPanel = ({ notes, onSave }: NotesPanelProps) => {
  const [value, setValue] = useState(notes);

  useEffect(() => {
    setValue(notes);
    resetSavedValue(notes);
  }, [notes]);

  const { isDirty: dirty, isSaving: saving, triggerSave, resetSavedValue } = useAutosave(value, onSave, {
    delay: 1500,
    enabled: true,
  });

  return (
    <div className="flex h-full flex-col bg-ide-sidebar">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
        </div>
        <div className="flex items-center gap-1.5">
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <span className="text-[10px] text-muted-foreground">
            {saving ? 'Saving...' : dirty ? 'Unsaved' : '✓ Saved'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px]"
            onClick={triggerSave}
            disabled={!dirty || saving}
          >
            <Save className="h-3 w-3" />
            Save
          </Button>
        </div>
      </div>
      <div className="flex-1 p-3">
        <Textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); triggerSave(); } }}
          placeholder="Write notes about this problem... e.g. 'Use a hash map to store complements' or 'Two pointers work because the array is sorted'"
          className="h-full min-h-[120px] resize-none border-panel-border bg-card font-mono text-xs"
        />
      </div>
    </div>
  );
};

export default NotesPanel;
