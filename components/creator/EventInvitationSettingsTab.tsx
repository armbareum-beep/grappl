import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { fetchOrganizerById, updateOrganizerProfile } from '../../lib/api-organizers';
import { Trophy, Users, Calendar, DollarSign, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { Creator } from '../../types';

interface EventTypeSettings {
    accept: boolean;
    minFee: string;
}

interface EventTypeCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    settings: EventTypeSettings;
    onChange: (settings: EventTypeSettings) => void;
}

const EventTypeCard: React.FC<EventTypeCardProps> = ({ title, description, icon, color, settings, onChange }) => (
    <div className={`bg-zinc-900/50 rounded-xl border ${settings.accept ? color : 'border-zinc-800'} p-5 transition-all`}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.accept ? color.replace('border-', 'bg-').replace('500', '500/20') : 'bg-zinc-800'}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <p className="text-sm text-zinc-400">{description}</p>
                </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={settings.accept}
                    onChange={(e) => onChange({ ...settings, accept: e.target.checked })}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
        </div>

        {settings.accept && (
            <div className="pt-4 border-t border-zinc-800">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                    <DollarSign className="w-4 h-4 text-zinc-400" />
                    최소 금액 (원)
                </label>
                <input
                    type="number"
                    value={settings.minFee}
                    onChange={(e) => onChange({ ...settings, minFee: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-zinc-600"
                    placeholder="0"
                    min="0"
                    step="10000"
                />
                <p className="text-xs text-zinc-500 mt-1">
                    주최자가 제안할 수 있는 최소 금액입니다
                </p>
            </div>
        )}
    </div>
);

export const EventInvitationSettingsTab: React.FC = () => {
    const { user, creatorId } = useAuth();
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [instructor, setInstructor] = useState<Creator | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Event type specific settings
    const [competition, setCompetition] = useState<EventTypeSettings>({ accept: false, minFee: '0' });
    const [seminar, setSeminar] = useState<EventTypeSettings>({ accept: false, minFee: '0' });
    const [openmat, setOpenmat] = useState<EventTypeSettings>({ accept: false, minFee: '0' });

    // Bank account for invitations
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [holderName, setHolderName] = useState('');

    // Use user.id as fallback if creatorId is not available
    const effectiveCreatorId = creatorId || user?.id;

    useEffect(() => {
        if (effectiveCreatorId) {
            loadSettings();
        } else {
            setLoading(false);
            setLoadError('크리에이터 정보를 찾을 수 없습니다.');
        }
    }, [effectiveCreatorId]);

    const loadSettings = async () => {
        if (!effectiveCreatorId) {
            setLoading(false);
            return;
        }

        setLoadError(null);

        try {
            const data = await fetchOrganizerById(effectiveCreatorId);
            if (!data) {
                // Creator not found - show empty form for first-time setup
                setLoading(false);
                return;
            }
            setInstructor(data);

            // Load event type settings (handle undefined fields gracefully)
            setCompetition({
                accept: data.acceptCompetitionInvitations ?? false,
                minFee: (data.minCompetitionFee || 0).toString()
            });
            setSeminar({
                accept: data.acceptSeminarInvitations ?? false,
                minFee: (data.minSeminarFee || 0).toString()
            });
            setOpenmat({
                accept: data.acceptOpenmatInvitations ?? false,
                minFee: (data.minOpenmatFee || 0).toString()
            });

            // Load bank account
            if (data.bankAccountForInvitation) {
                setBankName(data.bankAccountForInvitation.bankName || '');
                setAccountNumber(data.bankAccountForInvitation.accountNumber || '');
                setHolderName(data.bankAccountForInvitation.holderName || '');
            }
        } catch (error: any) {
            console.error('Failed to load invitation settings:', error);
            // Don't show error toast for first-time users or missing data
            if (error?.code !== 'PGRST116') { // Not a "not found" error
                setLoadError('설정을 불러오는 중 오류가 발생했습니다. 아래에서 직접 설정해주세요.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!effectiveCreatorId) {
            toastError('저장할 수 없습니다. 크리에이터 정보가 없습니다.');
            return;
        }

        // Validate bank account if any type is enabled
        const anyEnabled = competition.accept || seminar.accept || openmat.accept;
        if (anyEnabled && (!bankName || !accountNumber || !holderName)) {
            toastError('초청을 수락하려면 계좌 정보를 입력해야 합니다.');
            return;
        }

        setSaving(true);
        try {
            await updateOrganizerProfile(effectiveCreatorId, {
                acceptCompetitionInvitations: competition.accept,
                minCompetitionFee: parseInt(competition.minFee) || 0,
                acceptSeminarInvitations: seminar.accept,
                minSeminarFee: parseInt(seminar.minFee) || 0,
                acceptOpenmatInvitations: openmat.accept,
                minOpenmatFee: parseInt(openmat.minFee) || 0,
                bankAccountForInvitation: {
                    bankName,
                    accountNumber,
                    holderName
                }
            });

            success('설정이 저장되었습니다!');
        } catch (error: any) {
            toastError(error.message || '설정 저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const anyTypeEnabled = competition.accept || seminar.accept || openmat.accept;
    const hasBankAccount = bankName && accountNumber && holderName;

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
        );
    }

    // Show error message but still allow editing
    const errorBanner = loadError ? (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">{loadError}</p>
        </div>
    ) : null;

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">행사 초청 설정</h2>
                <p className="text-zinc-400">주최자로부터 행사 초청을 받을 수 있습니다</p>
            </div>

            {errorBanner}

            <div className="space-y-6">
                {/* Event Type Cards */}
                <div className="space-y-4">
                    <EventTypeCard
                        title="시합 (Competition)"
                        description="주짓수 시합에 참석"
                        icon={<Trophy className={`w-5 h-5 ${competition.accept ? 'text-red-400' : 'text-zinc-400'}`} />}
                        color="border-red-500"
                        settings={competition}
                        onChange={setCompetition}
                    />

                    <EventTypeCard
                        title="세미나 (Seminar)"
                        description="세미나 강사로 참석"
                        icon={<Users className={`w-5 h-5 ${seminar.accept ? 'text-blue-400' : 'text-zinc-400'}`} />}
                        color="border-blue-500"
                        settings={seminar}
                        onChange={setSeminar}
                    />

                    <EventTypeCard
                        title="오픈매트 (Open Mat)"
                        description="오픈매트 지도자로 참석"
                        icon={<Calendar className={`w-5 h-5 ${openmat.accept ? 'text-green-400' : 'text-zinc-400'}`} />}
                        color="border-green-500"
                        settings={openmat}
                        onChange={setOpenmat}
                    />
                </div>

                {/* Bank Account Section */}
                {anyTypeEnabled && (
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <CreditCard className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">계좌 정보</h3>
                                <p className="text-sm text-zinc-400">초청 승낙 시 주최자에게 공개됩니다</p>
                            </div>
                        </div>

                        {!hasBankAccount && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-200">
                                    초청을 수락하려면 계좌 정보가 필요합니다
                                </p>
                            </div>
                        )}

                        {hasBankAccount && (
                            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-green-200">
                                    계좌 정보가 등록되어 있습니다
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">은행명</label>
                                <input
                                    type="text"
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="예: 신한은행"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">계좌번호</label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="- 없이 입력"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">예금주</label>
                                <input
                                    type="text"
                                    value={holderName}
                                    onChange={(e) => setHolderName(e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="예금주 이름"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-amber-500/20"
                    >
                        {saving ? '저장 중...' : '설정 저장'}
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-amber-400 mb-2">행사 초청 안내</h4>
                <ul className="text-sm text-amber-300 space-y-1 break-keep pl-1">
                    <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                        주최자가 설정한 최소 금액 이상으로 제안해야 초청할 수 있습니다
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                        초청을 승낙하면 계좌 정보가 주최자에게 공개됩니다
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                        주최자가 직접 계좌로 송금하며, 그래플레이 수수료는 없습니다
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                        입금 확인 후 완료 버튼을 눌러주세요
                    </li>
                </ul>
            </div>
        </div>
    );
};
