-- Insert creators (converted from mock data)
INSERT INTO creators (name, bio, profile_image, subscriber_count) VALUES
  ('김기천 마스터', '블랙벨트 3단, 20년의 지도 경력. 기본기의 정석을 가르칩니다.', 'https://picsum.photos/200/200?random=1', 12500),
  ('박수민 선수', '월드 프로 챔피언. 모던 주짓수와 레그락 스페셜리스트.', 'https://picsum.photos/200/200?random=2', 8900);

-- Get the creator IDs for reference
DO $$
DECLARE
  creator1_id UUID;
  creator2_id UUID;
BEGIN
  -- Get creator IDs
  SELECT id INTO creator1_id FROM creators WHERE name = '김기천 마스터';
  SELECT id INTO creator2_id FROM creators WHERE name = '박수민 선수';

  -- Insert videos using the creator IDs
  INSERT INTO videos (title, description, creator_id, category, difficulty, thumbnail_url, length, price, views, created_at) VALUES
    ('완벽한 암바 피니시 디테일', '상대가 방어할 때 그립을 뜯어내는 3가지 핵심 원리를 배웁니다.', creator1_id, 'Technique', 'Beginner', 'https://picsum.photos/600/400?random=3', '15:20', 25000, 1205, '2023-10-01'),
    ('데라히바 가드 셋업 & 스윕', '오픈 가드 플레이어를 위한 필수 데라히바 가드 운영법.', creator2_id, 'Technique', 'Intermediate', 'https://picsum.photos/600/400?random=4', '22:10', 30000, 890, '2023-10-05'),
    ('고강도 드릴 루틴 10분', '지치지 않는 체력을 위한 솔로 드릴 루틴입니다.', creator1_id, 'Drill', 'Beginner', 'https://picsum.photos/600/400?random=5', '10:00', 15000, 3400, '2023-09-20'),
    ('인사이드 힐훅 엔트리 분석', '스파링 영상 분석을 통해 안전하고 정확하게 힐훅을 거는 법을 익힙니다.', creator2_id, 'Sparring', 'Advanced', 'https://picsum.photos/600/400?random=6', '35:00', 45000, 560, '2023-10-12');
END $$;
