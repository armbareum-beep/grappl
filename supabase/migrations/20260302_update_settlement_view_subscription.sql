-- Update creator_monthly_settlements view to include subscription distribution and feedback revenue

-- Drop existing view first to allow data type changes
DROP VIEW IF EXISTS creator_monthly_settlements;

CREATE VIEW creator_monthly_settlements AS
WITH combined_sales AS (
    -- 1. 코스 판매
    SELECT uc.created_at as created_at, c.creator_id, uc.price_paid as amount, 'course' as type, c.title as item_title
    FROM user_courses uc JOIN courses c ON uc.course_id = c.id
    UNION ALL
    -- 2. 드릴 판매
    SELECT ud.purchased_at as created_at, d.creator_id, ud.price_paid as amount, 'drill' as type, d.title as item_title
    FROM user_drills ud JOIN drills d ON ud.drill_id = d.id
    UNION ALL
    -- 3. 루틴 판매
    SELECT udr.purchased_at as created_at, r.creator_id, udr.price_paid as amount, 'routine' as type, r.title as item_title
    FROM user_routines udr JOIN routines r ON udr.routine_id = r.id
    UNION ALL
    -- 4. 피드백 수익 (완료된 유료 피드백)
    SELECT fr.completed_at as created_at, fr.instructor_id as creator_id, fr.price as amount, 'feedback' as type, '피드백' as item_title
    FROM feedback_requests fr
    WHERE fr.status = 'completed' AND fr.payment_status = 'paid' AND fr.price > 0
    UNION ALL
    -- 5. 구독 분배 수익 (revenue_ledger에서)
    SELECT rl.created_at, rl.creator_id, rl.creator_revenue as amount, 'subscription' as type, '구독 분배' as item_title
    FROM revenue_ledger rl
    WHERE rl.product_type = 'subscription_distribution' AND rl.status = 'processed' AND rl.creator_id IS NOT NULL
)
SELECT
    cs.creator_id,
    c.name as creator_name,
    u.email as creator_email,
    c.payout_settings,
    DATE_TRUNC('month', cs.created_at) as settlement_month,
    COUNT(*)::bigint as total_sales_count,
    SUM(cs.amount)::numeric as total_revenue,
    -- 직접 판매는 80%, 구독/피드백은 이미 계산된 금액 그대로
    SUM(CASE
        WHEN cs.type IN ('subscription', 'feedback') THEN cs.amount  -- 이미 크리에이터 몫으로 계산됨
        ELSE FLOOR(cs.amount * 0.8)  -- 직접 판매는 80%
    END)::numeric as settlement_amount,
    SUM(CASE
        WHEN cs.type IN ('subscription', 'feedback') THEN 0  -- 이미 수수료 제외됨
        ELSE FLOOR(cs.amount * 0.2)  -- 직접 판매는 20% 수수료
    END)::numeric as platform_fee
FROM combined_sales cs
JOIN creators c ON cs.creator_id = c.id
LEFT JOIN users u ON c.id = u.id
WHERE cs.created_at IS NOT NULL
GROUP BY cs.creator_id, c.name, u.email, c.payout_settings, DATE_TRUNC('month', cs.created_at);

GRANT SELECT ON creator_monthly_settlements TO service_role;
GRANT SELECT ON creator_monthly_settlements TO authenticated;
