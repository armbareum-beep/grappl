import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { getHomePageData, HomePageData } from '../lib/api-home';
import { getRecentActivity } from '../lib/api';

export function useHomeQueries(userId?: string) {
    const queryClient = useQueryClient();

    // Check for cached data (for instant render on mount)
    const hasCachedData = useMemo(() => {
        const cached = queryClient.getQueryData(['home', 'data']);
        // 캐시가 있어도 에러 상태면 캐시 없는 것으로 처리
        const queryState = queryClient.getQueryState(['home', 'data']);
        return !!cached && queryState?.status !== 'error';
    }, [queryClient]);

    // Single optimized query for all home data
    // Enhanced retry settings for cold start scenarios
    const homeData = useQuery({
        queryKey: ['home', 'data'],
        queryFn: getHomePageData,
        staleTime: 1000 * 60 * 30, // 30 minutes - data doesn't change often
        gcTime: 1000 * 60 * 60, // 1 hour cache
        retry: 3, // Retry up to 3 times on failure (2 → 3)
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff: 1s, 2s, 4s... max 10s
    });

    // User activity - separate query (only when logged in)
    const userActivity = useQuery({
        queryKey: ['user', 'activity', userId],
        queryFn: () => getRecentActivity(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 3, // (2 → 3)
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    // 에러 상태에서 자동 복구: 10초 후 자동 재시도
    useEffect(() => {
        if (homeData.isError) {
            const timer = setTimeout(() => {
                console.warn('[useHomeQueries] Auto-recovering from error state');
                queryClient.invalidateQueries({ queryKey: ['home', 'data'] });
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [homeData.isError, queryClient]);

    // Use cached data if loading to prevent flash
    const isLoading = hasCachedData
        ? false
        : homeData.isLoading || (!!userId && userActivity.isLoading);
    const isError = homeData.isError || userActivity.isError;

    const data = homeData.data as HomePageData | undefined;

    return {
        dailyDrill: data?.dailyDrill,
        dailyLesson: data?.dailyLesson,
        dailySparring: data?.dailySparring,
        trendingSparring: data?.trendingSparring || [],
        featuredRoutines: data?.featuredRoutines || [],
        trendingCourses: data?.trendingCourses || [],
        newCourses: data?.newCourses || [],
        newRoutines: data?.newRoutines || [],
        newSparring: data?.newSparring || [],
        continueItems: userActivity.data || [],
        isLoading,
        isError
    };
}
