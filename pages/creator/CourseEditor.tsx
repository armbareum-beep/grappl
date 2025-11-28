
// Course State
const [courseData, setCourseData] = useState<Partial<Course>>({
    title: '',
    description: '',
    category: VideoCategory.Standing,
    difficulty: Difficulty.Beginner,
    price: 0,
    thumbnailUrl: '',
    isSubscriptionExcluded: false,
});

// Lessons State
const [lessons, setLessons] = useState<Lesson[]>([]);
const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');

// Drills State
const [availableDrills, setAvailableDrills] = useState<Drill[]>([]);
const [bundledDrills, setBundledDrills] = useState<Drill[]>([]);
const [loadingDrills, setLoadingDrills] = useState(false);

// Import Lesson State
const [showImportModal, setShowImportModal] = useState(false);
const [creatorLessons, setCreatorLessons] = useState<Lesson[]>([]);
const [selectedImportLesson, setSelectedImportLesson] = useState<Lesson | null>(null);

useEffect(() => {
    if (!isNew && id) {
        fetchCourseData(id);
        loadDrills();
        loadBundledDrills();
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

const loadDrills = async () => {
    if (!user) return;
    setLoadingDrills(true);
    try {
        const { data } = await getDrills(user.id);
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
    if (!id) return;

    const isCurrentlyBundled = bundledDrills.some(d => d.id === drill.id);

    try {
        if (isCurrentlyBundled) {
            const { error } = await removeCourseDrillBundle(id, drill.id);
            if (error) throw error;
            setBundledDrills(prev => prev.filter(d => d.id !== drill.id));
        } else {
            const { error } = await addCourseDrillBundle(id, drill.id);
            if (error) throw error;
            setBundledDrills(prev => [...prev, drill]);
        }
    } catch (error) {
        console.error('Error toggling drill bundle:', error);
        alert('드릴 연결 중 오류가 발생했습니다.');
    }
};

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

                try {
                    if (editingLesson.id) {
                        await updateLesson(editingLesson.id, editingLesson);
                    } else {
                        await createLesson({
                            ...editingLesson,
                            courseId: id,
                            lessonNumber: lessons.length + 1,
                        });
                    }

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

            const handleOpenImportModal = async () => {
                if (!user) return;
                setShowImportModal(true);
                try {
                    const allLessons = await getAllCreatorLessons(user.id);
                    // Filter out lessons already in this course to avoid confusion (optional, but good UX)
                    // But user might want to duplicate within same course, so maybe keep them.
                    // Let's just show all.
                    setCreatorLessons(allLessons);
                } catch (error) {
                    console.error('Error loading creator lessons:', error);
                }
            };

            const handleImportLesson = async () => {
                if (!selectedImportLesson || !id) return;

                try {
                    // Clone the lesson
                    await createLesson({
                        courseId: id,
                        title: selectedImportLesson.title,
                        description: selectedImportLesson.description,
                        lessonNumber: lessons.length + 1,
                        vimeoUrl: selectedImportLesson.vimeoUrl,
                        length: selectedImportLesson.length,
                        difficulty: selectedImportLesson.difficulty,
                    });

                    const updatedLessons = await getLessonsByCourse(id);
                    setLessons(updatedLessons);
                    setShowImportModal(false);
                    setSelectedImportLesson(null);
                    alert('레슨을 가져왔습니다!');
                } catch (error) {
                    console.error('Error importing lesson:', error);
                    alert('레슨 가져오기 중 오류가 발생했습니다.');
                }
            };

            const autoCaptureThumbnail = async () => {
                if (lessons.length === 0) {
                    alert('먼저 레슨을 추가해주세요.');
                    return;
                }

                const firstLesson = lessons[0];
                if (!firstLesson.vimeoUrl) {
                    alert('첫 번째 레슨에 영상이 없습니다.');
                    return;
                }

                try {
                    const videoInfo = await getVimeoVideoInfo(firstLesson.vimeoUrl);
                    if (videoInfo && videoInfo.thumbnail) {
                        setCourseData({ ...courseData, thumbnailUrl: videoInfo.thumbnail });
                        alert('첫 번째 레슨에서 썸네일을 가져왔습니다! 🎉');
                    } else {
                        alert('썸네일을 가져올 수 없습니다.');
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
                            title: editingLesson.title || videoInfo.title,
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

            if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

            return (
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/creator/courses')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                                <ArrowLeft className="w-6 h-6 text-slate-400" />
                            </button>
                            <h1 className="text-2xl font-bold text-white">
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

                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
                        <div className="border-b border-slate-800 flex">
                            <button
                                onClick={() => setActiveTab('basic')}
                                className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'basic'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-white'
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
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-white'
                                    }`}
                            >
                                커리큘럼
                            </button>
                            <button
                                onClick={() => {
                                    if (isNew) {
                                        alert('먼저 강좌를 저장해주세요.');
                                        return;
                                    }
                                    setActiveTab('drills');
                                }}
                                className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'drills'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-white'
                                    }`}
                            >
                                🎁 보너스 드릴
                            </button>
                        </div>

                        <div className="p-6">
                            {activeTab === 'basic' ? (
                                <div className="space-y-6 max-w-3xl">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">강좌 제목</label>
                                        <input
                                            type="text"
                                            value={courseData.title}
                                            onChange={e => setCourseData({ ...courseData, title: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="예: 완벽한 암바 마스터 클래스"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">설명</label>
                                        <textarea
                                            value={courseData.description}
                                            onChange={e => setCourseData({ ...courseData, description: e.target.value })}
                                            rows={4}
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="강좌에 대한 설명을 입력하세요..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">카테고리</label>
                                            <select
                                                value={courseData.category}
                                                onChange={e => setCourseData({ ...courseData, category: e.target.value as VideoCategory })}
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                {Object.values(VideoCategory).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">난이도</label>
                                            <select
                                                value={courseData.difficulty}
                                                onChange={e => setCourseData({ ...courseData, difficulty: e.target.value as Difficulty })}
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                {Object.values(Difficulty).map(diff => (
                                                    <option key={diff} value={diff}>{diff}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">가격 (₩)</label>
                                            <input
                                                type="number"
                                                value={courseData.price}
                                                onChange={e => setCourseData({ ...courseData, price: Number(e.target.value) })}
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <div className="mt-3 flex items-start">
                                                <div className="flex items-center h-5">
                                                    <input
                                                        type="checkbox"
                                                        id="subscriptionExcluded"
                                                        checked={courseData.isSubscriptionExcluded || false}
                                                        onChange={e => setCourseData({ ...courseData, isSubscriptionExcluded: e.target.checked })}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-slate-950"
                                                    />
                                                </div>
                                                <div className="ml-2 text-sm">
                                                    <label htmlFor="subscriptionExcluded" className="font-medium text-slate-300">구독 제외 상품 (단품 구매 전용)</label>
                                                    <p className="text-slate-500">체크하면 구독자도 무료로 볼 수 없으며, 반드시 따로 구매해야 합니다.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">썸네일 이미지</label>
                                            <ImageUploader
                                                currentImageUrl={courseData.thumbnailUrl}
                                                onUploadComplete={(url) => setCourseData({ ...courseData, thumbnailUrl: url })}
                                            />
                                            <div className="mt-3">
                                                <button
                                                    type="button"
                                                    onClick={autoCaptureThumbnail}
                                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                                >
                                                    첫 번째 레슨에서 자동 캡처
                                                </button>
                                                <p className="text-xs text-slate-500 mt-2">
                                                    썸네일을 업로드하지 않으면 첫 번째 레슨 영상에서 자동으로 캡처됩니다
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : activeTab === 'curriculum' ? (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-lg text-white">레슨 목록</h3>
                                        <button
                                            onClick={() => setEditingLesson({ title: '', description: '', length: '10:00', difficulty: Difficulty.Beginner })}
                                            className="flex items-center gap-2 text-blue-400 hover:bg-blue-900/20 px-4 py-2 rounded-lg transition-colors font-medium"
                                        >
                                            <Plus className="w-4 h-4" />
                                            레슨 추가
                                        </button>
                                        <button
                                            onClick={handleOpenImportModal}
                                            className="flex items-center gap-2 text-slate-300 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors font-medium border border-slate-700 ml-2"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            기존 레슨 가져오기
                                        </button>
                                    </div>

                                    <div className="space-y-3 mb-8">
                                        {lessons.map((lesson, index) => (
                                            <div key={lesson.id} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-800 group">
                                                <div className="text-slate-500 cursor-grab">
                                                    <GripVertical className="w-5 h-5" />
                                                </div>
                                                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600 font-bold text-slate-300 text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-grow">
                                                    <h4 className="font-bold text-white">{lesson.title}</h4>
                                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                        <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {lesson.length}</span>
                                                        <span>{lesson.difficulty}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingLesson(lesson)}
                                                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLesson(lesson.id)}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {lessons.length === 0 && (
                                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                                                아직 등록된 레슨이 없습니다.
                                            </div>
                                        )}
                                    </div>

                                    {editingLesson && (
                                        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                                            <div className="bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto border border-slate-800">
                                                <h3 className="text-xl font-bold mb-4 text-white">{editingLesson.id ? '레슨 수정' : '새 레슨 추가'}</h3>

                                                <div className="space-y-4">
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
                                                            alert('업로드가 완료되었습니다! 내용을 확인하고 저장 버튼을 눌러주세요.');
                                                        }}
                                                    />

                                                    {editingLesson.vimeoUrl && (
                                                        <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                                                            <p className="text-sm text-green-400 font-medium flex items-center gap-2">
                                                                <CheckCircle className="w-4 h-4" />
                                                                영상 준비 완료
                                                            </p>
                                                            <p className="text-xs text-green-500 mt-1">
                                                                ID: {editingLesson.vimeoUrl} | 길이: {editingLesson.length}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <form onSubmit={handleSaveLesson} className="space-y-4 pt-4 border-t border-slate-800">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-300 mb-1">제목</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={editingLesson.title}
                                                                onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-300 mb-1">설명</label>
                                                            <textarea
                                                                value={editingLesson.description}
                                                                onChange={e => setEditingLesson({ ...editingLesson, description: e.target.value })}
                                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                                                                rows={3}
                                                            />
                                                        </div>

                                                        <div className="flex justify-end gap-3 mt-6">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingLesson(null)}
                                                                className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg"
                                                            >
                                                                취소
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                                disabled={!editingLesson.vimeoUrl}
                                                            >
                                                                저장
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Import Lesson Modal */}
                                    {showImportModal && (
                                        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                                            <div className="bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] flex flex-col border border-slate-800">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-xl font-bold text-white">기존 레슨 가져오기</h3>
                                                    <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                                                        <X className="w-6 h-6" />
                                                    </button>
                                                </div>

                                                <div className="flex-1 overflow-y-auto min-h-0 mb-4 space-y-2 pr-2">
                                                    {creatorLessons.length === 0 ? (
                                                        <p className="text-slate-500 text-center py-8">가져올 수 있는 레슨이 없습니다.</p>
                                                    ) : (
                                                        creatorLessons.map(lesson => (
                                                            <div
                                                                key={lesson.id}
                                                                onClick={() => setSelectedImportLesson(lesson)}
                                                                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-colors ${selectedImportLesson?.id === lesson.id
                                                                    ? 'bg-blue-900/30 border-blue-500'
                                                                    : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                                                                    }`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedImportLesson?.id === lesson.id ? 'border-blue-500' : 'border-slate-600'
                                                                    }`}>
                                                                    {selectedImportLesson?.id === lesson.id && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="text-white font-medium">{lesson.title}</h4>
                                                                    <div className="flex gap-2 text-xs text-slate-400">
                                                                        <span>{lesson.length}</span>
                                                                        <span>•</span>
                                                                        <span>{lesson.difficulty}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                                    <button
                                                        onClick={() => setShowImportModal(false)}
                                                        className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={handleImportLesson}
                                                        disabled={!selectedImportLesson}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        선택한 레슨 가져오기
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : activeTab === 'drills' ? (
                                <div>
                                    <div className="mb-6">
                                        <h3 className="font-bold text-lg text-white mb-2">보너스 드릴 설정</h3>
                                        <p className="text-sm text-slate-400">
                                            이 강좌를 구매한 유저에게 자동으로 제공될 드릴을 선택하세요. 선택한 드릴은 무료로 지급됩니다.
                                        </p>
                                    </div>

                                    {bundledDrills.length > 0 && (
                                        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                            <h4 className="text-sm font-medium text-blue-400 mb-2">✅ 연결된 드릴 ({bundledDrills.length}개)</h4>
                                            <div className="space-y-2">
                                                {bundledDrills.map(drill => (
                                                    <div key={drill.id} className="flex items-center gap-3 text-sm text-slate-300">
                                                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                                        <span className="flex-1">{drill.title}</span>
                                                        <span className="text-xs text-slate-500">{drill.category}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {loadingDrills ? (
                                        <div className="text-center py-12 text-slate-500">
                                            로딩 중...
                                        </div>
                                    ) : availableDrills.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                                            등록된 드릴이 없습니다. 먼저 드릴을 만들어주세요.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {availableDrills.map(drill => {
                                                const isBundled = bundledDrills.some(d => d.id === drill.id);
                                                return (
                                                    <div
                                                        key={drill.id}
                                                        onClick={() => toggleDrillBundle(drill)}
                                                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${isBundled
                                                            ? 'border-blue-500 bg-blue-900/20 ring-1 ring-blue-500'
                                                            : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 ${isBundled
                                                            ? 'bg-blue-500 border-blue-500'
                                                            : 'border-slate-600 bg-slate-800'
                                                            }`}>
                                                            {isBundled && (
                                                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-white truncate">{drill.title}</h4>
                                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{drill.description}</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                                                                    {drill.category}
                                                                </span>
                                                                {drill.duration && (
                                                                    <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                                                                        {drill.duration}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                                                                    {drill.difficulty}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="w-16 h-16 rounded bg-slate-800 flex-shrink-0 overflow-hidden">
                                                            {drill.thumbnailUrl && (
                                                                <img src={drill.thumbnailUrl} alt="" className="w-full h-full object-cover" />
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
                </div>
            );
        };
