-- Simplified creator_monthly_settlements view using revenue_ledger as single source of truth
-- All payments (course, drill, routine, feedback, subscription) are recorded in revenue_ledger

DROP VIEW IF EXISTS creator_monthly_settlements;

CREATE VIEW creator_monthly_settlements AS
SELECT
    rl.creator_id,
    c.name as creator_name,
    u.email as creator_email,
    c.payout_settings,
    DATE_TRUNC('month', rl.created_at) as settlement_month,
    COUNT(*)::bigint as total_sales_count,
    SUM(rl.amount)::numeric as total_revenue,
    SUM(rl.creator_revenue)::numeric as settlement_amount,
    SUM(rl.platform_fee)::numeric as platform_fee,
    -- 유형별 판매 수량
    COUNT(*) FILTER (WHERE rl.product_type = 'course')::bigint as course_count,
    COUNT(*) FILTER (WHERE rl.product_type = 'routine')::bigint as routine_count,
    COUNT(*) FILTER (WHERE rl.product_type = 'feedback')::bigint as feedback_count,
    COUNT(*) FILTER (WHERE rl.product_type = 'subscription_distribution')::bigint as subscription_count,
    COUNT(*) FILTER (WHERE rl.product_type = 'bundle')::bigint as bundle_count,
    -- 유형별 수익
    COALESCE(SUM(rl.creator_revenue) FILTER (WHERE rl.product_type = 'course'), 0)::numeric as course_revenue,
    COALESCE(SUM(rl.creator_revenue) FILTER (WHERE rl.product_type = 'routine'), 0)::numeric as routine_revenue,
    COALESCE(SUM(rl.creator_revenue) FILTER (WHERE rl.product_type = 'feedback'), 0)::numeric as feedback_revenue,
    COALESCE(SUM(rl.creator_revenue) FILTER (WHERE rl.product_type = 'subscription_distribution'), 0)::numeric as subscription_revenue,
    COALESCE(SUM(rl.creator_revenue) FILTER (WHERE rl.product_type = 'bundle'), 0)::numeric as bundle_revenue
FROM revenue_ledger rl
JOIN creators c ON rl.creator_id = c.id
LEFT JOIN users u ON c.id = u.id
WHERE rl.creator_id IS NOT NULL
  AND rl.product_type NOT IN ('subscription', 'subscription_upgrade')  -- 구독 원본은 제외 (distribution만 포함)
  AND rl.status IN ('processed', 'pending')
GROUP BY rl.creator_id, c.name, u.email, c.payout_settings, DATE_TRUNC('month', rl.created_at);

GRANT SELECT ON creator_monthly_settlements TO service_role;
GRANT SELECT ON creator_monthly_settlements TO authenticated;
