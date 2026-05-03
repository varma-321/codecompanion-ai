import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useUser } from '@/lib/user-context';
import { createIssue } from '@/lib/supabase';
import { toast } from 'sonner';

interface ReportIssueDialogProps {
  pageTitle?: string;
  trigger?: React.ReactNode;
}

export function ReportIssueDialog({ pageTitle, trigger }: ReportIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { authUser, isAdmin } = useUser();

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Please provide a comment');
      return;
    }

    if (!authUser) {
      toast.error('You must be logged in to report an issue');
      return;
    }

    setLoading(true);
    try {
      await createIssue(
        authUser.id,
        authUser.email || 'unknown',
        window.location.href,
        pageTitle || document.title || 'Unknown Page',
        comment
      );
      toast.success('Issue reported successfully. Thank you!');
      setComment('');
      setOpen(false);
    } catch (error: any) {
      console.error('Failed to report issue:', error);
      toast.error('Failed to report issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning" aria-label="Report Issue">
            <AlertTriangle className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Report an Issue
          </DialogTitle>
          <DialogDescription>
            Found a bug or have a suggestion for this page? Let us know.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isAdmin && (
            <div className="grid gap-2">
              <Label htmlFor="page-url" className="text-xs text-muted-foreground uppercase tracking-wider">Page</Label>
              <div className="p-2 bg-secondary/50 rounded text-xs font-mono truncate">
                {window.location.pathname}
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="comment">Detailed Comment</Label>
            <Textarea
              id="comment"
              placeholder="Describe the issue or provide feedback..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
