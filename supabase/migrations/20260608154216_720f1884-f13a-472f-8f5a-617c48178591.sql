
-- ============ COINS TABLES ============

CREATE TABLE public.user_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_coins TO authenticated;
GRANT ALL ON public.user_coins TO service_role;
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own balance" ON public.user_coins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all balances" ON public.user_coins FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coin_tx_user ON public.coin_transactions(user_id, created_at DESC);
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tx" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all tx" ON public.coin_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.coin_reward_rules (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  per_day_limit INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coin_reward_rules TO authenticated, anon;
GRANT ALL ON public.coin_reward_rules TO service_role;
ALTER TABLE public.coin_reward_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view rules" ON public.coin_reward_rules FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Admins manage rules" ON public.coin_reward_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.coin_daily_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  claim_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, rule_key, claim_key)
);
GRANT SELECT ON public.coin_daily_claims TO authenticated;
GRANT ALL ON public.coin_daily_claims TO service_role;
ALTER TABLE public.coin_daily_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own claims" ON public.coin_daily_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'cosmetic',
  price INTEGER NOT NULL,
  icon TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_items TO authenticated, anon;
GRANT ALL ON public.store_items TO service_role;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view items" ON public.store_items FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Admins manage items" ON public.store_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_slug TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  equipped BOOLEAN NOT NULL DEFAULT false,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, item_slug)
);
GRANT SELECT, UPDATE ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own inventory" ON public.user_inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users equip own items" ON public.user_inventory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view inventory" ON public.user_inventory FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ FUNCTIONS ============

CREATE OR REPLACE FUNCTION public.award_coins(
  _user_id UUID,
  _rule_key TEXT,
  _claim_key TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _rule RECORD;
  _claim TEXT;
BEGIN
  SELECT * INTO _rule FROM coin_reward_rules WHERE key = _rule_key AND enabled = true;
  IF NOT FOUND THEN RETURN 0; END IF;

  _claim := COALESCE(_claim_key, to_char(now(), 'YYYY-MM-DD'));

  BEGIN
    INSERT INTO coin_daily_claims (user_id, rule_key, claim_key) VALUES (_user_id, _rule_key, _claim);
  EXCEPTION WHEN unique_violation THEN
    RETURN 0;
  END;

  INSERT INTO user_coins (user_id, balance, lifetime_earned)
  VALUES (_user_id, _rule.amount, _rule.amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_coins.balance + _rule.amount,
    lifetime_earned = user_coins.lifetime_earned + _rule.amount,
    updated_at = now();

  INSERT INTO coin_transactions (user_id, amount, kind, reason, meta)
  VALUES (_user_id, _rule.amount, 'earn', _rule.label, jsonb_build_object('rule_key', _rule_key, 'claim_key', _claim));

  RETURN _rule.amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_item(_item_slug TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _item RECORD;
  _bal INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _item FROM store_items WHERE slug = _item_slug AND enabled = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not available'; END IF;

  SELECT balance INTO _bal FROM user_coins WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _item.price THEN RAISE EXCEPTION 'Insufficient coins'; END IF;

  UPDATE user_coins SET balance = balance - _item.price, lifetime_spent = lifetime_spent + _item.price, updated_at = now() WHERE user_id = _uid;

  INSERT INTO user_inventory (user_id, item_slug, quantity)
  VALUES (_uid, _item_slug, 1)
  ON CONFLICT (user_id, item_slug) DO UPDATE SET quantity = user_inventory.quantity + 1;

  INSERT INTO coin_transactions (user_id, amount, kind, reason, meta)
  VALUES (_uid, -_item.price, 'spend', 'Purchase: ' || _item.name, jsonb_build_object('item_slug', _item_slug));

  RETURN jsonb_build_object('ok', true, 'remaining', _bal - _item.price);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_coins(_target_user UUID, _amount INTEGER, _reason TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;

  INSERT INTO user_coins (user_id, balance, lifetime_earned, lifetime_spent)
  VALUES (_target_user, GREATEST(_amount, 0), GREATEST(_amount, 0), GREATEST(-_amount, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    balance = GREATEST(user_coins.balance + _amount, 0),
    lifetime_earned = user_coins.lifetime_earned + GREATEST(_amount, 0),
    lifetime_spent = user_coins.lifetime_spent + GREATEST(-_amount, 0),
    updated_at = now();

  INSERT INTO coin_transactions (user_id, amount, kind, reason, meta)
  VALUES (_target_user, _amount, 'admin', COALESCE(_reason, 'Admin adjustment'), jsonb_build_object('admin_id', auth.uid()));
END;
$$;

-- ============ SEEDS ============

INSERT INTO public.coin_reward_rules (key, label, description, amount, per_day_limit) VALUES
  ('first_submission_daily', 'First Submission of the Day', 'Awarded for your first accepted submission each day', 20, 1),
  ('daily_question_solved', 'Daily Question Solved', 'Solve the daily LeetCode-style question', 15, 1),
  ('streak_milestone_7', '7-Day Streak Milestone', 'Maintain a 7-day streak', 30, 1),
  ('discussion_post_created', 'Raised a Discussion', 'Start a thoughtful discussion thread', 20, 3),
  ('helpful_reply', 'Helpful Discussion Reply', 'Your reply was marked helpful', 15, 5),
  ('contest_participation', 'Contest Participation', 'Joined a contest', 25, 1),
  ('weekly_goal_met', 'Weekly Goal Met', 'Hit your weekly problem-solving goal', 40, 1),
  ('flashcard_review_7', 'Flashcard Review Streak', 'Reviewed flashcards 7 days in a row', 20, 1)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.store_items (slug, name, description, category, price, icon, sort_order) VALUES
  ('streak_freeze', 'Streak Freeze (48h)', 'Restore one broken streak within the last 48 hours', 'utility', 200, 'Snowflake', 1),
  ('theme_midnight', 'Theme: Midnight', 'Premium dark theme for the workspace', 'theme', 300, 'Moon', 2),
  ('theme_solarized', 'Theme: Solarized', 'Premium warm-tone theme', 'theme', 300, 'Sun', 3),
  ('theme_dracula', 'Theme: Dracula', 'Premium purple-tinted theme', 'theme', 300, 'Sparkles', 4),
  ('name_glow', 'Leaderboard Name Glow', 'Glowing name on the leaderboard', 'cosmetic', 250, 'Star', 5),
  ('avatar_banner', 'Avatar Banner', 'Decorative banner under your avatar', 'cosmetic', 250, 'Flag', 6),
  ('avatar_frame_animated', 'Animated Avatar Frame', 'Animated frame around your avatar', 'cosmetic', 400, 'Frame', 7),
  ('xp_boost_24h', 'XP Boost (24h)', '2x XP for 24 hours', 'utility', 350, 'Zap', 8),
  ('console_colors', 'Console Color Pack', 'Extra color palettes for the terminal', 'cosmetic', 150, 'Palette', 9),
  ('extra_hint_slot', 'Extra Hint Slot', 'One additional AI hint per problem', 'utility', 200, 'Lightbulb', 10),
  ('submission_confetti', 'Submission Confetti', 'Confetti animation on accepted submissions', 'cosmetic', 100, 'PartyPopper', 11)
ON CONFLICT (slug) DO NOTHING;

CREATE TRIGGER trg_store_items_updated BEFORE UPDATE ON public.store_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_user_coins_updated BEFORE UPDATE ON public.user_coins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
