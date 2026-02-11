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
    const homeData = useQuery({
        queryKey: ['home', 'data'],
        queryFn: getHomePageData,
        staleTime: 1000 * 60 * 30, // 30 minutes - data doesn't change often
        gcTime: 1000 * 60 * 60, // 1 hour cache
    });

    // User activity - separate query (only when logged in)
    const userActivity = useQuery({
        queryKey: ['user', 'activity', userId],
        queryFn: () => getRecentActivity(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5 // 5 minutes
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
