import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5분 - 이후 stale 상태
            gcTime: 1000 * 60 * 60 * 25, // 25시간 - IndexedDB persist maxAge(24시간)보다 길게
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
            refetchOnWindowFocus: true, // 탭 돌아올 때 stale 데이터 자동 갱신 (idle 후 복귀 시 콘텐츠 표시 문제 해결)
            refetchOnMount: true, // 컴포넌트 마운트 시 stale이면 refetch
            refetchOnReconnect: true,
            networkMode: 'online', // 오프라인 모드 비활성화 - 항상 네트워크 우선 (offlineFirst → online)
        },
    },
});

// 앱 시작 시 에러 상태의 쿼리들을 클리어하는 함수
export function clearErrorQueries() {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();

    queries.forEach((query) => {
        if (query.state.status === 'error') {
            queryClient.removeQueries({ queryKey: query.queryKey });
        }
    });
}
