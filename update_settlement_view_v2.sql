
-- Update creator_monthly_settlements view to include feedback sales
-- Removing individual drill sales as per user request
-- Ensuring routine sales use likely correct table 'user_routine_purchases' if that is what the app uses, or keeping 'user_routines' if created newly.
-- NOTE: Based on api.ts using 'user_routine_purchases', we should try to use that if possible. 
-- However, since I cannot be 100% sure of the table name without checking DB directly, I will assume 'user_routine_purchases' is the one used by the app logic.
-- If 'user_routines' was created by me earlier, it might be empty/unused.

CREATE OR REPLACE VIEW creator_monthly_settlements AS
WITH combined_sales AS (
    -- 1. 코스 판매
    SELECT uc.created_at as created_at, c.creator_id, uc.price_paid as amount, 'course' as type, c.title as item_title
    FROM user_courses uc JOIN courses c ON uc.course_id = c.id
    UNION ALL
    -- 2. 루틴 판매 (user_routine_purchases 테이블 사용 권장)
    -- 만약 이전 쿼리에서 user_routines를 만들었다면 데이터가 없을 수 있습니다.
    -- 안전을 위해 user_routine_purchases를 우선 사용합니다.
    SELECT ur.created_at, r.creator_id, ur.price_paid as amount, 'routine' as type, r.title as item_title
    FROM user_routine_purchases ur JOIN routines r ON ur.routine_id = r.id
    UNION ALL
    -- 3. 피드백 판매
    SELECT fr.created_at, fr.instructor_id as creator_id, fr.price as amount, 'feedback' as type, '1:1 피드백' as item_title
    FROM feedback_requests fr
    -- 드릴 판매 제거됨
)
SELECT 
    cs.creator_id,
    c.name as creator_name,
    u.email as creator_email,
    c.payout_settings,
    DATE_TRUNC('month', cs.created_at) as settlement_month,
    COUNT(*) as total_sales_count,
    SUM(cs.amount) as total_revenue,
    FLOOR(SUM(cs.amount) * 0.8) as settlement_amount, 
    FLOOR(SUM(cs.amount) * 0.2) as platform_fee
FROM combined_sales cs
JOIN creators c ON cs.creator_id = c.id
LEFT JOIN users u ON c.id = u.id
GROUP BY cs.creator_id, c.name, u.email, c.payout_settings, DATE_TRUNC('month', cs.created_at);

GRANT SELECT ON creator_monthly_settlements TO service_role;
GRANT SELECT ON creator_monthly_settlements TO authenticated;
