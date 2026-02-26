-- 정산 상태 추적 테이블
-- 최소 지급 기준: ₩100,000 미만은 다음 달로 이월

-- 1. 정산 추적 테이블 생성
CREATE TABLE IF NOT EXISTS creator_settlements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id uuid REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
    settlement_month date NOT NULL, -- 정산 월 (매월 1일)

    -- 금액
    gross_amount integer DEFAULT 0, -- 총 매출
    settlement_amount integer DEFAULT 0, -- 크리에이터 몫 (80%)
    platform_fee integer DEFAULT 0, -- 플랫폼 수수료 (20%)
    carried_over_from integer DEFAULT 0, -- 이전 달에서 이월된 금액
    total_payable integer DEFAULT 0, -- 실제 지급 대상 금액 (settlement_amount + carried_over_from)

    -- 상태: pending(대기) -> processing(처리중) -> paid(지급완료) / carried_over(이월)
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'carried_over')),

    -- 지급 정보
    paid_at timestamp with time zone,
    payment_reference text, -- 송금 참조번호
    payment_method text, -- 지급 방식 (bank_transfer 등)

    -- 메타
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    UNIQUE(creator_id, settlement_month)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_creator_settlements_creator ON creator_settlements(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_settlements_month ON creator_settlements(settlement_month);
CREATE INDEX IF NOT EXISTS idx_creator_settlements_status ON creator_settlements(status);

-- 2. 월별 정산 생성/업데이트 함수
-- 최소 지급 기준: ₩100,000
CREATE OR REPLACE FUNCTION generate_monthly_settlements(target_month DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    prev_month DATE;
    min_payout_threshold INTEGER := 100000; -- 최소 지급 기준 10만원
    creator_rec RECORD;
BEGIN
    start_date := date_trunc('month', target_month);
    end_date := start_date + INTERVAL '1 month';
    prev_month := start_date - INTERVAL '1 month';

    -- 각 크리에이터별 정산 생성
    FOR creator_rec IN
        SELECT
            cms.creator_id,
            COALESCE(SUM(cms.total_revenue), 0) as gross_amount,
            COALESCE(SUM(cms.settlement_amount), 0) as settlement_amount,
            COALESCE(SUM(cms.platform_fee), 0) as platform_fee
        FROM creator_monthly_settlements cms
        WHERE cms.settlement_month >= start_date
        AND cms.settlement_month < end_date
        GROUP BY cms.creator_id
    LOOP
        -- 이전 달 이월 금액 조회
        DECLARE
            prev_carried INTEGER := 0;
            total_pay INTEGER := 0;
            new_status TEXT := 'pending';
        BEGIN
            -- 이전 달에서 이월된 금액 (carried_over 상태인 것)
            SELECT COALESCE(total_payable, 0) INTO prev_carried
            FROM creator_settlements
            WHERE creator_id = creator_rec.creator_id
            AND settlement_month = prev_month
            AND status = 'carried_over';

            -- 총 지급 대상 금액
            total_pay := creator_rec.settlement_amount + COALESCE(prev_carried, 0);

            -- 최소 지급 기준 미달 시 이월
            IF total_pay < min_payout_threshold THEN
                new_status := 'carried_over';
            ELSE
                new_status := 'pending';
            END IF;

            -- Upsert 정산 레코드
            INSERT INTO creator_settlements (
                creator_id,
                settlement_month,
                gross_amount,
                settlement_amount,
                platform_fee,
                carried_over_from,
                total_payable,
                status
            ) VALUES (
                creator_rec.creator_id,
                start_date,
                creator_rec.gross_amount,
                creator_rec.settlement_amount,
                creator_rec.platform_fee,
                COALESCE(prev_carried, 0),
                total_pay,
                new_status
            )
            ON CONFLICT (creator_id, settlement_month)
            DO UPDATE SET
                gross_amount = EXCLUDED.gross_amount,
                settlement_amount = EXCLUDED.settlement_amount,
                platform_fee = EXCLUDED.platform_fee,
                carried_over_from = EXCLUDED.carried_over_from,
                total_payable = EXCLUDED.total_payable,
                status = CASE
                    WHEN creator_settlements.status = 'paid' THEN 'paid' -- 이미 지급된 건 변경 안 함
                    ELSE EXCLUDED.status
                END,
                updated_at = now();

            -- 이전 달 이월 상태 정리 (이번 달로 이월됐으니 처리 완료)
            IF prev_carried > 0 THEN
                UPDATE creator_settlements
                SET status = 'processing', updated_at = now()
                WHERE creator_id = creator_rec.creator_id
                AND settlement_month = prev_month
                AND status = 'carried_over';
            END IF;
        END;
    END LOOP;

    RAISE NOTICE 'Generated settlements for %', start_date;
END $$;

-- 3. 정산 상태 업데이트 함수 (지급 완료 처리)
CREATE OR REPLACE FUNCTION mark_settlement_paid(
    p_creator_id UUID,
    p_settlement_month DATE,
    p_payment_reference TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'bank_transfer'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE creator_settlements
    SET
        status = 'paid',
        paid_at = now(),
        payment_reference = p_payment_reference,
        payment_method = p_payment_method,
        updated_at = now()
    WHERE creator_id = p_creator_id
    AND settlement_month = date_trunc('month', p_settlement_month);
END $$;

-- 4. RLS 정책
ALTER TABLE creator_settlements ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 접근
CREATE POLICY "Admins can manage all settlements" ON creator_settlements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- 크리에이터 본인 정산만 조회
CREATE POLICY "Creators can view own settlements" ON creator_settlements
    FOR SELECT USING (
        creator_id = auth.uid()
    );

-- 5. 권한 부여
GRANT SELECT ON creator_settlements TO authenticated;
GRANT ALL ON creator_settlements TO service_role;
