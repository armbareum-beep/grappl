import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVideoPreloadSafe } from '../contexts/VideoPreloadContext';

/**
 * 전역 드릴 프리로더
 * 앱 어디서든 드릴 피드 첫 진입 시 빠른 로딩을 위해
 * 첫 번째 드릴 영상을 미리 프리로드합니다.
 */
export const GlobalDrillPreloader: React.FC = () => {
    const queryClient = useQueryClient();
    const videoPreload = useVideoPreloadSafe();
    const hasPreloadedRef = useRef(false);

    useEffect(() => {
        // 이미 프리로드했으면 스킵
        if (hasPreloadedRef.current || !videoPreload) return;

        const prefetchAndPreload = async () => {
            try {
                // drills-feed 쿼리 캐시 확인
                const queries = queryClient.getQueriesData<any[]>({ queryKey: ['drills-feed'] });
                let drillsData: any[] | null = null;

                if (queries.length > 0 && queries[0][1]) {
                    // 캐시된 데이터 사용
                    drillsData = queries[0][1];
                } else {
                    // 캐시 없음 - 첫 방문이므로 데이터 fetch
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
                    if (firstDrill) {
                        hasPreloadedRef.current = true;

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
                // 프리로드 실패는 무시 (치명적이지 않음)
                console.debug('[GlobalDrillPreloader] Preload failed:', err);
            }
        };

        // 초기 렌더링 후 약간의 지연을 두고 프리로드 시작
        const timer = setTimeout(prefetchAndPreload, 300);
        return () => clearTimeout(timer);
    }, [queryClient, videoPreload]);

    return null;
};
