import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, GripVertical, Video, Trash2, Edit } from 'lucide-react';
import { getCourseById, createCourse, updateCourse, getLessonsByCourse, createLesson, updateLesson, deleteLesson } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Course, Lesson, VideoCategory, Difficulty } from '../../types';
import { getVimeoVideoInfo } from '../../lib/vimeo';

export const CourseEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNew = !id || id === 'new';

    const [activeTab, setActiveTab] = useState<'basic' | 'curriculum'>('basic');
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Course State
    const [courseData, setCourseData] = useState<Partial<Course>>({
        title: '',
        description: '',
        category: VideoCategory.Standing, // Default to Standing
        difficulty: Difficulty.Beginner,
        price: 0,
        thumbnailUrl: '',
    });

    // Lessons State
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);

    useEffect(() => {
        if (!isNew && id) {
            fetchCourseData(id);
        }
    }, [id, isNew]);

    async function fetchCourseData(courseId: string) {
        try {
            const [course, courseLessons] = await Promise.all([
                getCourseById(courseId),
                getLessonsByCourse(courseId)
            ]);
            if (course) setCourseData(course);
            setLessons(courseLessons);
        } catch (error) {
            console.error('Error fetching course:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveCourse = async () => {
        if (!user) return;
        setSaving(true);

        try {
            if (isNew) {
                const { data, error } = await createCourse({
                    ...courseData,
                    creatorId: user.id,
                });
                if (error) throw error;
                if (data) {
                    navigate(`/creator/courses/${data.id}/edit`, { replace: true });
                    // Switch to curriculum tab after creating
                    setActiveTab('curriculum');
                }
            } else if (id) {
                const { error } = await updateCourse(id, courseData);
                if (error) throw error;
                alert('저장되었습니다.');
            }
        } catch (error) {
            console.error('Error saving course:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLesson || !id) return;

        try {
            if (editingLesson.id) {
                // Update
                await updateLesson(editingLesson.id, editingLesson);
            } else {
                // Create
                await createLesson({
                    ...editingLesson,
                    courseId: id,
                    lessonNumber: lessons.length + 1,
                });
            }

            // Refresh lessons
            const updatedLessons = await getLessonsByCourse(id);
            setLessons(updatedLessons);
            setEditingLesson(null);
        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('레슨 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteLesson(lessonId);
            setLessons(lessons.filter(l => l.id !== lessonId));
        } catch (error) {
            console.error('Error deleting lesson:', error);
        }
    };

    const fetchVimeoThumbnail = async () => {
        if (!courseData.thumbnailUrl) {
            alert('먼저 Vimeo URL을 입력하세요.');
            return;
        }

        try {
            const videoInfo = await getVimeoVideoInfo(courseData.thumbnailUrl);
            if (videoInfo && videoInfo.thumbnail) {
                setCourseData({ ...courseData, thumbnailUrl: videoInfo.thumbnail });
                alert('썸네일을 가져왔습니다! 🎉');
            } else {
                alert('썸네일을 가져올 수 없습니다. Vimeo URL을 확인하세요.');
            }
        } catch (error) {
            console.error('Error fetching thumbnail:', error);
            alert('썸네일을 가져오는 중 오류가 발생했습니다.');
        }
    };

    const fetchLessonMetadata = async () => {
        if (!editingLesson?.vimeoUrl) {
            alert('먼저 Vimeo URL을 입력하세요.');
            return;
        }

        try {
            const videoInfo = await getVimeoVideoInfo(editingLesson.vimeoUrl);
            if (videoInfo) {
                const durationMinutes = Math.floor(videoInfo.duration / 60);
                const durationSeconds = videoInfo.duration % 60;
                const formattedDuration = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;

                setEditingLesson({
                    ...editingLesson,
                    length: formattedDuration,
                    title: editingLesson.title || videoInfo.title, // Only set if empty
                    description: editingLesson.description || videoInfo.description,
                });
                alert('비디오 정보를 가져왔습니다! 🎉');
            } else {
                alert('비디오 정보를 가져올 수 없습니다. Vimeo URL을 확인하세요.');
            }
        } catch (error) {
            console.error('Error fetching video metadata:', error);
            alert('비디오 정보를 가져오는 중 오류가 발생했습니다.');
        }
    };

    if (loading) return <div className="p-8 text-center">로딩 중...</div>;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/creator/courses')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isNew ? '새 강좌 만들기' : '강좌 수정하기'}
                    </h1>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'basic' && (
                        <button
                            onClick={handleSaveCourse}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? '저장 중...' : '저장하기'}
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 flex">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'basic'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        기본 정보
                    </button>
                    <button
                        onClick={() => {
                            if (isNew) {
                                alert('먼저 강좌를 저장해주세요.');
                                return;
                            }
                            setActiveTab('curriculum');
                        }}
                        className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'curriculum'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        커리큘럼
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'basic' ? (
                        <div className="space-y-6 max-w-3xl">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">강좌 제목</label>
                                <input
                                    type="text"
                                    value={courseData.title}
                                    onChange={e => setCourseData({ ...courseData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="예: 완벽한 암바 마스터 클래스"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                                <textarea
                                    value={courseData.description}
                                    onChange={e => setCourseData({ ...courseData, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="강좌에 대한 설명을 입력하세요..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
                                    <select
                                        value={courseData.category}
                                        onChange={e => setCourseData({ ...courseData, category: e.target.value as VideoCategory })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {Object.values(VideoCategory).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">난이도</label>
                                    <select
                                        value={courseData.difficulty}
                                        onChange={e => setCourseData({ ...courseData, difficulty: e.target.value as Difficulty })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {Object.values(Difficulty).map(diff => (
                                            <option key={diff} value={diff}>{diff}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">가격 (₩)</label>
                                    <input
                                        type="number"
                                        value={courseData.price}
                                        onChange={e => setCourseData({ ...courseData, price: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">썸네일 URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={courseData.thumbnailUrl}
                                            onChange={e => setCourseData({ ...courseData, thumbnailUrl: e.target.value })}
                                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Vimeo URL 또는 이미지 URL"
                                        />
                                        <button
                                            type="button"
                                            onClick={fetchVimeoThumbnail}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                                        >
                                            Vimeo에서 가져오기
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Vimeo URL을 입력하고 버튼을 클릭하면 자동으로 썸네일을 가져옵니다
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg text-slate-900">레슨 목록</h3>
                                <button
                                    onClick={() => setEditingLesson({ title: '', description: '', length: '10:00', difficulty: Difficulty.Beginner })}
                                    className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    레슨 추가
                                </button>
                            </div>

                            <div className="space-y-3 mb-8">
                                {lessons.map((lesson, index) => (
                                    <div key={lesson.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 group">
                                        <div className="text-slate-400 cursor-grab">
                                            <GripVertical className="w-5 h-5" />
                                        </div>
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200 font-bold text-slate-600 text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-grow">
                                            <h4 className="font-bold text-slate-900">{lesson.title}</h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {lesson.length}</span>
                                                <span>{lesson.difficulty}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingLesson(lesson)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLesson(lesson.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {lessons.length === 0 && (
                                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                                        아직 등록된 레슨이 없습니다.
                                    </div>
                                )}
                            </div>

                            {editingLesson && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                                        <h3 className="text-xl font-bold mb-4">{editingLesson.id ? '레슨 수정' : '새 레슨 추가'}</h3>
                                        <form onSubmit={handleSaveLesson} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editingLesson.title}
                                                    onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                                                <textarea
                                                    value={editingLesson.description}
                                                    onChange={e => setEditingLesson({ ...editingLesson, description: e.target.value })}
                                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                                    rows={3}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Vimeo URL/ID</label>
                                                    <input
                                                        type="text"
                                                        value={editingLesson.vimeoUrl}
                                                        onChange={e => setEditingLesson({ ...editingLesson, vimeoUrl: e.target.value })}
                                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                                        placeholder="123456789"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">재생 시간</label>
                                                    <input
                                                        type="text"
                                                        value={editingLesson.length}
                                                        onChange={e => setEditingLesson({ ...editingLesson, length: e.target.value })}
                                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                                        placeholder="10:00"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={fetchLessonMetadata}
                                                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                            >
                                                📹 Vimeo 정보 가져오기 (제목, 재생시간)
                                            </button>
                                            <div className="flex justify-end gap-3 mt-6">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingLesson(null)}
                                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    저장
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
