# Grapplay

**프리미엄 브라질리안 주짓수 영상 플랫폼**

[https://grapplay.com](https://grapplay.com)

---

## 소개

Grapplay는 브라질리안 주짓수(BJJ) 수련자들을 위한 프리미엄 영상 플랫폼입니다. 세계 최고 수준의 강사진과 그래플링 실력 향상을 원하는 수련생들을 고품질 교육 콘텐츠로 연결합니다.

### 주요 기능

- **드릴 영상** - 세로 스크롤 형식의 짧고 집중적인 기술 시연 영상
- **레슨 영상** - 기술과 포지션별로 정리된 심층 교육 콘텐츠
- **코스** - 엘리트 강사가 제작한 체계적인 학습 경로
- **훈련 루틴** - 여러 드릴을 조합한 맞춤형 연습 세션
- **AI 코치** - 훈련 목표에 맞는 지능형 기술 추천
- **스킬 트리** - 주짓수 성장 과정을 추적하는 시각적 진행 시스템
- **스파링 분석** - 대회 영상 리뷰 및 학습

### 크리에이터를 위한 기능

Grapplay는 주짓수 강사와 선수들이 지식을 공유할 수 있는 플랫폼을 제공합니다:

- 드릴, 레슨, 전체 코스 업로드
- 구독자 기반 구축
- 참여도 분석 추적
- 전문성 수익화

## 기술 스택

- **프론트엔드**: React 18 + TypeScript + Vite
- **스타일링**: Tailwind CSS
- **상태 관리**: React Query + Context API
- **백엔드**: Supabase (PostgreSQL + Auth + Storage)
- **영상 호스팅**: Vimeo (레슨/코스) + Mux (드릴)
- **결제**: Stripe, PayPal, PortOne (한국 결제)
- **모바일**: Capacitor (iOS/Android)
- **배포**: Vercel

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

### 환경 변수

`.env.example`을 `.env.local`로 복사하고 필요한 변수를 설정하세요:

- `VITE_SUPABASE_URL` - Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY` - Supabase 익명 키
- `VITE_VIMEO_ACCESS_TOKEN` - Vimeo API 토큰
- `VITE_MUX_TOKEN_ID` - Mux 토큰 ID
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe 공개 키

## 프로젝트 구조

```
grapplay/
├── App.tsx              # 메인 애플리케이션 라우터
├── index.tsx            # 진입점
├── components/          # 재사용 가능한 UI 컴포넌트
├── contexts/            # React Context 프로바이더
├── hooks/               # 커스텀 React 훅
├── lib/                 # 유틸리티 및 API 클라이언트
├── pages/               # 페이지 컴포넌트
│   ├── admin/           # 관리자 대시보드
│   └── creator/         # 크리에이터 도구
├── supabase/
│   └── functions/       # Edge 함수
└── public/              # 정적 자산
```

## 라이선스

Proprietary - 모든 권리 보유.

---

**Grapplay** - 당신의 주짓수 실력을 한 단계 끌어올리세요.
