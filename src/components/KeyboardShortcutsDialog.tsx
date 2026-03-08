import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

export const SHORTCUTS = [
  { keys: [`${mod}`, 'Enter'], action: 'Run Code', category: 'Execution' },
  { keys: [`${mod}`, 'S'], action: 'Save', category: 'Execution' },
  { keys: [`${mod}`, 'Shift', 'E'], action: 'Explain Code (AI)', category: 'AI' },
  { keys: [`${mod}`, 'Shift', 'T'], action: 'Run Tests', category: 'Execution' },
  { keys: [`${mod}`, 'Shift', 'H'], action: 'Toggle Description', category: 'Navigation' },
  { keys: [`${mod}`, 'K'], action: 'Open Keyboard Shortcuts', category: 'Navigation' },
  { keys: [`${mod}`, '1'], action: 'Tab: Description', category: 'Navigation' },
  { keys: [`${mod}`, '2'], action: 'Tab: Console', category: 'Navigation' },
  { keys: [`${mod}`, '3'], action: 'Tab: Results', category: 'Navigation' },
  { keys: [`${mod}`, '4'], action: 'Tab: History', category: 'Navigation' },
  { keys: [`${mod}`, '5'], action: 'Tab: Templates', category: 'Navigation' },
  { keys: [`${mod}`, '6'], action: 'Tab: Solutions', category: 'Navigation' },
  { keys: ['Escape'], action: 'Close panels/dialogs', category: 'Navigation' },
];

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsDialog = ({ isOpen, onClose }: KeyboardShortcutsDialogProps) => {
  if (!isOpen) return null;

  const categories = [...new Set(SHORTCUTS.map(s => s.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-[420px] max-h-[80vh] shadow-lg" onClick={e => e.stopPropagation()}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Keyboard Shortcuts</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-4">
            {categories.map(cat => (
              <div key={cat}>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</span>
                <div className="mt-1 space-y-1">
                  {SHORTCUTS.filter(s => s.category === cat).map(shortcut => (
                    <div key={shortcut.action} className="flex items-center justify-between py-1">
                      <span className="text-xs text-foreground">{shortcut.action}</span>
                      <div className="flex items-center gap-0.5">
                        {shortcut.keys.map((key, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-muted-foreground text-[9px] mx-0.5">+</span>}
                            <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">{key}</Badge>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-panel-border">
            <p className="text-[10px] text-muted-foreground text-center">
              Press <Badge variant="outline" className="text-[9px] font-mono px-1 py-0">{mod}+K</Badge> anytime to open this dialog
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyboardShortcutsDialog;
