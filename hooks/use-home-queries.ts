import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
    getDailyFreeDrill,
    getDailyFreeLesson,
    getDailyFreeSparring,
    getTrendingSparring,
    getFeaturedRoutines,
    getTrendingCourses,
    getNewCourses,
    fetchRoutines,
    getPublicSparringVideos,
    getRecentActivity
} from '../lib/api';

export function useHomeQueries(userId?: string) {
    const queryClient = useQueryClient();

    // 캐시된 데이터가 있는지 먼저 확인 (마운트 시 즉시 반환용)
    const hasCachedData = useMemo(() => {
        const dailyDrill = queryClient.getQueryData(['daily', 'drill']);
        const trendingCourses = queryClient.getQueryData(['trending', 'courses']);
        return !!(dailyDrill || trendingCourses);
    }, [queryClient]);

    // 드릴 피드 프리로드는 GlobalDrillPreloader에서 전역으로 처리

    // 모든 쿼리를 병렬로 실행 (순차 로딩 제거 - 캐시된 데이터가 있으면 즉시 반환)
    const allResults = useQueries({
        queries: [
            // Daily content (1시간 캐시)
            { queryKey: ['daily', 'drill'], queryFn: getDailyFreeDrill, staleTime: 1000 * 60 * 60 },
            { queryKey: ['daily', 'lesson'], queryFn: getDailyFreeLesson, staleTime: 1000 * 60 * 60 },
            { queryKey: ['daily', 'sparring'], queryFn: getDailyFreeSparring, staleTime: 1000 * 60 * 60 },
            // Other content (30분 캐시)
            { queryKey: ['trending', 'sparring'], queryFn: () => getTrendingSparring(10), staleTime: 1000 * 60 * 30 },
            { queryKey: ['featured', 'routines'], queryFn: () => getFeaturedRoutines(20), staleTime: 1000 * 60 * 30 },
            { queryKey: ['trending', 'courses'], queryFn: () => getTrendingCourses(10), staleTime: 1000 * 60 * 30 },
            { queryKey: ['new', 'courses'], queryFn: () => getNewCourses(10), staleTime: 1000 * 60 * 30 },
            { queryKey: ['new', 'routines'], queryFn: () => fetchRoutines(20), staleTime: 1000 * 60 * 30 },
            { queryKey: ['new', 'sparring'], queryFn: () => getPublicSparringVideos(20), staleTime: 1000 * 60 * 30 },
        ]
    });

    const userActivity = useQuery({
        queryKey: ['user', 'activity', userId],
        queryFn: () => getRecentActivity(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5
    });

    // 캐시된 데이터가 있으면 로딩 상태를 false로 처리 (즉시 렌더링)
    const isLoading = hasCachedData
        ? false
        : allResults.some(r => r.isLoading) || (!!userId && userActivity.isLoading);
    const isError = allResults.some(r => r.isError) || userActivity.isError;

    return {
        dailyDrill: allResults[0]?.data?.data,
        dailyLesson: allResults[1]?.data?.data,
        dailySparring: allResults[2]?.data?.data,
        trendingSparring: allResults[3]?.data || [],
        featuredRoutines: allResults[4]?.data || [],
        trendingCourses: allResults[5]?.data || [],
        newCourses: allResults[6]?.data || [],
        newRoutines: allResults[7]?.data?.data || [],
        newSparring: allResults[8]?.data || [],
        continueItems: userActivity.data || [],
        isLoading,
        isError
    };
}
