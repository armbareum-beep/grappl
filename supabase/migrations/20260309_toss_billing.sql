-- TossPayments 빌링 지원을 위한 스키마 업데이트

-- subscriptions 테이블에 토스 관련 컬럼 추가
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS toss_customer_key TEXT,
ADD COLUMN IF NOT EXISTS toss_payment_key TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'portone';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_subscriptions_toss_customer ON subscriptions(toss_customer_key) WHERE toss_customer_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_provider ON subscriptions(payment_provider);

COMMENT ON COLUMN subscriptions.toss_customer_key IS '토스페이먼츠 고객 식별키';
COMMENT ON COLUMN subscriptions.toss_payment_key IS '토스페이먼츠 결제 키';
COMMENT ON COLUMN subscriptions.payment_provider IS '결제 제공자 (portone, toss)';
