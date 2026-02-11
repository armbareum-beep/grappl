import { queryClient } from './react-query';
import { getHomePageData } from './api-home';
import {
    getTrendingCourses,
    getNewCourses,
    getFeaturedRoutines,
} from './api';

// 페이지별 프리페치 함수들
const prefetchFunctions: Record<string, () => Promise<void>> = {
    '/home': async () => {
        // 홈페이지 데이터 통합 프리페치 (새 최적화된 API 사용)
        await queryClient.prefetchQuery({
            queryKey: ['home', 'data'],
            queryFn: getHomePageData,
            staleTime: 1000 * 60 * 30, // 30분
        });
    },

    '/library': async () => {
        await Promise.all([
            queryClient.prefetchQuery({
                queryKey: ['trending', 'courses'],
                queryFn: () => getTrendingCourses(20),
                staleTime: 1000 * 60 * 30,
            }),
            queryClient.prefetchQuery({
                queryKey: ['new', 'courses'],
                queryFn: () => getNewCourses(20),
                staleTime: 1000 * 60 * 30,
            }),
        ]);
    },

    '/watch': async () => {
        // 드릴 피드는 별도 훅에서 처리
    },

    '/training-routines': async () => {
        await queryClient.prefetchQuery({
            queryKey: ['featured', 'routines'],
            queryFn: () => getFeaturedRoutines(20),
            staleTime: 1000 * 60 * 30,
        });
    },
};

// 디바운스된 프리페치 (너무 빠른 호버 방지)
let prefetchTimeout: ReturnType<typeof setTimeout> | null = null;
const prefetchedPaths = new Set<string>();

export function prefetchRoute(path: string) {
    // 이미 프리페치했으면 스킵
    if (prefetchedPaths.has(path)) return;

    // 기존 타이머 취소
    if (prefetchTimeout) {
        clearTimeout(prefetchTimeout);
    }

    // 100ms 후에 프리페치 시작 (짧은 호버는 무시)
    prefetchTimeout = setTimeout(async () => {
        const prefetchFn = prefetchFunctions[path];
        if (prefetchFn) {
            try {
                await prefetchFn();
                prefetchedPaths.add(path);
            } catch (err) {
                // 프리페치 실패해도 무시 (실제 페이지 방문 시 다시 시도됨)
            }
        }
    }, 100);
}

// 페이지 청크 프리로드 (React.lazy 컴포넌트용)
const chunkLoaders: Record<string, () => Promise<any>> = {
    '/home': () => import('../pages/Home'),
    '/library': () => import('../pages/Library'),
    '/watch': () => import('../pages/DrillReels'),
    '/training-routines': () => import('../pages/Routines'),
    '/skill-tree': () => import('../components/technique/TechniqueSkillTree'),
    '/browse': () => import('../pages/Browse'),
    '/saved': () => import('../pages/MyLibrary'),
    '/pricing': () => import('../pages/Pricing'),
};

const preloadedChunks = new Set<string>();

export function preloadRouteChunk(path: string) {
    if (preloadedChunks.has(path)) return;

    const loader = chunkLoaders[path];
    if (loader) {
        // requestIdleCallback으로 브라우저가 한가할 때 로드
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                loader().then(() => preloadedChunks.add(path));
            }, { timeout: 2000 });
        } else {
            setTimeout(() => {
                loader().then(() => preloadedChunks.add(path));
            }, 100);
        }
    }
}

// 네비게이션 호버 시 호출할 통합 함수
export function onNavHover(path: string) {
    preloadRouteChunk(path);
    prefetchRoute(path);
}

// 앱 시작 시 주요 라우트 미리 로드
export function preloadCriticalRoutes() {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            // 메인 페이지들 청크 미리 로드
            ['/home', '/library', '/watch'].forEach(path => {
                preloadRouteChunk(path);
            });
        }, { timeout: 5000 });
    }
}
