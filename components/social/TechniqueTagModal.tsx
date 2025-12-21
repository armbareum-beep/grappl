import React, { useState } from 'react';
import { Search, X, Check } from 'lucide-react';

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-white font-bold">기술 태그 선택</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="기술 검색 또는 직접 입력..."
                            className="w-full bg-slate-800 text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Display Custom Added Tags */}
                    {tempSelected.filter(t => !Object.values(TECHNIQUE_CATEGORIES).flat().includes(t)).length > 0 && (
                        <div>
                            <h4 className="text-slate-500 text-xs font-bold uppercase mb-2 px-1">직접 입력</h4>
                            <div className="space-y-1">
                                {tempSelected.filter(t => !Object.values(TECHNIQUE_CATEGORIES).flat().includes(t)).map(tech => (
                                    <button
                                        key={tech}
                                        onClick={() => toggleTechnique(tech)}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors bg-slate-700 text-white"
                                    >
                                        <span>{tech}</span>
                                        <Check className="w-4 h-4" />
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
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors border border-dashed border-slate-700"
                        >
                            <span>+ "{search}" 추가하기</span>
                        </button>
                    )}

                    {Object.entries(filteredCategories).map(([category, techs]) => (
                        <div key={category}>
                            <h4 className="text-slate-500 text-xs font-bold uppercase mb-2 px-1">{category}</h4>
                            <div className="space-y-1">
                                {techs.map(tech => (
                                    <button
                                        key={tech}
                                        onClick={() => toggleTechnique(tech)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${tempSelected.includes(tech)
                                            ? 'bg-slate-700 text-white'
                                            : 'text-slate-300 hover:bg-slate-800'
                                            }`}
                                    >
                                        <span>{tech}</span>
                                        {tempSelected.includes(tech) && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-slate-700 text-white py-3 rounded-xl font-bold hover:bg-slate-600 transition-colors"
                    >
                        선택 완료 ({tempSelected.length})
                    </button>
                </div>
            </div>
        </div>
    );
};
