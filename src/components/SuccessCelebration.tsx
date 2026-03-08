import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Trophy, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';

interface SuccessCelebrationProps {
  open: boolean;
  onClose: () => void;
  problemTitle: string;
  passedCount: number;
  totalCount: number;
  executionTime?: number;
  onNextProblem?: () => void;
  onTryAgain?: () => void;
}

const SuccessCelebration = ({
  open,
  onClose,
  problemTitle,
  passedCount,
  totalCount,
  executionTime,
  onNextProblem,
  onTryAgain,
}: SuccessCelebrationProps) => {
  const allPassed = passedCount === totalCount && totalCount > 0;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open && allPassed) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [open, allPassed]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-border bg-background p-0 overflow-hidden">
        {/* Top accent bar */}
        <div className={`h-1.5 w-full ${allPassed ? 'bg-emerald-500' : 'bg-destructive'}`} />

        <div className="flex flex-col items-center px-8 py-10 text-center relative">
          {/* Confetti particles */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 60}%`,
                    backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'][i % 6],
                    animationDelay: `${Math.random() * 1}s`,
                    animationDuration: `${0.5 + Math.random() * 1}s`,
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>
          )}

          {/* Icon */}
          <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
            allPassed ? 'bg-emerald-500/10' : 'bg-destructive/10'
          }`}>
            {allPassed ? (
              <Trophy className="h-10 w-10 text-emerald-500" />
            ) : (
              <RotateCcw className="h-10 w-10 text-destructive" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {allPassed ? 'All Tests Passed!' : 'Almost There!'}
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground mb-1 max-w-xs">
            {allPassed
              ? `Congratulations! You solved "${problemTitle}" successfully.`
              : `${passedCount} of ${totalCount} tests passed for "${problemTitle}".`}
          </p>

          {/* Stats */}
          <div className="mt-6 flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className={`text-3xl font-bold ${allPassed ? 'text-emerald-500' : 'text-foreground'}`}>
                {passedCount}/{totalCount}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">Tests Passed</span>
            </div>
            {executionTime != null && (
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-foreground">{executionTime}ms</span>
                <span className="text-[11px] text-muted-foreground mt-1">Execution Time</span>
              </div>
            )}
          </div>

          {/* Motivational badge for all passed */}
          {allPassed && (
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              Problem Solved — Progress Saved
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center gap-3 w-full">
            {!allPassed && onTryAgain && (
              <Button variant="outline" className="flex-1 gap-1.5" onClick={onTryAgain}>
                <RotateCcw className="h-3.5 w-3.5" /> Try Again
              </Button>
            )}
            {allPassed && onNextProblem && (
              <Button variant="outline" className="flex-1 gap-1.5" onClick={onNextProblem}>
                <ArrowRight className="h-3.5 w-3.5" /> Next Problem
              </Button>
            )}
            <Button className="flex-1 gap-1.5" onClick={onClose}>
              <CheckCircle2 className="h-3.5 w-3.5" /> {allPassed ? 'Continue' : 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SuccessCelebration;
