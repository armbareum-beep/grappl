import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trophy, Users, Scale, Grid, Play, Eye, Edit2, Trash2,
    ChevronRight, ChevronDown, AlertCircle, Loader2, Check, X, Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import {
    fetchEventById,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchMatches,
    fetchRegistrations
} from '../../lib/api-events';
import { Event, CompetitionCategory, CompetitionMatch, EventRegistration } from '../../types';

const BELT_LEVELS = ['화이트', '블루', '퍼플', '브라운', '블랙', '오픈'];
const WEIGHT_CLASSES = ['루스터', '라이트페더', '페더', '라이트', '미들', '미디엄헤비', '헤비', '슈퍼헤비', '울트라헤비', '오픈', '어솔루트'];
const GENDERS = [
    { value: 'male', label: '남자' },
    { value: 'female', label: '여자' },
    { value: 'mixed', label: '혼성' },
];
const AGE_GROUPS = ['유소년', '청소년', '성인', '마스터1', '마스터2', '마스터3', '마스터4', '오픈'];

export const CompetitionManager: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const { user, isOrganizer, loading: authLoading } = useAuth();
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<Event | null>(null);
    const [categories, setCategories] = useState<CompetitionCategory[]>([]);
    const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [categoryMatches, setCategoryMatches] = useState<Record<string, CompetitionMatch[]>>({});

    // Modal state
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CompetitionCategory | null>(null);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        beltLevel: '',
        weightClass: '',
        gender: 'mixed',
        ageGroup: '',
        isTeamEvent: false,
        bracketType: 'single_elimination' as 'single_elimination' | 'double_elimination' | 'round_robin',
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!eventId) return;

            try {
                const [eventData, categoriesData, registrationsData] = await Promise.all([
                    fetchEventById(eventId),
                    fetchCategories(eventId),
                    fetchRegistrations(eventId, { status: 'confirmed' }),
                ]);

                setEvent(eventData);
                setCategories(categoriesData);
                setRegistrations(registrationsData);

                // Load matches for each category
                const matchesMap: Record<string, CompetitionMatch[]> = {};
                for (const cat of categoriesData) {
                    try {
                        const matches = await fetchMatches(cat.id);
                        matchesMap[cat.id] = matches;
                    } catch (err) {
                        console.error(`Failed to load matches for category ${cat.id}:`, err);
                        matchesMap[cat.id] = [];
                    }
                }
                setCategoryMatches(matchesMap);
            } catch (error) {
                console.error('Failed to load data:', error);
                toastError('데이터를 불러올 수 없습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [eventId]);

    const handleOpenCategoryModal = (category?: CompetitionCategory) => {
        if (category) {
            setEditingCategory(category);
            setCategoryForm({
                name: category.name,
                beltLevel: category.beltLevel || '',
                weightClass: category.weightClass || '',
                gender: category.gender || 'mixed',
                ageGroup: category.ageGroup || '',
                isTeamEvent: category.isTeamEvent,
                bracketType: category.bracketType,
            });
        } else {
            setEditingCategory(null);
            setCategoryForm({
                name: '',
                beltLevel: '',
                weightClass: '',
                gender: 'mixed',
                ageGroup: '',
                isTeamEvent: false,
                bracketType: 'single_elimination',
            });
        }
        setShowCategoryModal(true);
    };

    const handleSaveCategory = async () => {
        if (!eventId || !categoryForm.name.trim()) {
            toastError('카테고리 이름을 입력해주세요.');
            return;
        }

        setSaving(true);
        try {
            if (editingCategory) {
                const updated = await updateCategory(editingCategory.id, {
                    name: categoryForm.name,
                    beltLevel: categoryForm.beltLevel || undefined,
                    weightClass: categoryForm.weightClass || undefined,
                    gender: categoryForm.gender,
                    ageGroup: categoryForm.ageGroup || undefined,
                    isTeamEvent: categoryForm.isTeamEvent,
                    bracketType: categoryForm.bracketType,
                });
                setCategories(categories.map(c => c.id === editingCategory.id ? updated : c));
                success('카테고리가 수정되었습니다.');
            } else {
                const newCategory = await createCategory({
                    eventId,
                    name: categoryForm.name,
                    beltLevel: categoryForm.beltLevel || undefined,
                    weightClass: categoryForm.weightClass || undefined,
                    gender: categoryForm.gender,
                    ageGroup: categoryForm.ageGroup || undefined,
                    isTeamEvent: categoryForm.isTeamEvent,
                    bracketType: categoryForm.bracketType,
                });
                setCategories([...categories, newCategory]);
                setCategoryMatches({ ...categoryMatches, [newCategory.id]: [] });
                success('카테고리가 생성되었습니다.');
            }
            setShowCategoryModal(false);
        } catch (error: any) {
            toastError(error.message || '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm('이 카테고리를 삭제하시겠습니까? 모든 대진표 정보가 삭제됩니다.')) return;

        setDeleting(categoryId);
        try {
            await deleteCategory(categoryId);
            setCategories(categories.filter(c => c.id !== categoryId));
            const newMatchesMap = { ...categoryMatches };
            delete newMatchesMap[categoryId];
            setCategoryMatches(newMatchesMap);
            success('카테고리가 삭제되었습니다.');
        } catch (error: any) {
            toastError(error.message || '삭제 중 오류가 발생했습니다.');
        } finally {
            setDeleting(null);
        }
    };

    const toggleCategory = async (categoryId: string) => {
        if (expandedCategory === categoryId) {
            setExpandedCategory(null);
        } else {
            setExpandedCategory(categoryId);
        }
    };

    // Count participants per category based on belt/weight matching
    const getParticipantCount = (category: CompetitionCategory) => {
        return registrations.filter(r => {
            if (category.beltLevel && r.beltLevel !== category.beltLevel) return false;
            if (category.weightClass && r.weightClass !== category.weightClass) return false;
            return true;
        }).length;
    };

    const getMatchStats = (categoryId: string) => {
        const matches = categoryMatches[categoryId] || [];
        const total = matches.length;
        const completed = matches.filter(m => m.status === 'completed').length;
        const inProgress = matches.filter(m => m.status === 'in_progress').length;
        return { total, completed, inProgress };
    };

    if (authLoading || loading) {
        return <LoadingScreen message="대회 정보 불러오는 중..." />;
    }

    if (!user || !isOrganizer) {
        navigate('/login');
        return null;
    }

    if (!event || event.type !== 'competition') {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <Trophy className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">시합 이벤트가 아닙니다</h2>
                    <p className="text-zinc-400">대진표 관리는 시합 이벤트에서만 가능합니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 py-6 px-4 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">대진표 관리</h1>
                            <p className="text-sm text-zinc-400">{event.title}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            to={`/organizer/event/${eventId}/weigh-in`}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium text-sm transition-colors"
                        >
                            <Scale className="w-4 h-4" />
                            계체 관리
                        </Link>
                        <button
                            onClick={() => handleOpenCategoryModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            카테고리 추가
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-red-400">{categories.length}</div>
                        <div className="text-xs text-zinc-500">카테고리</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-amber-400">{registrations.length}</div>
                        <div className="text-xs text-zinc-500">확정 참가자</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">
                            {Object.values(categoryMatches).flat().filter(m => m.status === 'completed').length}
                        </div>
                        <div className="text-xs text-zinc-500">완료된 경기</div>
                    </div>
                </div>

                {/* Categories List */}
                {categories.length === 0 ? (
                    <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800/50 border-dashed rounded-2xl">
                        <Grid className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-400 mb-2">카테고리가 없습니다</h3>
                        <p className="text-zinc-500 mb-6">체급별, 띠별로 카테고리를 만들어 대진표를 구성하세요</p>
                        <button
                            onClick={() => handleOpenCategoryModal()}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            첫 카테고리 만들기
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {categories.map((category) => {
                            const isExpanded = expandedCategory === category.id;
                            const participantCount = getParticipantCount(category);
                            const matchStats = getMatchStats(category.id);

                            return (
                                <div
                                    key={category.id}
                                    className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
                                >
                                    {/* Category Header */}
                                    <div
                                        onClick={() => toggleCategory(category.id)}
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                category.isTeamEvent ? 'bg-blue-500/20' : 'bg-red-500/20'
                                            }`}>
                                                {category.isTeamEvent ? (
                                                    <Users className="w-5 h-5 text-blue-400" />
                                                ) : (
                                                    <Trophy className="w-5 h-5 text-red-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{category.name}</h3>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {category.beltLevel && (
                                                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                                                            {category.beltLevel}
                                                        </span>
                                                    )}
                                                    {category.weightClass && (
                                                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                                                            {category.weightClass}
                                                        </span>
                                                    )}
                                                    {category.gender && category.gender !== 'mixed' && (
                                                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                                                            {GENDERS.find(g => g.value === category.gender)?.label}
                                                        </span>
                                                    )}
                                                    {category.ageGroup && (
                                                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                                                            {category.ageGroup}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-sm font-medium">
                                                    {participantCount}명 참가
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {matchStats.completed}/{matchStats.total} 경기 완료
                                                </div>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronDown className="w-5 h-5 text-zinc-500" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-zinc-500" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="border-t border-zinc-800 p-4 bg-zinc-800/30">
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <Link
                                                    to={`/organizer/event/${eventId}/category/${category.id}/bracket`}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium transition-colors"
                                                >
                                                    <Grid className="w-4 h-4" />
                                                    대진표 편집
                                                </Link>
                                                <Link
                                                    to={`/organizer/event/${eventId}/category/${category.id}/matches`}
                                                    className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-sm font-medium transition-colors"
                                                >
                                                    <Play className="w-4 h-4" />
                                                    경기 진행
                                                </Link>
                                                <Link
                                                    to={`/scoreboard/${eventId}/${category.id}`}
                                                    target="_blank"
                                                    className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-sm font-medium transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    스코어보드
                                                </Link>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenCategoryModal(category);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-sm font-medium transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    수정
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteCategory(category.id);
                                                    }}
                                                    disabled={deleting === category.id}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                                >
                                                    {deleting === category.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                    삭제
                                                </button>
                                            </div>

                                            {/* Match Preview */}
                                            {categoryMatches[category.id]?.length > 0 ? (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-medium text-zinc-400 mb-2">최근 경기</h4>
                                                    {categoryMatches[category.id].slice(0, 3).map((match) => (
                                                        <div
                                                            key={match.id}
                                                            className="flex items-center justify-between p-3 bg-zinc-800 rounded-xl"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs text-zinc-500">#{match.matchNumber}</span>
                                                                <span className={match.winnerId === match.player1Id ? 'font-bold text-green-400' : ''}>
                                                                    {match.player1?.participantName || 'TBD'}
                                                                </span>
                                                                <span className="text-zinc-600">vs</span>
                                                                <span className={match.winnerId === match.player2Id ? 'font-bold text-green-400' : ''}>
                                                                    {match.player2?.participantName || 'TBD'}
                                                                </span>
                                                            </div>
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                match.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                                match.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-zinc-700 text-zinc-400'
                                                            }`}>
                                                                {match.status === 'completed' ? '완료' :
                                                                 match.status === 'in_progress' ? '진행중' : '대기'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-zinc-500 text-sm">
                                                    아직 대진표가 생성되지 않았습니다
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold">
                                {editingCategory ? '카테고리 수정' : '새 카테고리'}
                            </h3>
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    카테고리 이름 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-red-500"
                                    placeholder="예: 블루벨트 페더급"
                                />
                            </div>

                            {/* Belt Level */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">띠</label>
                                <select
                                    value={categoryForm.beltLevel}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, beltLevel: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-red-500"
                                >
                                    <option value="">전체 (오픈)</option>
                                    {BELT_LEVELS.map(belt => (
                                        <option key={belt} value={belt}>{belt}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Weight Class */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">체급</label>
                                <select
                                    value={categoryForm.weightClass}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, weightClass: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-red-500"
                                >
                                    <option value="">전체 (어솔루트)</option>
                                    {WEIGHT_CLASSES.map(weight => (
                                        <option key={weight} value={weight}>{weight}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">성별</label>
                                <div className="flex gap-2">
                                    {GENDERS.map(gender => (
                                        <button
                                            key={gender.value}
                                            type="button"
                                            onClick={() => setCategoryForm({ ...categoryForm, gender: gender.value })}
                                            className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${
                                                categoryForm.gender === gender.value
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                            }`}
                                        >
                                            {gender.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Age Group */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">연령대</label>
                                <select
                                    value={categoryForm.ageGroup}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, ageGroup: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-red-500"
                                >
                                    <option value="">전체</option>
                                    {AGE_GROUPS.map(age => (
                                        <option key={age} value={age}>{age}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Team Event */}
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={categoryForm.isTeamEvent}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, isTeamEvent: e.target.checked })}
                                        className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm font-medium">팀전</span>
                                </label>
                            </div>

                            {/* Bracket Type */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">대진 방식</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'single_elimination', label: '싱글 토너먼트' },
                                        { value: 'double_elimination', label: '더블 토너먼트' },
                                        { value: 'round_robin', label: '리그전' },
                                    ].map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setCategoryForm({ ...categoryForm, bracketType: type.value as any })}
                                            className={`py-2 px-3 rounded-xl font-medium text-xs transition-colors ${
                                                categoryForm.bracketType === type.value
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowCategoryModal(false)}
                                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSaveCategory}
                                    disabled={saving || !categoryForm.name.trim()}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            저장 중...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            {editingCategory ? '수정' : '생성'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
