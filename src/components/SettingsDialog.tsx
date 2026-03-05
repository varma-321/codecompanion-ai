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
            <Label className="text-sm">Code Execution</Label>
            <p className="text-xs text-muted-foreground">
              Java code is compiled and run using the <strong>Piston API</strong> — no API key required.
            </p>
          </div>
          <div>
            <Label className="text-sm">Ollama AI Model</Label>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
