# Grapplay Vercel Development Guide

이 프로젝트는 **Vercel Serverless Functions**(`api/*.ts`)를 사용하고 있습니다.
따라서 로컬에서 동영상 업로드 등 핵심 기능을 테스트하려면 `npm run dev` 대신 `vercel dev`를 사용해야 합니다.

## 🚀 로컬 실행 방법 (권장)

1. 터미널을 엽니다.
2. 아래 명령어를 실행합니다:
   ```bash
   vercel dev
   ```
   *(처음 실행 시 Vercel 로그인 및 프로젝트 연결을 물어볼 수 있습니다. 'Yes'로 진행하면 됩니다.)*

3. 실행되면 `http://localhost:3000` 으로 접속하세요.
   - 프론트엔드와 백엔드(API)가 모두 완벽하게 동작합니다.

---

## ⚠️ `npm run dev` 실행 시 주의점

그냥 `npm run dev` (또는 `vite`)로 실행하면:
- **웹사이트 화면은 잘 나옵니다.**
- 하지만 **`/api/...` 요청을 처리해줄 서버가 없어서 에러가 납니다.**
- (동영상 업로드, 알림 등 서버 기능이 작동하지 않습니다.)

간단한 화면 수정 작업만 할 때는 `npm run dev`도 괜찮지만,
기능 테스트를 할 때는 꼭 `vercel dev`를 사용해주세요!
