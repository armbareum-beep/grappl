import React, { useState } from 'react';
import { Search, X, Check } from 'lucide-react';

interface TechniqueTagModalProps {
    selectedTechniques: string[];
    onSelect: (techniques: string[]) => void;
    onClose: () => void;
}

const TECHNIQUE_CATEGORIES = {
    'Guard': ['Closed Guard', 'Half Guard', 'Spider Guard', 'De La Riva', 'Butterfly Guard'],
    'Pass': ['Knee Cut', 'Torreando', 'Smash Pass', 'Leg Drag', 'Over Under'],
    'Submission': ['Armbar', 'Triangle Choke', 'Kimura', 'Rear Naked Choke', 'Guillotine'],
    'Takedown': ['Single Leg', 'Double Leg', 'Arm Drag', 'Collar Drag', 'Tomoe Nage']
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
                            placeholder="기술 검색..."
                            className="w-full bg-slate-800 text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {Object.entries(filteredCategories).map(([category, techs]) => (
                        <div key={category}>
                            <h4 className="text-slate-500 text-xs font-bold uppercase mb-2 px-1">{category}</h4>
                            <div className="space-y-1">
                                {techs.map(tech => (
                                    <button
                                        key={tech}
                                        onClick={() => toggleTechnique(tech)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${tempSelected.includes(tech)
                                                ? 'bg-blue-600/20 text-blue-400'
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
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        선택 완료 ({tempSelected.length})
                    </button>
                </div>
            </div>
        </div>
    );
};
