-- Add vimeo_url column to videos table
ALTER TABLE videos ADD COLUMN vimeo_url TEXT;

-- Update existing videos with sample Vimeo URLs (public BJJ technique videos)
UPDATE videos SET vimeo_url = '76979871' WHERE title = '완벽한 암바 피니시 디테일';
UPDATE videos SET vimeo_url = '76979871' WHERE title = '데라히바 가드 셋업 & 스윕';
UPDATE videos SET vimeo_url = '76979871' WHERE title = '고강도 드릴 루틴 10분';
UPDATE videos SET vimeo_url = '76979871' WHERE title = '인사이드 힐훅 엔트리 분석';
