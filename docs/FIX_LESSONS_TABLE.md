# Supabase 레슨 테이블 컬럼 추가

## 문제
백엔드가 레슨 비디오를 Vimeo에 업로드했지만, `lessons` 테이블에 `thumbnail_url` 컬럼이 없어서 업데이트에 실패했습니다.

## 해결 방법

### Supabase Dashboard에서 SQL 실행

1. **Supabase Dashboard 접속**
   - https://supabase.com 로그인
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭

3. **SQL 실행**
   ```sql
   -- Add thumbnail_url column to lessons table
   ALTER TABLE lessons 
   ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

   -- Add vimeo_url column if it doesn't exist
   ALTER TABLE lessons 
   ADD COLUMN IF NOT EXISTS vimeo_url TEXT;
   ```

4. **"Run" 버튼 클릭**

### 완료 후

1. **레슨 데이터 수동 업데이트** (Vimeo ID가 이미 있는 경우)
   - Vimeo에서 업로드된 비디오 ID 확인
   - Supabase에서 해당 레슨의 `vimeo_url`과 `thumbnail_url` 수동 업데이트

2. **또는 레슨 재업로드**
   - 새로운 레슨을 업로드해서 전체 프로세스 테스트

## 이미 업로드된 레슨 수정

만약 "sde" 레슨의 Vimeo ID를 알고 있다면:

```sql
UPDATE lessons 
SET 
  vimeo_url = 'YOUR_VIMEO_ID',
  thumbnail_url = 'https://vumbnail.com/YOUR_VIMEO_ID.jpg'
WHERE id = '9c0167aa-386f-4119-95b3-a26b04d47de5';
```

`YOUR_VIMEO_ID`를 실제 Vimeo 비디오 ID로 교체하세요.
