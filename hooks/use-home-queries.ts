import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useVideoPreloadSafe } from '../contexts/VideoPreloadContext';
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
    const videoPreload = useVideoPreloadSafe();

    // 드릴 피드 첫 영상 프리로드
    useEffect(() => {
        const prefetchAndPreload = async () => {
            try {
                // drills-feed 쿼리 캐시 찾기 (permissions 포함된 키도 매칭)
                const queries = queryClient.getQueriesData<any[]>({ queryKey: ['drills-feed'] });
                let drillsData: any[] | null = null;

                if (queries.length > 0 && queries[0][1]) {
                    // 캐시된 데이터 있음
                    drillsData = queries[0][1];
                    console.log('[useHomeQueries] Found cached drills-feed, count:', drillsData?.length);
                } else {
                    // 캐시 없음 - 첫 방문이므로 데이터 먼저 fetch
                    console.log('[useHomeQueries] No cache, prefetching drills-feed...');
                    const { useDrillsFeed } = await import('./use-feed-queries');

                    // prefetchQuery는 queryFn이 필요하므로 간단히 fetch
                    const { supabase } = await import('../lib/supabase');
                    const { fetchCreatorsByIds } = await import('../lib/api');

                    const { data: routineDrills } = await supabase
                        .from('routine_drills')
                        .select(`
                            drill:drills!inner (*),
                            routines!inner (id, price, title)
                        `)
                        .limit(5); // 프리로드용으로 5개만

                    if (routineDrills && routineDrills.length > 0) {
                        const allCreatorIds = routineDrills.map((rd: any) => rd.drill.creator_id).filter(Boolean);
                        const creatorsMap = await fetchCreatorsByIds([...new Set(allCreatorIds)]);

                        drillsData = routineDrills.map((item: any) => ({
                            id: item.drill.id,
                            vimeoUrl: item.drill.vimeo_url,
                            videoUrl: item.drill.video_url,
                            creatorName: creatorsMap[item.drill.creator_id]?.name || 'Instructor',
                        }));
                        console.log('[useHomeQueries] Prefetched drills for preload:', drillsData?.length);
                    }
                }

                // 첫 번째 영상 프리로드
                if (drillsData && drillsData.length > 0 && videoPreload) {
                    const firstDrill = drillsData[0];
                    if (firstDrill) {
                        if ('requestIdleCallback' in window) {
                            requestIdleCallback(() => {
                                videoPreload.startPreload({
                                    id: firstDrill.id,
                                    vimeoUrl: firstDrill.vimeoUrl || firstDrill.vimeo_url,
                                    videoUrl: firstDrill.videoUrl || firstDrill.video_url,
                                });
                            }, { timeout: 500 });
                        } else {
                            videoPreload.startPreload({
                                id: firstDrill.id,
                                vimeoUrl: firstDrill.vimeoUrl || firstDrill.vimeo_url,
                                videoUrl: firstDrill.videoUrl || firstDrill.video_url,
                            });
                        }
                    }
                }
            } catch (err) {
                console.log('[useHomeQueries] Prefetch error:', err);
            }
        };

        // 최소 지연 후 프리로드 시작 (렌더링 블로킹 방지)
        const timer = setTimeout(prefetchAndPreload, 100);
        return () => clearTimeout(timer);
    }, [queryClient, videoPreload]);

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
