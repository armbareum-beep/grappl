-- 무료 구독 회원 관리 기능
-- 관리자가 특정 사용자에게 무료 구독을 부여하고, 정산에서 제외

-- 1. users 테이블에 무료 구독 필드 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_complimentary_subscription BOOLEAN DEFAULT FALSE;

-- 2. 무료 구독 부여 함수
CREATE OR REPLACE FUNCTION grant_complimentary_subscription(
    target_user_id UUID,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
BEGIN
    -- users 테이블 업데이트
    UPDATE users
    SET
        is_subscriber = TRUE,
        is_complimentary_subscription = TRUE,
        subscription_tier = 'premium',
        subscription_end_date = end_date,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- 기존 무료 구독 레코드 삭제 후 재생성 (has_premium_subscription, check_routine_access 등 DB 함수 호환)
    DELETE FROM subscriptions
    WHERE user_id = target_user_id
    AND stripe_subscription_id = 'complimentary';

    INSERT INTO subscriptions (user_id, status, subscription_tier, plan_interval, current_period_start, current_period_end, stripe_subscription_id)
    VALUES (target_user_id, 'active', 'premium', 'month', NOW(), end_date, 'complimentary');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 무료 구독 취소 함수
CREATE OR REPLACE FUNCTION revoke_complimentary_subscription(
    target_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET
        is_subscriber = FALSE,
        is_complimentary_subscription = FALSE,
        subscription_tier = NULL,
        subscription_end_date = NULL,
        updated_at = NOW()
    WHERE id = target_user_id
    AND is_complimentary_subscription = TRUE;

    -- subscriptions 테이블에서도 무료 구독 레코드 삭제
    DELETE FROM subscriptions
    WHERE user_id = target_user_id
    AND stripe_subscription_id = 'complimentary';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 관리자용 사용자 목록 조회 함수 (구독 정보 포함)
-- 기존 함수 삭제 (반환 타입이 변경되었으므로)
DROP FUNCTION IF EXISTS get_all_users_admin();

-- 새로운 함수 생성
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    is_subscriber BOOLEAN,
    is_complimentary_subscription BOOLEAN,
    subscription_tier TEXT,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN,
    is_creator BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.is_subscriber,
        COALESCE(u.is_complimentary_subscription, FALSE) as is_complimentary_subscription,
        u.subscription_tier,
        u.subscription_end_date,
        COALESCE(u.is_admin, FALSE) as is_admin,
        COALESCE(u.is_creator, FALSE) as is_creator,
        u.created_at
    FROM users u
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 정산 뷰 업데이트 (무료 구독 회원 제외)
-- 기존 정산 뷰가 있다면 수정 필요
-- 예시: video_watch_logs에서 무료 구독 회원의 시청 기록 제외

COMMENT ON COLUMN users.is_complimentary_subscription IS '관리자가 부여한 무료 구독 여부 (정산 제외 대상)';
COMMENT ON FUNCTION grant_complimentary_subscription IS '관리자가 사용자에게 무료 구독 부여';
COMMENT ON FUNCTION revoke_complimentary_subscription IS '무료 구독 취소';
