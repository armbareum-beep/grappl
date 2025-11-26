import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getUserSkills,
    upsertUserSkill,
    getUserCourses,
    getCourses,
    deleteUserSkill,
    getSkillSubcategories,
    createSkillSubcategory,
    deleteSkillSubcategory,
    getCourseProgress,
    addXP,
    updateQuestProgress
} from '../../lib/api';
import { UserSkill, SkillCategory, SkillStatus, SkillSubcategory, Course } from '../../types';
import { Shield, Swords, Users, Mountain, Target, User2, Plus, Search, X, FolderPlus, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CombatPowerRadar } from '../CombatPowerRadar';

const CATEGORIES: { name: SkillCategory; icon: any; color: string }[] = [
    { name: 'Standing', icon: User2, color: 'bg-indigo-500' },
    { name: 'Guard', icon: Shield, color: 'bg-blue-500' },
    { name: 'Guard Pass', icon: Swords, color: 'bg-purple-500' },
    { name: 'Side', icon: Users, color: 'bg-green-500' },
    { name: 'Mount', icon: Mountain, color: 'bg-orange-500' },
    { name: 'Back', icon: Target, color: 'bg-red-500' }
];

export const SkillTreeTab: React.FC = () => {
    const { user } = useAuth();
    const [skills, setSkills] = useState<UserSkill[]>([]);
    const [subcategories, setSubcategories] = useState<SkillSubcategory[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [purchasedCourseIds, setPurchasedCourseIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('Standing');
    const [showCourseSelector, setShowCourseSelector] = useState(false);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
    const [newSubcategoryName, setNewSubcategoryName] = useState('');
    const [showMasteryModal, setShowMasteryModal] = useState(false);
    const [masteryData, setMasteryData] = useState<{ courseTitle: string; xpEarned: number; leveledUp: boolean; newLevel?: number } | null>(null);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        try {
            if (!user) {
                const courses = await getCourses();
                setAllCourses(courses);
                setLoading(false);
                return;
            }
            const [skills, purchasedCourses, allCourses, subcats] = await Promise.all([
                getUserSkills(user.id),
                getUserCourses(user.id),
                getCourses(),
                getSkillSubcategories(user.id)
            ]);

            setSkills(skills);
            setPurchasedCourseIds(purchasedCourses.map(c => c.id));
            setAllCourses(allCourses);
            setSubcategories(subcats);
            setLoading(false);
        } catch (error) {
            console.error('Error loading skill tree data:', error);
            setLoading(false);
        }
    };

    const handleCreateSubcategory = async () => {
        if (!user || !newSubcategoryName.trim()) return;

        const { data, error } = await createSkillSubcategory(user.id, selectedCategory, newSubcategoryName.trim());
        if (!error && data) {
            setSubcategories([...subcategories, data]);
            setNewSubcategoryName('');
            setShowSubcategoryForm(false);
        }
    };

    const handleDeleteSubcategory = async (subcategoryId: string) => {
        if (!confirm('이 서브카테고리와 포함된 모든 강좌를 삭제하시겠습니까?')) return;

        const { error } = await deleteSkillSubcategory(subcategoryId);
        if (!error) {
            await loadData();
        }
    };

    const handleAddCourse = async (courseId: string) => {
        if (!user) return;

        await upsertUserSkill(user.id, selectedCategory, courseId, 'learning', selectedSubcategoryId || undefined);

        // Award XP for adding a skill
        const { xpEarned, leveledUp, newLevel } = await addXP(user.id, 20, 'add_skill', courseId);
        await loadData();
    };

    const handleToggleStatus = async (skill: UserSkill) => {
        if (!user) return;

        const newStatus: SkillStatus = skill.status === 'learning' ? 'mastered' : 'learning';

        // If trying to master, check ownership and completion
        if (newStatus === 'mastered') {
            const isPurchased = purchasedCourseIds.includes(skill.courseId);
            if (!isPurchased) {
                alert('강좌를 구매해야 마스터할 수 있습니다.');
                return;
            }

            const progress = await getCourseProgress(user.id, skill.courseId);
            if (progress.percentage < 100) {
                alert('강좌를 100% 수강해야 마스터할 수 있습니다.');
                return;
            }

            // Award XP for mastering!
            const { xpEarned, leveledUp, newLevel } = await addXP(user.id, 100, 'master_skill', skill.courseId);

            // Show celebration modal
            setMasteryData({
                courseTitle: skill.courseTitle || '강좌',
                xpEarned,
                leveledUp,
                newLevel
            });
            setShowMasteryModal(true);
        }

        await upsertUserSkill(user.id, skill.category, skill.courseId, newStatus, skill.subcategoryId);
        await loadData();
    };

    const handleRemoveCourse = async (skillId: string) => {
        if (!user || !confirm('이 강좌를 스킬 트리에서 제거하시겠습니까?')) return;
        const { error } = await deleteUserSkill(skillId);
        if (!error) {
            await loadData();
        }
    };

    const categorySkills = skills.filter(s => s.category === selectedCategory);
    const categorySubcategories = subcategories.filter(s => s.category === selectedCategory);
    const skillCourseIds = skills.map(s => s.courseId);

    // Filter courses by category and exclude already added ones
    const availableCourses = allCourses.filter(c =>
        !skillCourseIds.includes(c.id) &&
        c.category === selectedCategory
    );

    // Filter by search term
    const filteredCourses = availableCourses.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.creatorName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group skills by subcategory
    const skillsWithoutSubcategory = categorySkills.filter(s => !s.subcategoryId);
    const skillsBySubcategory = categorySubcategories.map(subcat => ({
        subcategory: subcat,
        skills: categorySkills.filter(s => s.subcategoryId === subcat.id)
    }));

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">스킬 로드맵</h2>
                <p className="text-slate-400 mb-6">구매한 강좌를 챕터별로 정리하고 학습 진행 상황을 추적하세요</p>
            </div>

            {/* Combat Power Radar Chart */}
            {user && (
                <CombatPowerRadar skills={skills} />
            )}

            {/* Dashboard Overview */}
            {user && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Total Skills */}
                    <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-2xl border border-blue-800/30 p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-white">{skills.length}</div>
                                <div className="text-xs text-blue-300">등록된 강좌</div>
                            </div>
                        </div>
                    </div>

                    {/* Mastered Skills */}
                    <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-2xl border border-green-800/30 p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-white">
                                    {skills.filter(s => s.status === 'mastered').length}
                                </div>
                                <div className="text-xs text-green-300">마스터 완료</div>
                            </div>
                        </div>
                    </div>

                    {/* Learning Skills */}
                    <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-2xl border border-yellow-800/30 p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                <Target className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-white">
                                    {skills.filter(s => s.status === 'learning').length}
                                </div>
                                <div className="text-xs text-yellow-300">수련 중</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Tracking - Courses Needing Attention */}
            {user && (
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-8">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-orange-400" />
                        집중 수련 필요
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {skills
                            .filter(s => s.status === 'learning')
                            .slice(0, 6)
                            .map((skill) => (
                                <Link
                                    key={skill.id}
                                    to={`/courses/${skill.courseId}`}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-orange-900/20 hover:bg-orange-900/30 border border-orange-800/30 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">
                                        !
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white font-medium truncate">{skill.courseTitle || '강좌'}</div>
                                        <div className="text-xs text-slate-400">수련 중</div>
                                    </div>
                                </Link>
                            ))}
                        {skills.filter(s => s.status === 'learning').length === 0 && (
                            <p className="text-slate-400 text-sm col-span-2 text-center py-4">
                                모든 강좌를 마스터했습니다! 🎉
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Category Selector */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.name;
                    const categoryCount = skills.filter(s => s.category === cat.name).length;
                    const masteredCount = skills.filter(s => s.category === cat.name && s.status === 'mastered').length;

                    return (
                        <button
                            key={cat.name}
                            onClick={() => {
                                setSelectedCategory(cat.name);
                                setShowCourseSelector(false);
                                setShowSubcategoryForm(false);
                                setSearchTerm('');
                            }}
                            className={`p-3 md:p-4 rounded-xl border-2 transition-all ${isSelected
                                ? `${cat.color} border-transparent text-white shadow-lg`
                                : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                                }`}
                        >
                            <Icon className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2" />
                            <div className="text-xs md:text-sm font-semibold whitespace-nowrap">{cat.name}</div>
                            <div className="text-[10px] md:text-xs mt-1 opacity-80">
                                {masteredCount}/{categoryCount}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                    onClick={() => {
                        setShowSubcategoryForm(!showSubcategoryForm);
                        setShowCourseSelector(false);
                    }}
                    className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
                >
                    <FolderPlus className="w-5 h-5" />
                    서브카테고리 추가
                </button>
                <button
                    onClick={() => {
                        console.log('Available courses:', availableCourses);
                        console.log('All courses:', allCourses);
                        console.log('Selected category:', selectedCategory);
                        setShowCourseSelector(!showCourseSelector);
                        setShowSubcategoryForm(false);
                    }}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" />
                    강좌 추가 ({availableCourses.length})
                </button>
            </div>

            {/* Subcategory Form */}
            {showSubcategoryForm && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
                    <h3 className="font-semibold text-white mb-4">새 서브카테고리 추가</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        예: Guard 카테고리에 "Open Guard", "Half Guard", "Closed Guard" 등의 서브카테고리를 만들 수 있습니다.
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newSubcategoryName}
                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                            placeholder="예: Open Guard, Half Guard, Closed Guard..."
                            className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateSubcategory()}
                        />
                        <button
                            onClick={handleCreateSubcategory}
                            disabled={!newSubcategoryName.trim()}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            추가
                        </button>
                    </div>
                </div>
            )}

            {/* Course Selector with Search */}
            {showCourseSelector && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
                    <h3 className="font-semibold text-white mb-4">{selectedCategory} 강좌 선택</h3>

                    {/* Subcategory Selector */}
                    {categorySubcategories.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                서브카테고리 (선택사항)
                            </label>
                            <select
                                value={selectedSubcategoryId || ''}
                                onChange={(e) => setSelectedSubcategoryId(e.target.value || null)}
                                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">서브카테고리 없음</option>
                                {categorySubcategories.map((subcat) => (
                                    <option key={subcat.id} value={subcat.id}>
                                        {subcat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="강좌 검색..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Course List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredCourses.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-400 mb-2">
                                    {searchTerm ? '검색 결과가 없습니다.' : `${selectedCategory} 카테고리에 추가할 수 있는 강좌가 없습니다.`}
                                </p>
                                <p className="text-xs text-slate-500">
                                    전체 강좌: {allCourses.length}개 | 이미 추가됨: {skillCourseIds.length}개
                                </p>
                                {allCourses.length > 0 && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        💡 다른 카테고리를 선택하거나 새 강좌를 구매해보세요
                                    </p>
                                )}
                            </div>
                        ) : (
                            filteredCourses.map((course) => {
                                const isPurchased = purchasedCourseIds.includes(course.id);
                                return (
                                    <button
                                        key={course.id}
                                        onClick={() => handleAddCourse(course.id)}
                                        className="w-full text-left p-3 rounded-lg border border-slate-700 hover:border-blue-500 hover:bg-blue-900/20 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-white">{course.title}</div>
                                                <div className="text-xs text-slate-400 mt-1">{course.creatorName}</div>
                                            </div>
                                            {!isPurchased && (
                                                <span className="text-xs px-2 py-1 bg-amber-900/30 text-amber-400 rounded-full font-medium border border-amber-800/30">
                                                    미구매
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Skills organized by subcategory */}
            <div className="space-y-6">
                {/* Skills without subcategory */}
                {skillsWithoutSubcategory.length > 0 && (
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                        <h3 className="font-semibold text-white mb-4">
                            {selectedCategory} 강좌 ({skillsWithoutSubcategory.length})
                        </h3>
                        <div className="space-y-2">
                            {skillsWithoutSubcategory.map((skill) => (
                                <SkillCard
                                    key={skill.id}
                                    skill={skill}
                                    onToggleStatus={handleToggleStatus}
                                    onRemove={handleRemoveCourse}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Subcategories with skills */}
                {skillsBySubcategory.map(({ subcategory, skills: subcatSkills }) => (
                    <div key={subcategory.id} className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white">
                                📁 {subcategory.name} ({subcatSkills.length})
                            </h3>
                            <button
                                onClick={() => handleDeleteSubcategory(subcategory.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="서브카테고리 삭제"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {subcatSkills.length === 0 ? (
                            <p className="text-slate-400 text-center py-4 text-sm">
                                아직 등록된 강좌가 없습니다.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {subcatSkills.map((skill) => (
                                    <SkillCard
                                        key={skill.id}
                                        skill={skill}
                                        onToggleStatus={handleToggleStatus}
                                        onRemove={handleRemoveCourse}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Empty state */}
                {categorySkills.length === 0 && (
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
                        <p className="text-slate-300 mb-4">
                            아직 등록된 강좌가 없습니다.
                        </p>
                        <p className="text-sm text-slate-400">
                            서브카테고리를 만들고 강좌를 추가해보세요!
                        </p>
                    </div>
                )}
            </div>

            {/* Mastery Celebration Modal */}
            {showMasteryModal && masteryData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center relative overflow-hidden">
                        {/* Background effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-transparent to-yellow-100 opacity-50" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-green-400/30 blur-[100px] rounded-full" />

                        {/* Confetti effect */}
                        <div className="absolute inset-0 pointer-events-none">
                            {[...Array(20)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-confetti"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: '-10px',
                                        animationDelay: `${Math.random() * 0.5}s`,
                                        animationDuration: `${1 + Math.random()}s`
                                    }}
                                />
                            ))}
                        </div>

                        <div className="relative z-10">
                            {/* Trophy Icon */}
                            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow shadow-lg">
                                <Trophy className="w-12 h-12 text-white" />
                            </div>

                            {/* Title */}
                            <h2 className="text-3xl font-black text-slate-900 mb-2">
                                마스터 완료! 🎉
                            </h2>
                            <p className="text-slate-600 mb-6">
                                {masteryData.courseTitle}
                            </p>

                            {/* XP Earned */}
                            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-xl p-4 mb-6">
                                <div className="text-sm text-yellow-800 mb-1">획득 XP</div>
                                <div className="text-4xl font-black text-yellow-900">
                                    +{masteryData.xpEarned} XP
                                </div>
                            </div>

                            {/* Level Up */}
                            {masteryData.leveledUp && masteryData.newLevel && (
                                <div className="bg-gradient-to-r from-purple-100 to-purple-200 rounded-xl p-4 mb-6 animate-pulse">
                                    <div className="text-sm text-purple-800 mb-1">레벨 업!</div>
                                    <div className="text-3xl font-black text-purple-900">
                                        Lv.{masteryData.newLevel}
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={async () => {
                                        const { createFeedPost } = await import('../../lib/api');
                                        const feedContent = `🎉 강좌 마스터 완료!\\n\\n${masteryData.courseTitle}\\n\\n획득 XP: +${masteryData.xpEarned}${masteryData.leveledUp ? `\\n레벨 업! Lv.${masteryData.newLevel}` : ''}`;

                                        await createFeedPost({
                                            userId: user!.id,
                                            content: feedContent,
                                            type: 'mastery',
                                            metadata: {
                                                courseTitle: masteryData.courseTitle,
                                                xpEarned: masteryData.xpEarned,
                                                leveledUp: masteryData.leveledUp,
                                                newLevel: masteryData.newLevel
                                            }
                                        });

                                        setShowMasteryModal(false);
                                        setMasteryData(null);
                                        alert('피드에 공유되었습니다!');
                                    }}
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
                                >
                                    피드에 공유
                                </button>
                                <button
                                    onClick={() => {
                                        setShowMasteryModal(false);
                                        setMasteryData(null);
                                    }}
                                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes confetti {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                
                @keyframes bounce-slow {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-20px);
                    }
                }
                
                .animate-confetti {
                    animation: confetti linear forwards;
                }
                
                .animate-bounce-slow {
                    animation: bounce-slow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

// Skill Card Component
const SkillCard: React.FC<{
    skill: UserSkill;
    onToggleStatus: (skill: UserSkill) => void;
    onRemove: (skillId: string) => void;
}> = ({ skill, onToggleStatus, onRemove }) => {
    return (
        <div
            className={`p-4 rounded-lg border-2 transition-all ${skill.status === 'mastered'
                ? 'bg-green-900/20 border-green-700'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                    <Link
                        to={`/courses/${skill.courseId}`}
                        className={`font-medium hover:underline block ${skill.status === 'mastered' ? 'text-green-400' : 'text-white'
                            }`}
                    >
                        {skill.courseTitle || '강좌'}
                    </Link>
                    {skill.creatorName && (
                        <p className="text-xs text-slate-400 mt-1">{skill.creatorName}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onToggleStatus(skill)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap ${skill.status === 'mastered'
                            ? 'bg-green-600 text-white'
                            : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/30'
                            }`}
                    >
                        {skill.status === 'mastered' ? '✓ 마스터' : '수련 중'}
                    </button>
                    <button
                        onClick={() => onRemove(skill.id)}
                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                        title="제거"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
