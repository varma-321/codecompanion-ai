  import { Loader2, CheckCircle2, XCircle, AlertTriangle, Circle } from 'lucide-react';
  import type { ExecutionStatus as StatusType } from '@/lib/executor';

  interface ExecutionStatusProps {
    status: StatusType;
  }

  const statusConfig: Record<StatusType, { label: string; icon: React.ElementType; colorClass: string }> = {
    ready: { label: 'Ready', icon: Circle, colorClass: 'text-emerald-400' },
    sending: { label: 'Sending Code', icon: Loader2, colorClass: 'text-blue-400' },
    compiling: { label: 'Compiling', icon: Loader2, colorClass: 'text-amber-400' },
    running: { label: 'Running', icon: Loader2, colorClass: 'text-blue-400' },
    complete: { label: 'Complete', icon: CheckCircle2, colorClass: 'text-emerald-400' },
    compile_error: { label: 'Error', icon: AlertTriangle, colorClass: 'text-rose-400' },
    failed: { label: 'Failed', icon: XCircle, colorClass: 'text-rose-400' },
    stopped: { label: 'Stopped', icon: XCircle, colorClass: 'text-amber-400' },
  };

  const ExecutionStatus = ({ status }: ExecutionStatusProps) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    const isSpinning = ['sending', 'compiling', 'running'].includes(status);

    return (
      <div className={`flex items-center gap-1.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/5 px-2.5 py-0.5 ${config.colorClass} transition-all duration-300 shadow-sm`}>
        <Icon className={`h-3 w-3 ${isSpinning ? 'animate-spin' : ''}`} />
        <span className="text-[11px] font-medium">{config.label}</span>
      </div>
    );
  };

  export default ExecutionStatus;
