
-- creator_monthly_settlements View v4
-- 정산 View - 모든 수익 유형 포함
--
-- 포함된 수익 유형:
-- 1. 코스 판매 (user_courses)
-- 2. 루틴 판매 (user_routine_purchases)
-- 3. 피드백 판매 (feedback_requests - completed + paid만)
-- 4. 스파링 판매 (user_videos)
-- 5. 구독 수익 배분 (revenue_ledger - subscription_distribution)
-- 6. 환불 차감 (revenue_ledger - refund)
-- 7. 번들 판매 (user_bundles - 크리에이터별 비례 배분, 코스+루틴+스파링 기준)
-- 참고: 드릴은 개별 판매 상품 아님 (루틴의 재료)

CREATE OR REPLACE VIEW creator_monthly_settlements AS
WITH
-- 번들 내 아이템별 가치 계산 (코스 + 루틴 + 스파링)
bundle_items AS (
    -- 코스
    SELECT bc.bundle_id, c.creator_id, COALESCE(c.price, 0) as item_value
    FROM bundle_courses bc
    JOIN courses c ON bc.course_id = c.id
    UNION ALL
    -- 루틴
    SELECT br.bundle_id, r.creator_id, COALESCE(r.price, 0) as item_value
    FROM bundle_routines br
    JOIN routines r ON br.routine_id = r.id
    UNION ALL
    -- 스파링
    SELECT bs.bundle_id, sv.creator_id, COALESCE(sv.price, 0) as item_value
    FROM bundle_sparring bs
    JOIN sparring_videos sv ON bs.sparring_id = sv.id
),
-- 번들별 총 가치 계산
bundle_totals AS (
    SELECT bundle_id, SUM(item_value) as total_value
    FROM bundle_items
    GROUP BY bundle_id
),
-- 번들별 크리에이터 가치 계산
bundle_creator_values AS (
    SELECT bundle_id, creator_id, SUM(item_value) as creator_value
    FROM bundle_items
    GROUP BY bundle_id, creator_id
),
combined_sales AS (
    -- 1. 코스 판매
    SELECT uc.created_at as created_at, c.creator_id, uc.price_paid as amount, 'course' as type, c.title as item_title
    FROM user_courses uc JOIN courses c ON uc.course_id = c.id
    UNION ALL
    -- 2. 루틴 판매
    SELECT ur.purchased_at as created_at, r.creator_id, r.price as amount, 'routine' as type, r.title as item_title
    FROM user_routine_purchases ur JOIN routines r ON ur.routine_id = r.id
    UNION ALL
    -- 3. 피드백 판매 (완료 + 결제 완료된 피드백만 정산)
    SELECT fr.created_at, fr.instructor_id as creator_id, fr.price as amount, 'feedback' as type, '1:1 피드백' as item_title
    FROM feedback_requests fr
    WHERE fr.status = 'completed' AND fr.payment_status = 'paid'
    UNION ALL
    -- 4. 스파링 판매
    SELECT uv.purchased_at as created_at, sv.creator_id, sv.price as amount, 'sparring' as type, sv.title as item_title
    FROM user_videos uv JOIN sparring_videos sv ON uv.video_id = sv.id
    UNION ALL
    -- 5. 구독 수익 배분 (이미 80%가 적용된 순수 크리에이터 수익, 역산 필요)
    SELECT rl.created_at, rl.creator_id, CEIL(rl.creator_revenue / 0.8) as amount, 'subscription' as type, '구독 수익 배분' as item_title
    FROM revenue_ledger rl
    WHERE rl.product_type = 'subscription_distribution'
    UNION ALL
    -- 6. 환불 차감 (creator_revenue 역산)
    SELECT rl.created_at, rl.creator_id, CEIL(rl.creator_revenue / 0.8) as amount, 'refund' as type, '환불' as item_title
    FROM revenue_ledger rl
    WHERE rl.product_type = 'refund' AND rl.creator_id IS NOT NULL
    UNION ALL
    -- 7. 번들 판매 (크리에이터별 비례 배분 - 코스+루틴+스파링 기준)
    -- 예: 번들 = Creator A의 $100 코스 + Creator B의 $50 루틴, 판매가 $120
    --     Creator A 몫: ($100 / $150) × $120 = $80
    --     Creator B 몫: ($50 / $150) × $120 = $40
    SELECT
        ub.purchased_at as created_at,
        bcv.creator_id,
        FLOOR(ub.price_paid * bcv.creator_value / NULLIF(bt.total_value, 0)) as amount,
        'bundle' as type,
        '번들 판매' as item_title
    FROM user_bundles ub
    JOIN bundle_creator_values bcv ON ub.bundle_id = bcv.bundle_id
    JOIN bundle_totals bt ON ub.bundle_id = bt.bundle_id
    WHERE bcv.creator_value > 0 AND bt.total_value > 0
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
