import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { checkBackendStatus } from '@/lib/ai-backend';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    if (open) {
      checkBackendStatus().then(setBackendOnline);
    }
  }, [open]);

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
            <Label className="text-sm font-medium">AI Service</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              All AI features are powered by <strong>Groq Cloud</strong> via the deployed backend.
              {backendOnline ? (
                <span className="ml-1 text-success font-medium">● Online</span>
              ) : (
                <span className="ml-1 text-destructive font-medium">● Offline</span>
              )}
            </p>
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
