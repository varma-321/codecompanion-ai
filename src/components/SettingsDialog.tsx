import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getOllamaModels, getSelectedModel, setSelectedModel, checkOllamaStatus } from '@/lib/ollama';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const [models, setModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState(getSelectedModel());
  const [ollamaOnline, setOllamaOnline] = useState(false);

  useEffect(() => {
    if (open) {
      checkOllamaStatus().then(online => {
        setOllamaOnline(online);
        if (online) {
          getOllamaModels().then(setModels);
        }
      });
    }
  }, [open]);

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
    setSelectedModel(model);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Code Execution</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Java code is compiled and run using the <strong>deployed backend</strong> at Render.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              ℹ️ The server may take ~30s to wake up on first request (free tier).
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium">Ollama AI</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Run <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">ollama serve</code> locally.
              {ollamaOnline ? (
                <span className="ml-1 text-success font-medium">● Connected</span>
              ) : (
                <span className="ml-1 text-destructive font-medium">● Offline</span>
              )}
            </p>
            {ollamaOnline && models.length > 0 && (
              <Select value={currentModel} onValueChange={handleModelChange}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(model => (
                    <SelectItem key={model} value={model} className="text-xs">
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">AI Features</Label>
            <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
              <li>• Code analysis & complexity detection</li>
              <li>• 4-level progressive hints</li>
              <li>• Brute / Better / Optimal solutions</li>
              <li>• Pattern detection & mistake finder</li>
              <li>• Edge cases & test case generation</li>
              <li>• Free-form chat about your code</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
