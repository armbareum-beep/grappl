import { useQueries, useQuery } from '@tanstack/react-query';
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
    const results = useQueries({
        queries: [
            { queryKey: ['daily', 'drill'], queryFn: getDailyFreeDrill, staleTime: 1000 * 60 * 60 },
            { queryKey: ['daily', 'lesson'], queryFn: getDailyFreeLesson, staleTime: 1000 * 60 * 60 },
            { queryKey: ['daily', 'sparring'], queryFn: getDailyFreeSparring, staleTime: 1000 * 60 * 60 },
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

    const isLoading = results.some(r => r.isLoading) || (!!userId && userActivity.isLoading);
    const isError = results.some(r => r.isError) || userActivity.isError;

    return {
        dailyDrill: results[0].data?.data,
        dailyLesson: results[1].data?.data,
        dailySparring: results[2].data?.data,
        trendingSparring: results[3].data || [],
        featuredRoutines: results[4].data || [],
        trendingCourses: results[5].data || [],
        newCourses: results[6].data || [],
        newRoutines: results[7].data?.data || [],
        newSparring: results[8].data || [],
        continueItems: userActivity.data || [],
        isLoading,
        isError
    };
}
