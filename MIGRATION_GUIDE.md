# Supabase 데이터베이스 마이그레이션 가이드

## 레슨 테이블 수정 (course_id nullable)

레슨을 코스와 독립적으로 생성할 수 있도록 `lessons` 테이블의 `course_id` 컬럼을 nullable로 변경해야 합니다.

### 방법 1: Supabase Dashboard 사용 (추천)

1. **Supabase Dashboard 접속**
   - https://supabase.com 로그인
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 클릭

3. **SQL 실행**
   ```sql
   -- Step 1: Drop the existing foreign key constraint
   ALTER TABLE lessons 
   DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;

   -- Step 2: Make course_id nullable
   ALTER TABLE lessons 
   ALTER COLUMN course_id DROP NOT NULL;

   -- Step 3: Recreate the foreign key constraint (now allowing NULL)
   ALTER TABLE lessons 
   ADD CONSTRAINT lessons_course_id_fkey 
   FOREIGN KEY (course_id) 
   REFERENCES courses(id) 
   ON DELETE SET NULL;
   ```

4. **"Run" 버튼 클릭**

### 방법 2: 마이그레이션 파일 사용

마이그레이션 파일이 이미 생성되어 있습니다:
`supabase/migrations/make_lessons_course_id_nullable.sql`

Supabase CLI를 사용하는 경우:
```bash
supabase db push
```

### 확인 방법

SQL Editor에서 실행:
```sql
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name = 'course_id';
```

결과에서 `is_nullable`이 `YES`이면 성공입니다.

### 완료 후

마이그레이션 완료 후:
1. 사이트에서 캐시 삭제 (Ctrl + Shift + R)
2. 레슨 업로드 테스트
3. 레슨이 정상적으로 생성되는지 확인

### 문제 해결

만약 여전히 오류가 발생하면:
1. Supabase Dashboard에서 `lessons` 테이블 확인
2. `course_id` 컬럼이 nullable인지 확인
3. 브라우저 콘솔에서 정확한 오류 메시지 확인
