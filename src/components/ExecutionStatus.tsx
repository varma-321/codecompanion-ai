import { Loader2, CheckCircle2, XCircle, AlertTriangle, Circle } from 'lucide-react';
import type { ExecutionStatus as StatusType } from '@/lib/executor';

interface ExecutionStatusProps {
  status: StatusType;
}

const statusConfig: Record<StatusType, { label: string; icon: React.ElementType; colorClass: string }> = {
  ready: { label: 'Ready', icon: Circle, colorClass: 'text-muted-foreground' },
  sending: { label: 'Sending Code', icon: Loader2, colorClass: 'text-primary' },
  compiling: { label: 'Compiling', icon: Loader2, colorClass: 'text-warning' },
  running: { label: 'Running', icon: Loader2, colorClass: 'text-primary' },
  complete: { label: 'Execution Complete', icon: CheckCircle2, colorClass: 'text-success' },
  compile_error: { label: 'Compilation Error', icon: AlertTriangle, colorClass: 'text-destructive' },
  failed: { label: 'Execution Failed', icon: XCircle, colorClass: 'text-destructive' },
};

const ExecutionStatus = ({ status }: ExecutionStatusProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isSpinning = ['sending', 'compiling', 'running'].includes(status);

  return (
    <div className={`ml-auto flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 ${config.colorClass} transition-colors duration-300`}>
      <Icon className={`h-3 w-3 ${isSpinning ? 'animate-spin' : ''}`} />
      <span className="text-[11px] font-medium">{config.label}</span>
    </div>
  );
};

export default ExecutionStatus;
