import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, CreditCard, ChevronRight, Upload as UploadIcon, Check, Settings as SettingsIcon, LogOut, Loader2, AlertTriangle, Calendar, Smartphone, Bookmark } from 'lucide-react';
import { updateUserProfile, uploadProfileImage, updateCreatorProfile, getCreatorById, updatePassword, getUserSubscription, cancelSubscription } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type SettingsSection = 'profile' | 'notifications' | 'security' | 'subscription' | 'app' | 'saved';

export const Settings: React.FC = () => {
    const { user, isCreator, signOut } = useAuth();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState<string>('');

    // Profile State
    const [displayName, setDisplayName] = useState(user?.user_metadata?.name || '');
    const [bio, setBio] = useState('');

    // Notification Settings State
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [marketingEmails, setMarketingEmails] = useState(false);

    // Subscription State
    const [subscription, setSubscription] = useState<any>(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Password Change State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Load initial data
    useEffect(() => {
        if (!user) return;

        // 1. Load Profile Image
        async function loadProfile() {
            try {
                const { data } = await supabase
                    .from('users')
                    .select('avatar_url')
                    .eq('id', user?.id)
                    .single();

                if (data?.avatar_url) {
                    setProfileImageUrl(data.avatar_url);
                } else if (user?.user_metadata?.avatar_url) {
                    setProfileImageUrl(user.user_metadata.avatar_url);
                }
            } catch (err) {
                console.error('Error loading profile:', err);
            }
        }
        loadProfile();

        // 2. Load Creator Profile
        if (isCreator) {
            async function loadCreator() {
                const creator = await getCreatorById(user!.id);
                if (creator) {
                    if (creator.profileImage) setProfileImageUrl(creator.profileImage);
                    setBio(creator.bio || '');
                }
            }
            loadCreator();
        }

        // 3. Load Notification Preferences
        if (user.user_metadata) {
            setEmailNotifications(user.user_metadata.emailNotifications ?? true);
            setPushNotifications(user.user_metadata.pushNotifications ?? true);
            setMarketingEmails(user.user_metadata.marketingEmails ?? false);
        }

        // 4. Load Subscription
        async function loadSub() {
            setSubscriptionLoading(true);
            try {
                const sub = await getUserSubscription(user!.id);
                setSubscription(sub);
            } catch (err) {
                console.error('Error loading subscription:', err);
            } finally {
                setSubscriptionLoading(false);
            }
        }
        loadSub();

    }, [user, isCreator]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: '이미지 파일만 업로드 가능합니다.' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: '파일 크기는 5MB 이하여야 합니다.' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const { url, error } = await uploadProfileImage(user.id, file);
            if (error) throw error;

            if (url) {
                setProfileImageUrl(url);
                const { error: updateError } = await updateUserProfile(user.id, { profileImageUrl: url });
                if (updateError) throw updateError;

                await supabase.from('users').upsert({
                    id: user.id,
                    name: displayName,
                    avatar_url: url,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
            }

            setMessage({ type: 'success', text: '프로필 이미지가 업데이트되었습니다.' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: '이미지 업로드에 실패했습니다.' });
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await updateUserProfile(user.id, { name: displayName });
            if (error) throw error;

            await supabase.from('users').upsert({
                id: user.id,
                name: displayName,
                avatar_url: profileImageUrl || user.user_metadata?.avatar_url,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

            if (isCreator) {
                const { error: bioError } = await updateCreatorProfile(user.id, { bio });
                if (bioError) throw bioError;
            }

            setMessage({ type: 'success', text: '프로필이 업데이트되었습니다.' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: '프로필 업데이트에 실패했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword.length < 6) {
            setPasswordError('비밀번호는 6자 이상이어야 합니다.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await updatePassword(newPassword);
            if (error) throw error;

            setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error(err);
            setPasswordError(err.message || '비밀번호 변경에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!subscription) return;
        setLoading(true);
        try {
            await cancelSubscription(subscription.id);
            setMessage({ type: 'success', text: '구독이 취소되었습니다. 현재 기간이 만료될 때까지 이용 가능합니다.' });
            setShowCancelModal(false);
            // Reload subscription to show status change
            const sub = await getUserSubscription(user!.id);
            setSubscription(sub);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: '구독 취소 중 오류가 발생했습니다. 고객센터로 문의해주세요.' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotification = async (type: 'email' | 'push' | 'marketing', value: boolean) => {
        const updates: any = {};
        if (type === 'email') {
            setEmailNotifications(value);
            updates.emailNotifications = value;
        } else if (type === 'push') {
            setPushNotifications(value);
            updates.pushNotifications = value;
        } else if (type === 'marketing') {
            setMarketingEmails(value);
            updates.marketingEmails = value;
        }

        try {
            const { error } = await supabase.auth.updateUser({ data: updates });
            if (error) throw error;
            // Optimistic update already done via state setters
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
        }
    };

    const { isInstallable, isInstalled, install } = usePWAInstall();

    const handleInstall = async () => {
        const success = await install();
        if (success) {
            setMessage({ type: 'success', text: '앱 설치가 시작되었습니다.' });
        }
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'profile':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">프로필 설정</h3>
                            <p className="text-sm text-zinc-400">계정 정보를 관리하세요.</p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex-shrink-0">
                                <label className="block text-sm font-medium text-zinc-400 mb-3">프로필 이미지</label>
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-2xl overflow-hidden bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shadow-xl">
                                        {profileImageUrl ? (
                                            <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <User className="w-12 h-12 text-zinc-600" />
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                            <UploadIcon className="w-8 h-8 text-white" />
                                            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="flex-1 w-full space-y-5 max-w-lg">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">이메일</label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full px-4 py-3 border border-zinc-800 rounded-xl bg-zinc-900/50 text-zinc-500 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">이름</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full px-4 py-3 border border-zinc-700 rounded-xl bg-zinc-900 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                    />
                                </div>

                                {isCreator && (
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">자기소개 (Bio)</label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 border border-zinc-700 rounded-xl bg-zinc-900 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
                                            placeholder="수강생들에게 자신을 소개해보세요."
                                        />
                                    </div>
                                )}

                                <div className="pt-2">
                                    <Button type="submit" disabled={loading} size="lg" className="w-full md:w-auto">
                                        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 저장 중...</> : '변경사항 저장'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">알림 설정</h3>
                            <p className="text-sm text-zinc-400">어떤 알림을 받을지 선택하세요.</p>
                        </div>
                        <div className="space-y-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 p-2">
                            {[
                                { id: 'email', label: '이메일 알림', desc: '중요한 업데이트 및 계정 활동 알림', state: emailNotifications },
                                { id: 'push', label: '앱 푸시 알림', desc: '실시간 활동 및 메세지 알림', state: pushNotifications },
                                { id: 'marketing', label: '마케팅 정보 수신', desc: '새로운 기능, 할인 및 프로모션 소식', state: marketingEmails }
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/50 rounded-xl transition-colors">
                                    <div>
                                        <div className="font-medium text-white mb-0.5">{item.label}</div>
                                        <div className="text-xs text-zinc-500">{item.desc}</div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleNotification(item.id as any, !item.state)}
                                        className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${item.state ? 'bg-violet-600' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${item.state ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">보안</h3>
                            <p className="text-sm text-zinc-400">계정 보안을 강화하세요.</p>
                        </div>

                        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="w-full text-left px-6 py-5 hover:bg-zinc-800/50 flex justify-between items-center transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                        <Shield className="w-5 h-5 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-white group-hover:text-violet-400 transition-colors">비밀번호 변경</div>
                                        <div className="text-xs text-zinc-500">주기적으로 비밀번호를 변경하여 계정을 보호하세요.</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                            </button>

                            <div className="h-px bg-zinc-800" />

                            <button
                                onClick={signOut}
                                className="w-full text-left px-6 py-5 hover:bg-red-500/5 flex justify-between items-center transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                        <LogOut className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-red-500">로그아웃</div>
                                        <div className="text-xs text-zinc-500">현재 기기에서 로그아웃합니다.</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-red-500 transition-colors" />
                            </button>
                        </div>
                    </div>
                );
            case 'subscription':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">구독 관리</h3>
                            <p className="text-sm text-zinc-400">현재 이용 중인 멤버십을 관리하세요.</p>
                        </div>

                        {subscriptionLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                            </div>
                        ) : subscription ? (
                            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${subscription.cancel_at_period_end ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                        {subscription.cancel_at_period_end ? '해지 예정' : '구독 중'}
                                    </div>
                                </div>

                                <div className="flex items-start gap-5 mb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                        <CreditCard className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white mb-1">Premium Plan</h4>
                                        <p className="text-sm text-zinc-400 mb-2">모든 강좌와 AI 코칭 기능을 무제한으로 이용하세요.</p>
                                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-lg inline-flex">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>다음 결제일: {subscription.current_period_end ? format(new Date(subscription.current_period_end), 'yyyy년 M월 d일', { locale: ko }) : '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {!subscription.cancel_at_period_end && (
                                    <div className="flex justify-end pt-6 border-t border-zinc-800">
                                        <button
                                            onClick={() => setShowCancelModal(true)}
                                            className="text-sm text-zinc-500 hover:text-red-400 underline transition-colors"
                                        >
                                            구독 취소하기
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 text-center">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CreditCard className="w-8 h-8 text-zinc-600" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">활성화된 구독이 없습니다</h3>
                                <p className="text-zinc-400 mb-6">프리미엄 멤버십으로 업그레이드하고 모든 기능을 이용해보세요.</p>
                                <Button variant="primary" onClick={() => window.location.href = '/pricing'}>
                                    멤버십 알아보기
                                </Button>
                            </div>
                        )}
                    </div>
                );
            case 'app':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">앱 관리</h3>
                            <p className="text-sm text-zinc-400">Grapplay를 앱으로 설치하여 더 편하게 이용하세요.</p>
                        </div>

                        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8">
                            {isInstalled ? (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                        <Check className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white mb-1">앱이 설치되어 있습니다</h4>
                                        <p className="text-sm text-zinc-400">홈 화면이나 앱 목록에서 Grapplay를 실행할 수 있습니다.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="w-32 h-32 rounded-3xl bg-zinc-800 flex items-center justify-center border border-zinc-700 shadow-2xl relative group overflow-hidden">
                                        <img src="/pwa-192x192.png" alt="App Icon" className="w-20 h-20 rounded-2xl shadow-lg" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                    </div>
                                    <div className="flex-1 text-center md:text-left space-y-4">
                                        <div>
                                            <h4 className="text-lg font-bold text-white mb-1">Native App Experience</h4>
                                            <p className="text-sm text-zinc-400 leading-relaxed">
                                                앱으로 설치하면 브라우저 주소창 없이 더 넓은 화면에서<br />
                                                빠르고 쾌적하게 Grapplay를 이용할 수 있습니다.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleInstall}
                                            disabled={!isInstallable}
                                            variant="primary"
                                            size="lg"
                                            className="w-full md:w-auto px-8"
                                        >
                                            <Smartphone className="w-4 h-4 mr-2" />
                                            {isInstallable ? '앱 설치하기' : '브라우저 설정에서 설치 가능'}
                                        </Button>
                                        {!isInstallable && (
                                            <p className="text-[10px] text-zinc-500 italic">
                                                * 이미 설치되어 있거나, 브라우저가 PWA 설치를 지원하지 않을 수 있습니다.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                                <h5 className="text-xs font-bold text-zinc-300 mb-2 uppercase tracking-widest">설치 혜택</h5>
                                <ul className="space-y-2 text-[11px] text-zinc-500 font-medium">
                                    <li className="flex items-center gap-2"><Check className="w-3 h-3 text-violet-500" /> 홈 화면에 바로가기 생성</li>
                                    <li className="flex items-center gap-2"><Check className="w-3 h-3 text-violet-500" /> 오프라인 모드 일부 지원</li>
                                    <li className="flex items-center gap-2"><Check className="w-3 h-3 text-violet-500" /> 주소창 없는 전체 화면 모드</li>
                                </ul>
                            </div>
                            <div className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                                <h5 className="text-xs font-bold text-zinc-300 mb-2 uppercase tracking-widest">수동 설치 방법</h5>
                                <p className="text-[11px] text-zinc-500 leading-relaxed">
                                    iOS(iPhone)의 경우 <strong>'공유하기'</strong> 버튼 클릭 후 <strong>'홈 화면에 추가'</strong>를 눌러 직접 설치해주세요.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'saved':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">저장 목록</h3>
                            <p className="text-sm text-zinc-400">저장한 콘텐츠를 한눈에 관리하세요.</p>
                        </div>

                        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6">
                                <div className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                    저장된 콘텐츠
                                </div>
                            </div>

                            <div className="flex items-start gap-5 mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                    <Bookmark className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-1">라이브러리 접근</h4>
                                    <p className="text-sm text-zinc-400 mb-4">저장한 클래스, 레슨, 루틴, 드릴, 스파링 영상을 한곳에서 관리할 수 있습니다.</p>
                                    <Button
                                        onClick={() => navigate('/saved')}
                                        variant="primary"
                                    >
                                        라이브러리로 이동
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-zinc-800">
                                <h5 className="text-sm font-bold text-zinc-300 mb-4 uppercase tracking-widest">기능</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3 p-4 bg-zinc-800/20 rounded-lg border border-zinc-700/30">
                                        <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-white">클래스 저장</p>
                                            <p className="text-xs text-zinc-400">원하는 클래스를 저장하고 언제든 다시 보기</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-zinc-800/20 rounded-lg border border-zinc-700/30">
                                        <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-white">루틴 저장</p>
                                            <p className="text-xs text-zinc-400">훈련 루틴도 라이브러리에서 관리</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-zinc-800/20 rounded-lg border border-zinc-700/30">
                                        <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-white">드릴 저장</p>
                                            <p className="text-xs text-zinc-400">개별 드릴을 저장해 연습 준비</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-zinc-800/20 rounded-lg border border-zinc-700/30">
                                        <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-white">스파링 영상</p>
                                            <p className="text-xs text-zinc-400">관심 스파링 영상을 모아보기</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-slate-950 min-h-screen py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
                        <SettingsIcon className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">설정</h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <nav className="w-full lg:w-64 flex-shrink-0 space-y-2">
                        {[
                            { id: 'profile', label: '프로필 설정', icon: User },
                            { id: 'saved', label: '저장 목록', icon: Bookmark },
                            { id: 'subscription', label: '멤버십 구독', icon: CreditCard },
                            { id: 'notifications', label: '알림 설정', icon: Bell },
                            { id: 'security', label: '보안', icon: Shield },
                            { id: 'app', label: '앱 관리', icon: Smartphone },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id as SettingsSection)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeSection === item.id
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 translate-x-1'
                                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${activeSection === item.id ? 'text-white' : 'text-zinc-500'}`} />
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        {message && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${message.type === 'success'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                } animate-in fade-in slide-in-from-top-2`}>
                                {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                <span className="font-medium text-sm">{message.text}</span>
                            </div>
                        )}
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-white mb-4">비밀번호 변경</h3>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">새 비밀번호</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-zinc-700 rounded-xl bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-zinc-600"
                                    placeholder="6자 이상 입력"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">비밀번호 확인</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-zinc-700 rounded-xl bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-zinc-600"
                                    placeholder="비밀번호 재입력"
                                    required
                                />
                            </div>

                            {passwordError && (
                                <p className="text-red-400 text-sm flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {passwordError}
                                </p>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        setPasswordError('');
                                    }}
                                    className="flex-1 px-4 py-3 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors font-medium"
                                >
                                    취소
                                </button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1"
                                >
                                    {loading ? '변경 중...' : '변경하기'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Subscription Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-amber-500">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-xl font-bold">정말 구독을 취소하시겠습니까?</h3>
                        </div>
                        <p className="text-zinc-400 mb-6 leading-relaxed">
                            구독을 취소하더라도 <strong>{subscription?.current_period_end ? format(new Date(subscription.current_period_end), 'yyyy년 M월 d일', { locale: ko }) : '이번 결제 주기'}</strong>까지는 혜택을 계속 이용하실 수 있습니다. 이후에는 자동으로 결제되지 않습니다.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors font-bold"
                            >
                                유지하기
                            </button>
                            <button
                                onClick={handleCancelSubscription}
                                disabled={loading}
                                className="flex-1 px-4 py-3 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 transition-colors font-medium"
                            >
                                {loading ? '처리 중...' : '구독 취소'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
