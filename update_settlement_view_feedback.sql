
-- Update creator_monthly_settlements view to include feedback sales
CREATE OR REPLACE VIEW creator_monthly_settlements AS
WITH combined_sales AS (
    -- 1. 코스 판매 (수정됨: purchased_at -> created_at)
    SELECT uc.created_at as created_at, c.creator_id, uc.price_paid as amount, 'course' as type, c.title as item_title
    FROM user_courses uc JOIN courses c ON uc.course_id = c.id
    UNION ALL
    -- 2. 드릴 판매 (새로 만든 테이블은 purchased_at 유지)
    SELECT ud.purchased_at as created_at, d.creator_id, ud.price_paid as amount, 'drill' as type, d.title as item_title
    FROM user_drills ud JOIN drills d ON ud.drill_id = d.id
    UNION ALL
    -- 3. 루틴 판매 (새로 만든 테이블은 purchased_at 유지)
    SELECT udr.purchased_at as created_at, r.creator_id, udr.price_paid as amount, 'routine' as type, r.title as item_title
    FROM user_routines udr JOIN routines r ON udr.routine_id = r.id
    UNION ALL
    -- 4. 피드백 판매 (새로 추가)
    -- 피드백 요청 테이블에서 status가 'completed'인 것만 정산 대상으로 간주할 수도 있으나, 
    -- 선결제 방식이라면 결제 시점(created_at) 기준으로 잡는 것이 일반적입니다. 환불은 별도 로직.
    -- 여기서는 status='completed' 조건 없이 결제된 모든 건을 잡거나, 
    -- 안전하게 'pending' 상태여도 매출은 일어났으므로 포함합니다.
    SELECT fr.created_at, fr.instructor_id as creator_id, fr.price as amount, 'feedback' as type, '1:1 피드백' as item_title
    FROM feedback_requests fr
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
