import { useEffect, useState } from 'react';
import { Coins, ShoppingBag, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useUser } from '@/lib/user-context';
import {
  fetchStoreItems, fetchBalance, purchaseItem,
  type StoreItem, type CoinBalance,
} from '@/lib/coins';
import { supabase } from '@/integrations/supabase/client';

export default function Store() {
  const { authUser } = useUser();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [balance, setBalance] = useState<CoinBalance>({ balance: 0, lifetime_earned: 0, lifetime_spent: 0 });
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<StoreItem | null>(null);
  const [buying, setBuying] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [it, bal] = await Promise.all([fetchStoreItems(), authUser ? fetchBalance(authUser.id) : Promise.resolve(null)]);
    setItems(it.filter(i => i.enabled));
    if (bal) setBalance(bal);
    if (authUser) {
      const { data } = await (supabase as any).from('user_inventory').select('item_slug').eq('user_id', authUser.id);
      setOwned(new Set((data ?? []).map((r: any) => r.item_slug)));
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [authUser?.id]);

  const handleBuy = async () => {
    if (!confirm) return;
    setBuying(true);
    const res = await purchaseItem(confirm.slug);
    setBuying(false);
    if (!res.ok) {
      toast.error(res.error || 'Purchase failed');
      return;
    }
    toast.success(`Purchased ${confirm.name}`);
    setConfirm(null);
    refresh();
  };

  const grouped = items.reduce<Record<string, StoreItem[]>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Store
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Spend coins on themes, boosts, and cosmetics.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 h-10 rounded-md border border-border bg-card">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="font-semibold tabular-nums">{balance.balance.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">coins</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <section key={cat} className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map(item => {
                const isOwned = owned.has(item.slug);
                const canAfford = balance.balance >= item.price;
                return (
                  <Card key={item.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</div>
                      </div>
                      {isOwned && <Badge variant="secondary" className="text-[10px]"><Check className="h-3 w-3 mr-1" />Owned</Badge>}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold">
                        <Coins className="h-3.5 w-3.5 text-amber-500" /> {item.price}
                      </span>
                      <Button
                        size="sm"
                        variant={isOwned ? 'outline' : 'default'}
                        disabled={!canAfford && !isOwned}
                        onClick={() => setConfirm(item)}
                      >
                        {isOwned ? 'Buy again' : canAfford ? 'Buy' : 'Need more'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm purchase</DialogTitle>
            <DialogDescription>
              Spend <strong>{confirm?.price}</strong> coins on <strong>{confirm?.name}</strong>? Your balance will be {Math.max(0, balance.balance - (confirm?.price ?? 0))} after.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button onClick={handleBuy} disabled={buying}>
              {buying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
