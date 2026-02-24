# 소셜 로그인 설정 가이드 (Google, Naver, Kakao)

Grappl 플랫폼에 소셜 로그인 기능을 활성화하기 위한 단계별 가이드입니다.

> [!IMPORTANT]
> 소셜 로그인 코드는 이미 구현되어 있습니다. 이 가이드는 **외부 OAuth 제공자 설정**을 위한 것입니다.

---

## 📋 사전 준비

- [x] Supabase 프로젝트 생성 완료
- [ ] Google Cloud Console 계정
- [ ] Naver Developers 계정
- [ ] Kakao Developers 계정

---

## 🔧 1. Supabase 리다이렉트 URL 확인

모든 OAuth 제공자에서 사용할 Supabase 콜백 URL을 확인합니다.

1. Supabase 대시보드 → **Authentication** → **URL Configuration**
2. **Redirect URLs** 섹션에서 다음 URL 확인:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
3. 이 URL을 복사해두세요 (각 OAuth 앱 설정에서 사용)

---

## 🔵 2. Google OAuth 설정

### 2.1 Google Cloud Console 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 이름: `Grappl` (또는 원하는 이름)

### 2.2 OAuth 동의 화면 구성

1. 좌측 메뉴 → **APIs & Services** → **OAuth consent screen**
2. User Type: **External** 선택 → **CREATE**
3. 앱 정보 입력:
   - **App name**: `Grappl`
   - **User support email**: 본인 이메일
   - **Developer contact information**: 본인 이메일
4. **SAVE AND CONTINUE** 클릭
5. Scopes: 기본값 유지 → **SAVE AND CONTINUE**
6. Test users: (선택사항) → **SAVE AND CONTINUE**

### 2.3 OAuth 2.0 클라이언트 ID 생성

1. 좌측 메뉴 → **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Grappl Web Client`
4. **Authorized redirect URIs** → **+ ADD URI**:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
5. **CREATE** 클릭
6. **Client ID**와 **Client Secret** 복사 (잘 보관!)

### 2.4 Supabase에 Google OAuth 등록

1. Supabase 대시보드 → **Authentication** → **Providers**
2. **Google** 찾기 → **Enable** 토글
3. 정보 입력:
   - **Client ID**: Google에서 복사한 Client ID
   - **Client Secret**: Google에서 복사한 Client Secret
4. **Save** 클릭

---

## 🟢 3. Naver OAuth 설정

### 3.1 Naver Developers 애플리케이션 등록

1. [Naver Developers](https://developers.naver.com/apps/#/register) 접속
2. **애플리케이션 등록** 클릭
3. 애플리케이션 정보 입력:
   - **애플리케이션 이름**: `Grappl`
   - **사용 API**: **네이버 로그인** 선택
   - **제공 정보**: 이메일, 닉네임, 프로필 이미지 선택
4. **로그인 오픈 API 서비스 환경**:
   - **서비스 URL**: `http://localhost:5173` (개발용)
   - **Callback URL**: 
     ```
     https://your-project.supabase.co/auth/v1/callback
     ```
5. **등록하기** 클릭

### 3.2 Client ID/Secret 확인

1. 등록한 애플리케이션 클릭
2. **Client ID**와 **Client Secret** 확인 및 복사

### 3.3 Supabase에 Naver OAuth 등록

> [!WARNING]
> Supabase는 기본적으로 Naver를 지원하지 않을 수 있습니다. 이 경우 커스텀 OAuth 제공자로 설정하거나, Supabase 업데이트를 기다려야 합니다.

**대안 방법:**
- Supabase Edge Functions를 사용하여 Naver OAuth 직접 구현
- 또는 백엔드에서 Naver 로그인 처리 후 Supabase 세션 생성

---

## 🟡 4. Kakao OAuth 설정

### 4.1 Kakao Developers 애플리케이션 생성

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 정보 입력:
   - **앱 이름**: `Grappl`
   - **사업자명**: 개인 또는 회사명
4. **저장** 클릭

### 4.2 플랫폼 설정

1. 생성한 앱 선택 → **플랫폼** 메뉴
2. **Web 플랫폼 등록** 클릭
3. **사이트 도메인**: 
   ```
   http://localhost:5173
   ```
4. **저장** 클릭

### 4.3 카카오 로그인 활성화

1. 좌측 메뉴 → **카카오 로그인** → **활성화 설정** → **ON**
2. **Redirect URI** 등록:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
3. **동의 항목** 설정:
   - 닉네임: 필수
   - 프로필 사진: 선택
   - 카카오계정(이메일): 필수
4. **저장** 클릭

### 4.4 앱 키 확인

1. **앱 설정** → **앱 키** 메뉴
2. **REST API 키** 복사 (이것이 Client ID)
3. **보안** → **Client Secret** 생성 및 복사

### 4.5 Supabase에 Kakao OAuth 등록

> [!WARNING]
> Supabase는 기본적으로 Kakao를 지원하지 않을 수 있습니다. Naver와 동일하게 커스텀 구현이 필요할 수 있습니다.

**대안 방법:**
- Supabase Edge Functions 사용
- 또는 백엔드에서 Kakao 로그인 처리

---

## ✅ 5. 테스트

### 5.1 개발 서버 실행

```powershell
npm run dev
```

### 5.2 로그인 페이지 접근

1. 브라우저에서 `http://localhost:5173/login` 접속
2. 소셜 로그인 버튼 확인:
   - ✅ Google 로그인
   - ✅ 네이버 로그인
   - ✅ 카카오 로그인

### 5.3 Google 로그인 테스트

1. **Google 로그인** 버튼 클릭
2. Google 계정 선택 화면으로 리다이렉트
3. 계정 선택 및 권한 승인
4. 앱으로 리다이렉트되어 로그인 완료
5. 사용자 정보 확인 (우측 상단 프로필)

### 5.4 Naver/Kakao 로그인 테스트

> [!NOTE]
> Naver와 Kakao는 Supabase에서 기본 지원하지 않을 수 있습니다. 버튼 클릭 시 에러가 발생하면 정상입니다.

**에러 발생 시:**
- Google 로그인만 사용
- 또는 커스텀 OAuth 구현 필요

---

## 🔍 문제 해결

### 문제: "Provider not enabled" 에러

**해결:**
1. Supabase 대시보드 → Authentication → Providers
2. 해당 제공자가 **Enabled** 상태인지 확인
3. Client ID/Secret이 올바르게 입력되었는지 확인

### 문제: Redirect URI mismatch

**해결:**
1. OAuth 제공자 설정에서 Redirect URI 확인
2. Supabase 콜백 URL과 정확히 일치하는지 확인:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
3. 프로토콜(https), 도메인, 경로 모두 정확해야 함

### 문제: Naver/Kakao 로그인 작동 안 함

**원인:** Supabase가 해당 제공자를 기본 지원하지 않음

**해결 방법:**
1. **Google 로그인만 사용** (가장 간단)
2. **Supabase Edge Functions로 커스텀 구현**
3. **백엔드 서버에서 OAuth 처리** 후 Supabase 세션 생성

---

## 📝 현재 상태

### 구현 완료 ✅
- [x] AuthContext에 소셜 로그인 함수 추가
- [x] Login 페이지 UI 업데이트
- [x] Google, Naver, Kakao 버튼 활성화
- [x] 로딩 상태 처리
- [x] 에러 처리

### 설정 필요 ⚠️
- [ ] Google OAuth 앱 등록 및 Supabase 연동
- [ ] Naver OAuth 앱 등록 (커스텀 구현 필요)
- [ ] Kakao OAuth 앱 등록 (커스텀 구현 필요)

### 권장 사항 💡

**단계별 접근:**
1. **먼저 Google 로그인만 설정** (가장 쉽고 안정적)
2. 테스트 및 검증
3. 필요시 Naver/Kakao는 나중에 추가

**Google만으로도 충분한 이유:**
- 대부분의 사용자가 Google 계정 보유
- Supabase 완벽 지원
- 설정이 간단하고 안정적

---

## 🎉 완료!

Google OAuth 설정을 완료하면 소셜 로그인이 작동합니다. Naver와 Kakao는 선택사항이며, 필요시 커스텀 구현을 고려하세요.

다음 단계: [전체 플로우 테스트](#)
