-- routines 테이블에 is_hidden 컬럼 추가
-- (20260211 마이그레이션에서 drill_routines만 추가되고 routines 누락됨)
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
COMMENT ON COLUMN routines.is_hidden IS '크리에이터가 비공개 처리한 콘텐츠 (삭제 없이 숨기기)';

DROP POLICY IF EXISTS "Public can view all routines" ON routines;
DROP POLICY IF EXISTS "Enable read access for all users" ON routines;
CREATE POLICY "Public can view visible routines"
  ON routines FOR SELECT
  USING (
    (is_hidden IS NULL OR is_hidden = false)
    OR creator_id = auth.uid()
  );