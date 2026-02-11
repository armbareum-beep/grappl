-- ==============================================================================
-- 기간 기반 무료 구독 기능
-- 유료 결제 기간은 정산에 포함, 무료 추가 기간만 정산에서 제외
-- ==============================================================================

-- 1. users 테이블에 무료 기간 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS complimentary_start_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS complimentary_end_date DATE;

COMMENT ON COLUMN users.complimentary_start_date IS '무료 구독 시작일 (이 기간의 시청만 정산 제외)';
COMMENT ON COLUMN users.complimentary_end_date IS '무료 구독 종료일 (이 기간의 시청만 정산 제외)';

-- 2. grant_complimentary_subscription 함수 수정 (시작일, 종료일 받도록)
CREATE OR REPLACE FUNCTION grant_complimentary_subscription(
    target_user_id UUID,
    start_date DATE,
    end_date DATE
)
RETURNS VOID AS $$
BEGIN
    -- users 테이블 업데이트
    UPDATE users
    SET
        is_subscriber = TRUE,
        is_complimentary_subscription = TRUE,
        subscription_tier = 'premium',
        subscription_end_date = end_date + TIME '23:59:59',
        complimentary_start_date = start_date,
        complimentary_end_date = end_date,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- 기존 무료 구독 레코드 삭제 후 재생성
    DELETE FROM subscriptions
    WHERE user_id = target_user_id
    AND stripe_subscription_id = 'complimentary';

    INSERT INTO subscriptions (user_id, status, subscription_tier, plan_interval, current_period_start, current_period_end, stripe_subscription_id)
    VALUES (target_user_id, 'active', 'premium', 'month', start_date, end_date, 'complimentary');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 기존 유료 구독에 무료 기간 추가 (유료 상태 유지)
CREATE OR REPLACE FUNCTION extend_subscription_complimentary(
    target_user_id UUID,
    start_date DATE,
    end_date DATE
)
RETURNS VOID AS $$
BEGIN
    -- 무료 기간만 설정 (기존 유료 구독 상태는 유지)
    UPDATE users
    SET
        complimentary_start_date = start_date,
        complimentary_end_date = end_date,
        -- 만료일이 무료 기간 종료일보다 이전이면 연장
        subscription_end_date = GREATEST(COALESCE(subscription_end_date, end_date + TIME '23:59:59'), end_date + TIME '23:59:59'),
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. revoke_complimentary_subscription 함수 수정
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
        complimentary_start_date = NULL,
        complimentary_end_date = NULL,
        updated_at = NOW()
    WHERE id = target_user_id
    AND is_complimentary_subscription = TRUE;

    DELETE FROM subscriptions
    WHERE user_id = target_user_id
    AND stripe_subscription_id = 'complimentary';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 무료 기간만 제거 (유료 구독은 유지)
CREATE OR REPLACE FUNCTION clear_complimentary_period(
    target_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET
        complimentary_start_date = NULL,
        complimentary_end_date = NULL,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 정산 함수 수정 (기간 기반 무료 구독 체크 추가)
CREATE OR REPLACE FUNCTION calculate_monthly_subscription_distribution(target_month DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    total_sub_revenue NUMERIC;
    distributable_amount NUMERIC;
    total_watch_seconds BIGINT;

    creator_stats CURSOR FOR
        SELECT
            c.id AS creator_id,
            COALESCE(c.subscription_share, 0.8) as share_ratio,
            SUM(log.watch_seconds) as watch_seconds
        FROM video_watch_logs log
        INNER JOIN users u ON log.user_id = u.id
        LEFT JOIN lessons l ON log.lesson_id = l.id
        LEFT JOIN courses course ON l.course_id = course.id
        LEFT JOIN drills d ON log.drill_id = d.id
        LEFT JOIN sparring_videos s ON log.video_id = s.id
        LEFT JOIN creators c ON COALESCE(l.creator_id, course.creator_id, d.creator_id, s.creator_id) = c.id
        LEFT JOIN user_courses uc ON (l.course_id = uc.course_id AND uc.user_id = u.id)
        LEFT JOIN user_drills ud ON (log.drill_id = ud.drill_id AND ud.user_id = u.id)
        LEFT JOIN user_videos uv ON (log.video_id = uv.video_id AND uv.user_id = u.id)
        WHERE log.date >= start_date AND log.date < end_date
        AND c.id IS NOT NULL
        -- 1. 유료 구독자만
        AND u.is_subscriber = true
        -- 2. 전체 무료 구독자 제외
        AND (u.is_complimentary_subscription IS NULL OR u.is_complimentary_subscription = false)
        -- 3. 기간 기반 무료 구독 기간 내 시청 제외 (NEW!)
        AND NOT (
            u.complimentary_start_date IS NOT NULL
            AND u.complimentary_end_date IS NOT NULL
            AND log.date >= u.complimentary_start_date
            AND log.date <= u.complimentary_end_date
        )
        -- 4. 구매한 콘텐츠 제외
        AND uc.course_id IS NULL
        AND ud.drill_id IS NULL
        AND uv.video_id IS NULL
        -- 5. 구독 제외 콘텐츠 제외
        AND (course.is_subscription_excluded IS NULL OR course.is_subscription_excluded = false)
        AND (l.is_subscription_excluded IS NULL OR l.is_subscription_excluded = false)
        GROUP BY c.id;

    creator_rec RECORD;
    creator_payout NUMERIC;
BEGIN
    start_date := date_trunc('month', target_month);
    end_date := start_date + INTERVAL '1 month';

    SELECT COALESCE(SUM(amount), 0)
    INTO total_sub_revenue
    FROM revenue_ledger
    WHERE product_type = 'subscription'
    AND recognition_date >= start_date AND recognition_date < end_date;

    IF total_sub_revenue = 0 THEN
        RAISE NOTICE 'No subscription revenue found for %', start_date;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(log.watch_seconds), 0)
    INTO total_watch_seconds
    FROM video_watch_logs log
    INNER JOIN users u ON log.user_id = u.id
    LEFT JOIN lessons l ON log.lesson_id = l.id
    LEFT JOIN courses course ON l.course_id = course.id
    LEFT JOIN drills d ON log.drill_id = d.id
    LEFT JOIN sparring_videos s ON log.video_id = s.id
    LEFT JOIN user_courses uc ON (l.course_id = uc.course_id AND uc.user_id = u.id)
    LEFT JOIN user_drills ud ON (log.drill_id = ud.drill_id AND ud.user_id = u.id)
    LEFT JOIN user_videos uv ON (log.video_id = uv.video_id AND uv.user_id = u.id)
    WHERE log.date >= start_date AND log.date < end_date
    AND u.is_subscriber = true
    AND (u.is_complimentary_subscription IS NULL OR u.is_complimentary_subscription = false)
    -- 기간 기반 무료 구독 기간 내 시청 제외 (NEW!)
    AND NOT (
        u.complimentary_start_date IS NOT NULL
        AND u.complimentary_end_date IS NOT NULL
        AND log.date >= u.complimentary_start_date
        AND log.date <= u.complimentary_end_date
    )
    AND uc.course_id IS NULL
    AND ud.drill_id IS NULL
    AND uv.video_id IS NULL
    AND (course.is_subscription_excluded IS NULL OR course.is_subscription_excluded = false)
    AND (l.is_subscription_excluded IS NULL OR l.is_subscription_excluded = false);

    IF total_watch_seconds = 0 THEN
         RAISE NOTICE 'No watch time recorded for %', start_date;
         RETURN;
    END IF;

    distributable_amount := total_sub_revenue * 0.8;

    FOR creator_rec IN creator_stats LOOP
        creator_payout := floor(distributable_amount * (creator_rec.watch_seconds::NUMERIC / total_watch_seconds::NUMERIC));

        IF creator_payout > 0 THEN
            INSERT INTO revenue_ledger (
                creator_id,
                amount,
                platform_fee,
                creator_revenue,
                product_type,
                status,
                recognition_date,
                description
            ) VALUES (
                creator_rec.creator_id,
                creator_payout,
                0,
                creator_payout,
                'subscription_distribution',
                'processed',
                CURRENT_DATE,
                'Subscription Revenue Share for ' || to_char(start_date, 'YYYY-MM')
            );
        END IF;
    END LOOP;

    RAISE NOTICE 'Distributed % to creators for %', distributable_amount, start_date;
END $$;

-- 7. get_all_users_admin 함수 수정 (무료 기간 필드 추가)
DROP FUNCTION IF EXISTS get_all_users_admin();

CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    is_subscriber BOOLEAN,
    is_complimentary_subscription BOOLEAN,
    subscription_tier TEXT,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    complimentary_start_date DATE,
    complimentary_end_date DATE,
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
        u.complimentary_start_date,
        u.complimentary_end_date,
        COALESCE(u.is_admin, FALSE) as is_admin,
        COALESCE(u.is_creator, FALSE) as is_creator,
        u.created_at
    FROM users u
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
