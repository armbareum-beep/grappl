import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 30, // 30분 - 데이터가 신선하다고 간주하는 시간 (10분 → 30분)
            gcTime: 1000 * 60 * 60 * 2, // 2시간 - 캐시 유지 시간 (30분 → 2시간, 잠깐 나갔다 와도 캐시 유지)
            retry: 1,
            refetchOnWindowFocus: false, // 탭 포커스 시 재요청 방지
            refetchOnMount: false, // 마운트 시 캐시가 있으면 재요청 안 함
            refetchOnReconnect: false, // 네트워크 재연결 시 재요청 방지
            networkMode: 'offlineFirst', // 오프라인 우선 - 캐시 먼저 보여주고 백그라운드에서 업데이트
        },
    },
});
