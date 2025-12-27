import React, { useState } from 'react';
import { Button } from '../Button';
import { TrainingLog } from '../../types';
import { X, Hash } from 'lucide-react';
import { TechniqueTagModal } from '../social/TechniqueTagModal';

interface TrainingLogFormProps {
    onSubmit: (log: Omit<TrainingLog, 'id' | 'createdAt'>) => Promise<void>;
    onCancel: () => void;
    userId: string;
    initialData?: Partial<TrainingLog>;
}

export const TrainingLogForm: React.FC<TrainingLogFormProps> = ({ onSubmit, onCancel, userId, initialData }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [duration, setDuration] = useState(initialData?.durationMinutes || 90);
    const [sparringRounds, setSparringRounds] = useState(initialData?.sparringRounds || 3);
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [techniques, setTechniques] = useState<string[]>(initialData?.techniques || []);
    const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtubeUrl || '');
    const [shareToFeed, setShareToFeed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showTechModal, setShowTechModal] = useState(false);

    const handleRemoveTechnique = (tech: string) => {
        setTechniques(techniques.filter(t => t !== tech));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit({
                userId,
                date,
                durationMinutes: duration,
                sparringRounds,
                notes,
                location,
                techniques,
                youtubeUrl: youtubeUrl || undefined,
                isPublic: shareToFeed  // Share to feed if checked
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-slate-900 rounded-xl border border-slate-800 p-6 relative">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">날짜</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">수련 시간 (분)</label>
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        min="0"
                        required
                    />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">스파링 라운드 수</label>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center gap-4">
                    <input
                        type="range"
                        min="0"
                        max="20"
                        value={sparringRounds}
                        onChange={(e) => setSparringRounds(Number(e.target.value))}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                        <span className="text-xl font-bold text-blue-500">{sparringRounds}</span>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-slate-300">배운 기술</label>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTechModal(true)}
                        className="border-slate-700 hover:bg-slate-800 text-blue-400 gap-1.5"
                    >
                        <Hash className="w-4 h-4" />
                        기술 선택
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    {techniques.length === 0 ? (
                        <p className="text-sm text-slate-500 py-1">아직 선택된 기술이 없습니다.</p>
                    ) : (
                        techniques.map((tech, index) => (
                            <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm font-medium animate-in zoom-in duration-200">
                                #{tech}
                                <button type="button" onClick={() => handleRemoveTechnique(tech)} className="hover:text-blue-300 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </span>
                        ))
                    )}
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">수련 장소 (선택)</label>
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 그라플 짐, 서울 체육관"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">메모</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="오늘 수련에서 느낀 점이나 피드백을 기록하세요."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-32 resize-none"
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">YouTube 영상 링크 (선택)</label>
                <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
            </div>

            <div className="mb-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={shareToFeed}
                        onChange={(e) => setShareToFeed(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <div>
                        <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">공개 피드에 공유</span>
                        <p className="text-xs text-slate-500 mt-0.5">체크하면 저장과 동시에 피드에 게시됩니다</p>
                    </div>
                </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white hover:bg-slate-800">취소</Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                    {submitting ? '저장 중...' : '저장하기'}
                </Button>
            </div>

            {/* Technique Selector Modal */}
            {showTechModal && (
                <TechniqueTagModal
                    selectedTechniques={techniques}
                    onClose={() => setShowTechModal(false)}
                    onSelect={(selected) => {
                        setTechniques(selected);
                        setShowTechModal(false);
                    }}
                />
            )}
        </form>
    );
};
