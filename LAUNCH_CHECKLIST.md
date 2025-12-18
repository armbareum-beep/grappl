# 🚀 Grapplay 론칭 최종 체크리스트

> **론칭 D-Day 전 필수 확인 사항**  
> 마지막 업데이트: 2025-12-18

---

## ⚡ 즉시 확인 (Critical - 론칭 전 필수)

### 1. 결제 시스템 ✅
- [x] **PayPal 라이브 키 설정** - 완료
- [x] **PayPal 에지 함수 배포** - 완료
- [ ] **포트원 승인 대기 중** - 승인 후 즉시 설정
- [ ] **DB 마이그레이션 실행** ⚠️ **매우 중요!**
  ```sql
  -- Supabase SQL Editor에서 실행
  -- 파일: supabase/paypal_migration.sql
  ```

### 2. 결제 테스트
- [ ] **PayPal 샌드박스 테스트** (가상 결제)
- [ ] **포트원 테스트** (승인 후)
- [ ] **구독 결제 확인** (Basic/Pro)
- [ ] **결제 후 권한 부여 확인**

### 3. 동영상 시스템 ✅
- [x] **Vimeo 토큰 설정** - 완료
- [ ] **도메인 제한 설정** (Vimeo 대시보드)
  - Settings → Privacy → Domain-level privacy
  - `grapplay.com` 또는 실제 도메인 추가

---

## 🔧 설정 확인 (Important)

### 환경 변수
- [x] Supabase URL/Key
- [x] PayPal Live Keys
- [x] Vimeo Token
- [ ] Google Client ID (소셜 로그인용)
- [ ] 포트원 Keys (승인 후)

### 배포 상태
- [x] GitHub 푸시 완료
- [ ] Vercel/Netlify 빌드 성공 확인
- [ ] 실제 도메인 접속 테스트

---

## 📊 분석 & 마케팅 (Nice to Have)

### Google Analytics
- [ ] GA4 태그 추가 (`index.html`)
  ```html
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  ```

### SEO
- [ ] 메타 태그 확인 (Title, Description, OG Image)
- [ ] 사이트맵 생성

---

## ⚖️ 법적 고지 (Must Have)

### 필수 페이지
- [ ] **이용약관** 페이지 작성 및 링크 연결
- [ ] **개인정보처리방침** 페이지 작성 및 링크 연결
- [ ] **사업자 정보** 푸터 표시
  - 상호명
  - 대표자명
  - 사업자등록번호
  - 통신판매업 신고번호

---

## 🎯 론칭 당일 체크리스트

### 오전 (론칭 3시간 전)
- [ ] 모든 에지 함수 정상 작동 확인
- [ ] 데이터베이스 백업
- [ ] 에러 로깅 확인 (Sentry 등)

### 론칭 직전 (1시간 전)
- [ ] 실제 결제 테스트 (최소 금액)
- [ ] 회원가입 → 로그인 → 결제 → 강좌 접근 전체 플로우 확인
- [ ] 모바일 브라우저 테스트 (iOS Safari, Android Chrome)

### 론칭 직후
- [ ] 실시간 에러 모니터링
- [ ] 첫 결제 발생 시 DB 확인
- [ ] 사용자 피드백 수집 준비

---

## 🚨 긴급 연락처

### 서비스 장애 시
1. Supabase 대시보드 확인
2. Vercel/Netlify 로그 확인
3. PayPal/포트원 대시보드 확인

### 결제 오류 시
- PayPal: [https://www.paypal.com/merchantsupport](https://www.paypal.com/merchantsupport)
- 포트원: 고객센터 1670-0876

---

## ✅ 최종 승인

**론칭 책임자 서명:**  
날짜: ___________  
확인: [ ] 모든 Critical 항목 완료

---

> **💡 Tip**: 이 체크리스트를 프린트하여 하나씩 체크하세요!
