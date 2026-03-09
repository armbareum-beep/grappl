# 콜드 스타트 문제 분석 및 해결 가이드

> 마지막 업데이트: 2026-03-08

## 문제 현상

웹사이트를 사용하다가 다른 탭으로 이동하거나, 잠시 자리를 비운 후 돌아오면 **첫 로딩이 느림** (2-5초 이상 지연)

---

## 현재 인프라 상태

| 서비스 | 플랜 | 비고 |
|--------|------|------|
| Supabase | Pro | PostgreSQL + Auth |
| Vercel | Pro | Edge Functions, CDN |
| React Query | IndexedDB Persist | 24시간 캐시 |

---

## 현재 구현된 최적화

### 1. Connection Manager (`lib/connection-manager.ts`)
- 4분 간격 keepalive ping
- 탭 visibility 변경 시 warmup
- 2분 이상 유휴 시 auth refresh + query invalidate

### 2. React Query Persistence (`lib/query-persister.ts`)
- IndexedDB 기반 캐시 저장
- 24시간 maxAge
- 앱 버전 변경 시 캐시 버스팅

### 3. Auth Context 최적화
- 30분 localStorage 캐시
- 4초 타임아웃
- 백그라운드 상태 업데이트

---

## 콜드 스타트 원인 분석

### 원인 1: Supabase PostgreSQL Connection Pool Timeout
**심각도: 높음**

Supabase Pro도 PgBouncer connection pooling을 사용하지만:
- 기본 idle timeout: 60초 (Transaction mode)
- 5분 이상 유휴 후 **새 connection 생성 필요**
- Connection 재설정 시 100-500ms 추가 지연

```
[유휴 5분] → [첫 쿼리] → [Connection Pool에서 새 연결 할당] → [지연 발생]
```

### 원인 2: Supabase Auth Session Check
**심각도: 높음**

`supabase.auth.getSession()`은:
- localStorage에서 토큰 읽기 (빠름)
- 하지만 **토큰 유효성 검증을 위해 네트워크 호출** 가능
- 오래된 토큰 → refresh 필요 → 추가 RTT

### 원인 3: DNS Resolution + TLS Handshake
**심각도: 중간**

브라우저가 5분 이상 연결을 사용하지 않으면:
- DNS 캐시 만료 가능 (OS/브라우저 정책)
- TLS 세션 재협상 필요
- 첫 요청에 **200-500ms 추가 지연**

### 원인 4: React Query Hydration 병목
**심각도: 중간**

IndexedDB에서 복원 시:
- 대용량 캐시 → 파싱 지연
- 복원 완료 전 컴포넌트 렌더링 → 로딩 상태 표시
- `staleTime` 이후 즉시 refetch → 네트워크 대기

### 원인 5: Service Worker 캐싱 비활성화
**심각도: 낮음**

현재 `vite.config.ts`:
```js
workbox: {
    globPatterns: [], // JS/CSS precache 없음
}
```
- 모든 JS/CSS가 네트워크에서 로드
- 304 Not Modified 응답 대기 시간 존재

---

## 해결책

### 해결책 1: Supabase Connection 적극적 유지 (권장)

현재 4분 keepalive는 충분하지만, **더 가벼운 방식**으로 개선:

```typescript
// lib/connection-manager.ts 개선

// 기존: 4분마다 전체 쿼리
// 개선: 30초마다 초경량 ping (Realtime 채널 활용)

import { supabase } from './supabase';

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export function startConnectionKeepalive() {
    // Realtime 채널로 연결 유지 (WebSocket은 항상 연결 상태)
    realtimeChannel = supabase
        .channel('keepalive')
        .on('broadcast', { event: 'ping' }, () => {})
        .subscribe();

    // 기존 HTTP keepalive도 유지 (백업)
    // ... existing code
}
```

**장점**: WebSocket은 브라우저가 탭을 유휴 상태로 만들어도 연결 유지

### 해결책 2: Supabase Pooler Mode 변경

Supabase Dashboard → Project Settings → Database:

| Mode | Idle Timeout | 용도 |
|------|--------------|------|
| Transaction | 60초 | 기본값 (현재) |
| Session | 더 김 | 장기 연결 유지 |

**Session Mode 고려**: 연결을 더 오래 유지하지만 connection 수 제한 주의

### 해결책 3: Auth 세션 사전 복원 최적화

```typescript
// contexts/AuthContext.tsx 개선

// 문제: getSession이 네트워크 호출을 기다림
// 해결: localStorage 캐시 먼저 사용, 백그라운드 검증

const initAuth = async () => {
    // 1. localStorage에서 즉시 복원 (0ms)
    const cachedSession = localStorage.getItem('supabase.auth.token');
    if (cachedSession) {
        try {
            const parsed = JSON.parse(cachedSession);
            const user = parsed.user;
            if (user) {
                setUser(user);
                setLoading(false); // 즉시 로딩 완료

                // 2. 백그라운드에서 세션 유효성 검증
                supabase.auth.getSession().then(({ data }) => {
                    if (!data.session) {
                        // 세션 만료 - 재로그인 필요
                        setUser(null);
                    }
                });
                return;
            }
        } catch {}
    }

    // 캐시 없으면 기존 로직
    // ...
};
```

### 해결책 4: Service Worker Precache 활성화

```typescript
// vite.config.ts 개선

workbox: {
    // 핵심 JS/CSS만 precache (너무 많으면 오히려 느림)
    globPatterns: [
        'assets/react-core-*.js',
        'assets/react-router-*.js',
        'assets/supabase-*.js',
        'index.html'
    ],
    // 또는 runtime caching 사용
    runtimeCaching: [
        {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-resources',
                expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
            }
        }
    ]
}
```

**주의**: 기존에 PWA 캐시 문제로 비활성화했다면 신중하게 테스트

### 해결책 5: Critical Data Prefetch

```typescript
// App.tsx 또는 Layout.tsx

// 앱 시작 시 필수 데이터 미리 로드
useEffect(() => {
    // 로그인 사용자의 필수 데이터 prefetch
    if (user) {
        queryClient.prefetchQuery({
            queryKey: ['user-permissions', user.id],
            queryFn: () => fetchUserPermissions(user.id),
            staleTime: 5 * 60 * 1000
        });
    }
}, [user]);
```

### 해결책 6: Vercel Edge Config 활용

```typescript
// 정적 설정을 Edge Config에서 로드 (전역 캐시)
import { get } from '@vercel/edge-config';

// 콜드 스타트 시에도 빠른 응답
const siteSettings = await get('site-settings');
```

---

## 즉시 적용 가능한 Quick Wins

### 1. Connection Warmup 타이밍 조정

```typescript
// lib/connection-manager.ts

// 기존: 탭 visible 시 warmup
// 추가: 마우스/터치 이벤트 시 사전 warmup

let warmupScheduled = false;

function scheduleWarmup() {
    if (warmupScheduled) return;
    warmupScheduled = true;

    requestIdleCallback(() => {
        warmupConnection();
        warmupScheduled = false;
    }, { timeout: 1000 });
}

// 사용자가 탭으로 돌아올 때 (마우스 진입 시)
document.addEventListener('mouseenter', scheduleWarmup, { once: true });
document.addEventListener('touchstart', scheduleWarmup, { once: true, passive: true });
```

### 2. Supabase Auth 토큰 사전 갱신

```typescript
// 토큰 만료 10분 전에 미리 갱신
const REFRESH_THRESHOLD = 10 * 60; // 10분

async function proactiveTokenRefresh() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);

    if (expiresAt && expiresAt - now < REFRESH_THRESHOLD) {
        await supabase.auth.refreshSession();
    }
}

// 탭이 visible일 때 5분마다 체크
setInterval(() => {
    if (document.visibilityState === 'visible') {
        proactiveTokenRefresh();
    }
}, 5 * 60 * 1000);
```

### 3. IndexedDB 캐시 크기 제한

```typescript
// lib/query-persister.ts 개선

const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB

export const indexedDBPersister: Persister = {
    persistClient: async (client: PersistedClient) => {
        try {
            const serialized = JSON.stringify(client);

            // 캐시가 너무 크면 오래된 쿼리 제거
            if (serialized.length > MAX_CACHE_SIZE) {
                console.warn('[Persister] Cache too large, trimming old queries');
                // 오래된 쿼리 필터링 로직
            }

            await set(CACHE_KEY, client);
        } catch (error) {
            console.warn('[Persister] Failed to save cache:', error);
        }
    },
    // ...
};
```

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

### Supabase 쿼리 시간 측정

```typescript
// 느린 쿼리 감지
const start = performance.now();
const { data, error } = await supabase.from('users').select('*');
const duration = performance.now() - start;

if (duration > 500) {
    console.warn(`[Supabase] Slow query: ${duration}ms`);
}
```

---

## 권장 적용 순서

1. **즉시 적용** (코드 변경 최소)
   - Connection warmup 마우스/터치 이벤트 추가
   - 토큰 사전 갱신 로직 추가

2. **단기** (테스트 필요)
   - Supabase Realtime 채널로 연결 유지
   - Auth 세션 즉시 복원 최적화

3. **중기** (영향도 분석 필요)
   - Service Worker precache 재활성화
   - IndexedDB 캐시 크기 최적화

4. **장기** (인프라 변경)
   - Supabase Pooler Mode 변경 검토
   - Vercel Edge Config 도입

---

## 참고 자료

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [React Query Persistence](https://tanstack.com/query/latest/docs/react/plugins/persistQueryClient)
- [Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview/)
- [Web Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
