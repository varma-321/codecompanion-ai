import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getJudge0ApiKey, setJudge0ApiKey } from '@/lib/judge0';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const [apiKey, setApiKey] = useState(getJudge0ApiKey());

  const handleSave = () => {
    setJudge0ApiKey(apiKey);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Judge0 API Key (RapidAPI)</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Get a free key from{' '}
              <a href="https://rapidapi.com/judge0-official/api/judge0-ce" target="_blank" rel="noreferrer" className="text-primary underline">
                RapidAPI Judge0
              </a>
              {' '}to compile and run Java code.
            </p>
            <Input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter your RapidAPI key"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-sm">Ollama</Label>
            <p className="text-xs text-muted-foreground">
              Run <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">ollama serve</code> locally.
              The app connects to <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">localhost:11434</code> automatically.
            </p>
          </div>
          <Button onClick={handleSave} className="w-full">Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
