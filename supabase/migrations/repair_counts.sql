-- Drills 좋아요 카운트 동기화
UPDATE drills d
SET likes = (
  SELECT COUNT(*)
  FROM user_interactions ui
  WHERE ui.item_id = d.id 
    AND ui.item_type = 'drill'
    AND ui.interaction_type = 'like'
);

-- Lessons 좋아요 카운트 동기화
UPDATE lessons l
SET likes = (
  SELECT COUNT(*)
  FROM user_interactions ui
  WHERE ui.item_id = l.id 
    AND ui.item_type = 'lesson'
    AND ui.interaction_type = 'like'
);

-- 만약 likes가 NULL인 경우 0으로 초기화
UPDATE drills SET likes = 0 WHERE likes IS NULL;
UPDATE lessons SET likes = 0 WHERE likes IS NULL;

-- 음수 카운트 제거 (안전 장치)
UPDATE drills SET likes = 0 WHERE likes < 0;
UPDATE lessons SET likes = 0 WHERE likes < 0;
