# Supabase 데이터베이스 설정 가이드

이 가이드는 Grappl 프로젝트의 Supabase 데이터베이스를 처음부터 설정하는 방법을 단계별로 안내합니다.

## 📋 사전 준비

- [ ] Supabase 계정 (https://supabase.com)
- [ ] 프로젝트 소스 코드
- [ ] 이메일 주소 (관리자 계정용)

---

## 🚀 1단계: Supabase 프로젝트 생성

### 1.1 새 프로젝트 만들기

1. [Supabase 대시보드](https://app.supabase.com)에 로그인
2. **"New Project"** 클릭
3. 프로젝트 정보 입력:
   - **Name**: `grappl` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (잘 보관하세요!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 사용자용)
   - **Pricing Plan**: Free 또는 Pro 선택
4. **"Create new project"** 클릭
5. 프로젝트 생성 완료까지 1-2분 대기

### 1.2 API 키 확인

프로젝트 생성 후:

1. 좌측 메뉴에서 **Settings** → **API** 클릭
2. 다음 정보 복사:
   - **Project URL** (예: `https://xxxxx.supabase.co`)
   - **anon public** 키 (긴 문자열)

---

## 🔧 2단계: 환경변수 설정

### 2.1 .env 파일 생성

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 내용 입력:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> [!WARNING]
> `.env` 파일은 절대 Git에 커밋하지 마세요! `.gitignore`에 이미 포함되어 있는지 확인하세요.

### 2.2 환경변수 확인

개발 서버를 재시작하여 환경변수가 로드되었는지 확인:

```powershell
npm run dev
```

브라우저 콘솔에 Supabase 관련 에러가 없으면 성공!

---

## 🗄️ 3단계: 데이터베이스 스키마 설정

### 3.1 SQL Editor 열기

1. Supabase 대시보드에서 좌측 메뉴 **SQL Editor** 클릭
2. **"New query"** 클릭

### 3.2 마스터 스키마 실행

1. [`supabase/master_schema.sql`](file:///c:/Users/armba/grappl/supabase/master_schema.sql) 파일 열기
2. 전체 내용 복사
3. Supabase SQL Editor에 붙여넣기
4. **"Run"** 버튼 클릭 (또는 `Ctrl+Enter`)
5. 성공 메시지 확인: `Success. No rows returned`

> [!TIP]
> 에러가 발생하면 에러 메시지를 확인하고, 이미 테이블이 존재하는 경우 해당 부분을 건너뛰거나 `DROP TABLE IF EXISTS` 명령을 먼저 실행하세요.

### 3.3 테이블 생성 확인

1. 좌측 메뉴에서 **Table Editor** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - ✅ `users`
   - ✅ `creators`
   - ✅ `courses`
   - ✅ `lessons`
   - ✅ `videos`
   - ✅ `user_courses`
   - ✅ `user_videos`
   - ✅ `lesson_progress`
   - ✅ `notifications`
   - ✅ `subscriptions`
   - ✅ `revenue_ledger`
   - ✅ `creator_payouts`

---

## 📦 4단계: Storage 버킷 설정

### 4.1 프로필 이미지 버킷 생성

1. 좌측 메뉴에서 **Storage** 클릭
2. **SQL Editor**로 돌아가기
3. **"New query"** 클릭
4. [`supabase/setup_profile_storage.sql`](file:///c:/Users/armba/grappl/supabase/setup_profile_storage.sql) 파일 내용 복사
5. SQL Editor에 붙여넙기
6. **"Run"** 클릭

### 4.2 버킷 확인

1. **Storage** 메뉴로 돌아가기
2. `profile-images` 버킷이 생성되었는지 확인
3. 버킷 클릭 → **Policies** 탭에서 4개의 정책 확인:
   - ✅ Users can upload profile images
   - ✅ Users can update own profile images
   - ✅ Users can delete own profile images
   - ✅ Public profile images

---

## 👤 5단계: 관리자 계정 설정

### 5.1 회원가입

1. 개발 서버 실행: `npm run dev`
2. 브라우저에서 앱 열기
3. 회원가입 페이지에서 **본인의 이메일**로 가입
4. 이메일 인증 완료

### 5.2 관리자 권한 부여

1. Supabase 대시보드 → **SQL Editor** 열기
2. 다음 쿼리 실행 (**이메일을 본인의 이메일로 변경**):

```sql
UPDATE public.users 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

3. **"Run"** 클릭

### 5.3 관리자 권한 확인

1. 다음 쿼리로 확인:

```sql
SELECT id, email, is_admin, created_at 
FROM public.users 
WHERE is_admin = true;
```

2. 본인의 이메일이 `is_admin = true`로 표시되면 성공!

3. 앱에서 로그아웃 후 다시 로그인
4. 관리자 메뉴가 표시되는지 확인

---

## 🧪 6단계: 테스트 데이터 삽입 (선택사항)

개발 및 테스트를 위해 샘플 데이터를 삽입할 수 있습니다.

### 6.1 샘플 크리에이터 및 코스 생성

1. SQL Editor에서 [`supabase/courses_seed.sql`](file:///c:/Users/armba/grappl/supabase/courses_seed.sql) 실행
2. 앱에서 Browse 페이지를 열어 샘플 코스가 표시되는지 확인

> [!NOTE]
> 시드 데이터는 개발 환경에서만 사용하세요. 프로덕션 환경에서는 실제 데이터를 사용해야 합니다.

---

## ✅ 7단계: 설정 검증 체크리스트

모든 설정이 완료되었는지 확인하세요:

### 데이터베이스
- [ ] 12개의 테이블이 모두 생성됨
- [ ] 각 테이블에 RLS가 활성화됨 (Table Editor → 테이블 선택 → Policies 탭)
- [ ] 트리거 2개 생성됨 (`on_auth_user_created`, `update_lesson_progress_updated_at`)

### Storage
- [ ] `profile-images` 버킷 생성됨
- [ ] Public 읽기 권한 활성화됨
- [ ] 4개의 Storage 정책 생성됨

### 환경변수
- [ ] `.env` 파일에 `VITE_SUPABASE_URL` 설정됨
- [ ] `.env` 파일에 `VITE_SUPABASE_ANON_KEY` 설정됨
- [ ] 개발 서버 재시작 후 에러 없음

### 계정
- [ ] 본인 이메일로 회원가입 완료
- [ ] `users` 테이블에 본인 계정이 `is_admin = true`로 설정됨
- [ ] 앱에서 관리자 메뉴 접근 가능

### 기능 테스트
- [ ] 로그인/로그아웃 정상 작동
- [ ] Browse 페이지에서 코스 목록 표시
- [ ] 관리자 대시보드 접근 가능
- [ ] 프로필 이미지 업로드 가능 (Settings 페이지)

---

## 🔍 문제 해결

### 문제: "Missing Supabase environment variables" 에러

**해결:**
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. 환경변수 이름이 정확한지 확인 (`VITE_` 접두사 필수)
3. 개발 서버 재시작

### 문제: RLS 정책 에러 (403 Forbidden)

**해결:**
1. Supabase 대시보드 → Table Editor → 해당 테이블 → Policies 탭
2. RLS가 활성화되어 있는지 확인
3. 적절한 정책이 생성되어 있는지 확인
4. 로그아웃 후 다시 로그인

### 문제: 관리자 메뉴가 보이지 않음

**해결:**
1. SQL Editor에서 확인:
   ```sql
   SELECT is_admin FROM users WHERE email = 'your-email@example.com';
   ```
2. `is_admin`이 `false`이면 5.2단계 다시 실행
3. 앱에서 로그아웃 후 다시 로그인

### 문제: Storage 업로드 실패

**해결:**
1. Storage → `profile-images` → Policies 확인
2. 4개의 정책이 모두 생성되어 있는지 확인
3. `setup_profile_storage.sql` 다시 실행

---

## 📚 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Row Level Security (RLS) 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage 가이드](https://supabase.com/docs/guides/storage)
- [데이터베이스 스키마 문서](file:///c:/Users/armba/grappl/DATABASE_SCHEMA.md)

---

## 🎉 완료!

축하합니다! Grappl 프로젝트의 Supabase 데이터베이스 설정이 완료되었습니다.

이제 다음 단계로 진행할 수 있습니다:
- 크리에이터 신청 및 승인 플로우 테스트
- 코스 생성 및 업로드
- 결제 시스템 연동
- 프로덕션 배포

문제가 발생하면 위의 문제 해결 섹션을 참고하거나, Supabase 대시보드의 Logs 메뉴에서 에러 로그를 확인하세요.
