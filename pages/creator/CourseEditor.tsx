import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, GripVertical, Video, Trash2, Edit, CheckCircle, BookOpen, X, Link2, Upload, Loader2 } from 'lucide-react';
import { getCourseById, createCourse, updateCourse, getLessonsByCourse, createLesson, updateLesson, deleteLesson, removeLessonFromCourse, getDrills, getCourseDrillBundles, addCourseDrillBundle, removeCourseDrillBundle, getAllCreatorLessons, reorderLessons, getSparringVideos, getCourseSparringVideos, addCourseSparringVideo, removeCourseSparringVideo, getCreators, extractVimeoId } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Course, Lesson, VideoCategory, Difficulty, Drill, SparringVideo, UniformType, Creator } from '../../types';
import { getVimeoVideoInfo, formatDuration } from '../../lib/vimeo';
import { VideoUploader } from '../../components/VideoUploader';
import { ImageUploader } from '../../components/ImageUploader';
import { useToast } from '../../contexts/ToastContext';



import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

const SortableLessonItem = ({ lesson, index, onEdit, onDelete }: {
    lesson: Lesson,
    index: number,
    onEdit: (lesson: Lesson) => void,
    onDelete: (id: string) => void
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: lesson.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        position: 'relative' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border transition-all duration-200 group ${isDragging
                ? 'border-violet-500 bg-zinc-800 shadow-2xl scale-[1.02]'
                : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="text-zinc-500 cursor-grab active:cursor-grabbing hover:text-zinc-300 p-1 transition-colors"
            >
                <GripVertical className="w-5 h-5" />
            </div>
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700 font-bold text-zinc-300 text-sm shadow-inner mt-0.5">
                {index + 1}
            </div>
            <div className="flex-grow">
                <h4 className="font-semibold text-zinc-100">{lesson.title}</h4>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5 text-zinc-600" /> {lesson.length}</span>
                    <span className="px-2 py-0.5 bg-zinc-800 rounded-full border border-zinc-700/50 text-zinc-400 capitalize">{lesson.difficulty}</span>
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(lesson)}
                    className="p-2.5 text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-xl transition-all"
                    title="수정"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(lesson.id)}
                    className="p-2.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    title="삭제"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

        </div>
    );
};


export const CourseEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { success, error: toastError } = useToast();
    const isNew = !id || id === 'new';

    // Admin State
    const [creators, setCreators] = useState<Creator[]>([]);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');

    const [activeTab, setActiveTab] = useState<'basic' | 'curriculum' | 'drills' | 'sparring'>('basic');
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Course State
    const [courseData, setCourseData] = useState<Partial<Course>>({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
        price: 0,
        thumbnailUrl: '',
        uniformType: UniformType.Gi,
        isSubscriptionExcluded: false,
        published: true,
    });

    // Lessons State
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
    const [lessonUploadMode, setLessonUploadMode] = useState<'file' | 'url'>('file');
    const [vimeoUrlInput, setVimeoUrlInput] = useState('');
    const [vimeoUrlLoading, setVimeoUrlLoading] = useState(false);

    // Drills State
    const [availableDrills, setAvailableDrills] = useState<Drill[]>([]);
    const [bundledDrills, setBundledDrills] = useState<Drill[]>([]);
    const [loadingDrills, setLoadingDrills] = useState(false);

    // Sparring State
    const [availableSparringVideos, setAvailableSparringVideos] = useState<SparringVideo[]>([]);
    const [bundledSparringVideos, setBundledSparringVideos] = useState<SparringVideo[]>([]);
    const [loadingSparringVideos, setLoadingSparringVideos] = useState(false);

    // Import Lesson State
    const [showImportModal, setShowImportModal] = useState(false);
    const [showThumbnailModal, setShowThumbnailModal] = useState(false);
    const [creatorLessons, setCreatorLessons] = useState<Lesson[]>([]);
    const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());



    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = lessons.findIndex((l) => l.id === active.id);
            const newIndex = lessons.findIndex((l) => l.id === over.id);

            const newLessons = arrayMove(lessons, oldIndex, newIndex);
            setLessons(newLessons);

            // If it's an existing course, update the order in the database
            if (!isNew && id) {
                const lessonOrders = newLessons.map((l, index) => ({
                    id: l.id,
                    lessonNumber: index + 1
                }));

                try {
                    const { error } = await reorderLessons(lessonOrders);
                    if (error) throw error;
                    success('순서가 저장되었습니다.');
                } catch (err) {
                    console.error('Error reordering lessons:', err);
                    toastError('순서 저장 중 오류가 발생했습니다.');
                    // Revert UI if needed, but usually better to just alert
                }
            } else {
                // For new course, just update local state (handles lessonNumber)
                const updatedIndices = newLessons.map((l, index) => ({
                    ...l,
                    lessonNumber: index + 1
                }));
                setLessons(updatedIndices);
            }
        }
    };


    useEffect(() => {
        if (user) {
            // Load creators for admin
            if (isAdmin) {
                getCreators().then(list => {
                    setCreators(list);
                }).catch(console.error);
                if (isNew) {
                    setSelectedCreatorId(user.id);
                }
            } else {
                setSelectedCreatorId(user.id); // Non-admin users always create for themselves
            }

            loadDrills();
            loadSparringVideos();

            if (!isNew && id) {
                fetchCourseData(id);
                loadBundledDrills();
                loadBundledSparringVideos();
            } else {
                setLoading(false);
            }
        }
    }, [id, isNew, user?.id, isAdmin]);

    async function fetchCourseData(courseId: string) {
        try {
            const [course, courseLessons] = await Promise.all([
                getCourseById(courseId),
                getLessonsByCourse(courseId)
            ]);
            if (course) {
                setCourseData(course);
                if (course.creatorId) {
                    setSelectedCreatorId(course.creatorId);
                }
            }
            setLessons(courseLessons);
        } catch (error) {
            console.error('Error fetching course:', error);
        } finally {
            setLoading(false);
        }
    }

    const loadDrills = async () => {
        if (!user) return;
        setLoadingDrills(true);
        try {
            const data = await getDrills(user.id);
            if (data) {
                setAvailableDrills(data);
            }
        } catch (error) {
            console.error('Error loading drills:', error);
        } finally {
            setLoadingDrills(false);
        }
    };

    const loadBundledDrills = async () => {
        if (!id) return;
        try {
            const { data } = await getCourseDrillBundles(id);
            if (data) {
                setBundledDrills(data);
            }
        } catch (error) {
            console.error('Error loading bundled drills:', error);
        }
    };

    const toggleDrillBundle = async (drill: Drill) => {
        const isCurrentlyBundled = bundledDrills.some(d => d.id === drill.id);

        if (isNew) {
            // Local state update for new course
            if (isCurrentlyBundled) {
                setBundledDrills(prev => prev.filter(d => d.id !== drill.id));
            } else {
                setBundledDrills(prev => [...prev, drill]);
            }
            return;
        }

        // API update for existing course
        if (!id) return;

        try {
            if (isCurrentlyBundled) {
                const { error } = await removeCourseDrillBundle(id, drill.id);
                if (error) throw error;
                setBundledDrills(prev => prev.filter(d => d.id !== drill.id));
                success('드릴 연결이 해제되었습니다.');
            } else {
                const { error } = await addCourseDrillBundle(id, drill.id);
                if (error) throw error;
                setBundledDrills(prev => [...prev, drill]);
                success('드릴이 클래스에 연결되었습니다.');
            }
        } catch (error) {
            console.error('Error toggling drill bundle:', error);
            toastError('드릴 연결 중 오류가 발생했습니다.');
        }
    };

    const loadSparringVideos = async () => {
        if (!user) return;
        setLoadingSparringVideos(true);
        try {
            // Fetch all sparring videos by this creator
            const { data } = await getSparringVideos(50, user.id);
            if (data) {
                setAvailableSparringVideos(data);
            }
        } catch (error) {
            console.error('Error loading sparring videos:', error);
            toastError('스파링 영상 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoadingSparringVideos(false);
        }
    };

    const loadBundledSparringVideos = async () => {
        if (!id || isNew) return;
        try {
            const { data } = await getCourseSparringVideos(id);
            if (data) {
                setBundledSparringVideos(data);
            }
        } catch (error) {
            console.error('Error loading bundled sparring videos:', error);
        }
    };

    const toggleSparringBundle = async (video: SparringVideo) => {
        const isCurrentlyBundled = bundledSparringVideos.some(v => v.id === video.id);

        if (isNew) {
            // Local state update for new course
            if (isCurrentlyBundled) {
                setBundledSparringVideos(prev => prev.filter(v => v.id !== video.id));
            } else {
                setBundledSparringVideos(prev => [...prev, video]);
            }
            return;
        }

        // API update for existing course
        if (!id) return;

        try {
            if (isCurrentlyBundled) {
                const { error } = await removeCourseSparringVideo(id, video.id);
                if (error) throw error;
                setBundledSparringVideos(prev => prev.filter(v => v.id !== video.id));
                success('스파링 영상이 제외되었습니다.');
            } else {
                const { error } = await addCourseSparringVideo(id, video.id, courseData.title || 'Untitled Course');
                if (error) throw error;
                setBundledSparringVideos(prev => [...prev, video]);
                success('스파링 영상이 추가되었습니다.');
            }
        } catch (error) {
            console.error('Error toggling sparring bundle:', error);
            toastError('스파링 영상 연결 중 오류가 발생했습니다.');
        }
    };

    const [isThumbnailValid, setIsThumbnailValid] = useState(true);

    const handleSaveCourse = async () => {
        if (!user) return;

        // Validation: Thumbnail must be valid
        if (!isThumbnailValid) {
            toastError('썸네일 이미지가 올바르지 않습니다. 다시 업로드해주세요.');
            return;
        }

        // Validation: Course must have at least one lesson to be created
        if (isNew && lessons.length === 0) {
            toastError('클래스를 개설하려면 최소 1개의 레슨이 필요합니다.');

            return;
        }

        setSaving(true);

        let courseToSave = { ...courseData };

        // Auto-capture thumbnail if missing
        if (!courseToSave.thumbnailUrl && lessons.length > 0) {
            // Priority 1: Use lesson's thumbnailUrl if available
            const firstLessonWithThumb = lessons.find(l => l.thumbnailUrl);
            if (firstLessonWithThumb?.thumbnailUrl) {
                courseToSave.thumbnailUrl = firstLessonWithThumb.thumbnailUrl;
                setCourseData(prev => ({ ...prev, thumbnailUrl: firstLessonWithThumb.thumbnailUrl }));
                success('썸네일이 없어 레슨에서 자동으로 설정되었습니다.');
            }
            // Priority 2: Try to fetch from Vimeo (legacy/fallback)
            else if (lessons[0].vimeoUrl) {
                try {
                    const videoInfo = await getVimeoVideoInfo(lessons[0].vimeoUrl);
                    if (videoInfo && videoInfo.thumbnail) {
                        courseToSave.thumbnailUrl = videoInfo.thumbnail;
                        setCourseData(prev => ({ ...prev, thumbnailUrl: videoInfo.thumbnail }));
                        success('썸네일이 없어 첫 번째 레슨에서 자동으로 설정되었습니다.');
                    }
                } catch (error) {
                    console.warn('Auto-thumbnail capture failed:', error);
                }
            }
        }

        try {
            if (isNew) {
                const { data, error } = await createCourse({
                    ...courseToSave,
                    creatorId: (isAdmin && selectedCreatorId) ? selectedCreatorId : user.id,
                });
                if (error) throw error;
                if (data) {
                    // Create or Link lessons for the new course
                    for (let i = 0; i < lessons.length; i++) {
                        const lesson = lessons[i];
                        // If lesson has a real ID (not temp), update it instead of creating new one
                        if (lesson.id && !lesson.id.startsWith('temp-')) {
                            await updateLesson(lesson.id, {
                                courseId: data.id,
                                lessonNumber: i + 1,
                            });
                        } else {
                            await createLesson({
                                courseId: data.id,
                                creatorId: (isAdmin && selectedCreatorId) ? selectedCreatorId : user.id,
                                title: lesson.title,
                                description: lesson.description || '',
                                lessonNumber: i + 1,
                                vimeoUrl: lesson.vimeoUrl,
                                length: lesson.length,
                                difficulty: lesson.difficulty,
                                thumbnailUrl: lesson.thumbnailUrl,
                                durationMinutes: lesson.durationMinutes,
                                category: lesson.category,
                            });
                        }
                    }


                    // Link bundled drills for the new course
                    if (bundledDrills.length > 0) {
                        for (const drill of bundledDrills) {
                            await addCourseDrillBundle(data.id, drill.id);
                        }
                    }

                    // Link bundled sparring videos for the new course
                    if (bundledSparringVideos.length > 0) {
                        for (const video of bundledSparringVideos) {
                            await addCourseSparringVideo(data.id, video.id, data.title);
                        }
                    }

                    // Redirect to Public Course Page
                    navigate(`/courses/${data.id}`);
                    success('클래스가 개설되었습니다! 클래스 페이지로 이동합니다.');

                }
            } else if (id) {
                const effectiveCreatorId = (isAdmin && selectedCreatorId) ? selectedCreatorId : user.id;
                const { error } = await updateCourse(id, { ...courseToSave, creatorId: effectiveCreatorId });
                if (error) throw error;
                success('저장되었습니다. 클래스 페이지로 이동합니다.');

                navigate(`/courses/${id}`);
            }
        } catch (error) {
            console.error('Error saving course:', error);
            toastError('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLesson || !id || !user) return;


        try {
            if (editingLesson.id) {
                await updateLesson(editingLesson.id, editingLesson);
            } else {
                await createLesson({
                    ...editingLesson,
                    courseId: id,
                    creatorId: (isAdmin && selectedCreatorId) ? selectedCreatorId : user.id,
                    lessonNumber: lessons.length + 1,
                });
            }


            const updatedLessons = await getLessonsByCourse(id);
            setLessons(updatedLessons);
            setEditingLesson(null);
        } catch (error) {
            console.error('Error saving lesson:', error);
            toastError('레슨 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!window.confirm('이 레슨을 커리큘럼에서 제거하시겠습니까? (레슨 자체는 삭제되지 않습니다)')) return;
        try {
            if (!isNew) {
                const { error } = await removeLessonFromCourse(lessonId);
                if (error) throw error;
            }
            setLessons(lessons.filter(l => l.id !== lessonId));
        } catch (error) {
            console.error('Error removing lesson from course:', error);
        }
    };

    const handleOpenImportModal = async () => {
        if (!user) return;
        setShowImportModal(true);
        try {
            const allLessons = await getAllCreatorLessons(user.id);
            setCreatorLessons(allLessons);
        } catch (error) {
            console.error('Error loading creator lessons:', error);
        }
    };

    const handleImportLessons = async () => {
        if (selectedImportIds.size === 0) return;

        const selectedLessons = creatorLessons.filter(l => selectedImportIds.has(l.id));

        try {
            if (isNew) {
                // For new course, just add to local state
                // Keep the original lesson ID to indicate it's an existing lesson being linked
                const newLessons = selectedLessons.map((l, index) => ({
                    ...l,
                    lessonNumber: lessons.length + index + 1
                }));
                setLessons([...lessons, ...newLessons]);
                setShowImportModal(false);
                setSelectedImportIds(new Set());
                success(`${newLessons.length}개의 레슨을 추가했습니다.`);
            } else if (id) {
                // For existing course, update the lesson's course_id (LINKING)
                for (let i = 0; i < selectedLessons.length; i++) {
                    const lesson = selectedLessons[i];
                    await updateLesson(lesson.id, {
                        courseId: id,
                        lessonNumber: lessons.length + i + 1,
                    });

                    // Add to local state (using updated lesson info)
                    setLessons(prev => [...prev, {
                        ...lesson,
                        courseId: id,
                        lessonNumber: lessons.length + i + 1
                    }]);
                }

                const updatedLessons = await getLessonsByCourse(id);
                setLessons(updatedLessons);
                setShowImportModal(false);
                setSelectedImportIds(new Set());
                success('레슨을 가져왔습니다!');
            }
        } catch (error) {
            console.error('Error importing lessons:', error);
            toastError('레슨 가져오기 중 오류가 발생했습니다.');
        }
    };

    const autoCaptureThumbnail = async () => {
        if (lessons.length === 0) {
            toastError('먼저 레슨을 추가해주세요.');
            return;
        }

        const firstLesson = lessons[0];
        if (!firstLesson.vimeoUrl) {
            toastError('첫 번째 레슨에 영상이 없습니다.');
            return;
        }

        try {
            const videoInfo = await getVimeoVideoInfo(firstLesson.vimeoUrl);
            if (videoInfo && videoInfo.thumbnail) {
                setCourseData({ ...courseData, thumbnailUrl: videoInfo.thumbnail });
                success('첫 번째 레슨에서 썸네일을 가져왔습니다! 🎉');
            } else {
                toastError('썸네일을 가져올 수 없습니다.');
            }
        } catch (error) {
            toastError('썸네일을 가져오는 중 오류가 발생했습니다.');
        }
    };



    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-zinc-500">
            <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            <p className="font-medium animate-pulse">정보를 불러오는 중...</p>
        </div>
    );

    return (
        <>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/creator')}
                            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                                {isNew ? '새 클래스 만들기' : '클래스 수정하기'}

                            </h1>
                            <p className="text-sm text-zinc-500 mt-1">
                                프리미엄 지식을 체계적으로 구성하여 전달하세요
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleSaveCourse}
                            disabled={saving}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-violet-600 text-white px-8 py-2.5 rounded-xl hover:bg-violet-500 active:scale-95 transition-all font-semibold shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4.5 h-4.5" />
                            )}
                            {saving ? '저장 중...' : (isNew ? '클래스 개설하기' : '변경사항 저장')}

                        </button>
                    </div>
                </div>

                <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/50 shadow-2xl overflow-hidden backdrop-blur-xl">
                    <div className="px-2 pt-2 border-b border-zinc-800/50 bg-zinc-900/60 flex flex-wrap gap-1">
                        {[
                            { id: 'basic', label: '기본 정보', icon: '📝' },
                            { id: 'curriculum', label: '커리큘럼', icon: '📚' },
                            { id: 'drills', label: '보너스 드릴', icon: '🎁' },
                            { id: 'sparring', label: '관련 스파링', icon: '⚔️' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-3.5 font-semibold text-sm transition-all rounded-t-xl relative group flex items-center gap-2 ${activeTab === tab.id
                                    ? 'text-violet-400'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <span className="text-lg leading-none opacity-80 group-hover:scale-110 transition-transform">{tab.icon}</span>
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 shadow-[0_-4px_12px_rgba(139,92,246,0.3)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 sm:p-8">
                        {activeTab === 'basic' ? (
                            <div className="space-y-10 max-w-4xl">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    <div className="lg:col-span-2 space-y-8">
                                        <div className="space-y-6">
                                            {isAdmin && (
                                                <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                                                    <label className="block text-sm font-bold text-violet-400 mb-2">
                                                        인스트럭터 선택 (관리자 대리 업로드)
                                                    </label>
                                                    <select
                                                        value={selectedCreatorId}
                                                        onChange={(e) => setSelectedCreatorId(e.target.value)}
                                                        className="w-full px-4 py-3 bg-zinc-950 border border-violet-500/30 rounded-xl text-white outline-none focus:border-violet-500"
                                                    >
                                                        <option value="">본인 (관리자 계정)</option>
                                                        {creators.map(creator => (
                                                            <option key={creator.id} value={creator.id}>
                                                                {creator.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-semibold text-zinc-400 mb-2.5 ml-1">클래스 제목</label>

                                                <input
                                                    type="text"
                                                    value={courseData.title}
                                                    onChange={e => setCourseData({ ...courseData, title: e.target.value })}
                                                    className="w-full px-5 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none text-lg font-medium"
                                                    placeholder="예: 완벽한 암바 마스터 클래스"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-zinc-400 mb-2.5 ml-1">설명</label>
                                                <textarea
                                                    value={courseData.description}
                                                    onChange={e => setCourseData({ ...courseData, description: e.target.value })}
                                                    rows={5}
                                                    className="w-full px-5 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none text-base leading-relaxed"
                                                    placeholder="클래스에 대한 상세한 커리큘럼과 목표를 입력하세요..."

                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="group">
                                                <label className="block text-sm font-semibold text-zinc-400 mb-2.5 ml-1">카테고리</label>
                                                <div className="relative">
                                                    <select
                                                        value={courseData.category}
                                                        onChange={e => setCourseData({ ...courseData, category: e.target.value as VideoCategory })}
                                                        className="w-full pl-5 pr-10 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none appearance-none"
                                                    >
                                                        {Object.values(VideoCategory).map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-focus-within:text-violet-500 transition-colors">
                                                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="block text-sm font-semibold text-zinc-400 mb-2.5 ml-1">난이도</label>
                                                <div className="relative">
                                                    <select
                                                        value={courseData.difficulty}
                                                        onChange={e => setCourseData({ ...courseData, difficulty: e.target.value as Difficulty })}
                                                        className="w-full pl-5 pr-10 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none appearance-none"
                                                    >
                                                        {Object.values(Difficulty).map(diff => (
                                                            <option key={diff} value={diff}>{diff}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-focus-within:text-violet-500 transition-colors">
                                                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="block text-sm font-semibold text-zinc-400 mb-2.5 ml-1">도복</label>
                                                <div className="relative">
                                                    <select
                                                        value={courseData.uniformType}
                                                        onChange={e => setCourseData({ ...courseData, uniformType: e.target.value as UniformType })}
                                                        className="w-full pl-5 pr-10 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none appearance-none"
                                                    >
                                                        {Object.values(UniformType).map(type => (
                                                            <option key={type} value={type}>{type}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-focus-within:text-violet-500 transition-colors">
                                                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-zinc-800/50">
                                            <div className="flex flex-col gap-6">
                                                <div>
                                                    <label className="block text-sm font-semibold text-zinc-400 mb-2.5 ml-1">판매 가격 (₩)</label>
                                                    <div className="relative group">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-violet-500 transition-colors font-medium">₩</div>
                                                        <input
                                                            type="number"
                                                            value={courseData.price}
                                                            onChange={e => setCourseData({ ...courseData, price: Number(e.target.value) })}
                                                            className="w-full pl-10 pr-5 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none text-lg font-bold"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="flex items-start gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/30 hover:bg-zinc-800/20 transition-all cursor-pointer group">
                                                        <div className="flex items-center h-5 mt-0.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={courseData.isSubscriptionExcluded || false}
                                                                onChange={e => setCourseData({ ...courseData, isSubscriptionExcluded: e.target.checked })}
                                                                className="h-5 w-5 text-violet-600 focus:ring-violet-500/20 border-zinc-700 rounded-md bg-zinc-900 transition-all cursor-pointer"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="block font-semibold text-zinc-200 group-hover:text-white transition-colors">구독 제외 상품 (단품 구매 전용)</span>
                                                            <span className="block text-sm text-zinc-500 mt-1 leading-relaxed">체크하면 구독권 사용자도 무료로 이용할 수 없으며, 별도의 단품 구매가 필요합니다.</span>
                                                        </div>
                                                    </label>

                                                    <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group animate-pulse-subtle ${courseData.published
                                                        ? 'bg-violet-500/10 border-violet-500/30'
                                                        : 'bg-zinc-950/30 border-zinc-800 hover:bg-zinc-800/20'
                                                        }`}>
                                                        <div className="flex items-center h-5 mt-0.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={courseData.published || false}
                                                                onChange={e => setCourseData({ ...courseData, published: e.target.checked })}
                                                                className="h-5 w-5 text-violet-600 focus:ring-violet-500/20 border-zinc-700 rounded-md bg-zinc-900 transition-all cursor-pointer"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className={`block font-semibold transition-colors ${courseData.published ? 'text-violet-400' : 'text-zinc-200 group-hover:text-white'}`}>클래스 전체 공개 (Publish)</span>

                                                            <span className="block text-xs text-zinc-500 mt-1 leading-relaxed">체크 시 즉시 서비스에 노출됩니다. 콘텐츠 준비가 완벽히 끝난 후 활성화해주세요.</span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 shadow-inner">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-sm font-semibold text-zinc-400 ml-1">대표 썸네일</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowThumbnailModal(true)}
                                                    disabled={lessons.length === 0}
                                                    className="text-xs text-violet-400 hover:text-violet-300 disabled:text-zinc-700 disabled:cursor-not-allowed font-semibold px-2 py-1 bg-violet-500/5 rounded-md transition-all active:scale-95"
                                                >
                                                    레슨에서 추출
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                <ImageUploader
                                                    currentImageUrl={courseData.thumbnailUrl}
                                                    onUploadComplete={(url) => setCourseData({ ...courseData, thumbnailUrl: url })}
                                                    onValidityChange={setIsThumbnailValid}
                                                />
                                                <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                                                    <p className="text-xs text-violet-400/70 leading-relaxed font-medium">
                                                        💡 미설정 시 첫 번째 레슨 영상에서 자동으로 캡처된 이미지가 사용됩니다.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>


                                        <div className="p-6 rounded-2xl bg-violet-500/5 border border-violet-500/10 mt-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 shrink-0">
                                                    <Video className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-violet-400 text-sm mb-1">자동 미리보기 생성</h4>
                                                    <p className="text-zinc-500 text-xs leading-relaxed">
                                                        별도의 미리보기 영상을 업로드할 필요가 없습니다.<br />
                                                        <strong>첫 번째 레슨의 앞 1분</strong>이 자동으로 무료 미리보기로 제공됩니다.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'curriculum' ? (
                            <div className="animate-in fade-in duration-300">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                    <div>
                                        <h3 className="font-bold text-xl text-white">커리큘럼 구성</h3>
                                        <p className="text-sm text-zinc-500 mt-1">드래그하여 레슨 순서를 변경할 수 있습니다</p>
                                    </div>

                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={handleOpenImportModal}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 rounded-xl transition-all font-semibold border border-zinc-700 shadow-lg"
                                        >
                                            <BookOpen className="w-4.5 h-4.5" />
                                            기존 레슨 가져오기
                                        </button>
                                        <button
                                            onClick={() => { setEditingLesson({ title: '', description: '', vimeoUrl: '', length: '0:00', difficulty: courseData.difficulty }); setLessonUploadMode('file'); setVimeoUrlInput(''); }}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-violet-600/10 text-violet-400 hover:bg-violet-600/20 px-5 py-2.5 rounded-xl transition-all font-semibold border border-violet-500/20 shadow-lg"
                                        >
                                            <Video className="w-4.5 h-4.5" />
                                            새 레슨 추가
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-10">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                        modifiers={[restrictToVerticalAxis]}
                                    >
                                        <SortableContext
                                            items={lessons.map(l => l.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-3">
                                                {lessons.map((lesson, index) => (
                                                    <SortableLessonItem
                                                        key={lesson.id}
                                                        lesson={lesson}
                                                        index={index}
                                                        onEdit={setEditingLesson}
                                                        onDelete={handleDeleteLesson}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>

                                    {lessons.length === 0 && (
                                        <div className="text-center py-20 bg-zinc-950/30 border-2 border-dashed border-zinc-800 rounded-2xl">
                                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-700">
                                                <Video className="w-8 h-8" />
                                            </div>
                                            <p className="text-zinc-500 font-medium text-lg">아직 등록된 레슨이 없습니다</p>
                                            <p className="text-zinc-600 text-sm mt-1">새 레슨을 추가하거나 기존 레슨을 가져오세요</p>
                                            <button
                                                onClick={() => { setEditingLesson({ title: '', description: '', vimeoUrl: '', length: '0:00', difficulty: courseData.difficulty }); setLessonUploadMode('file'); setVimeoUrlInput(''); }}
                                                className="mt-6 text-violet-400 hover:text-violet-300 font-semibold inline-flex items-center gap-2"
                                            >
                                                첫 번째 레슨 만들기 <ArrowLeft className="w-4 h-4 rotate-180" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                            </div>
                        ) : activeTab === 'drills' ? (
                            <div className="animate-in fade-in duration-300 max-w-4xl">
                                <div className="mb-10 bg-violet-600/5 border border-violet-500/10 p-6 rounded-2xl relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <h3 className="font-bold text-xl text-white mb-2 flex items-center gap-2">
                                            보너스 드릴 설정 <span className="bg-violet-500/20 text-violet-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Bonus content</span>
                                        </h3>
                                        <p className="text-zinc-500 leading-relaxed">
                                            이 클래스를 구매한 수강생들에게 자동으로 지급될 추가 드릴을 선택하세요.<br />

                                            <span className="text-zinc-400 font-medium italic underline decoration-violet-500/30">잘 구성된 보너스 콘텐츠는 클래스의 가치를 높여줍니다.</span>

                                        </p>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 text-violet-500/10 group-hover:scale-110 transition-transform">
                                        <Plus className="w-32 h-32" />
                                    </div>
                                </div>

                                {bundledDrills.length > 0 && (
                                    <div className="mb-10 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                                        <h4 className="text-sm font-bold text-violet-400 mb-4 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-violet-400 rounded-full shadow-[0_0_8px_rgba(167,139,250,0.6)] animate-pulse" />
                                            현재 연결된 드릴 ({bundledDrills.length})
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {bundledDrills.map(drill => (
                                                <div key={drill.id} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-sm">
                                                    <span className="text-zinc-200 text-sm font-medium">{drill.title}</span>
                                                    <button
                                                        onClick={() => toggleDrillBundle(drill)}
                                                        className="text-zinc-600 hover:text-rose-400 transition-colors p-0.5 rounded"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {loadingDrills ? (
                                    <div className="flex flex-col items-center py-20 text-zinc-600 gap-3">
                                        <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                                        <p className="font-medium">나의 드릴 목록을 불러오는 중...</p>
                                    </div>
                                ) : availableDrills.length === 0 ? (
                                    <div className="text-center py-20 bg-zinc-950/30 border-2 border-dashed border-zinc-800 rounded-2xl">
                                        <Plus className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                        <p className="text-zinc-500 font-medium">사용 가능한 드릴이 없습니다</p>
                                        <button
                                            onClick={() => navigate('/creator')}
                                            className="mt-4 text-violet-400 hover:underline font-semibold"
                                        >
                                            먼저 새 드릴을 등록하러 가기
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableDrills.map(drill => {
                                            const isBundled = bundledDrills.some(d => d.id === drill.id);
                                            return (
                                                <div
                                                    key={drill.id}
                                                    onClick={() => toggleDrillBundle(drill)}
                                                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all group relative overflow-hidden ${isBundled
                                                        ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/5'
                                                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-1 shrink-0 transition-all ${isBundled
                                                        ? 'bg-violet-500 border-violet-500 scale-110 shadow-lg'
                                                        : 'border-zinc-700 group-hover:border-zinc-500 bg-zinc-900'
                                                        }`}>
                                                        {isBundled && <CheckCircle className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-16 bg">
                                                        <h4 className={`font-bold text-lg leading-tight transition-colors ${isBundled ? 'text-violet-400' : 'text-white'}`}>
                                                            {drill.title}
                                                        </h4>
                                                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{drill.description}</p>
                                                        <div className="flex items-center gap-2 mt-3 overflow-hidden">
                                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md border border-zinc-700/50">
                                                                {drill.category}
                                                            </span>
                                                            {drill.duration && (
                                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md border border-zinc-700/50">
                                                                    {drill.duration}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md border border-zinc-700/50">
                                                                {drill.difficulty}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="absolute right-4 top-4 w-16 h-16 rounded-xl bg-zinc-900/80 border border-zinc-800 flex-shrink-0 overflow-hidden shadow-inner ring-1 ring-white/5 group-hover:scale-105 transition-transform">
                                                        {drill.thumbnailUrl ? (
                                                            <img src={drill.thumbnailUrl} alt="" className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-700"><Video className="w-6 h-6" /></div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'sparring' ? (
                            <div className="animate-in fade-in duration-300 max-w-4xl">
                                <div className="mb-10 bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl">
                                    <h3 className="font-bold text-xl text-white mb-2 flex items-center gap-2">
                                        실전 스파링 연동 <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold border border-zinc-700">Live sparring</span>
                                    </h3>
                                    <p className="text-zinc-500 leading-relaxed">
                                        클래스에서 배운 테크닉이 실제로 어떻게 쓰이는지 보여주는 스파링 영상을 선택하세요.<br />

                                        수강생들의 실전 응용력을 높여주는 최고의 시청각 자료가 됩니다.
                                    </p>
                                </div>

                                {bundledSparringVideos.length > 0 && (
                                    <div className="mb-10 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                                        <h4 className="text-sm font-bold text-violet-400 mb-4 flex items-center gap-2">
                                            연결된 스파링 목록 ({bundledSparringVideos.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {bundledSparringVideos.map(video => (
                                                <div key={video.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-sm group">
                                                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                                                    <span className="flex-1 text-zinc-200 text-sm font-medium truncate">{video.title}</span>
                                                    <button
                                                        onClick={() => toggleSparringBundle(video)}
                                                        className="text-zinc-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {loadingSparringVideos ? (
                                    <div className="flex flex-col items-center py-20 text-zinc-600 gap-3">
                                        <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                                        <p className="font-medium">나의 스파링 보관함을 여는 중...</p>
                                    </div>
                                ) : availableSparringVideos.length === 0 ? (
                                    <div className="text-center py-20 bg-zinc-950/30 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                                        <p className="font-medium">등록된 실전 영상이 없습니다</p>
                                        <button
                                            onClick={() => navigate('/creator/upload-sparring')}
                                            className="mt-4 text-violet-400 hover:underline font-semibold"
                                        >
                                            첫 스파링 영상 올리기
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableSparringVideos.map(video => {
                                            const isBundled = bundledSparringVideos.some(v => v.id === video.id);
                                            return (
                                                <div
                                                    key={video.id}
                                                    onClick={() => toggleSparringBundle(video)}
                                                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all group ${isBundled
                                                        ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/5'
                                                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-1 transition-all ${isBundled
                                                        ? 'bg-violet-500 border-violet-500'
                                                        : 'border-zinc-700 group-hover:border-zinc-500'
                                                        }`}>
                                                        {isBundled && <CheckCircle className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-16 bg">
                                                        <h4 className={`font-bold text-lg leading-tight transition-colors ${isBundled ? 'text-violet-400' : 'text-white'}`}>
                                                            {video.title}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-zinc-900 text-zinc-500 rounded-lg border border-zinc-800">
                                                                {video.category || 'NO CATEGORY'}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-zinc-600">
                                                                조회 {video.views?.toLocaleString()}회
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="absolute right-4 top-4 w-16 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0 overflow-hidden shadow-inner ring-1 ring-white/5">
                                                        {video.thumbnailUrl && (
                                                            <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div >

            {/* Combined Thumbnail Extract Modal */}
            {
                showThumbnailModal && createPortal(
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60000] p-4 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-zinc-900 rounded-3xl shadow-2xl max-w-2xl w-full p-8 max-h-[85vh] flex flex-col border border-zinc-800/50 animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-3xl font-black text-white tracking-tight">클래스 썸네일 추출</h3>

                                    <p className="text-zinc-500 font-medium mt-1">커리큘럼 비디오 중 하나를 대표 이미지로 사용하세요</p>
                                </div>
                                <button
                                    onClick={() => setShowThumbnailModal(false)}
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-all shadow-lg active:scale-95"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 mb-8 scrollbar-none pr-1">
                                {lessons.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
                                        <Video className="w-16 h-16 text-zinc-700 mb-4" />
                                        <p className="text-zinc-600 font-bold">먼저 레슨을 하나 이상 등록해주세요</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                        {lessons.map((lesson) => (
                                            <div
                                                key={lesson.id}
                                                onClick={async () => {
                                                    if (lesson.thumbnailUrl) {
                                                        setCourseData({ ...courseData, thumbnailUrl: lesson.thumbnailUrl });
                                                        setShowThumbnailModal(false);
                                                        success('클래스 대표 썸네일이 변경되었습니다 ✨');
                                                    } else if (lesson.vimeoUrl) {
                                                        try {
                                                            const videoInfo = await getVimeoVideoInfo(lesson.vimeoUrl);
                                                            if (videoInfo?.thumbnail) {
                                                                setCourseData({ ...courseData, thumbnailUrl: videoInfo.thumbnail });
                                                                setShowThumbnailModal(false);
                                                                success('클래스 대표 썸네일이 변경되었습니다 ✨');
                                                            }
                                                        } catch (err) {
                                                            toastError('썸네일을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.');
                                                        }
                                                    }
                                                }}
                                                className="group relative aspect-video bg-zinc-950 rounded-2xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-violet-500 transition-all shadow-2xl ring-1 ring-white/5"
                                            >
                                                <div className="absolute inset-0 bg-zinc-800 animate-pulse group-hover:hidden" />
                                                {lesson.vimeoUrl && (
                                                    <img
                                                        src={lesson.thumbnailUrl || `https://vumbnail.com/${extractVimeoId(lesson.vimeoUrl)}.jpg?${Date.now()}`}
                                                        alt={lesson.title}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 blur-[2px] hover:blur-0"
                                                        onLoad={(e) => (e.currentTarget.style.filter = 'none')}
                                                    />
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                                    <p className="text-xs font-black text-white truncate drop-shadow-lg">{lesson.title}</p>
                                                    <p className="text-[10px] font-bold text-violet-400 mt-0.5">{lesson.length} • 클릭하여 선택</p>
                                                </div>
                                                {courseData.thumbnailUrl === lesson.thumbnailUrl && lesson.thumbnailUrl && (
                                                    <div className="absolute top-4 right-4 bg-violet-600 rounded-full p-2 shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-violet-400/50">
                                                        <CheckCircle className="w-5 h-5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-zinc-800/50">
                                <button
                                    onClick={autoCaptureThumbnail}
                                    className="flex-1 py-4 bg-zinc-800 text-zinc-300 hover:text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg border border-zinc-700"
                                >
                                    첫 레슨에서 자동 추출
                                </button>
                                <button
                                    onClick={() => setShowThumbnailModal(false)}
                                    className="flex-1 py-4 bg-violet-600 text-white hover:bg-violet-500 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-violet-500/20"
                                >
                                    현재 썸네일 유지
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Edit/Add Lesson Modal */}
            {
                editingLesson && createPortal(
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60000] p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-xl w-full p-8 max-h-[90vh] overflow-y-auto border border-zinc-800 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-white">{editingLesson.id ? '레슨 상세 수정' : '새로운 레슨 제작'}</h3>
                                <button
                                    onClick={() => setEditingLesson(null)}
                                    className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                {isAdmin && (
                                    <div className="flex bg-zinc-950 rounded-xl p-1 border border-zinc-800/50">
                                        <button
                                            type="button"
                                            onClick={() => setLessonUploadMode('file')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${lessonUploadMode === 'file' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            <Upload className="w-4 h-4" />
                                            파일 업로드
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLessonUploadMode('url')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${lessonUploadMode === 'url' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            <Link2 className="w-4 h-4" />
                                            Vimeo URL
                                        </button>
                                    </div>
                                )}

                                {(!isAdmin || lessonUploadMode === 'file') ? (
                                    <div className="p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800/50">
                                        <VideoUploader
                                            compact
                                            initialMetadata={{
                                                title: editingLesson.title,
                                                description: editingLesson.description,
                                                category: courseData.category,
                                                difficulty: courseData.difficulty,
                                            }}
                                            onUploadComplete={(vimeoId, duration) => {
                                                setEditingLesson({
                                                    ...editingLesson,
                                                    vimeoUrl: vimeoId,
                                                    length: duration
                                                });
                                                success('영상이 준비되었습니다! 정보를 입력하고 하단 버튼을 눌러주세요.');
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800/50 space-y-3">
                                        <label className="block text-sm font-semibold text-zinc-400 ml-1">Vimeo 영상 URL</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={vimeoUrlInput}
                                                onChange={e => setVimeoUrlInput(e.target.value)}
                                                placeholder="https://vimeo.com/123456789"
                                                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-600 text-sm"
                                            />
                                            <button
                                                type="button"
                                                disabled={!vimeoUrlInput.trim() || vimeoUrlLoading}
                                                onClick={async () => {
                                                    const id = extractVimeoId(vimeoUrlInput);
                                                    if (!id) {
                                                        toastError('올바른 Vimeo URL을 입력해주세요.');
                                                        return;
                                                    }
                                                    setVimeoUrlLoading(true);
                                                    try {
                                                        const info = await getVimeoVideoInfo(id);
                                                        if (!info) {
                                                            toastError('영상 정보를 가져올 수 없습니다. URL을 확인해주세요.');
                                                            return;
                                                        }
                                                        setEditingLesson({
                                                            ...editingLesson,
                                                            vimeoUrl: id,
                                                            length: formatDuration(info.duration),
                                                            thumbnailUrl: info.thumbnail,
                                                        });
                                                        success('영상 정보를 불러왔습니다!');
                                                    } catch {
                                                        toastError('영상 정보를 가져오는 중 오류가 발생했습니다.');
                                                    } finally {
                                                        setVimeoUrlLoading(false);
                                                    }
                                                }}
                                                className="px-5 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 disabled:opacity-50 disabled:pointer-events-none transition-all text-sm flex items-center gap-2"
                                            >
                                                {vimeoUrlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                확인
                                            </button>
                                        </div>
                                        <p className="text-xs text-zinc-600 ml-1">
                                            예: https://vimeo.com/123456789 또는 Vimeo ID 직접 입력
                                        </p>
                                    </div>
                                )}

                                {editingLesson.vimeoUrl && (
                                    <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                                            <CheckCircle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-emerald-400">영상 트랜스코딩 완료</p>
                                            <p className="text-xs text-emerald-500/70 mt-0.5">
                                                Vimeo ID: {editingLesson.vimeoUrl} | 재생 시간: {editingLesson.length}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSaveLesson} className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">레슨 제목</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingLesson.title}
                                                onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                                                className="w-full px-5 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-700"
                                                placeholder="레슨 주제를 입력하세요"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">상세 설명 (선택)</label>
                                            <textarea
                                                value={editingLesson.description}
                                                onChange={e => setEditingLesson({ ...editingLesson, description: e.target.value })}
                                                className="w-full px-5 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all resize-none placeholder:text-zinc-700"
                                                rows={4}
                                                placeholder="배우게 될 핵심 테크닉을 설명하세요"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setEditingLesson(null)}
                                            className="flex-1 py-3.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl font-bold transition-all"
                                        >
                                            취소
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-[2] py-3.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-500 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95"
                                            disabled={!editingLesson.vimeoUrl}
                                        >
                                            {editingLesson.id ? '수정사항 저장' : '레슨 등록 완료'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Import Lesson Modal */}
            {
                showImportModal && createPortal(
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60000] p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[85vh] flex flex-col border border-zinc-800 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white">기존 레슨 가져오기</h3>
                                    <p className="text-zinc-500 text-sm mt-1">내가 만든 클래스의 레슨들을 재사용할 수 있습니다</p>

                                </div>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 mb-6 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
                                {creatorLessons.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                                        <BookOpen className="w-12 h-12 text-zinc-800 mb-4" />
                                        <p className="text-zinc-600 font-medium">재사용 가능한 레슨이 없습니다</p>
                                    </div>
                                ) : (
                                    Array.from(new Map(creatorLessons.map(item => [item.vimeoUrl || item.title, item])).values())
                                        .filter(cl => !lessons.some(l => l.vimeoUrl === cl.vimeoUrl))
                                        .map(lesson => (
                                            <div
                                                key={lesson.id}
                                                onClick={() => {
                                                    const newSelected = new Set(selectedImportIds);
                                                    if (newSelected.has(lesson.id)) {
                                                        newSelected.delete(lesson.id);
                                                    } else {
                                                        newSelected.add(lesson.id);
                                                    }
                                                    setSelectedImportIds(newSelected);
                                                }}
                                                className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-4 transition-all group ${selectedImportIds.has(lesson.id)
                                                    ? 'bg-violet-600/10 border-violet-500/50 shadow-lg shadow-violet-500/5'
                                                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedImportIds.has(lesson.id)
                                                    ? 'border-violet-500 bg-violet-500 scale-110 shadow-lg'
                                                    : 'border-zinc-700 group-hover:border-zinc-500'
                                                    }`}>
                                                    {selectedImportIds.has(lesson.id) && <CheckCircle className="w-4 h-4 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`font-bold transition-colors ${selectedImportIds.has(lesson.id) ? 'text-violet-400' : 'text-white'}`}>
                                                        {lesson.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1 px-1.5 py-0.5 bg-zinc-800/80 rounded-md w-fit">
                                                        <Video className="w-3 h-3 text-zinc-500" />
                                                        <span className="text-[10px] text-zinc-400 font-bold uppercase">{lesson.length} • {lesson.difficulty}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-zinc-800/50">
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="flex-1 py-3.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl font-bold transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleImportLessons}
                                    disabled={selectedImportIds.size === 0}
                                    className="flex-[2] py-3.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-500 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {selectedImportIds.size > 0 && <span>{selectedImportIds.size}개의</span>}
                                    레슨 일괄 가져오기
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }


        </>
    );
};
