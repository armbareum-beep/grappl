# 콜드 스타트 문제 분석 및 해결 가이드

> 마지막 업데이트: 2026-03-10

## 문제 현상

웹사이트를 사용하다가 다른 탭으로 이동하거나, 잠시 자리를 비운 후 돌아오면 **첫 로딩이 느림** (2-5초 이상 지연)

---

## 현재 인프라 상태

| 서비스 | 플랜 | 비고 |
|--------|------|------|
| Supabase | Pro | PostgreSQL + Auth (Supavisor pooler) |
| Vercel | Pro | Edge Functions, CDN |
| React Query | IndexedDB Persist | 24시간 캐시 |

---

## 현재 구현된 최적화 (✅ 적용 완료)

### 1. Connection Manager (`lib/connection-manager.ts`)
- ✅ Realtime 채널로 WebSocket 연결 상시 유지
- ✅ 4분 간격 HTTP keepalive ping (백업)
- ✅ 탭 visibility 변경 시 warmup
- ✅ 2분 이상 유휴 시 auth refresh + query invalidate
- ✅ 마우스/터치/포커스 이벤트 시 사전 warmup (requestIdleCallback)
- ✅ Auth 토큰 10분 전 사전 갱신 (5분 간격 체크)

### 2. React Query Persistence (`lib/query-persister.ts`)
- ✅ IndexedDB 기반 캐시 저장 (idb-keyval)
- ✅ 24시간 maxAge
- ✅ 앱 버전 변경 시 캐시 버스팅

### 3. Auth Context 최적화 (`contexts/AuthContext.tsx`)
- ✅ 30분 localStorage 캐시 (user status)
- ✅ 4초 getSession 타임아웃
- ✅ 세션에서 즉시 user 설정 → loading=false → 백그라운드 status 체크
- ✅ 만료 토큰 자동 감지 및 refresh
- ✅ 3초 safety timeout (무한 로딩 방지)

### 4. Network 최적화 (`index.html`)
- ✅ Supabase, Vimeo, Sentry, Google Fonts에 `preconnect` 설정
- ✅ `dns-prefetch` 설정
- ✅ Google Fonts 비동기 로드 (preload + media=print trick)
- ✅ GA 2초 지연 로드

### 5. Bundle 최적화 (`vite.config.ts`)
- ✅ 주요 라이브러리 manual chunks 분리 (17개+ 청크)
- ✅ recharts/d3/framer-motion 초기 preload 제외
- ✅ sourcemap 제거

---

## 여전히 콜드 스타트가 발생하는 원인 분석

### 🔴 원인 1: `invalidateQueries()` 전체 무효화 (렌더링 폭풍)
**파일: `lib/connection-manager.ts` 238번째 줄**
```typescript
refreshAuthSession().then(() => {
    queryClient.invalidateQueries(); // ← 인자 없음 = 모든 쿼리 무효화!
});
```
- 탭을 2분 이상 떠났다 돌아오면 **모든 React Query 캐시를 한꺼번에 무효화**
- 수십 개의 쿼리가 **동시에 refetch** 시작 → 네트워크 병목 + 렌더 폭풍
- 각 쿼리의 `onSuccess` → `setState` → 컴포넌트 리렌더 연쇄 발생
- **사용자 체감**: 페이지 전체가 깜빡이거나 잠시 멈춘 것처럼 느껴짐

### 🔴 원인 2: 탭 복귀 시 동시 실행되는 작업들 (경합 조건)
탭을 떠났다 돌아오는 순간 **4개의 독립적 프로세스가 동시에 시작**:
```
[탭 복귀]
  ├─ connection-manager: warmupConnection() + refreshAuthSession() + invalidateQueries()
  ├─ VersionChecker: fetch('/version.json') (매번 네트워크 호출)
  ├─ AuthContext: onAuthStateChange 이벤트 → checkUserStatus() (2개 DB 쿼리)
  └─ React Query: staleTime 초과된 쿼리 자동 refetch
```
- 모두 **메인 스레드**에서 `setState` + 렌더링을 발생시킴
- 특히 `VersionChecker`의 `fetch('/version.json?t=...')`는 **cache: 'no-store'**로 매번 네트워크 호출

### 🟡 원인 3: `LoadingScreen` 전체 화면 차단
**파일: `components/LoadingScreen.tsx`**
```tsx
<div className="fixed inset-0 z-[999] ...">  // 전체 화면 overlay
```
- Auth `loading` 상태 동안 **전체 화면을 로딩 스피너**로 덮음
- `RootRedirect`에서 최대 3초간 표시될 수 있음
- 네트워크가 빨라도 auth 체크가 끝날 때까지 **아무것도 보이지 않음**
- **사용자 체감**: "페이지가 안 뜬다" → 실제로는 auth 체크 대기 중

### 🟡 원인 4: Auth 상태 변경 시 연쇄 리렌더
**파일: `contexts/AuthContext.tsx`**
```typescript
setUser(...)        // → 리렌더 1
setIsAdmin(...)     // → 리렌더 2
setIsCreator(...)   // → 리렌더 3
setIsOrganizer(...) // → 리렌더 4
setIsSubscribed(...)// → 리렌더 5
```
- 5개 `useState` 개별 업데이트 → 최대 5번 연쇄 리렌더
- `Layout`, 모든 `ProtectedRoute`, `AdminRoute` 등이 `useAuth()` 사용 중
- 각 리렌더마다 800줄짜리 `Layout.tsx` + 모든 하위 컴포넌트 재평가

### 🟡 원인 5: `Layout`의 `getSiteSettings()` 직접 호출
**파일: `components/Layout.tsx` 33-37번째 줄**
```typescript
React.useEffect(() => {
    getSiteSettings().then(res => {
        if (res.data) setSiteSettings(res.data);
    });
}, []);
```
- React Query를 거치지 않는 **직접 API 호출** → 캐시 없음
- Layout이 마운트될 때마다 매번 Supabase 쿼리 실행
- 응답 오면 `setSiteSettings()` → Layout 전체 리렌더

### ℹ️ 원인 6: 네이버 지도 SDK 동기 로딩
**현재 `index.html` 154번째 줄:**
```html
<script src="https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=...&submodules=geocoder"></script>
```
- **동기 스크립트** → HTML 파싱 차단
- 지도를 사용하지 않는 페이지에서도 매번 로드

### ℹ️ 원인 7: Cache-Control `no-cache, no-store` 메타 태그
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
```
- Vite 빌드 파일은 해시가 포함되어 캐시해도 안전한데 강제로 재검증

---

## 🆕 추가 해결책 (아직 적용되지 않은 것들)

### 해결책 A: 네이버 지도 SDK 지연 로드 (⭐ 최우선)

**효과: 지도 비사용 페이지에서 초기 로딩 200-800ms 단축**

네이버 지도 SDK를 지도가 실제 필요한 페이지에서만 동적으로 로드:

```typescript
// lib/naver-map-loader.ts

let mapPromise: Promise<void> | null = null;

export function loadNaverMapSDK(): Promise<void> {
    if (window.naver?.maps) return Promise.resolve();
    if (mapPromise) return mapPromise;

    mapPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=0abcyzwvg7&submodules=geocoder';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Naver Map SDK load failed'));
        document.head.appendChild(script);
    });

    return mapPromise;
}
```

`index.html`에서 동기 스크립트 태그 제거:
```diff
-<script src="https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=0abcyzwvg7&submodules=geocoder"></script>
+<!-- 네이버 지도: 필요한 컴포넌트에서 동적 로드 (lib/naver-map-loader.ts) -->
+<link rel="dns-prefetch" href="https://openapi.map.naver.com" />
```

지도를 사용하는 컴포넌트에서:
```typescript
// 지도 컴포넌트 내부
useEffect(() => {
    loadNaverMapSDK().then(() => {
        // 지도 초기화
    });
}, []);
```

### 해결책 B: Cache-Control 헤더 개선 (⭐ 최우선)

**효과: JS/CSS 재검증 대기 제거, 탭 복귀 시 즉시 로드**

`index.html`의 `no-cache, no-store` 메타 태그 제거:
```diff
-<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
-<meta http-equiv="Pragma" content="no-cache" />
-<meta http-equiv="Expires" content="0" />
```

Vercel `vercel.json`에서 세밀한 캐시 정책 적용:
```json
{
    "headers": [
        {
            "source": "/assets/(.*)",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "public, max-age=31536000, immutable"
                }
            ]
        },
        {
            "source": "/index.html",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "no-cache"
                }
            ]
        }
    ]
}
```

**이유**: Vite가 빌드한 JS/CSS는 해시값이 포함된 파일명(`assets/react-core-abc123.js`)이므로 `immutable` 캐시가 안전함. `index.html`만 `no-cache`로 항상 최신 진입점 보장.

### 해결책 C: Supabase Auth `startAutoRefresh` / `stopAutoRefresh` 활용

**효과: 탭 복귀 시 토큰 갱신 지연 제거**

Supabase JS 클라이언트가 제공하는 공식 API를 활용:

```typescript
// contexts/AuthContext.tsx 또는 connection-manager.ts에 추가

// 탭 전환 시 자동 갱신 제어
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // 탭 활성화 → 즉시 자동 갱신 시작
        supabase.auth.startAutoRefresh();
    } else {
        // 탭 비활성화 → 자동 갱신 중지 (리소스 절약)
        supabase.auth.stopAutoRefresh();
    }
});
```

**장점**: 수동 `proactiveTokenRefresh` 로직의 일부를 Supabase 공식 API로 대체 가능. 탭 복귀 시 `startAutoRefresh`가 즉시 토큰 상태 확인 및 갱신 수행.

### 해결책 D: Service Worker Navigation Preload 활성화

**효과: SW 부팅 시간과 네트워크 요청을 병렬 처리, 300-500ms 단축**

Service Worker가 활성화된 상태에서 네비게이션 요청 시, SW 부팅과 네트워크 fetch를 동시에 수행:

```typescript
// service-worker 등록 시 추가 (vite-plugin-pwa가 생성하는 SW에 커스텀 로직)

// sw-custom.js (import from vite-plugin-pwa injectManifest)
self.addEventListener('activate', (event) => {
    event.waitUntil(async function () {
        if (self.registration.navigationPreload) {
            await self.registration.navigationPreload.enable();
        }
    }());
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(async function () {
            try {
                // Navigation Preload 응답 사용 (SW 부팅과 병렬)
                const preloadResponse = await event.preloadResponse;
                if (preloadResponse) return preloadResponse;
            } catch {}
            return fetch(event.request);
        }());
    }
});
```

**주의**: `vite-plugin-pwa`의 `injectManifest` 모드로 전환 필요. `generateSW` 모드에서는 커스텀 SW 코드 삽입이 제한적.

## 새로운 해결책 제안 (렌더링 & 초기화 병목 기반)

새롭게 파악된 렌더링/네트워크 병목을 해결하기 위한 권장 조치입니다.

### I. `invalidateQueries` 무효화 대상 제한 (🔥 최우선)
**파일: `lib/connection-manager.ts` (238번째 줄 부근)**
현재 인자 없이 호출되는 `invalidateQueries()`를 수정하여, **사용자 정보 관련 핵심 쿼리**만 무효화하거나 네트워크 통신 방식을 변경해야 합니다.
```typescript
// AS-IS
queryClient.invalidateQueries(); // 모든 캐시 삭제 및 동시 렌더 폭풍

// TO-BE (사용자 상태만 무효화)
queryClient.invalidateQueries({ queryKey: ['user-status'] });

// TO-BE (조용히 백그라운드 리패치)
queryClient.refetchQueries({ type: 'active' }); 
```

### J. `LoadingScreen` 차단 완화 및 Skeleton UI 활용 (🌟 중요)
**파일: `App.tsx` 및 `components/LoadingScreen.tsx`**
3초간 앱 전체를 덮는 LoadingScreen을 제거하거나 완화해야 합니다.
- **스켈레톤 UI(Skeleton UI) 도입**: Auth 상태를 기다리는 동안 전체 화면 스피너 대신 화면 골격만 보여주어 앱이 즉각 반응하는 것처럼 느끼게 합니다.
- `RootRedirect`에서 강제 로딩 스크린 표출 시간을 대폭 줄이거나 없앱니다.

### K. `AuthContext` 연쇄 리렌더 방지 (렌더 최적화)
**파일: `contexts/AuthContext.tsx`**
다수의 `setState`를 하나의 `setState`로 통합하거나 렌더링 일괄 처리(batching)를 최적화해야 합니다. (React 18의 자동 배칭에 의존하기보다 하나의 객체로 관리하는 것이 확실합니다.)
```typescript
// AS-IS
setUser(sessionUser);
setIsAdmin(adminStatus);
setIsCreator(creatorStatus);

// TO-BE
setAuthState({
  user: sessionUser,
  isAdmin: adminStatus,
  isCreator: creatorStatus,
  // ...
});
```

### L. `Layout`의 `getSiteSettings` React Query 마이그레이션
**파일: `components/Layout.tsx`의 33번째 줄**
직접 API를 `fetch`하는 대신 React Query를 사용하여 불필요한 호출을 막아야 합니다.
```typescript
// AS-IS
React.useEffect(() => { getSiteSettings().then(...) }, []);

// TO-BE
const { data: siteSettings } = useQuery({
  queryKey: ['siteSettings'],
  queryFn: getSiteSettings,
  staleTime: 1000 * 60 * 60 * 24 // 하루 종일 캐시
});
```

### M. `VersionChecker` 불필요한 호출 방지
**파일: `components/VersionChecker.tsx` 30번째 줄**
- `cache: 'no-store'`로 인해 탭 복귀마다 무조건 실행되는 `/version.json` 요청 주기를 늘리거나, ETag를 활용하여 `304 Not Modified`를 받도록 개선합니다.
- `visibilitychange` 이벤트에 걸려 있는 `checkVersion()` 트리거를 제거하거나 Throttling을 더 강하게(예: 최소 30분 간격) 설정합니다.

---

## 권장 적용 순서 (업데이트)

1. **🔴 즉시 적용** (코드 변경 최소, 효과 큼)
   - **해결책 A**: 네이버 지도 SDK 지연 로드 → `index.html` 동기 스크립트 제거
   - **해결책 B**: `no-cache, no-store` 메타 태그 제거 + `vercel.json` 캐시 정책

2. **🟡 단기** (로직 추가, 테스트 필요)
   - **해결책 C**: `startAutoRefresh` / `stopAutoRefresh` 활용
   - **해결책 E**: 선택적 React Query 캐시 복원
   - **해결책 G**: fetch keepalive 설정

3. **🟠 중기** (아키텍처 변경)
   - **해결책 D**: Navigation Preload (injectManifest 모드 전환 필요)
   - **해결책 H**: Realtime 재연결 감지 로직 강화

4. **🔵 장기** (인프라 변경)
   - **해결책 F**: Edge Function 중간 계층 도입 시 SWR CDN 캐시

---

## 모니터링 및 측정

### Performance API로 콜드 스타트 시간 측정

```typescript
// lib/performance-monitor.ts

export function measureColdStart() {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    const metrics = {
        // DNS + TCP + TLS
        connectionTime: navigationEntry.connectEnd - navigationEntry.connectStart,
        // 첫 바이트까지
        ttfb: navigationEntry.responseStart - navigationEntry.requestStart,
        // DOM 파싱 완료
        domContentLoaded: navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime,
        // 완전 로드
        loadComplete: navigationEntry.loadEventEnd - navigationEntry.startTime,
    };

    console.log('[Performance] Cold start metrics:', metrics);

    // Sentry나 Analytics로 전송
    if (metrics.ttfb > 1000) {
        console.warn('[Performance] Slow TTFB detected:', metrics.ttfb);
    }
}

// 앱 시작 시 호출
measureColdStart();
```

### 탭 복귀 시 지연 측정

```typescript
// lib/performance-monitor.ts 추가

let lastHidden = 0;

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        lastHidden = performance.now();
    } else if (lastHidden > 0) {
        const hiddenDuration = performance.now() - lastHidden;
        // 첫 API 응답 시간 추적
        const mark = `tab-return-${Date.now()}`;
        performance.mark(mark);

        // 5초 이상 숨겨졌다가 복귀한 경우만 로그
        if (hiddenDuration > 5000) {
            console.log(`[Performance] Tab return after ${Math.round(hiddenDuration / 1000)}s hidden`);
        }
    }
});
```

---

## 참고 자료

- [Supabase Connection Pooling (Supavisor)](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Supabase Auth - startAutoRefresh / stopAutoRefresh](https://supabase.com/docs/reference/javascript/auth-startautorefresh)
- [React Query Persistence](https://tanstack.com/query/latest/docs/react/plugins/persistQueryClient)
- [Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview/)
- [Navigation Preload - web.dev](https://web.dev/articles/navigation-preload)
- [Vercel Cache-Control Headers](https://vercel.com/docs/edge-network/caching)
- [Web Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- [fetch keepalive - MDN](https://developer.mozilla.org/en-US/docs/Web/API/fetch#keepalive)
