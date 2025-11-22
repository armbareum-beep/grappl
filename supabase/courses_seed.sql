-- Insert sample courses
INSERT INTO courses (title, description, creator_id, category, difficulty, thumbnail_url, price, views) 
SELECT 
  '완벽한 암바 마스터 클래스',
  '기본부터 고급까지, 암바의 모든 것을 배우는 완벽한 강좌입니다. 초급자도 쉽게 따라할 수 있는 기본 자세부터 상급자를 위한 피니시 디테일까지 체계적으로 학습합니다.',
  id,
  'Technique',
  'Beginner',
  'https://picsum.photos/600/400?random=10',
  45000,
  2500
FROM creators WHERE name = '김기천 마스터';

INSERT INTO courses (title, description, creator_id, category, difficulty, thumbnail_url, price, views)
SELECT 
  '데라히바 가드 완전 정복',
  '모던 주짓수의 핵심 가드인 데라히바를 마스터하세요. 셋업부터 스윕, 서브미션까지 모든 것을 다룹니다.',
  id,
  'Technique',
  'Intermediate',
  'https://picsum.photos/600/400?random=11',
  55000,
  1800
FROM creators WHERE name = '박수민 선수';

-- Get course IDs for lesson insertion
DO $$
DECLARE
  course1_id UUID;
  course2_id UUID;
BEGIN
  SELECT id INTO course1_id FROM courses WHERE title = '완벽한 암바 마스터 클래스';
  SELECT id INTO course2_id FROM courses WHERE title = '데라히바 가드 완전 정복';

  -- Insert lessons for Course 1 (암바 마스터 클래스)
  INSERT INTO lessons (course_id, title, description, lesson_number, vimeo_url, length, difficulty) VALUES
    (course1_id, '암바의 기본 자세와 포지셔닝', '암바를 걸기 위한 올바른 자세와 포지션을 배웁니다.', 1, '76979871', '12:30', 'Beginner'),
    (course1_id, '그립 잡기와 컨트롤', '상대의 팔을 효과적으로 컨트롤하는 그립 기술을 익힙니다.', 2, '76979871', '15:20', 'Beginner'),
    (course1_id, '힙 무브먼트와 각도 만들기', '암바를 위한 힙 이동과 최적의 각도를 만드는 법을 배웁니다.', 3, '76979871', '18:45', 'Intermediate'),
    (course1_id, '상대의 방어 대처법', '상대가 방어할 때 그립을 뜯어내고 피니시하는 방법을 학습합니다.', 4, '76979871', '20:15', 'Intermediate'),
    (course1_id, '완벽한 피니시 디테일', '암바를 확실하게 마무리하는 고급 디테일을 배웁니다.', 5, '76979871', '22:50', 'Advanced');

  -- Insert lessons for Course 2 (데라히바 가드)
  INSERT INTO lessons (course_id, title, description, lesson_number, vimeo_url, length, difficulty) VALUES
    (course2_id, '데라히바 가드 기본 개념', '데라히바 가드의 기본 원리와 중요성을 이해합니다.', 1, '76979871', '10:20', 'Intermediate'),
    (course2_id, '데라히바 훅 걸기', '효과적으로 데라히바 훅을 거는 방법을 배웁니다.', 2, '76979871', '14:30', 'Intermediate'),
    (course2_id, '스윕 테크닉 1: 베이직 스윕', '데라히바에서 가장 기본적인 스윕을 익힙니다.', 3, '76979871', '16:45', 'Intermediate'),
    (course2_id, '스윕 테크닉 2: 백 테이크', '데라히바에서 등을 잡는 테크닉을 배웁니다.', 4, '76979871', '18:20', 'Advanced'),
    (course2_id, '서브미션 옵션', '데라히바 가드에서 직접 서브미션을 거는 방법을 학습합니다.', 5, '76979871', '19:30', 'Advanced'),
    (course2_id, '상대의 패스 가드 대처', '상대가 패스를 시도할 때 대응하는 법을 배웁니다.', 6, '76979871', '21:15', 'Advanced'),
    (course2_id, '실전 스파링 분석', '실제 스파링 영상을 통해 데라히바 활용법을 분석합니다.', 7, '76979871', '25:40', 'Advanced');
END $$;
