import React, { useState } from 'react';
import { Lesson, Drill } from '../../types';
import { X, Search, GraduationCap, Target, LayoutGrid } from 'lucide-react';

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
}

type TabType = 'all' | 'lesson' | 'drill';

const categories = ['All', 'Standing', 'Guard', 'Guard Pass', 'Side', 'Mount', 'Back'];

export const AddTechniqueModal: React.FC<AddTechniqueModalProps> = ({
    isOpen,
    onClose,
    lessons,
    drills,
    addedItems,
    onAddContent
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<AddContentItem[]>([]);

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

    const filterItem = (item: Lesson | Drill) => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        // Lessons don't have a category field directly, so we skip category filtering for them
        // Only apply category filter to Drills
        const matchesCategory = activeCategory === 'All' ||
            ('category' in item && item.category === activeCategory);
        return matchesSearch && matchesCategory;
    };

    const filteredLessons = lessons.filter(filterItem);
    const filteredDrills = drills.filter(filterItem);

    const handleAddSelected = () => {
        if (selectedItems.length > 0) {
            onAddContent(selectedItems);
            setSelectedItems([]);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white">콘텐츠 추가</h2>
                        <p className="text-sm text-slate-400">로드맵에 추가할 레슨과 드릴을 선택하세요.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 px-6 overflow-x-auto no-scrollbar">
                    {(['all', 'lesson', 'drill'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setSearchQuery('');
                            }}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative shrink-0 ${activeTab === tab ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {tab === 'all' && <LayoutGrid className="w-4 h-4" />}
                            {tab === 'lesson' && <GraduationCap className="w-4 h-4" />}
                            {tab === 'drill' && <Target className="w-4 h-4" />}
                            {tab === 'all' ? '전체' : tab === 'lesson' ? '레슨' : '드릴'}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Search & Category Filter */}
                <div className="p-6 border-b border-slate-800 space-y-4 bg-slate-900/30">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${activeCategory === category
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20'
                                    : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500'
                                    }`}
                            >
                                {category === 'All' ? '전체' : category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {(activeTab === 'all' || activeTab === 'lesson') && filteredLessons.map(lesson => (
                        <ContentItemRow
                            key={`lesson-${lesson.id}`}
                            title={lesson.title}
                            subtitle={`${lesson.course?.creatorName ? lesson.course.creatorName + ' • ' : ''}${lesson.course?.title || 'Unknown Course'} • Lesson ${lesson.lessonNumber}`}
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
                            subtitle={`${drill.creatorName ? drill.creatorName + ' • ' : ''}${drill.category} • ${drill.length || ''}`}
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

                    {((activeTab === 'all' && filteredLessons.length === 0 && filteredDrills.length === 0) ||
                        (activeTab === 'lesson' && filteredLessons.length === 0) ||
                        (activeTab === 'drill' && filteredDrills.length === 0)) && (
                            <div className="text-center py-20 text-slate-500">
                                검색 결과가 없습니다.
                            </div>
                        )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="text-sm font-bold text-slate-400">
                        <span className="text-blue-400">{selectedItems.length}</span>개 선택됨
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-bold">
                            취소
                        </button>
                        <button
                            onClick={handleAddSelected}
                            disabled={selectedItems.length === 0}
                            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg shadow-blue-600/20"
                        >
                            추가하기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ContentItemRow: React.FC<{
    title: string;
    subtitle?: string;
    thumbnail?: string;
    isAdded: boolean;
    isSelected: boolean;
    onClick: () => void;
    onDragStart?: (e: React.DragEvent) => void;
}> = ({ title, subtitle, thumbnail, isAdded, isSelected, onClick, onDragStart }) => (
    <button
        draggable={!isAdded}
        onDragStart={onDragStart}
        onClick={() => !isAdded && onClick()}
        disabled={isAdded}
        className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-all text-left ${isAdded ? 'bg-slate-800/30 border-slate-700 opacity-50 cursor-not-allowed'
            : isSelected ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
            }`}
    >
        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isAdded ? 'border-slate-600 bg-slate-700'
            : isSelected ? 'border-blue-500 bg-blue-500'
                : 'border-slate-600'
            }`}>
            {(isSelected || isAdded) && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            )}
        </div>

        {thumbnail && (
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-700">
                <img src={thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
        )}

        <div className="flex-1 min-w-0">
            <div className="text-white font-bold truncate">{title}</div>
            {subtitle && <div className="text-xs text-slate-400 truncate font-medium">{subtitle}</div>}
        </div>

        {isAdded && <span className="text-[10px] font-bold text-slate-500 px-2 py-1 bg-slate-700/50 rounded-lg">추가됨</span>}
    </button>
);
