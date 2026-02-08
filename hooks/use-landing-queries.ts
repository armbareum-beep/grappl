import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getTestimonials,
    getDailyFreeDrill,
    getDailyFreeLesson,
    getDailyFreeSparring,
    getRoutines,
    getSparringVideos
} from '../lib/api';
import { Testimonial } from '../types';

// Default testimonials fallback
const DEFAULT_TESTIMONIALS: Testimonial[] = [
    {
        id: '1',
        name: '김민수',
        belt: 'Blue Belt',
        comment: '가드 패스 강의 덕분에 시합에서 우승할 수 있었습니다. 챔피언한테 직접 배우는 느낌이 정말 좋아요!',
        rating: 5,
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        name: '박지영',
        belt: 'Purple Belt',
        comment: '스파이더 가드 시리즈가 최고입니다. 실전에서 바로 써먹을 수 있는 디테일이 가득해요.',
        rating: 5,
        createdAt: new Date().toISOString()
    },
    {
        id: '3',
        name: '이준호',
        belt: 'White Belt',
        comment: '초보자도 쉽게 따라할 수 있어요. 무료 강의로 시작했는데 바로 1년 구독했습니다. 2달무료 혜택도 좋았어요!',
        rating: 5,
        createdAt: new Date().toISOString()
    }
];

export function useLandingPageData() {
    const queryClient = useQueryClient();

    // Daily free content
    const { data: dailyDrill } = useQuery({
        queryKey: ['daily', 'drill'],
        queryFn: async () => {
            const result = await getDailyFreeDrill();
            return result.data;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const { data: dailyLesson } = useQuery({
        queryKey: ['daily', 'lesson'],
        queryFn: async () => {
            const result = await getDailyFreeLesson();
            return result.data;
        },
        staleTime: 1000 * 60 * 60,
    });

    const { data: dailySparring } = useQuery({
        queryKey: ['daily', 'sparring'],
        queryFn: async () => {
            const result = await getDailyFreeSparring();
            return result.data;
        },
        staleTime: 1000 * 60 * 60,
    });

    // Testimonials
    const { data: testimonials = DEFAULT_TESTIMONIALS } = useQuery({
        queryKey: ['testimonials'],
        queryFn: async () => {
            const { data } = await getTestimonials();
            return data && data.length > 0 ? data : DEFAULT_TESTIMONIALS;
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    // Site settings
    const { data: siteSettings } = useQuery({
        queryKey: ['site-settings'],
        queryFn: async () => {
            try {
                const { getSiteSettings } = await import('../lib/api-admin');
                const { data } = await getSiteSettings();
                return data;
            } catch (e) {
                console.warn('Failed to load site settings', e);
                return null;
            }
        },
        staleTime: 1000 * 60 * 30,
    });

    // Prefetch data for faster navigation
    const prefetchData = () => {
        // Prefetch routines
        queryClient.prefetchQuery({
            queryKey: ['routines'],
            queryFn: async () => {
                const routines = await getRoutines();
                return routines.slice(0, 3);
            }
        });

        // Prefetch sparring feed
        queryClient.prefetchQuery({
            queryKey: ['sparring', 'feed'],
            queryFn: () => getSparringVideos(3)
        });
    };

    return {
        dailyDrill,
        dailyLesson,
        dailySparring,
        testimonials,
        siteSettings,
        prefetchData,
        isLoading: !dailyDrill && !dailyLesson && !dailySparring
    };
}
