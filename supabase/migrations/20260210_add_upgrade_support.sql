-- 구독 업그레이드 지원 추가 (2026-02-10)

-- 1. 'upgraded' 상태 추가
DO $$
BEGIN
    -- 기존 제약 조건 제거
    ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

    -- 새 제약 조건 추가
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
        CHECK (status IN ('active', 'canceling', 'canceled', 'expired', 'past_due', 'upgraded'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
    ON subscriptions(user_id, status, plan_interval);

-- 3. 업그레이드 가능 여부 확인 함수
CREATE OR REPLACE FUNCTION can_user_upgrade_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions
        WHERE user_id = p_user_id
            AND status = 'active'
            AND plan_interval = 'month'
            AND current_period_end > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 업그레이드 가능 구독 뷰
CREATE OR REPLACE VIEW upgrade_eligible_subscriptions AS
SELECT
    s.*,
    EXTRACT(DAY FROM (s.current_period_end - NOW()))::INTEGER as remaining_days,
    CASE WHEN s.subscription_tier = 'premium' THEN 39000 ELSE 29000 END as monthly_amount,
    CASE WHEN s.subscription_tier = 'premium' THEN 390000 ELSE 290000 END as yearly_amount
FROM subscriptions s
WHERE s.status = 'active'
    AND s.plan_interval = 'month'
    AND s.current_period_end > NOW();

-- 5. 권한 설정
GRANT SELECT ON upgrade_eligible_subscriptions TO authenticated;

-- 6. 업그레이드 크레딧 조회 함수
CREATE OR REPLACE FUNCTION calculate_upgrade_credit(p_subscription_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_daily_rate NUMERIC;
    v_remaining_days INTEGER;
    v_credit NUMERIC;
    v_yearly_price INTEGER;
    v_final_amount NUMERIC;
BEGIN
    -- 구독 정보 조회
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE id = p_subscription_id AND status = 'active' AND plan_interval = 'month';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active monthly subscription not found';
    END IF;

    -- 남은 일수 계산
    v_remaining_days := CEIL(EXTRACT(EPOCH FROM (v_subscription.current_period_end - NOW())) / 86400)::INTEGER;

    -- 남은 기간이 1일 미만이면 업그레이드 불가
    IF v_remaining_days < 1 THEN
        RAISE EXCEPTION 'Not enough days remaining for upgrade';
    END IF;

    -- 일일 요금 계산
    v_daily_rate := v_subscription.amount::NUMERIC / 30;

    -- 크레딧 계산
    v_credit := FLOOR(v_daily_rate * v_remaining_days);

    -- 연간 가격 결정
    v_yearly_price := CASE WHEN v_subscription.subscription_tier = 'premium' THEN 390000 ELSE 290000 END;

    -- 최종 결제 금액
    v_final_amount := v_yearly_price - v_credit;

    -- 결과 반환
    RETURN jsonb_build_object(
        'remaining_days', v_remaining_days,
        'daily_rate', v_daily_rate,
        'credit_amount', v_credit,
        'yearly_price', v_yearly_price,
        'final_amount', v_final_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 설정
GRANT EXECUTE ON FUNCTION calculate_upgrade_credit(UUID) TO authenticated;
