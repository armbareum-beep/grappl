import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFeedbackSettings, updateFeedbackSettings } from '../../lib/api';
import { MessageSquare, DollarSign, Clock, Users } from 'lucide-react';

export const FeedbackSettingsTab: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [enabled, setEnabled] = useState(false);
    const [price, setPrice] = useState('50000');
    const [turnaroundDays, setTurnaroundDays] = useState('3');
    const [maxActiveRequests, setMaxActiveRequests] = useState('5');

    useEffect(() => {
        if (user) {
            loadSettings();
        }
    }, [user]);

    const loadSettings = async () => {
        if (!user) return;

        const { data } = await getFeedbackSettings(user.id);
        if (data) {
            setEnabled(data.enabled);
            setPrice(data.price.toString());
            setTurnaroundDays(data.turnaroundDays.toString());
            setMaxActiveRequests(data.maxActiveRequests.toString());
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        const { error } = await updateFeedbackSettings(user.id, {
            enabled,
            price: parseFloat(price),
            turnaroundDays: parseInt(turnaroundDays),
            maxActiveRequests: parseInt(maxActiveRequests)
        });

        if (!error) {
            alert('설정이 저장되었습니다!');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">1:1 피드백 설정</h2>
                <p className="text-zinc-400">학생들에게 유료 피드백 서비스를 제공하세요</p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/10 rounded-lg">
                            <MessageSquare className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">피드백 서비스 활성화</h3>
                            <p className="text-sm text-zinc-400">학생들이 피드백을 요청할 수 있습니다</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                </div>

                {enabled && (
                    <>
                        {/* Price Setting */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                                <DollarSign className="w-4 h-4 text-zinc-400" />
                                피드백 가격 (KRW)
                            </label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-600"
                                placeholder="50000"
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                수익 분배: 크리에이터 80% (₩{(parseFloat(price) * 0.8).toLocaleString()}), 플랫폼 20% (₩{(parseFloat(price) * 0.2).toLocaleString()})
                            </p>
                        </div>

                        {/* Turnaround Days */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                                <Clock className="w-4 h-4 text-zinc-400" />
                                응답 기간 (일)
                            </label>
                            <input
                                type="number"
                                value={turnaroundDays}
                                onChange={(e) => setTurnaroundDays(e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-600"
                                placeholder="3"
                                min="1"
                                max="14"
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                피드백을 제공하는 데 걸리는 평균 시간
                            </p>
                        </div>

                        {/* Max Active Requests */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                                <Users className="w-4 h-4 text-zinc-400" />
                                최대 동시 요청 수
                            </label>
                            <input
                                type="number"
                                value={maxActiveRequests}
                                onChange={(e) => setMaxActiveRequests(e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-600"
                                placeholder="5"
                                min="1"
                                max="20"
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                동시에 처리할 수 있는 피드백 요청 개수
                            </p>
                        </div>
                    </>
                )}

                {/* Save Button */}
                <div className="pt-4 border-t border-zinc-800">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-violet-500/20"
                    >
                        {saving ? '저장 중...' : '설정 저장'}
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-400 mb-2 flex items-center gap-2">
                    <span className="text-lg">💡</span> 피드백 서비스 안내
                </h4>
                <ul className="text-sm text-indigo-300 space-y-1 break-keep pl-1">
                    <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />
                        학생들이 YouTube 영상 링크를 제공하고 피드백을 요청합니다
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />
                        텍스트로 상세한 피드백을 작성해주세요
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />
                        수익의 80%가 크리에이터에게, 20%가 플랫폼에 분배됩니다
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />
                        설정한 응답 기간 내에 피드백을 제공해주세요
                    </li>
                </ul>
            </div>
        </div>
    );
};
