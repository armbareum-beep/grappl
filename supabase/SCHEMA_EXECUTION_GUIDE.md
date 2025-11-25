# 🚀 Grappl Database Schema 실행 가이드

## 📋 현재 상황
- **Dev 환경**: 일부 스키마만 실행됨 (어떤 것인지 불명확)
- **Production 환경**: 실행 안 된 스키마 있음
- **문제**: 어떤 스키마를 실행했는지 추적 불가

## ✅ 해결 방법: 마스터 스키마 파일 사용

### 1. 기술 마스터리 시스템 (NEW - 2024-11-25)

**파일**: `MASTER_TECHNIQUE_SCHEMA.sql`

**포함 내용**:
- ✅ `techniques` 테이블 (18개 기본 기술 포함)
- ✅ `user_technique_mastery` 테이블
- ✅ `technique_xp_transactions` 테이블
- ✅ `technique_*_links` 테이블 (course, drill, routine)
- ✅ `user_technique_goals` 테이블
- ✅ 모든 함수 (XP 계산, 레벨업 등)
- ✅ RLS 정책
- ✅ 시드 데이터

**특징**:
- 여러 번 실행해도 안전 (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Dev와 Production 모두에 실행 가능

---

## 🔧 실행 방법

### Step 1: Supabase Dashboard 접속

#### Dev 환경:
1. https://supabase.com/dashboard 접속
2. Dev 프로젝트 선택
3. 왼쪽 메뉴 → **SQL Editor** 클릭

#### Production 환경:
1. https://supabase.com/dashboard 접속
2. Production 프로젝트 선택
3. 왼쪽 메뉴 → **SQL Editor** 클릭

### Step 2: SQL 파일 실행

1. **New Query** 버튼 클릭
2. `MASTER_TECHNIQUE_SCHEMA.sql` 파일 내용 전체 복사
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭 (또는 `Ctrl + Enter`)

### Step 3: 확인

실행 후 다음 쿼리로 확인:

```sql
-- 기술 테이블 확인
SELECT COUNT(*) FROM techniques;
-- 결과: 18 (기본 기술 개수)

-- 테이블 존재 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'technique%';
-- 결과: 7개 테이블
```

---

## 📊 기존 스키마 파일 목록

현재 `supabase/` 폴더에 있는 SQL 파일들:

### ✅ 이미 실행했을 가능성이 높은 것들:
- `courses_schema.sql` - 강좌 시스템
- `drills_schema.sql` - 드릴 시스템
- `drill_routine_schema.sql` - 루틴 시스템
- `user_skills_schema.sql` - 스킬 트리 (구버전)
- `enhanced_xp_system.sql` - XP 시스템
- `tournament_enhancements.sql` - 토너먼트

### ⚠️ 실행 여부 불명확:
- `final_schema_update.sql`
- `master_schema.sql`
- `notifications_schema.sql`
- `subscriptions_schema.sql`

### 🆕 새로 만든 것:
- `MASTER_TECHNIQUE_SCHEMA.sql` ⬅️ **이것만 실행하면 됨!**

---

## 🎯 권장 사항

### 지금 당장:
1. **Dev 환경**에 `MASTER_TECHNIQUE_SCHEMA.sql` 실행
2. 앱 테스트 (`/technique-roadmap` 페이지 확인)
3. 문제 없으면 **Production 환경**에도 실행

### 나중에 (선택):
기존 스키마 파일들을 정리하고 싶다면:

1. **현재 DB 상태 덤프**:
   ```bash
   # Supabase Dashboard → Database → Backups
   ```

2. **마이그레이션 파일 생성**:
   - 각 스키마 파일에 버전 번호 추가
   - 실행 이력 테이블 생성
   - 예: `schema_migrations` 테이블

3. **통합 마스터 스키마 생성**:
   - 모든 필요한 스키마를 하나로 통합
   - 버전 관리 추가

---

## 🚨 주의사항

1. **Production 실행 전 백업**:
   - Supabase Dashboard → Database → Backups → Create Backup

2. **피크 시간 피하기**:
   - 사용자가 적은 시간대에 실행

3. **롤백 계획**:
   - 문제 발생 시 백업에서 복구

---

## 📞 문제 발생 시

1. **에러 메시지 확인**:
   - SQL Editor에서 에러 메시지 복사
   - 어떤 라인에서 에러가 났는지 확인

2. **테이블 충돌**:
   - 이미 존재하는 테이블이면 `DROP TABLE` 후 재실행
   - 또는 해당 부분만 주석 처리

3. **데이터 손실 방지**:
   - 절대 `DROP TABLE` 하지 말 것 (데이터 있으면)
   - `ALTER TABLE` 사용

---

## ✅ 체크리스트

- [ ] Dev 환경 백업 완료
- [ ] Dev 환경에 `MASTER_TECHNIQUE_SCHEMA.sql` 실행
- [ ] Dev 환경에서 `/technique-roadmap` 페이지 테스트
- [ ] 기술 목록 18개 확인
- [ ] Production 환경 백업 완료
- [ ] Production 환경에 `MASTER_TECHNIQUE_SCHEMA.sql` 실행
- [ ] Production 환경 테스트

---

**작성일**: 2024-11-25  
**작성자**: Antigravity AI  
**버전**: 1.0
