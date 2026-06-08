import { Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/user-context';
import { useCoinBalance } from '@/lib/coins';

export default function CoinBadge({ className = '' }: { className?: string }) {
  const { authUser } = useUser();
  const { balance } = useCoinBalance(authUser?.id);
  const navigate = useNavigate();
  if (!authUser) return null;
  return (
    <button
      onClick={() => navigate('/store')}
      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-secondary/60 hover:bg-secondary text-[12px] font-medium transition-colors ${className}`}
      title="Coin balance — open store"
    >
      <Coins className="h-3.5 w-3.5 text-amber-500" />
      <span>{balance.balance.toLocaleString()}</span>
    </button>
  );
}
