import React, { useState } from 'react';
import { Button } from '../Button';
import { TrainingLog } from '../../types';
import { X, Plus } from 'lucide-react';

interface TrainingLogFormProps {
    onSubmit: (log: Omit<TrainingLog, 'id' | 'createdAt'>) => Promise<void>;
    onCancel: () => void;
    userId: string;
    initialData?: TrainingLog;
}

export const TrainingLogForm: React.FC<TrainingLogFormProps> = ({ onSubmit, onCancel, userId, initialData }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [duration, setDuration] = useState(initialData?.durationMinutes || 90);
    const [sparringRounds, setSparringRounds] = useState(initialData?.sparringRounds || 3);
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);
    const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtubeUrl || '');
    const [techniqueInput, setTechniqueInput] = useState('');
    const [techniques, setTechniques] = useState<string[]>(initialData?.techniques || []);
    const [submitting, setSubmitting] = useState(false);

    const handleAddTechnique = () => {
        if (techniqueInput.trim()) {
            setTechniques([...techniques, techniqueInput.trim()]);
            setTechniqueInput('');
        }
    };

    const handleRemoveTechnique = (index: number) => {
        setTechniques(techniques.filter((_, i) => i !== index));
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
                isPublic,
                youtubeUrl
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">날짜</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">수련 시간 (분)</label>
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        required
                    />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">스파링 라운드 수</label>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="0"
                        max="20"
                        value={sparringRounds}
                        onChange={(e) => setSparringRounds(Number(e.target.value))}
                        className="flex-1"
                    />
                    <span className="text-lg font-bold text-blue-600 w-12 text-center">{sparringRounds}</span>
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">배운 기술</label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={techniqueInput}
                        onChange={(e) => setTechniqueInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTechnique())}
                        placeholder="기술 이름 입력 (예: 암바, 트라이앵글)"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button type="button" onClick={handleAddTechnique} variant="secondary">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {techniques.map((tech, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm">
                            {tech}
                            <button type="button" onClick={() => handleRemoveTechnique(index)} className="hover:text-blue-900">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">수련 장소 (선택)</label>
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 그라플 짐, 서울 체육관"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">메모</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="오늘 수련에서 느낀 점이나 피드백을 기록하세요."
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-900">커뮤니티에 공개</span>
                    </label>
                    <p className="text-xs text-slate-500 ml-6">
                        공개하면 다른 유저들이 보고 피드백을 남길 수 있습니다.
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">YouTube 영상 링크 (선택)</label>
                    <input
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onCancel}>취소</Button>
                <Button type="submit" disabled={submitting}>
                    {submitting ? '저장 중...' : '저장하기'}
                </Button>
            </div>
        </form>
    );
};
