import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5분으로 줄임 (30분 → 5분) - 더 자주 새 데이터 확인
            gcTime: 1000 * 60 * 30, // 30분으로 줄임 (2시간 → 30분)
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
            refetchOnWindowFocus: false, // ✅ 탭 돌아올 때 불필요한 재요청 방지 (true → false)
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
