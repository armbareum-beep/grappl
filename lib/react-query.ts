import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 10, // 10분 - 데이터가 신선하다고 간주하는 시간
            gcTime: 1000 * 60 * 30, // 30분 - 캐시 유지 시간 (페이지 이동해도 캐시 유지)
            retry: 1,
            refetchOnWindowFocus: false, // 탭 포커스 시 재요청 방지
            refetchOnMount: false, // 마운트 시 캐시가 있으면 재요청 안 함
            refetchOnReconnect: false, // 네트워크 재연결 시 재요청 방지
        },
    },
});
