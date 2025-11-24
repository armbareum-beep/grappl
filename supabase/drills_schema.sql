-- ============================================================================
-- Grappl - 드릴 & 루틴 기능 스키마
-- ============================================================================
-- 9:16 세로 영상 형식의 드릴과 루틴 판매 기능을 위한 데이터베이스 스키마
-- ============================================================================

-- ============================================================================
-- 1. 드릴 테이블 생성
-- ============================================================================

-- 1.1 Drills 테이블 (개별 드릴 영상)
CREATE TABLE IF NOT EXISTS drills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  thumbnail_url TEXT,
  vimeo_url TEXT,
  aspect_ratio TEXT DEFAULT '9:16', -- 세로 영상
  duration TEXT, -- 예: "2:30"
  price INTEGER DEFAULT 5000, -- 기본 5,000원
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 Drill Routines 테이블 (드릴 묶음 패키지)
CREATE TABLE IF NOT EXISTS drill_routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  thumbnail_url TEXT,
  price INTEGER DEFAULT 30000, -- 기본 30,000원
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 Drill Routine Items 테이블 (루틴에 포함된 드릴 목록)
CREATE TABLE IF NOT EXISTS drill_routine_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES drill_routines(id) ON DELETE CASCADE,
  drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL, -- 루틴 내 드릴 순서
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(routine_id, drill_id)
);

-- ============================================================================
-- 2. 구매 기록 테이블 생성
-- ============================================================================

-- 2.1 User Drills (사용자가 구매한 드릴)
CREATE TABLE IF NOT EXISTS user_drills (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  price_paid INTEGER NOT NULL,
  PRIMARY KEY (user_id, drill_id)
);

-- 2.2 User Drill Routines (사용자가 구매한 루틴)
CREATE TABLE IF NOT EXISTS user_drill_routines (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES drill_routines(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  price_paid INTEGER NOT NULL,
  PRIMARY KEY (user_id, routine_id)
);

-- ============================================================================
-- 3. 인덱스 생성 (성능 최적화)
-- ============================================================================

CREATE INDEX IF NOT EXISTS drills_creator_id_idx ON drills(creator_id);
CREATE INDEX IF NOT EXISTS drills_category_idx ON drills(category);
CREATE INDEX IF NOT EXISTS drill_routines_creator_id_idx ON drill_routines(creator_id);
CREATE INDEX IF NOT EXISTS drill_routine_items_routine_id_idx ON drill_routine_items(routine_id);
CREATE INDEX IF NOT EXISTS drill_routine_items_drill_id_idx ON drill_routine_items(drill_id);
CREATE INDEX IF NOT EXISTS user_drills_user_id_idx ON user_drills(user_id);
CREATE INDEX IF NOT EXISTS user_drill_routines_user_id_idx ON user_drill_routines(user_id);

-- ============================================================================
-- 4. 함수 생성
-- ============================================================================

-- 4.1 드릴 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_drill_views(drill_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE drills
  SET views = views + 1
  WHERE id = drill_id;
END;
$$ LANGUAGE plpgsql;

-- 4.2 루틴 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_drill_routine_views(routine_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE drill_routines
  SET views = views + 1
  WHERE id = routine_id;
END;
$$ LANGUAGE plpgsql;

-- 4.3 루틴에 포함된 드릴 개수 조회 함수
CREATE OR REPLACE FUNCTION get_routine_drill_count(routine_id UUID)
RETURNS INTEGER AS $$
DECLARE
  drill_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO drill_count
  FROM drill_routine_items
  WHERE routine_id = routine_id;
  RETURN drill_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Row Level Security (RLS) 활성화
-- ============================================================================

ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_drill_routines ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS 정책 생성
-- ============================================================================

-- 6.1 Drills 정책 (모든 사용자가 조회 가능)
DROP POLICY IF EXISTS "Public drills read access" ON drills;
CREATE POLICY "Public drills read access"
  ON drills FOR SELECT
  USING (true);

-- 6.2 Drill Routines 정책 (모든 사용자가 조회 가능)
DROP POLICY IF EXISTS "Public drill routines read access" ON drill_routines;
CREATE POLICY "Public drill routines read access"
  ON drill_routines FOR SELECT
  USING (true);

-- 6.3 Drill Routine Items 정책 (모든 사용자가 조회 가능)
DROP POLICY IF EXISTS "Public drill routine items read access" ON drill_routine_items;
CREATE POLICY "Public drill routine items read access"
  ON drill_routine_items FOR SELECT
  USING (true);

-- 6.4 User Drills 정책 (본인이 구매한 드릴만 조회 가능)
DROP POLICY IF EXISTS "Users can view their purchased drills" ON user_drills;
CREATE POLICY "Users can view their purchased drills"
  ON user_drills FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own drill purchases" ON user_drills;
CREATE POLICY "Users can insert their own drill purchases"
  ON user_drills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6.5 User Drill Routines 정책 (본인이 구매한 루틴만 조회 가능)
DROP POLICY IF EXISTS "Users can view their purchased routines" ON user_drill_routines;
CREATE POLICY "Users can view their purchased routines"
  ON user_drill_routines FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own routine purchases" ON user_drill_routines;
CREATE POLICY "Users can insert their own routine purchases"
  ON user_drill_routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. 테이블 코멘트 (문서화)
-- ============================================================================

COMMENT ON TABLE drills IS '9:16 세로 영상 형식의 개별 드릴 콘텐츠';
COMMENT ON TABLE drill_routines IS '여러 드릴을 묶은 루틴 패키지';
COMMENT ON TABLE drill_routine_items IS '루틴에 포함된 드릴 목록';
COMMENT ON TABLE user_drills IS '사용자가 구매한 드릴 기록';
COMMENT ON TABLE user_drill_routines IS '사용자가 구매한 루틴 기록';

-- ============================================================================
-- 완료!
-- ============================================================================
