import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';

export interface CoinBalance {
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

export interface StoreItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  icon: string | null;
  enabled: boolean;
  sort_order: number;
  meta: Record<string, unknown> | null;
}

export interface CoinRewardRule {
  key: string;
  label: string;
  description: string | null;
  amount: number;
  enabled: boolean;
  per_day_limit: number | null;
}

export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  kind: string;
  reason: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
}

export async function fetchBalance(userId: string): Promise<CoinBalance> {
  const { data } = await (supabase as any)
    .from('user_coins')
    .select('balance, lifetime_earned, lifetime_spent')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };
}

export async function fetchTransactions(userId: string, limit = 50): Promise<CoinTransaction[]> {
  const { data } = await (supabase as any)
    .from('coin_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as CoinTransaction[];
}

export async function fetchStoreItems(): Promise<StoreItem[]> {
  const { data } = await (supabase as any)
    .from('store_items')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data ?? []) as StoreItem[];
}

export async function fetchRewardRules(): Promise<CoinRewardRule[]> {
  const { data } = await (supabase as any)
    .from('coin_reward_rules')
    .select('*')
    .order('key', { ascending: true });
  return (data ?? []) as CoinRewardRule[];
}

export async function purchaseItem(slug: string): Promise<{ ok: boolean; remaining?: number; error?: string }> {
  const { data, error } = await (supabase as any).rpc('purchase_item', { _item_slug: slug });
  if (error) return { ok: false, error: error.message };
  return { ok: true, remaining: (data as any)?.remaining };
}

export async function awardCoins(userId: string, ruleKey: string, claimKey?: string): Promise<number> {
  const { data } = await (supabase as any).rpc('award_coins', {
    _user_id: userId,
    _rule_key: ruleKey,
    _claim_key: claimKey ?? null,
  });
  return Number(data ?? 0);
}

export async function adminAdjustCoins(targetUserId: string, amount: number, reason: string) {
  return (supabase as any).rpc('admin_adjust_coins', {
    _target_user: targetUserId,
    _amount: amount,
    _reason: reason,
  });
}

export async function adminUpdateRule(key: string, patch: Partial<CoinRewardRule>) {
  return (supabase as any).from('coin_reward_rules').update(patch).eq('key', key);
}

export async function adminUpdateItem(id: string, patch: Partial<StoreItem>) {
  return (supabase as any).from('store_items').update(patch).eq('id', id);
}

export function useCoinBalance(userId: string | null | undefined) {
  const [balance, setBalance] = useState<CoinBalance>({ balance: 0, lifetime_earned: 0, lifetime_spent: 0 });
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try { setBalance(await fetchBalance(userId)); } finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { balance, loading, refresh };
}
