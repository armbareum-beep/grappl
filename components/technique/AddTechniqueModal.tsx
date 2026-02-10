import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Lesson, Drill } from '../../types';
import { X, Search, GraduationCap, Target, LayoutGrid, Check, Plus, Bookmark } from 'lucide-react';

interface AddContentItem {
    id: string;
    type: 'technique' | 'lesson' | 'drill';
}

interface AddTechniqueModalProps {
    isOpen: boolean;
    onClose: () => void;
    lessons: (Lesson & { course?: { title: string; creatorName?: string } })[];
    drills: Drill[];
    addedItems: AddContentItem[];
    onAddContent: (items: AddContentItem[]) => void;
    savedLessons?: Lesson[];
    savedDrills?: Drill[];
}

type TabType = 'all' | 'lesson' | 'drill' | 'saved';

const categories = ['All', 'Standing', 'Guard', 'Guard Pass', 'Side', 'Mount', 'Back'];

export const AddTechniqueModal: React.FC<AddTechniqueModalProps> = ({
    isOpen,
    onClose,
    lessons,
    drills,
    addedItems,
    onAddContent,
    savedLessons = [],
    savedDrills = []
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<AddContentItem[]>([]);

    // Prevent scrolling behind modal
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Note: We don't return null here if we want AnimatePresence in the parent to handle exit animations.
    // However, to keep it simple and safe, we'll keep the null check if the parent doesn't use AnimatePresence.
    // If the parent uses AnimatePresence with conditional rendering, this null check is redundant.
    if (!isOpen) return null;

    const isAlreadyAdded = (id: string, type: 'lesson' | 'drill' | 'technique') =>
        addedItems.some(item => item.id === id && item.type === type);

    const isItemSelected = (id: string, type: 'lesson' | 'drill' | 'technique') =>
        selectedItems.some(item => item.id === id && item.type === type);

    const handleToggleSelection = (id: string, type: 'lesson' | 'drill' | 'technique') => {
        if (isItemSelected(id, type)) {
            setSelectedItems(selectedItems.filter(item => !(item.id === id && item.type === type)));
        } else {
            setSelectedItems([...selectedItems, { id, type }]);
        }
    };

    // Enhanced filter with instructor name search
    const filterItem = (item: Lesson | Drill) => {
        const query = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(query);

        // Check instructor name for both lessons and drills
        let instructorMatch = false;
        if ('course' in item && (item as any).course?.creatorName) {
            instructorMatch = (item as any).course.creatorName.toLowerCase().includes(query);
        } else if ('category' in item) {
            // This is a Drill
            const drill = item as Drill;
            if (drill.creatorName) {
                instructorMatch = drill.creatorName.toLowerCase().includes(query);
            }
        }

        const matchesSearch = titleMatch || instructorMatch;

        // Only apply category filter to Drills
        const isDrill = 'category' in item;
        const matchesCategory = activeCategory === 'All' ||
            (isDrill && (item as Drill).category === activeCategory);

        return matchesSearch && matchesCategory;
    };

    const safeArray = (arr: any) => Array.isArray(arr) ? arr : [];
    const filteredLessons = safeArray(lessons).filter(filterItem);
    const filteredDrills = safeArray(drills).filter(filterItem);
    const filteredSavedLessons = safeArray(savedLessons).filter(filterItem);
    const filteredSavedDrills = safeArray(savedDrills).filter(filterItem);


    const handleAddSelected = () => {
        if (selectedItems.length > 0) {
            onAddContent(selectedItems);
            setSelectedItems([]);
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex flex-col md:items-center md:justify-center">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            {/* Modal Container */}
            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative bg-zinc-950 w-full h-full md:w-[95%] md:max-w-2xl md:h-[85vh] md:rounded-3xl border-y md:border border-zinc-800 flex flex-col shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 md:p-6 border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-md">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">콘텐츠 추가</h2>
                        <p className="text-xs md:text-sm text-zinc-500 mt-0.5">로드맵에 추가할 콘텐츠를 선택하세요.</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="콘텐츠 추가 닫기"
                        className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white transition-all hover:bg-zinc-800 rounded-xl"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Controls Bar */}
                    <div className="flex flex-col gap-3 p-5 md:p-6 border-b border-zinc-800/30 bg-zinc-950">
                        {/* Tabs */}
                        <div className="flex items-center p-1 bg-zinc-900/50 rounded-xl w-fit overflow-x-auto">
                            {(['all', 'lesson', 'drill', 'saved'] as const).map(tab => {
                                const isActive = activeTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab);
                                            setSearchQuery('');
                                        }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${isActive
                                            ? 'bg-violet-600 text-white shadow-lg'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        {tab === 'all' && <LayoutGrid className="w-3.5 h-3.5" />}
                                        {tab === 'lesson' && <GraduationCap className="w-3.5 h-3.5" />}
                                        {tab === 'drill' && <Target className="w-3.5 h-3.5" />}
                                        {tab === 'saved' && <Bookmark className="w-3.5 h-3.5" />}
                                        {tab === 'all' ? '전체' : tab === 'lesson' ? '레슨' : tab === 'drill' ? '드릴' : '저장'}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search & Categories */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="검색 (제목, 강사 등)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-zinc-50 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:bg-zinc-900 transition-all text-sm"
                                />
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setActiveCategory(category)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${activeCategory === category
                                            ? 'bg-violet-600/10 text-violet-400 border-violet-500/50'
                                            : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                    >
                                        {category === 'All' ? '전체' : category}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5 scrollbar-thin scrollbar-thumb-zinc-800 grid grid-cols-1 gap-3">
                        {(activeTab === 'all' || activeTab === 'lesson') && filteredLessons.map(lesson => (
                            <ContentItemRow
                                key={`lesson-${lesson.id}`}
                                title={lesson.title}
                                instructor={lesson.course?.creatorName || ''}
                                pathInfo={`${lesson.course?.title || 'Unknown Course'} • Lesson ${lesson.lessonNumber}`}
                                thumbnail={lesson.thumbnailUrl}
                                isAdded={isAlreadyAdded(lesson.id, 'lesson')}
                                isSelected={isItemSelected(lesson.id, 'lesson')}
                                onClick={() => handleToggleSelection(lesson.id, 'lesson')}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/grapplay-node', JSON.stringify({ type: 'lesson', id: lesson.id }));
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            />
                        ))}

                        {(activeTab === 'all' || activeTab === 'drill') && filteredDrills.map(drill => (
                            <ContentItemRow
                                key={`drill-${drill.id}`}
                                title={drill.title}
                                instructor={drill.creatorName || ''}
                                pathInfo={`${drill.category} • ${drill.length || ''}`}
                                thumbnail={drill.thumbnailUrl}
                                isAdded={isAlreadyAdded(drill.id, 'drill')}
                                isSelected={isItemSelected(drill.id, 'drill')}
                                onClick={() => handleToggleSelection(drill.id, 'drill')}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/grapplay-node', JSON.stringify({ type: 'drill', id: drill.id }));
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            />
                        ))}

                        {activeTab === 'saved' && (
                            <>
                                {filteredSavedLessons.map(lesson => (
                                    <ContentItemRow
                                        key={`saved-lesson-${lesson.id}`}
                                        title={lesson.title}
                                        instructor={''}
                                        pathInfo={`저장된 레슨`}
                                        thumbnail={lesson.thumbnailUrl}
                                        isAdded={isAlreadyAdded(lesson.id, 'lesson')}
                                        isSelected={isItemSelected(lesson.id, 'lesson')}
                                        onClick={() => handleToggleSelection(lesson.id, 'lesson')}
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('application/grapplay-node', JSON.stringify({ type: 'lesson', id: lesson.id }));
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                    />
                                ))}
                                {filteredSavedDrills.map(drill => (
                                    <ContentItemRow
                                        key={`saved-drill-${drill.id}`}
                                        title={drill.title}
                                        instructor={drill.creatorName || ''}
                                        pathInfo={`저장된 드릴 • ${drill.category || ''}`}
                                        thumbnail={drill.thumbnailUrl}
                                        isAdded={isAlreadyAdded(drill.id, 'drill')}
                                        isSelected={isItemSelected(drill.id, 'drill')}
                                        onClick={() => handleToggleSelection(drill.id, 'drill')}
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('application/grapplay-node', JSON.stringify({ type: 'drill', id: drill.id }));
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                    />
                                ))}
                            </>
                        )}

                        {((activeTab === 'all' && filteredLessons.length === 0 && filteredDrills.length === 0) ||
                            (activeTab === 'lesson' && filteredLessons.length === 0) ||
                            (activeTab === 'drill' && filteredDrills.length === 0) ||
                            (activeTab === 'saved' && filteredSavedLessons.length === 0 && filteredSavedDrills.length === 0)) && (
                                <div className="col-span-full flex flex-col items-center justify-center py-32 text-zinc-600">
                                    <Bookmark className="w-12 h-12 mb-4 opacity-20" />
                                    <div className="text-xl font-medium">
                                        {activeTab === 'saved' ? '저장된 콘텐츠가 없습니다.' : '검색 결과가 없습니다.'}
                                    </div>
                                    <div className="mt-1">
                                        {activeTab === 'saved' ? '라이브러리에서 레슨이나 드릴을 저장해보세요.' : '다른 검색어를 입력해 보세요.'}
                                    </div>
                                </div>
                            )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400 font-bold text-sm md:text-base">
                            {selectedItems.length}
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-white font-bold text-sm md:text-base">아이템 선택됨</div>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-1 md:flex-none">
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none px-5 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all font-bold text-sm border border-zinc-800"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleAddSelected}
                            disabled={selectedItems.length === 0}
                            className="flex-[2] md:flex-none px-6 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed font-bold text-sm shadow-[0_4px_12px_rgba(139,92,246,0.3)] active:scale-95"
                        >
                            {selectedItems.length}개 추가하기
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

const ContentItemRow: React.FC<{
    title: string;
    instructor: string;
    pathInfo: string;
    thumbnail?: string;
    isAdded: boolean;
    isSelected: boolean;
    onClick: () => void;
    onDragStart?: (e: React.DragEvent) => void;
}> = ({ title, instructor, pathInfo, thumbnail, isAdded, isSelected, onClick, onDragStart }) => (
    <button
        draggable={!isAdded}
        onDragStart={onDragStart}
        onClick={() => !isAdded && onClick()}
        disabled={isAdded}
        className={`w-full flex flex-row items-center bg-zinc-900/40 border rounded-2xl p-3 md:p-4 transition-all text-left group ${isAdded
            ? 'border-zinc-800 opacity-40 cursor-not-allowed'
            : isSelected
                ? 'border-violet-500 bg-violet-600/10 shadow-[0_4px_12px_rgba(139,92,246,0.15)]'
                : 'border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/60 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
            }`}
    >
        {/* Left Visual */}
        <div className="relative w-16 h-16 md:w-20 md:h-20 bg-zinc-800 rounded-xl flex-shrink-0 overflow-hidden shadow-inner">
            {thumbnail ? (
                <img src={thumbnail} alt={title || "썸네일"} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-zinc-700" />
                </div>
            )}
            {isSelected && (
                <div className="absolute inset-0 bg-violet-600/30 flex items-center justify-center backdrop-blur-[1px]">
                    <Check className="w-8 h-8 text-white" />
                </div>
            )}
        </div>

        {/* Center Info */}
        <div className="flex-1 px-4 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-wider ${pathInfo.toLowerCase().includes('lesson') ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {pathInfo.toLowerCase().includes('lesson') ? 'LESSON' : 'DRILL'}
                </span>
            </div>
            <div className={`text-zinc-50 text-sm md:text-base font-bold truncate transition-colors ${isSelected ? 'text-violet-300' : 'group-hover:text-white'}`}>{title}</div>
            {instructor && (
                <div className="text-zinc-500 text-[10px] md:text-xs font-medium mt-0.5 flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-violet-500" />
                    {instructor}
                </div>
            )}
            <div className="text-zinc-600 text-[10px] md:text-[11px] mt-0.5 font-medium truncate">{pathInfo}</div>
        </div>

        {/* Right Action */}
        <div className="flex-shrink-0 ml-1">
            {isAdded ? (
                <div className="flex flex-col items-center gap-0.5 opacity-50">
                    <Check className="w-4 h-4 text-zinc-500" />
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">Added</span>
                </div>
            ) : (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isSelected
                    ? 'bg-violet-600 text-white shadow-lg rotate-0'
                    : 'bg-zinc-800 text-zinc-400 group-hover:bg-violet-600/20 group-hover:text-violet-400'
                    }`}>
                    {isSelected ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
            )}
        </div>
    </button>
);
