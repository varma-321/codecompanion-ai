import { useEffect, useState } from 'react';
import { Coins, Loader2, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUser } from '@/lib/user-context';
import { Navigate } from 'react-router-dom';
import {
  fetchRewardRules, fetchStoreItems, adminAdjustCoins,
  adminUpdateRule, adminUpdateItem,
  type CoinRewardRule, type StoreItem,
} from '@/lib/coins';
import { supabase } from '@/integrations/supabase/client';

interface UserLite { id: string; username: string; email: string | null; balance: number; }

export default function AdminCoins() {
  const { isAdmin, loading: userLoading } = useUser();
  const [rules, setRules] = useState<CoinRewardRule[]>([]);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [search, setSearch] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadUsers = async () => {
    const { data: profiles } = await (supabase as any).from('profiles').select('id, username, email').limit(200);
    const { data: coins } = await (supabase as any).from('user_coins').select('user_id, balance');
    const map = new Map<string, number>();
    (coins ?? []).forEach((c: any) => map.set(c.user_id, c.balance));
    setUsers((profiles ?? []).map((p: any) => ({ ...p, balance: map.get(p.id) ?? 0 })));
  };

  const refresh = async () => {
    const [r, i] = await Promise.all([fetchRewardRules(), fetchStoreItems()]);
    setRules(r); setItems(i);
    await loadUsers();
  };

  useEffect(() => { if (isAdmin) refresh(); /* eslint-disable-next-line */ }, [isAdmin]);

  if (userLoading) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleAdjust = async (uid: string, amount: number) => {
    const reason = prompt(`Reason for ${amount > 0 ? 'adding' : 'removing'} ${Math.abs(amount)} coins?`) ?? 'Admin adjustment';
    const { error } = await adminAdjustCoins(uid, amount, reason);
    if (error) toast.error(error.message); else { toast.success('Adjusted'); loadUsers(); }
  };

  const saveRule = async (rule: CoinRewardRule) => {
    setSavingKey(rule.key);
    const { error } = await adminUpdateRule(rule.key, { amount: rule.amount, enabled: rule.enabled, per_day_limit: rule.per_day_limit });
    setSavingKey(null);
    if (error) toast.error(error.message); else toast.success('Saved');
  };

  const saveItem = async (it: StoreItem) => {
    setSavingKey(it.id);
    const { error } = await adminUpdateItem(it.id, { price: it.price, enabled: it.enabled });
    setSavingKey(null);
    if (error) toast.error(error.message); else toast.success('Saved');
  };

  const filteredUsers = users.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" /> Coins Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Control balances, rewards, and store prices.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Balances</TabsTrigger>
          <TabsTrigger value="rules">Reward Rules</TabsTrigger>
          <TabsTrigger value="items">Store Items</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search username or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Card className="divide-y divide-border">
            {filteredUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{u.username || u.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                    <Coins className="h-3.5 w-3.5 text-amber-500" /> {u.balance}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleAdjust(u.id, +50)}>+50</Button>
                  <Button size="sm" variant="outline" onClick={() => handleAdjust(u.id, +500)}>+500</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const v = Number(prompt('Custom amount (negative to remove):') ?? 0);
                    if (v) handleAdjust(u.id, v);
                  }}>Custom</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleAdjust(u.id, -u.balance)} disabled={!u.balance}>Reset</Button>
                </div>
              </div>
            ))}
            {!filteredUsers.length && <div className="p-6 text-center text-sm text-muted-foreground">No users.</div>}
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-2">
          {rules.map((r, idx) => (
            <Card key={r.key} className="p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.description}</div>
              </div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <Input type="number" className="w-24" value={r.amount}
                onChange={e => { const v = [...rules]; v[idx] = { ...r, amount: Number(e.target.value) }; setRules(v); }} />
              <Switch checked={r.enabled} onCheckedChange={(v) => { const arr = [...rules]; arr[idx] = { ...r, enabled: v }; setRules(arr); }} />
              <Button size="sm" onClick={() => saveRule(rules[idx])} disabled={savingKey === r.key}>
                {savingKey === r.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="items" className="space-y-2">
          {items.map((it, idx) => (
            <Card key={it.id} className="p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-medium">{it.name}</div>
                <div className="text-xs text-muted-foreground">{it.category} · {it.description}</div>
              </div>
              <label className="text-xs text-muted-foreground">Price</label>
              <Input type="number" className="w-24" value={it.price}
                onChange={e => { const v = [...items]; v[idx] = { ...it, price: Number(e.target.value) }; setItems(v); }} />
              <Switch checked={it.enabled} onCheckedChange={(v) => { const arr = [...items]; arr[idx] = { ...it, enabled: v }; setItems(arr); }} />
              <Button size="sm" onClick={() => saveItem(items[idx])} disabled={savingKey === it.id}>
                {savingKey === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
