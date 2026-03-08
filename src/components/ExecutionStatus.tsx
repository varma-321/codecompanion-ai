import { Loader2, CheckCircle2, XCircle, AlertTriangle, Circle } from 'lucide-react';
import type { ExecutionStatus as StatusType } from '@/lib/piston';

interface ExecutionStatusProps {
  status: StatusType;
}

const statusConfig: Record<StatusType, { label: string; icon: React.ElementType; colorClass: string }> = {
  ready: { label: 'Ready', icon: Circle, colorClass: 'text-muted-foreground' },
  checking: { label: 'Checking Piston', icon: Loader2, colorClass: 'text-warning' },
  sending: { label: 'Sending Code', icon: Loader2, colorClass: 'text-primary' },
  running: { label: 'Running', icon: Loader2, colorClass: 'text-primary' },
  complete: { label: 'Execution Complete', icon: CheckCircle2, colorClass: 'text-success' },
  compile_error: { label: 'Compilation Error', icon: AlertTriangle, colorClass: 'text-destructive' },
  failed: { label: 'Execution Failed', icon: XCircle, colorClass: 'text-destructive' },
};

const ExecutionStatus = ({ status }: ExecutionStatusProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isSpinning = ['checking', 'sending', 'running'].includes(status);

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 border-b border-panel-border bg-card ${config.colorClass}`}>
      <Icon className={`h-3 w-3 ${isSpinning ? 'animate-spin' : ''}`} />
      <span className="text-[11px] font-medium">{config.label}</span>
    </div>
  );
};

export default ExecutionStatus;
