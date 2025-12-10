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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">1:1 피드백 설정</h2>
                <p className="text-slate-400">학생들에게 유료 피드백 서비스를 제공하세요</p>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-blue-400" />
                        <div>
                            <h3 className="font-semibold text-white">피드백 서비스 활성화</h3>
                            <p className="text-sm text-slate-400">학생들이 피드백을 요청할 수 있습니다</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {enabled && (
                    <>
                        {/* Price Setting */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                <DollarSign className="w-4 h-4" />
                                피드백 가격 (KRW)
                            </label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="50000"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                수익 분배: 크리에이터 80% (₩{(parseFloat(price) * 0.8).toLocaleString()}), 플랫폼 20% (₩{(parseFloat(price) * 0.2).toLocaleString()})
                            </p>
                        </div>

                        {/* Turnaround Days */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                <Clock className="w-4 h-4" />
                                응답 기간 (일)
                            </label>
                            <input
                                type="number"
                                value={turnaroundDays}
                                onChange={(e) => setTurnaroundDays(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="3"
                                min="1"
                                max="14"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                피드백을 제공하는 데 걸리는 평균 시간
                            </p>
                        </div>

                        {/* Max Active Requests */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                <Users className="w-4 h-4" />
                                최대 동시 요청 수
                            </label>
                            <input
                                type="number"
                                value={maxActiveRequests}
                                onChange={(e) => setMaxActiveRequests(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="5"
                                min="1"
                                max="20"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                동시에 처리할 수 있는 피드백 요청 개수
                            </p>
                        </div>
                    </>
                )}

                {/* Save Button */}
                <div className="pt-4 border-t border-slate-800">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? '저장 중...' : '설정 저장'}
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-blue-400 mb-2">💡 피드백 서비스 안내</h4>
                <ul className="text-sm text-blue-300 space-y-1 break-keep">
                    <li>• 학생들이 YouTube 영상 링크를 제공하고 피드백을 요청합니다</li>
                    <li>• 텍스트로 상세한 피드백을 작성해주세요</li>
                    <li>• 수익의 80%가 크리에이터에게, 20%가 플랫폼에 분배됩니다</li>
                    <li>• 설정한 응답 기간 내에 피드백을 제공해주세요</li>
                </ul>
            </div>
        </div>
    );
};
