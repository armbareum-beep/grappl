-- ==============================================================================
-- 콘텐츠 비공개 기능 (삭제 없이 숨기기)
-- 크리에이터가 콘텐츠를 삭제하지 않고 비공개 처리할 수 있음
-- ==============================================================================

-- 1. courses 테이블에 is_hidden 컬럼 추가
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
COMMENT ON COLUMN courses.is_hidden IS '크리에이터가 비공개 처리한 콘텐츠 (삭제 없이 숨기기)';

-- 2. drill_routines 테이블에 is_hidden 컬럼 추가
ALTER TABLE drill_routines ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
COMMENT ON COLUMN drill_routines.is_hidden IS '크리에이터가 비공개 처리한 콘텐츠 (삭제 없이 숨기기)';

-- 3. sparring_videos 테이블에 is_hidden 컬럼 추가
ALTER TABLE sparring_videos ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
COMMENT ON COLUMN sparring_videos.is_hidden IS '크리에이터가 비공개 처리한 콘텐츠 (삭제 없이 숨기기)';

-- 4. drills 테이블에 is_hidden 컬럼 추가
ALTER TABLE drills ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
COMMENT ON COLUMN drills.is_hidden IS '크리에이터가 비공개 처리한 콘텐츠 (삭제 없이 숨기기)';

-- 5. lessons 테이블에도 is_hidden 컬럼 추가 (일관성을 위해)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
COMMENT ON COLUMN lessons.is_hidden IS '크리에이터가 비공개 처리한 콘텐츠 (삭제 없이 숨기기)';

-- 6. RLS 정책 업데이트 (비공개 콘텐츠는 크리에이터만 볼 수 있도록)

-- Courses: 공개된 콘텐츠만 일반 사용자에게 표시, 크리에이터는 자신의 비공개 콘텐츠도 볼 수 있음
DROP POLICY IF EXISTS "Public can view published courses" ON courses;
CREATE POLICY "Public can view visible courses"
  ON courses FOR SELECT
  USING (
    (published = true AND (is_hidden IS NULL OR is_hidden = false))
    OR creator_id = auth.uid()
  );

-- Drill Routines: 비공개가 아닌 루틴만 공개
DROP POLICY IF EXISTS "Public can view all routines" ON drill_routines;
DROP POLICY IF EXISTS "Enable read access for all users" ON drill_routines;
CREATE POLICY "Public can view visible routines"
  ON drill_routines FOR SELECT
  USING (
    (is_hidden IS NULL OR is_hidden = false)
    OR creator_id = auth.uid()
  );

-- Drills: 비공개가 아닌 드릴만 공개
DROP POLICY IF EXISTS "Public can view all drills" ON drills;
DROP POLICY IF EXISTS "Enable read access for all users" ON drills;
CREATE POLICY "Public can view visible drills"
  ON drills FOR SELECT
  USING (
    (is_hidden IS NULL OR is_hidden = false)
    OR creator_id = auth.uid()
  );

-- Sparring Videos: 기존 정책 업데이트 (is_published와 is_hidden 둘 다 체크)
DROP POLICY IF EXISTS "Public can view published sparring videos" ON sparring_videos;
CREATE POLICY "Public can view visible sparring videos"
  ON sparring_videos FOR SELECT
  USING (
    (is_published = true AND (is_hidden IS NULL OR is_hidden = false))
    OR creator_id = auth.uid()
  );

-- Lessons: 비공개가 아닌 레슨만 공개
DROP POLICY IF EXISTS "Enable read access for all users" ON lessons;
DROP POLICY IF EXISTS "Public can view all lessons" ON lessons;
CREATE POLICY "Public can view visible lessons"
  ON lessons FOR SELECT
  USING (
    (is_hidden IS NULL OR is_hidden = false)
    OR creator_id = auth.uid()
  );
