# DB 마이그레이션 테스트 가이드

## 로컬 환경에서 테스트하기

### 1단계: 마이그레이션 실행

Supabase SQL Editor에서 다음 순서로 실행:

```bash
# 1. 새 테이블 생성
supabase/migrations/20260206_create_user_interactions.sql

# 2. 데이터 마이그레이션
supabase/migrations/20260206_migrate_to_user_interactions.sql
```

### 2단계: 데이터 검증

SQL Editor에서 실행:

```sql
-- 전체 레코드 수 확인
SELECT 
    interaction_type,
    content_type,
    COUNT(*) as count
FROM public.user_interactions
GROUP BY interaction_type, content_type
ORDER BY interaction_type, content_type;

-- 특정 사용자의 저장 목록 확인
SELECT 
    content_type,
    content_id,
    interaction_type,
    created_at
FROM public.user_interactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 20;
```

### 3단계: API 함수 테스트

브라우저 콘솔에서:

```javascript
// 1. 새 API import (lib/api-user-interactions.ts)
import { toggleInteraction, hasInteraction } from './lib/api-user-interactions';

// 2. 드릴 저장 토글 테스트
const drillId = 'SOME_DRILL_ID';
const isSaved = await toggleInteraction('drill', drillId, 'save');
console.log('Drill saved:', isSaved);

// 3. 저장 상태 확인
const hasSave = await hasInteraction('drill', drillId, 'save');
console.log('Has save:', hasSave);

// 4. 다시 토글 (제거)
const isRemoved = await toggleInteraction('drill', drillId, 'save');
console.log('Drill removed:', !isRemoved);
```

### 4단계: UI 테스트

1. 로그인 후 드릴/레슨/루틴 페이지 방문
2. '저장' 버튼 클릭 → DB에 기록되는지 확인
3. '내 보관함' 페이지 → 저장된 항목들이 표시되는지 확인
4. 다시 '저장' 버튼 클릭 → 제거되는지 확인

## 프로덕션 배포 전 체크리스트

- [ ] 로컬 마이그레이션 성공
- [ ] 데이터 개수 일치 확인
- [ ] API 함수 단위 테스트 통과
- [ ] UI에서 저장/좋아요/조회 기능 정상 작동
- [ ] 기존 저장 데이터 모두 유지 확인
- [ ] 성능 테스트 (쿼리 속도 확인)

## 롤백 계획

문제 발생 시:

1. `lib/api-user-interactions.ts` 사용 중단
2. 기존 API 함수로 복구
3. `user_interactions` 테이블은 유지 (데이터 손실 방지)
4. 원인 파악 후 재시도
