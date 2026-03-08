import { useState, useEffect, useCallback } from 'react';
import { StickyNote, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface NotesPanelProps {
  notes: string;
  onSave: (notes: string) => Promise<void>;
}

const NotesPanel = ({ notes, onSave }: NotesPanelProps) => {
  const [value, setValue] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(notes);
    setDirty(false);
  }, [notes]);

  const handleChange = (v: string) => {
    setValue(v);
    setDirty(v !== notes);
  };

  const handleSave = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    await onSave(value);
    setDirty(false);
    setSaving(false);
  }, [dirty, value, onSave]);

  return (
    <div className="flex h-full flex-col bg-ide-sidebar">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-[10px]"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {dirty ? 'Save' : 'Saved'}
        </Button>
      </div>
      <div className="flex-1 p-3">
        <Textarea
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); } }}
          placeholder="Write notes about this problem... e.g. 'Use a hash map to store complements' or 'Two pointers work because the array is sorted'"
          className="h-full min-h-[120px] resize-none border-panel-border bg-card font-mono text-xs"
        />
      </div>
    </div>
  );
};

export default NotesPanel;
