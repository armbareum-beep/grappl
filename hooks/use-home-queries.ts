import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getHomePageData, HomePageData } from '../lib/api-home';
import { getRecentActivity } from '../lib/api';

export function useHomeQueries(userId?: string) {
    const queryClient = useQueryClient();

    // Check for cached data (for instant render on mount)
    const hasCachedData = useMemo(() => {
        return !!queryClient.getQueryData(['home', 'data']);
    }, [queryClient]);

    // Single optimized query for all home data
    // Enhanced retry settings for cold start scenarios
    const homeData = useQuery({
        queryKey: ['home', 'data'],
        queryFn: getHomePageData,
        staleTime: 1000 * 60 * 30, // 30 minutes - data doesn't change often
        gcTime: 1000 * 60 * 60, // 1 hour cache
        retry: 2, // Retry up to 2 times on failure
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff: 1s, 2s, 4s... max 10s
    });

    // User activity - separate query (only when logged in)
    const userActivity = useQuery({
        queryKey: ['user', 'activity', userId],
        queryFn: () => getRecentActivity(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

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
