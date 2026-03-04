-- Fix: Allow recalculation of monthly distribution by deleting existing records first

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

    -- Cursor for creator stats (only paid subscribers, excluding purchased content)
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
        -- Join Purchase Tables to check ownership
        LEFT JOIN user_courses uc ON (l.course_id = uc.course_id AND uc.user_id = u.id)
        LEFT JOIN user_drills ud ON (log.drill_id = ud.drill_id AND ud.user_id = u.id)
        LEFT JOIN user_videos uv ON (log.video_id = uv.video_id AND uv.user_id = u.id)
        -- Join to check routine purchase ownership for drills
        LEFT JOIN routine_drills rd ON (log.drill_id = rd.drill_id)
        LEFT JOIN user_routine_purchases urp ON (rd.routine_id = urp.routine_id AND urp.user_id = u.id)
        WHERE log.date >= start_date AND log.date < end_date
        AND c.id IS NOT NULL
        -- 1. Only paid subscribers (exclude complimentary)
        AND u.is_subscriber = true
        AND (u.is_complimentary_subscription IS NULL OR u.is_complimentary_subscription = false)
        -- 2. Exclude purchased content (If joined record exists, user owns it -> exclude from sub pool)
        AND uc.course_id IS NULL -- Not purchased as course
        AND ud.drill_id IS NULL  -- Not purchased as drill (direct)
        AND urp.routine_id IS NULL -- Not purchased via routine
        AND uv.video_id IS NULL  -- Not purchased as sparring video
        -- 3. Exclude 'Subscription Excluded' content
        AND (course.is_subscription_excluded IS NULL OR course.is_subscription_excluded = false)
        AND (l.is_subscription_excluded IS NULL OR l.is_subscription_excluded = false)
        GROUP BY c.id;

    creator_rec RECORD;
    creator_payout NUMERIC;
BEGIN
    -- Set period (e.g., '2023-01-01' -> start: '2023-01-01', end: '2023-02-01')
    start_date := date_trunc('month', target_month);
    end_date := start_date + INTERVAL '1 month';

    -- DELETE existing distribution records for this month (allow recalculation)
    DELETE FROM revenue_ledger
    WHERE product_type = 'subscription_distribution'
    AND recognition_date >= start_date AND recognition_date < end_date;

    -- 1. Get Total Recognized Subscription Revenue for this month
    SELECT COALESCE(SUM(amount), 0)
    INTO total_sub_revenue
    FROM revenue_ledger
    WHERE product_type = 'subscription'
    AND recognition_date >= start_date AND recognition_date < end_date;

    IF total_sub_revenue = 0 THEN
        RAISE NOTICE 'No subscription revenue found for %', start_date;
        RETURN;
    END IF;

    -- 2. Calculate Total Platform Watch Time (matching the same exclusion filters)
    SELECT COALESCE(SUM(log.watch_seconds), 0)
    INTO total_watch_seconds
    FROM video_watch_logs log
    INNER JOIN users u ON log.user_id = u.id
    LEFT JOIN lessons l ON log.lesson_id = l.id
    LEFT JOIN courses course ON l.course_id = course.id
    LEFT JOIN drills d ON log.drill_id = d.id
    LEFT JOIN sparring_videos s ON log.video_id = s.id
    -- Join Purchase Tables to check ownership
    LEFT JOIN user_courses uc ON (l.course_id = uc.course_id AND uc.user_id = u.id)
    LEFT JOIN user_drills ud ON (log.drill_id = ud.drill_id AND ud.user_id = u.id)
    LEFT JOIN user_videos uv ON (log.video_id = uv.video_id AND uv.user_id = u.id)
    -- Join to check routine purchase ownership for drills
    LEFT JOIN routine_drills rd ON (log.drill_id = rd.drill_id)
    LEFT JOIN user_routine_purchases urp ON (rd.routine_id = urp.routine_id AND urp.user_id = u.id)
    WHERE log.date >= start_date AND log.date < end_date
    -- 1. Only paid subscribers
    AND u.is_subscriber = true
    AND (u.is_complimentary_subscription IS NULL OR u.is_complimentary_subscription = false)
    -- 2. Exclude purchased content
    AND uc.course_id IS NULL
    AND ud.drill_id IS NULL  -- Not purchased as drill (direct)
    AND urp.routine_id IS NULL -- Not purchased via routine
    AND uv.video_id IS NULL
    -- 3. Exclude 'Subscription Excluded' content
    AND (course.is_subscription_excluded IS NULL OR course.is_subscription_excluded = false)
    AND (l.is_subscription_excluded IS NULL OR l.is_subscription_excluded = false);

    IF total_watch_seconds = 0 THEN
         RAISE NOTICE 'No watch time recorded for %', start_date;
         RETURN;
    END IF;

    -- 3. Distribute Revenue
    -- Pool Size = Total Revenue * 0.8 (80% to creators)
    distributable_amount := total_sub_revenue * 0.8;

    FOR creator_rec IN creator_stats LOOP
        -- Calculate payout: (Creator Watch / Total Watch) * Pool
        creator_payout := floor(distributable_amount * (creator_rec.watch_seconds::NUMERIC / total_watch_seconds::NUMERIC));

        IF creator_payout > 0 THEN
            -- Insert Distribution Record into revenue_ledger
            INSERT INTO revenue_ledger (
                creator_id,
                amount,
                platform_fee,
                creator_revenue,
                product_type,
                status,
                recognition_date
            ) VALUES (
                creator_rec.creator_id,
                creator_payout,
                0,
                creator_payout,
                'subscription_distribution',
                'processed',
                CURRENT_DATE
            );

            -- Also insert/update creator_payouts for UI display
            INSERT INTO creator_payouts (
                creator_id,
                amount,
                payout_period_start,
                payout_period_end,
                status
            ) VALUES (
                creator_rec.creator_id,
                creator_payout,
                start_date,
                end_date - INTERVAL '1 day',
                'draft'
            )
            ON CONFLICT (creator_id, payout_period_start)
            DO UPDATE SET
                amount = EXCLUDED.amount,
                updated_at = now();
        END IF;
    END LOOP;

    RAISE NOTICE 'Distributed % to creators for %', distributable_amount, start_date;
END $$;
