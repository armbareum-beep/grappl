import React, { useState } from 'react';
import { Search, X, Check, Sparkles, Plus } from 'lucide-react';

interface TechniqueTagModalProps {
    selectedTechniques: string[];
    onSelect: (techniques: string[]) => void;
    onClose: () => void;
}

const TECHNIQUE_CATEGORIES = {
    '가드': ['클로즈 가드', '하프 가드', '스파이더 가드', '델라리바', '버터플라이 가드'],
    '패스': ['니컷 패스', '토레안도', '스매쉬 패스', '레그 드래그', '오버 언더'],
    '서브미션': ['암바', '트라이앵글 초크', '키무라', '리어 네이키드 초크', '길로틴'],
    '테이크다운': ['싱글렉', '더블렉', '암 드래그', '칼라 드래그', '배대뒤치기']
};

export const TechniqueTagModal: React.FC<TechniqueTagModalProps> = ({ selectedTechniques, onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    const [tempSelected, setTempSelected] = useState<string[]>(selectedTechniques);

    const toggleTechnique = (tech: string) => {
        if (tempSelected.includes(tech)) {
            setTempSelected(prev => prev.filter(t => t !== tech));
        } else {
            setTempSelected(prev => [...prev, tech]);
        }
    };

    const handleConfirm = () => {
        onSelect(tempSelected);
        onClose();
    };

    const filteredCategories = Object.entries(TECHNIQUE_CATEGORIES).reduce((acc, [category, techs]) => {
        const filtered = techs.filter(t => t.toLowerCase().includes(search.toLowerCase()));
        if (filtered.length > 0) {
            acc[category] = filtered;
        }
        return acc;
    }, {} as Record<string, string[]>);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-zinc-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/5">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        기술 태그 선택
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-4 border-b border-white/5">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="기술 검색 또는 직접 입력..."
                            className="w-full bg-black/40 text-white pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 border border-white/5 focus:border-violet-500/50 transition-all placeholder:text-zinc-600"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-none">
                    {/* Display Custom Added Tags */}
                    {tempSelected.filter(t => !Object.values(TECHNIQUE_CATEGORIES).flat().includes(t)).length > 0 && (
                        <div>
                            <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-3 px-1">직접 입력</h4>
                            <div className="grid grid-cols-1 gap-1.5">
                                {tempSelected.filter(t => !Object.values(TECHNIQUE_CATEGORIES).flat().includes(t)).map(tech => (
                                    <button
                                        key={tech}
                                        onClick={() => toggleTechnique(tech)}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all bg-violet-600/10 border border-violet-500/30 text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.1)] group"
                                    >
                                        <span className="font-medium">#{tech}</span>
                                        <Check className="w-4 h-4 text-violet-400" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add New Tag Option */}
                    {search.trim() && !Object.values(TECHNIQUE_CATEGORIES).flat().some(t => t.toLowerCase() === search.toLowerCase()) && !tempSelected.includes(search.trim()) && (
                        <button
                            onClick={() => {
                                toggleTechnique(search.trim());
                                setSearch('');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all border border-dashed border-zinc-800 hover:border-violet-500/50 group"
                        >
                            <Plus className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 transition-transform group-hover:scale-110" />
                            <span className="font-medium">"{search}" 태그 추가하기</span>
                        </button>
                    )}

                    {Object.entries(filteredCategories).map(([category, techs]) => (
                        <div key={category}>
                            <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-3 px-1">{category}</h4>
                            <div className="grid grid-cols-1 gap-1.5">
                                {techs.map(tech => {
                                    const isSelected = tempSelected.includes(tech);
                                    return (
                                        <button
                                            key={tech}
                                            onClick={() => toggleTechnique(tech)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all group ${isSelected
                                                ? 'bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
                                                }`}
                                        >
                                            <span className={`font-medium ${isSelected ? '' : 'group-hover:translate-x-1 transition-transform'}`}>
                                                {tech}
                                            </span>
                                            {isSelected && <Check className="w-4 h-4 animate-in zoom-in duration-200" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 bg-black/20 border-t border-white/5">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white py-4 rounded-2xl font-bold shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        선택 완료
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white/20 text-[10px]">
                            {tempSelected.length}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
