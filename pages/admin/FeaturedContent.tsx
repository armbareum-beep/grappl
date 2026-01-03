import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Star, Upload, Plus, Shield, Users } from 'lucide-react';
import { getCourses, getCreators, getFeaturedContent, updateFeaturedContent, uploadHeroImage } from '../../lib/api';
import { Course, Creator } from '../../types';

export const FeaturedContent: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [creators, setCreators] = useState<Creator[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const [coursesData, creatorsData, featuredData] = await Promise.all([
                    getCourses(),
                    getCreators(),
                    getFeaturedContent()
                ]);

                setCourses(coursesData);
                setCreators(creatorsData);

                if (featuredData.data) {
                    setSelectedCourseIds(featuredData.data.featuredCourseIds || []);
                    setSelectedCreatorIds(featuredData.data.featuredCreatorIds || []);
                    setHeroImageUrl(featuredData.data.heroImageUrl || '');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const toggleCourse = (courseId: string) => {
        setSelectedCourseIds(prev => {
            if (prev.includes(courseId)) {
                return prev.filter(id => id !== courseId);
            } else if (prev.length < 3) {
                return [...prev, courseId];
            }
            return prev;
        });
    };

    const toggleCreator = (creatorId: string) => {
        setSelectedCreatorIds(prev => {
            if (prev.includes(creatorId)) {
                return prev.filter(id => id !== creatorId);
            } else if (prev.length < 2) {
                return [...prev, creatorId];
            }
            return prev;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateFeaturedContent({
                featuredCourseIds: selectedCourseIds,
                featuredCreatorIds: selectedCreatorIds,
                heroImageUrl
            });
            alert('홈 화면 설정이 저장되었습니다! 🎉');
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
            console.error('Save error:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 gap-4">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Accessing Home Configuration...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            {/* Header Section */}
            <div className="relative overflow-hidden border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="absolute top-0 right-0 w-[500px] h-[100px] bg-violet-600/5 blur-[80px] -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <Link to="/admin" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-white hover:border-zinc-700 transition-all group">
                                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter text-white">홈 화면 큐레이션</h1>
                                <p className="text-zinc-500 font-medium text-sm">메인 히어로 이미지와 추천 콘텐츠를 정교하게 구성합니다.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-violet-700 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-500/30 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'CONFIGURING...' : 'APPLY SETTINGS'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
                {/* Hero Image Section */}
                <section className="bg-zinc-900/20 rounded-[2.5rem] border border-zinc-800/50 p-10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                            <Upload className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-white mb-1">메인 히어로 비주얼</h2>
                            <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Primary Landing Visual Asset</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10 items-start">
                        <div className="md:col-span-2 space-y-6">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Asset Reference URL</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={heroImageUrl}
                                        readOnly
                                        placeholder="이미지 업로드 시 자동으로 URL이 생성됩니다."
                                        className="w-full px-6 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-400 font-mono text-sm focus:outline-none"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center justify-center gap-3 w-full px-8 py-5 bg-zinc-900 border border-zinc-800 border-dashed rounded-[2rem] cursor-pointer hover:bg-zinc-800/50 hover:border-violet-500/30 transition-all group">
                                <Plus className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                                <span className="font-black uppercase tracking-widest text-[10px] text-zinc-500 group-hover:text-white transition-colors">Replace Visual Asset</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                            setSaving(true);
                                            const { url, error } = await uploadHeroImage(file);
                                            if (error) throw error;
                                            if (url) setHeroImageUrl(url);
                                        } catch (err) {
                                            console.error('Upload failed:', err);
                                            alert('이미지 업로드에 실패했습니다.');
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <div className="relative group rounded-[2rem] overflow-hidden border border-zinc-800 bg-zinc-950 aspect-[16/9] flex items-center justify-center">
                            {heroImageUrl ? (
                                <img src={heroImageUrl} alt="Hero Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                                <div className="text-center space-y-2">
                                    <Star className="w-8 h-8 text-zinc-800 mx-auto" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700">Preview Unavailable</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Featured Courses Section */}
                <section className="bg-zinc-900/20 rounded-[2.5rem] border border-zinc-800/50 p-10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                    <Star className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight text-white mb-1">인기 강좌 큐레이션</h2>
                                    <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Hand-picked Featured Courses</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-3">
                            <div className="flex gap-1.5">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${i <= selectedCourseIds.length ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-zinc-800'}`} />
                                ))}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{selectedCourseIds.length} / 3 SELECETED</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => {
                            const isSelected = selectedCourseIds.includes(course.id);
                            const selectionIndex = selectedCourseIds.indexOf(course.id);

                            return (
                                <div
                                    key={course.id}
                                    onClick={() => toggleCourse(course.id)}
                                    className={`relative cursor-pointer rounded-[2rem] border transition-all p-5 group overflow-hidden ${isSelected
                                        ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
                                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-4 right-4 w-8 h-8 bg-amber-500 text-zinc-950 rounded-full flex items-center justify-center text-sm font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] z-10">
                                            {selectionIndex + 1}
                                        </div>
                                    )}
                                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-5 border border-zinc-800">
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent" />
                                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-white/80 bg-zinc-950/40 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 uppercase tracking-widest">
                                                {course.price === 0 ? 'COMPLEMENTARY' : `KRW ${course.price.toLocaleString()}`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-extrabold text-white line-clamp-1 group-hover:text-amber-200 transition-colors uppercase tracking-tight text-sm">{course.title}</h3>
                                        <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed font-medium">{course.description}</p>
                                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50 mt-4">
                                            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-black text-zinc-500">
                                                {course.creatorName.substring(0, 1)}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{course.creatorName}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Featured Creators Section */}
                <section className="bg-zinc-900/20 rounded-[2.5rem] border border-zinc-800/50 p-10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                                    <Shield className="w-6 h-6 text-violet-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight text-white mb-1">대표 인스트럭터 큐레이션</h2>
                                    <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Exclusive Platform Masters</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-3">
                            <div className="flex gap-1.5">
                                {[1, 2].map(i => (
                                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${i <= selectedCreatorIds.length ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'bg-zinc-800'}`} />
                                ))}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{selectedCreatorIds.length} / 2 SELECETED</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {creators.map(creator => {
                            const isSelected = selectedCreatorIds.includes(creator.id);
                            const selectionIndex = selectedCreatorIds.indexOf(creator.id);

                            return (
                                <div
                                    key={creator.id}
                                    onClick={() => toggleCreator(creator.id)}
                                    className={`relative cursor-pointer rounded-[2rem] border transition-all p-8 flex items-center gap-8 group overflow-hidden ${isSelected
                                        ? 'border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20'
                                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-6 right-6 w-8 h-8 bg-violet-500 text-white rounded-full flex items-center justify-center text-sm font-black shadow-[0_0_15px_rgba(139,92,246,0.4)] z-10">
                                            {selectionIndex + 1}
                                        </div>
                                    )}
                                    <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden border border-zinc-800 flex-shrink-0 relative group-hover:border-violet-500/30 transition-all">
                                        <img
                                            src={creator.profileImage}
                                            alt={creator.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/20 to-transparent" />
                                    </div>
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black tracking-tight text-white group-hover:text-violet-300 transition-colors uppercase">{creator.name}</h3>
                                            <Shield className="w-3.5 h-3.5 text-violet-500/50" />
                                        </div>
                                        <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed font-medium">{creator.bio}</p>
                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 rounded-lg border border-zinc-800">
                                                <Users className="w-3 h-3 text-zinc-600" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{creator.subscriberCount.toLocaleString()} Members</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-violet-600/5 blur-[40px] rounded-full group-hover:bg-violet-600/10 transition-all" />
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
};
