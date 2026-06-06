
# Plan: Mobile Access + Context-Aware AI + Coins Economy & Store

This is a large multi-area change. I'll ship it in 4 focused phases so nothing breaks the existing compiler, auth, or progress flows.

---

## Phase 1 — Mobile UI Access Audit (no feature removal)

Goal: every module reachable on mobile, no buttons removed.

- Audit `AppShell`, sidebar, `Toolbar`, `ProblemWorkspace`, `DailyQuestion`, admin pages on a 375px viewport.
- Add a mobile module drawer (hamburger → full module list mirroring desktop sidebar) so every route in `App.tsx` is reachable on phones.
- Ensure horizontal-scroll toolbars keep all buttons (Run, Save, GitHub, AI toggle, Settings, Logout, Theme, Profile) — just wrap into a 2-row layout on <640px instead of hiding any.
- Fix workspace tab strip so Description / Code / Tests / Console / Notes / AI all reachable on mobile via swipe + dropdown.
- No business logic changes here.

---

## Phase 2 — Context-Aware AI Chat (global + per-problem)

Goal: the AI chat acts as a general chatbot AND always knows the current problem when one is open.

- Create a lightweight `AIContextProvider` (`src/lib/ai-context.tsx`) that tracks:
  - `currentProblem` (key, title, description, examples, constraints) — set by ProblemWorkspace / DailyQuestion / Contest / Learning pages on mount.
  - `currentCode` (latest editor buffer) — set by `CodeEditor` via callback.
  - `currentModule` (striver / neetcode / leetcode150 / daily / playground / etc).
- Update `AIChatPanel` to:
  - Inject this context into every system prompt automatically.
  - Handle free-form messages ("explain this problem", "more test cases", "verify my code", "find the mistake") by routing them with the same context — no manual tool selection needed.
  - Fall back to pure general chatbot when no problem is loaded (e.g. on Dashboard, Mailbox).
- Keep the existing AI Tools dropdown intact; this just makes general typed messages problem-aware.
- Backend: extend `agent-chat` edge function payload with `{ problemContext, code, module }` and prepend a structured system block.

---

## Phase 3 — Coins Economy (earning side)

### DB (new tables, all with GRANTs + RLS)
- `user_coins` — `user_id`, `balance`, `lifetime_earned`, `lifetime_spent`.
- `coin_transactions` — `user_id`, `delta`, `reason`, `meta jsonb`, `created_at`.
- `coin_reward_rules` — admin-editable: `key`, `label`, `amount`, `enabled`. Seeded with the 8 earn rules below.
- `coin_daily_claims` — `user_id`, `module`, `claim_date` (unique) for per-module first-submission tracking.

### Earn rules (seeded, admin-editable amounts)
1. `first_submission_per_module_per_day` — 20 coins (per module per day)
2. `raise_discussion` — 20 coins per new discussion post
3. `streak_milestone` — 30 coins at streaks 25 / 50 / 100 / 250 / 500
4. **New**: `daily_question_solved` — 15 coins (LeetCode-style daily)
5. **New**: `contest_participation` — 25 coins per contest finished
6. **New**: `weekly_goal_completed` — 40 coins
7. **New**: `helpful_discussion_reply` (10+ likes) — 15 coins
8. **New**: `flashcard_review_streak_7` — 20 coins

### Wiring
- Server-side `award_coins(user_id, rule_key, meta)` Postgres function — single source of truth, idempotent (uses `coin_daily_claims` / unique meta keys to prevent double-award).
- Hook calls into existing submission flow, discussion post insert, streak update, daily question submit, contest result insert, weekly goal completion, flashcard review.

---

## Phase 4 — Store + Admin Controls

### DB
- `store_items` — admin-editable: `key`, `label`, `description`, `category`, `price`, `enabled`, `icon`.
- `user_inventory` — `user_id`, `item_key`, `acquired_at`, `active boolean`.

### Seeded items (admin-editable prices)
1. `streak_freeze_timetravel` — 200 coins (restore broken streak within 48h)
2. `theme_premium_1` (Aurora) — 300
3. `theme_premium_2` (Carbon) — 300
4. `theme_premium_3` (Sunset) — 300
5. `leaderboard_name_glow` — 250
6. `avatar_banner_effect` — 250
7. **New**: `profile_animated_avatar_frame` — 400
8. **New**: `xp_boost_24h` (2× XP for 24h) — 350
9. **New**: `custom_console_color_pack` — 150
10. **New**: `unlock_extra_hint_slot` — 200
11. **New**: `submission_confetti_pack` — 100

### UI
- `/store` page — categorized grid, balance header, "Buy" button → confirm modal → `purchase_item` RPC (atomic: deduct + insert inventory).
- `/profile` shows owned items + active toggles (themes, banner, name glow).
- Admin section in `AdminDashboard`:
  - **Users → Coins**: search user → add/remove coins (unlimited), see transaction log.
  - **Economy → Reward Rules**: edit `amount` / `enabled` per rule.
  - **Economy → Store Items**: edit `price` / `enabled` / `label` / `description` per item; add new items.

### Security
- All coin mutations behind SECURITY DEFINER functions; client cannot directly UPDATE `user_coins`.
- Admin checks via existing `has_role(auth.uid(), 'admin')`.

---

## Out of scope / clarifications I'm assuming
- Coins are non-monetary (in-app only, no real money). No payments integration.
- Time-travel streak heal restores at most one broken streak per purchase, within 48h window.
- Premium themes are CSS token swaps using the existing theme system.

If anything above should change (rule amounts, store prices, extra ideas), tell me and I'll adjust before building.

---

## Suggested execution order (4 separate AI turns to keep diffs reviewable)
1. Phase 1 (mobile audit) — frontend only.
2. Phase 2 (AI context provider + chat wiring) — frontend + 1 edge function tweak.
3. Phase 3 (coins schema + earn wiring) — migration + hooks.
4. Phase 4 (store page + admin economy controls) — migration + 2 pages + admin tab.

Approve and I'll start with Phase 1.
