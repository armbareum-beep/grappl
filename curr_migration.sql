-- 1. 누락된 드릴/루틴 구매 테이블 (유지 - 이미 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS user_drills (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  price_paid INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, drill_id)
);

CREATE TABLE IF NOT EXISTS user_routines (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  price_paid INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, routine_id)
);

-- 2. 정산 뷰 생성 (프로덕션 DB 컬럼명 대응 수정)
-- user_courses 테이블은 'purchased_at' 대신 기본 'created_at'을 사용합니다.

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
