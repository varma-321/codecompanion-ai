
REVOKE EXECUTE ON FUNCTION public.award_coins(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_item(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_coins(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_coins(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(UUID, INTEGER, TEXT) TO authenticated, service_role;
