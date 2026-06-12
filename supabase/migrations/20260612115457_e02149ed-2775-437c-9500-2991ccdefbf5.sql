
-- Ensure every non-consumable store item has a duration (no permanent items)
UPDATE public.store_items
SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('duration_days', 7)
WHERE COALESCE(meta->>'consumable','false') <> 'true'
  AND (meta->>'duration_days') IS NULL
  AND (meta->>'duration_hours') IS NULL;

-- Backfill expires_at for previously-purchased items so nothing shows "Permanent".
UPDATE public.user_inventory ui
SET expires_at = now() + ((si.meta->>'duration_hours')::int || ' hours')::interval
FROM public.store_items si
WHERE ui.item_slug = si.slug
  AND ui.expires_at IS NULL
  AND (si.meta->>'duration_hours') IS NOT NULL;

UPDATE public.user_inventory ui
SET expires_at = now() + ((si.meta->>'duration_days')::int || ' days')::interval
FROM public.store_items si
WHERE ui.item_slug = si.slug
  AND ui.expires_at IS NULL
  AND ui.equipped = true
  AND (si.meta->>'duration_days') IS NOT NULL;

-- equip_item: start the cosmetic timer on equip (when expires_at is null or expired)
CREATE OR REPLACE FUNCTION public.equip_item(_item_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _item RECORD;
  _inv RECORD;
  _group TEXT;
  _days INT;
  _hours INT;
  _new_expiry TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _item FROM store_items WHERE slug = _item_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  SELECT * INTO _inv FROM user_inventory WHERE user_id = _uid AND item_slug = _item_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'You do not own this item'; END IF;

  _group := COALESCE(_item.meta->>'equip_group', _item.slug);
  _days  := NULLIF(_item.meta->>'duration_days','')::INT;
  _hours := NULLIF(_item.meta->>'duration_hours','')::INT;

  IF _inv.expires_at IS NULL OR _inv.expires_at < now() THEN
    IF _days IS NOT NULL THEN
      _new_expiry := now() + (_days || ' days')::interval;
    ELSIF _hours IS NOT NULL THEN
      _new_expiry := now() + (_hours || ' hours')::interval;
    ELSE
      _new_expiry := NULL;
    END IF;
    UPDATE user_inventory SET expires_at = _new_expiry
    WHERE user_id = _uid AND item_slug = _item_slug;
  END IF;

  UPDATE user_inventory ui
  SET equipped = false
  FROM store_items si
  WHERE ui.user_id = _uid
    AND ui.item_slug = si.slug
    AND COALESCE(si.meta->>'equip_group', si.slug) = _group
    AND ui.item_slug <> _item_slug;

  UPDATE user_inventory SET equipped = true WHERE user_id = _uid AND item_slug = _item_slug;
  RETURN jsonb_build_object('ok', true, 'group', _group);
END;
$$;

-- purchase_item: cosmetics (duration_days) leave expires_at NULL until equipped.
-- Power-ups (duration_hours) start ticking immediately on purchase.
CREATE OR REPLACE FUNCTION public.purchase_item(_item_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _item RECORD;
  _bal INT;
  _days INT;
  _hours INT;
  _new_expiry TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _item FROM store_items WHERE slug = _item_slug AND enabled = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not available'; END IF;

  SELECT balance INTO _bal FROM user_coins WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _item.price THEN RAISE EXCEPTION 'Insufficient coins'; END IF;

  UPDATE user_coins
  SET balance = balance - _item.price,
      lifetime_spent = lifetime_spent + _item.price,
      updated_at = now()
  WHERE user_id = _uid;

  _days  := NULLIF(_item.meta->>'duration_days','')::INT;
  _hours := NULLIF(_item.meta->>'duration_hours','')::INT;
  IF _hours IS NOT NULL THEN
    _new_expiry := now() + (_hours || ' hours')::interval;
  ELSE
    _new_expiry := NULL;
  END IF;

  INSERT INTO user_inventory (user_id, item_slug, quantity, expires_at, acquired_at)
  VALUES (_uid, _item_slug, 1, _new_expiry, now())
  ON CONFLICT (user_id, item_slug) DO UPDATE SET
    quantity = user_inventory.quantity + 1,
    expires_at = CASE
      WHEN _hours IS NOT NULL THEN
        CASE WHEN user_inventory.expires_at IS NULL OR user_inventory.expires_at < now()
             THEN _new_expiry
             ELSE user_inventory.expires_at + (_hours || ' hours')::interval END
      WHEN _days IS NOT NULL THEN
        CASE WHEN user_inventory.expires_at IS NOT NULL AND user_inventory.expires_at > now()
             THEN user_inventory.expires_at + (_days || ' days')::interval
             ELSE NULL END
      ELSE user_inventory.expires_at
    END,
    acquired_at = now();

  INSERT INTO coin_transactions (user_id, amount, kind, reason, meta)
  VALUES (_uid, -_item.price, 'spend', 'Purchase: ' || _item.name, jsonb_build_object('item_slug', _item_slug));

  RETURN jsonb_build_object('ok', true, 'remaining', _bal - _item.price, 'expires_at', _new_expiry);
END;
$$;

GRANT EXECUTE ON FUNCTION public.equip_item(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT) TO authenticated;
