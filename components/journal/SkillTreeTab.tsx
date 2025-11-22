import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSkills, upsertUserSkill, getUserCourses, deleteUserSkill } from '../../lib/api';
import { UserSkill, SkillCategory, SkillStatus, Course } from '../../types';
import { Shield, Swords, Users, Mountain, Target, User2, Plus, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    const [myCourses, setMyCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('Standing');
    const [showCourseSelector, setShowCourseSelector] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        const [skillsRes, coursesRes] = await Promise.all([
            getUserSkills(user.id),
            getUserCourses(user.id)
        ]);

        if (skillsRes.data) setSkills(skillsRes.data);
        if (coursesRes) setMyCourses(coursesRes);
        setLoading(false);
    };

    const handleAddCourse = async (courseId: string) => {
        if (!user) return;

        await upsertUserSkill(user.id, selectedCategory, courseId, 'learning');
        setShowCourseSelector(false);
        setSearchTerm('');
        await loadData();
    };

    const handleToggleStatus = async (skill: UserSkill) => {
        if (!user) return;
        const newStatus: SkillStatus = skill.status === 'learning' ? 'mastered' : 'learning';
        await upsertUserSkill(user.id, skill.category, skill.courseId, newStatus);
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
    const skillCourseIds = skills.map(s => s.courseId);

    // Filter courses by category and exclude already added ones
    const availableCourses = myCourses.filter(c =>
        !skillCourseIds.includes(c.id) &&
        c.category === selectedCategory
    );

    // Filter by search term
    const filteredCourses = availableCourses.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.creatorName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <h2 className="text-2xl font-bold text-slate-900 mb-2">스킬 로드맵</h2>
                <p className="text-slate-600">구매한 강좌를 챕터별로 정리하고 학습 진행 상황을 추적하세요</p>
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-6 gap-3 mb-8">
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
                                setSearchTerm('');
                            }}
                            className={`p-4 rounded-xl border-2 transition-all ${isSelected
                                ? `${cat.color} border-transparent text-white shadow-lg`
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <Icon className="w-8 h-8 mx-auto mb-2" />
                            <div className="text-sm font-semibold">{cat.name}</div>
                            <div className="text-xs mt-1 opacity-80">
                                {masteredCount}/{categoryCount}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Add Course Button */}
            {availableCourses.length > 0 && (
                <div className="mb-6">
                    <button
                        onClick={() => setShowCourseSelector(!showCourseSelector)}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        강좌 추가하기 ({availableCourses.length})
                    </button>
                </div>
            )}

            {/* Course Selector with Search */}
            {showCourseSelector && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                    <h3 className="font-semibold text-slate-900 mb-4">{selectedCategory} 강좌 선택</h3>

                    {/* Search Input */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="강좌 검색..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Course List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredCourses.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">
                                {searchTerm ? '검색 결과가 없습니다.' : `${selectedCategory} 카테고리에 추가할 수 있는 강좌가 없습니다.`}
                            </p>
                        ) : (
                            filteredCourses.map((course) => (
                                <button
                                    key={course.id}
                                    onClick={() => handleAddCourse(course.id)}
                                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                >
                                    <div className="font-medium text-slate-900">{course.title}</div>
                                    <div className="text-xs text-slate-500 mt-1">{course.creatorName}</div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Course List */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">
                    {selectedCategory} 강좌 ({categorySkills.length})
                </h3>
                {categorySkills.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        아직 등록된 강좌가 없습니다. 위에서 강좌를 추가해보세요!
                    </p>
                ) : (
                    <div className="space-y-2">
                        {categorySkills.map((skill) => (
                            <div
                                key={skill.id}
                                className={`p-4 rounded-lg border-2 transition-all ${skill.status === 'mastered'
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <Link
                                        to={`/courses/${skill.courseId}`}
                                        className={`font-medium hover:underline flex-1 ${skill.status === 'mastered' ? 'text-green-900' : 'text-slate-900'
                                            }`}
                                    >
                                        {skill.courseTitle || '강좌'}
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleStatus(skill)}
                                            className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap ${skill.status === 'mastered'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                        >
                                            {skill.status === 'mastered' ? '✓ 마스터' : '수련 중'}
                                        </button>
                                        <button
                                            onClick={() => handleRemoveCourse(skill.id)}
                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="제거"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
