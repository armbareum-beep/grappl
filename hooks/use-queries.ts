import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCreators, getCourses, getCourseById, searchContent, getRelatedCourses, getDailyFreeLesson } from '../lib/api';
import { Creator, Course } from '../types';

// Creators Hook
export function useCreators() {
    return useQuery({
        queryKey: ['creators'],
        queryFn: getCreators,
        staleTime: 1000 * 60 * 60, // 1 hour (creators don't change often)
    });
}

// Courses Hook with Pagination
export function useCourses(limit: number = 20, offset: number = 0) {
    return useQuery({
        queryKey: ['courses', limit, offset],
        queryFn: () => getCourses(limit, offset),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Single Course Hook
export function useCourse(id?: string, options?: any) {
    return useQuery({
        queryKey: ['course', id],
        queryFn: () => getCourseById(id!),
        enabled: !!id,
        staleTime: 1000 * 60 * 10, // 10 minutes
        ...options
    });
}

// Search Hook
export function useContentSearch(query: string) {
    return useQuery({
        queryKey: ['search', query],
        queryFn: () => searchContent(query),
        enabled: !!query && query.length > 1,
        staleTime: 1000 * 60, // 1 minute
    });
}

// Related Courses Hook
export function useRelatedCourses(currentCourseId: string, category: string) {
    return useQuery({
        queryKey: ['related-courses', currentCourseId, category],
        queryFn: async () => {
            const { data } = await getRelatedCourses(currentCourseId, category);
            return data;
        },
        enabled: !!currentCourseId && !!category,
    });
}

// Daily Free Lesson Hook
export function useDailyFreeLesson() {
    return useQuery({
        queryKey: ['daily-free-lesson'],
        queryFn: getDailyFreeLesson,
        staleTime: 1000 * 60 * 60, // 1 hour (daily content changes once a day)
    });
}

// Course Lessons Hook
export function useCourseLessons(courseId?: string) {
    return useQuery({
        queryKey: ['course', courseId, 'lessons'],
        queryFn: async () => {
            const { getLessonsByCourse } = await import('../lib/api');
            return getLessonsByCourse(courseId!);
        },
        enabled: !!courseId,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

// Course Drills Bundle Hook
export function useCourseDrills(courseId?: string) {
    return useQuery({
        queryKey: ['course', courseId, 'drills'],
        queryFn: async () => {
            const { getCourseDrillBundles } = await import('../lib/api');
            return getCourseDrillBundles(courseId!);
        },
        enabled: !!courseId,
        staleTime: 1000 * 60 * 10,
    });
}

// Course Sparring Bundle Hook
export function useCourseSparring(courseId?: string) {
    return useQuery({
        queryKey: ['course', courseId, 'sparring'],
        queryFn: async () => {
            const { getCourseSparringVideos } = await import('../lib/api');
            return getCourseSparringVideos(courseId!);
        },
        enabled: !!courseId,
        staleTime: 1000 * 60 * 10,
    });
}
