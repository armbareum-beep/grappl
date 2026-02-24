
-- 루틴 테이블에 누락된 컬럼 추가
ALTER TABLE routines ADD COLUMN IF NOT EXISTS related_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS uniform_type TEXT;

-- 기존 데이터에 기본값 설정 (이미 추가되었을 경우를 대비)
UPDATE routines SET related_items = '[]'::jsonb WHERE related_items IS NULL;
