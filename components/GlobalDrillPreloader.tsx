import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVideoPreloadSafe } from '../contexts/VideoPreloadContext';
import { useLocation } from 'react-router-dom';

/**
 * 전역 드릴 프리로더
 * 앱 어디서든 드릴 피드 첫 진입 시 빠른 로딩을 위해
 * 첫 번째 드릴 영상을 미리 프리로드합니다.
 *
 * 개선사항:
 * - 프리로드된 영상이 소비되면 자동으로 다시 프리로드
 * - 드릴 피드 페이지에서는 프리로드 안 함 (이미 DrillReelsFeed에서 관리)
 * - requestIdleCallback으로 메인 스레드 블로킹 방지
 */
export const GlobalDrillPreloader: React.FC = () => {
    const queryClient = useQueryClient();
    const videoPreload = useVideoPreloadSafe();
    const location = useLocation();
    const lastPreloadedIdRef = useRef<string | null>(null);
    const isPreloadingRef = useRef(false);

    const doPreload = useCallback(async () => {
        if (!videoPreload || isPreloadingRef.current) return;

        // 드릴 피드 페이지에서는 스킵 (DrillReelsFeed가 직접 관리)
        if (location.pathname === '/drills' || location.pathname.startsWith('/drills/')) return;

        // 이미 프리로드 중이거나 준비된 상태면 스킵
        if (videoPreload.preloadState.status === 'loading' || videoPreload.preloadState.status === 'ready') return;

        isPreloadingRef.current = true;

        try {
            // drills-feed 쿼리 캐시 확인
            const queries = queryClient.getQueriesData<any[]>({ queryKey: ['drills-feed'] });
            let drillsData: any[] | null = null;

            if (queries.length > 0 && queries[0][1]) {
                // 캐시된 데이터 사용
                drillsData = queries[0][1];
            } else {
                // 캐시 없음 - 데이터 fetch
                const { supabase } = await import('../lib/supabase');
                const { fetchCreatorsByIds } = await import('../lib/api');

                const { data: routineDrills } = await supabase
                    .from('routine_drills')
                    .select(`
                        drill:drills!inner (*),
                        routines!inner (id, price, title)
                    `)
                    .limit(5);

                if (routineDrills && routineDrills.length > 0) {
                    const allCreatorIds = routineDrills.map((rd: any) => rd.drill.creator_id).filter(Boolean);
                    const creatorsMap = await fetchCreatorsByIds([...new Set(allCreatorIds)]);

                    drillsData = routineDrills.map((item: any) => ({
                        id: item.drill.id,
                        vimeoUrl: item.drill.vimeo_url,
                        videoUrl: item.drill.video_url,
                        creatorName: creatorsMap[item.drill.creator_id]?.name || 'Instructor',
                    }));
                }
            }

            // 첫 번째 영상 프리로드
            if (drillsData && drillsData.length > 0) {
                const firstDrill = drillsData[0];
                if (firstDrill && firstDrill.id !== lastPreloadedIdRef.current) {
                    lastPreloadedIdRef.current = firstDrill.id;

                    const startPreload = () => {
                        console.log('[GlobalDrillPreloader] Preloading first drill:', firstDrill.id);
                        videoPreload.startPreload({
                            id: firstDrill.id,
                            vimeoUrl: firstDrill.vimeoUrl || firstDrill.vimeo_url,
                            videoUrl: firstDrill.videoUrl || firstDrill.video_url,
                        });
                    };

                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(startPreload, { timeout: 1000 });
                    } else {
                        setTimeout(startPreload, 100);
                    }
                }
            }
        } catch (err) {
            console.debug('[GlobalDrillPreloader] Preload failed:', err);
        } finally {
            isPreloadingRef.current = false;
        }
    }, [queryClient, videoPreload, location.pathname]);

    // 초기 로드 시 프리로드
    useEffect(() => {
        const timer = setTimeout(doPreload, 500);
        return () => clearTimeout(timer);
    }, [doPreload]);

    // preloadState가 idle로 바뀌면 (영상이 소비됨) 다시 프리로드
    useEffect(() => {
        if (videoPreload?.preloadState.status === 'idle' && lastPreloadedIdRef.current) {
            // 이전 프리로드가 소비됨 - 2초 후 다시 프리로드 시도
            const timer = setTimeout(() => {
                lastPreloadedIdRef.current = null; // 리셋해서 같은 영상 다시 프리로드 가능
                doPreload();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [videoPreload?.preloadState.status, doPreload]);

    // 페이지 이동 시 프리로드 상태 확인하고 필요시 프리로드
    useEffect(() => {
        // 드릴 피드에서 다른 페이지로 이동했을 때 프리로드 재시작
        if (location.pathname !== '/drills' && !location.pathname.startsWith('/drills/')) {
            const timer = setTimeout(doPreload, 1000);
            return () => clearTimeout(timer);
        }
    }, [location.pathname, doPreload]);

    return null;
};
