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

    // Enhanced filter with instructor name search
    const filterItem = (item: Lesson | Drill) => {
        const query = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(query);

        // Check instructor name for both lessons and drills
        let instructorMatch = false;
        if ('course' in item && item.course?.creatorName) {
            instructorMatch = item.course.creatorName.toLowerCase().includes(query);
        } else if ('category' in item) {
            // This is a Drill
            const drill = item as Drill;
            if (drill.creatorName) {
                instructorMatch = drill.creatorName.toLowerCase().includes(query);
            }
        }

        const matchesSearch = titleMatch || instructorMatch;

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-50">콘텐츠 추가</h2>
                        <p className="text-sm text-zinc-400">로드맵에 추가할 레슨과 드릴을 선택하세요.</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800 px-6 overflow-x-auto no-scrollbar">
                    {(['all', 'lesson', 'drill'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setSearchQuery('');
                            }}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative shrink-0 ${activeTab === tab ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {tab === 'all' && <LayoutGrid className="w-4 h-4" />}
                            {tab === 'lesson' && <GraduationCap className="w-4 h-4" />}
                            {tab === 'drill' && <Target className="w-4 h-4" />}
                            {tab === 'all' ? '전체' : tab === 'lesson' ? '레슨' : '드릴'}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Search & Category Filter */}
                <div className="p-6 border-b border-zinc-800 space-y-4 bg-zinc-900/30">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search by technique title or instructor name (e.g., 이바름)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-all"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${activeCategory === category
                                    ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-600/20'
                                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                                    }`}
                            >
                                {category === 'All' ? '전체' : category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[600px] scrollbar-thin scrollbar-thumb-zinc-800">
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

                    {((activeTab === 'all' && filteredLessons.length === 0 && filteredDrills.length === 0) ||
                        (activeTab === 'lesson' && filteredLessons.length === 0) ||
                        (activeTab === 'drill' && filteredDrills.length === 0)) && (
                            <div className="text-center py-20 text-zinc-500">
                                검색 결과가 없습니다.
                            </div>
                        )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="text-sm font-bold text-zinc-400">
                        <span className="text-violet-400">{selectedItems.length}</span>개 선택됨
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-all font-bold">
                            취소
                        </button>
                        <button
                            onClick={handleAddSelected}
                            disabled={selectedItems.length === 0}
                            className="px-8 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg shadow-violet-600/20"
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
        className={`w-full flex flex-row items-center bg-zinc-900/40 border rounded-2xl p-4 mb-3 transition-all text-left ${isAdded
            ? 'border-zinc-800 opacity-50 cursor-not-allowed'
            : isSelected
                ? 'border-violet-500/50 bg-violet-600/5 shadow-[0_4px_20px_rgba(124,58,237,0.1)]'
                : 'border-zinc-800 hover:border-zinc-700 hover:translate-x-1 hover:shadow-[0_4px_20px_rgba(124,58,237,0.1)]'
            }`}
    >
        {/* Left Visual */}
        <div className="w-16 h-16 bg-zinc-800 rounded-xl flex-shrink-0 overflow-hidden">
            {thumbnail ? (
                <img src={thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-zinc-600" />
                </div>
            )}
        </div>

        {/* Center Info */}
        <div className="flex-grow px-5">
            <div className="text-zinc-50 text-lg font-bold truncate">{title}</div>
            {instructor && (
                <div className="text-violet-400 text-sm font-medium truncate">
                    {instructor}
                </div>
            )}
            <div className="text-zinc-500 text-xs truncate">{pathInfo}</div>
        </div>

        {/* Right Action */}
        {isAdded ? (
            <span className="text-zinc-600 bg-zinc-800 px-3 py-1 rounded-lg text-xs font-bold">
                Added
            </span>
        ) : (
            <div className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${isSelected
                ? 'bg-violet-600 text-white'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}>
                {isSelected ? '선택됨' : '추가'}
            </div>
        )}
    </button>
);
