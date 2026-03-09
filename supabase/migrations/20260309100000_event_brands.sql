-- ============================================
-- Event Brands System
-- 한 주최자(creator)가 여러 이벤트 브랜드를 운영할 수 있는 시스템
-- ============================================

-- 1. event_brands 테이블 생성
CREATE TABLE event_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- 브랜드 기본 정보
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- URL용 (예: russian-openmat)
  logo TEXT,
  cover_image TEXT,
  description TEXT,

  -- 연락처
  contact_email TEXT,
  contact_phone TEXT,

  -- 소셜 미디어
  instagram TEXT,
  youtube TEXT,
  website TEXT,

  -- 결제 정보 (브랜드별 계좌)
  bank_account JSONB, -- { bank_name, account_number, holder_name }

  -- 기본 브랜드 여부
  is_default BOOLEAN DEFAULT FALSE,

  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,

  -- 통계 (캐시)
  total_events INTEGER DEFAULT 0,
  total_participants INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_event_brands_creator ON event_brands(creator_id);
CREATE INDEX idx_event_brands_slug ON event_brands(slug);
CREATE INDEX idx_event_brands_active ON event_brands(is_active) WHERE is_active = TRUE;

-- 한 크리에이터당 기본 브랜드는 하나만
CREATE UNIQUE INDEX idx_event_brands_default
  ON event_brands(creator_id) WHERE is_default = TRUE;

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_event_brands_updated_at
  BEFORE UPDATE ON event_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. events 테이블에 brand_id 컬럼 추가
-- ============================================
ALTER TABLE events ADD COLUMN brand_id UUID REFERENCES event_brands(id) ON DELETE SET NULL;
CREATE INDEX idx_events_brand ON events(brand_id);

-- ============================================
-- 3. 기존 데이터 마이그레이션
-- 기존 주최자(can_host_events=TRUE)에 대해 기본 브랜드 자동 생성
-- ============================================
INSERT INTO event_brands (creator_id, name, is_default, bank_account)
SELECT
  id,
  name,  -- 크리에이터 이름을 브랜드 이름으로
  TRUE,  -- 기본 브랜드
  bank_account_for_invitation
FROM creators
WHERE can_host_events = TRUE;

-- 기존 이벤트에 brand_id 연결
UPDATE events e
SET brand_id = (
  SELECT eb.id FROM event_brands eb
  WHERE eb.creator_id = e.organizer_id AND eb.is_default = TRUE
)
WHERE e.organizer_id IS NOT NULL;

-- 브랜드 통계 업데이트
UPDATE event_brands eb
SET
  total_events = (
    SELECT COUNT(*) FROM events e WHERE e.brand_id = eb.id
  ),
  total_participants = (
    SELECT COALESCE(SUM(
      (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.payment_status IN ('confirmed'))
    ), 0)
    FROM events e WHERE e.brand_id = eb.id
  );

-- ============================================
-- 4. RLS 정책
-- ============================================
ALTER TABLE event_brands ENABLE ROW LEVEL SECURITY;

-- 공개 브랜드 조회 (is_active = TRUE)
CREATE POLICY "Anyone can view active brands"
  ON event_brands FOR SELECT
  USING (is_active = TRUE);

-- 브랜드 소유자만 수정 가능
CREATE POLICY "Creators can manage their own brands"
  ON event_brands FOR ALL
  USING (
    creator_id = auth.uid()
  );

-- ============================================
-- 5. 브랜드 통계 업데이트 함수
-- ============================================
CREATE OR REPLACE FUNCTION update_brand_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 이벤트 생성/삭제 시 브랜드 통계 업데이트
  IF TG_OP = 'INSERT' AND NEW.brand_id IS NOT NULL THEN
    UPDATE event_brands
    SET total_events = total_events + 1
    WHERE id = NEW.brand_id;
  ELSIF TG_OP = 'DELETE' AND OLD.brand_id IS NOT NULL THEN
    UPDATE event_brands
    SET total_events = total_events - 1
    WHERE id = OLD.brand_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- brand_id 변경 시
    IF OLD.brand_id IS DISTINCT FROM NEW.brand_id THEN
      IF OLD.brand_id IS NOT NULL THEN
        UPDATE event_brands
        SET total_events = total_events - 1
        WHERE id = OLD.brand_id;
      END IF;
      IF NEW.brand_id IS NOT NULL THEN
        UPDATE event_brands
        SET total_events = total_events + 1
        WHERE id = NEW.brand_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_brand_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_stats();

-- 등록자 수 통계 업데이트
CREATE OR REPLACE FUNCTION update_brand_participant_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  -- 이벤트의 brand_id 조회
  SELECT brand_id INTO v_brand_id
  FROM events
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);

  IF v_brand_id IS NOT NULL THEN
    -- 전체 참가자 수 재계산
    UPDATE event_brands eb
    SET total_participants = (
      SELECT COUNT(*)
      FROM event_registrations er
      JOIN events e ON er.event_id = e.id
      WHERE e.brand_id = eb.id
        AND er.payment_status = 'confirmed'
    )
    WHERE eb.id = v_brand_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registration_brand_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_participant_stats();

-- ============================================
-- 6. 슬러그 자동 생성 함수
-- ============================================
CREATE OR REPLACE FUNCTION generate_brand_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- 슬러그가 없으면 이름에서 생성
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- 한글/특수문자 제거하고 소문자로
    base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9가-힣]', '-', 'g'));
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');  -- 연속 대시 제거
    base_slug := trim(both '-' from base_slug);

    -- 빈 슬러그면 랜덤 생성
    IF base_slug = '' THEN
      base_slug := 'brand-' || substr(gen_random_uuid()::text, 1, 8);
    END IF;

    new_slug := base_slug;

    -- 중복 체크
    WHILE EXISTS (SELECT 1 FROM event_brands WHERE slug = new_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    END LOOP;

    NEW.slug := new_slug;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_brand_slug_trigger
  BEFORE INSERT OR UPDATE ON event_brands
  FOR EACH ROW
  EXECUTE FUNCTION generate_brand_slug();
