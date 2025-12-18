import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Bell, Shield, CreditCard, ChevronRight, Plus, Trash2, Check, Upload as UploadIcon } from 'lucide-react';
import { updateUserProfile, uploadProfileImage, updateCreatorProfileImage, getCreatorById, updateCreatorProfile, updatePassword } from '../lib/api';
import { supabase } from '../lib/supabase';

type SettingsSection = 'profile' | 'notifications' | 'security' | 'payment';

export const Settings: React.FC = () => {
    const { user, isCreator } = useAuth();
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

    // Load creator profile image if user is creator
    React.useEffect(() => {
        async function loadCreatorProfile() {
            if (isCreator && user) {
                const creator = await getCreatorById(user.id);
                if (creator) {
                    setProfileImageUrl(creator.profileImage);
                    setBio(creator.bio || '');
                }
            }
        }
        loadCreatorProfile();
    }, [isCreator, user]);

    // Load notification preferences from user metadata
    React.useEffect(() => {
        if (user?.user_metadata) {
            setEmailNotifications(user.user_metadata.emailNotifications ?? true);
            setPushNotifications(user.user_metadata.pushNotifications ?? true);
            setMarketingEmails(user.user_metadata.marketingEmails ?? false);
        }
    }, [user]);

    // Payment State (Mock)
    const [cards, setCards] = useState([
        { id: '1', last4: '4242', brand: 'Visa', exp: '12/25' },
        { id: '2', last4: '8888', brand: 'Mastercard', exp: '09/24' }
    ]);
    const [showAddCard, setShowAddCard] = useState(false);
    const [newCard, setNewCard] = useState({ number: '', exp: '', cvc: '' });

    // Password Change State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

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
                // Update user profile with new image URL
                const { error: updateError } = await updateUserProfile(user.id, { profileImageUrl: url });
                if (updateError) throw updateError;

                setProfileImageUrl(url);
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
        setLoading(true);
        setMessage(null);

        try {
            if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');

            const { error } = await updateUserProfile(user.id, { name: displayName });
            if (error) throw error;

            // Also update users table for feed display
            await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    name: displayName,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

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

    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();
        const id = Math.random().toString(36).substr(2, 9);
        const last4 = newCard.number.slice(-4) || '0000';
        setCards([...cards, { id, last4, brand: 'Visa', exp: newCard.exp || '12/28' }]);
        setShowAddCard(false);
        setNewCard({ number: '', exp: '', cvc: '' });
        setMessage({ type: 'success', text: '카드가 추가되었습니다.' });
    };

    const removeCard = (id: string) => {
        setCards(cards.filter(c => c.id !== id));
        setMessage({ type: 'success', text: '카드가 삭제되었습니다.' });
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
            const { error } = await supabase.auth.updateUser({
                data: updates
            });
            if (error) throw error;
            setMessage({ type: 'success', text: '알림 설정이 업데이트되었습니다.' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: '알림 설정 업데이트에 실패했습니다.' });
        }
    };


    const renderContent = () => {
        switch (activeSection) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-white">프로필 설정</h3>
                            <p className="text-sm text-slate-400">계정 정보를 관리하세요.</p>
                        </div>

                        {isCreator && (
                            <div className="max-w-md">
                                <label className="block text-sm font-medium text-slate-300 mb-2">프로필 이미지</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                                        {profileImageUrl ? (
                                            <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-slate-500" />
                                        )}
                                    </div>
                                    <div>
                                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                            <UploadIcon className="w-4 h-4" />
                                            <span>{uploading ? '업로드 중...' : '이미지 업로드'}</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={uploading}
                                                className="hidden"
                                            />
                                        </label>
                                        <p className="text-xs text-slate-500 mt-2">JPG, PNG (최대 5MB)</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">이메일</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">이름</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {isCreator && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">자기소개 (Bio)</label>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="수강생들에게 자신을 소개해보세요."
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? '저장 중...' : '저장하기'}
                            </button>
                        </form>
                    </div>
                );
            case 'payment':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-white">결제 관리</h3>
                            <p className="text-sm text-slate-400">등록된 결제 수단을 관리하세요.</p>
                        </div>

                        <div className="space-y-4">
                            {cards.map(card => (
                                <div key={card.id} className="flex items-center justify-between p-4 border border-slate-700 rounded-lg bg-slate-900">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-6 bg-slate-700 rounded flex items-center justify-center text-xs font-bold text-slate-300">
                                            {card.brand}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">•••• •••• •••• {card.last4}</p>
                                            <p className="text-sm text-slate-400">만료일: {card.exp}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeCard(card.id)} className="text-red-400 hover:text-red-300 p-2">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {showAddCard ? (
                            <form onSubmit={handleAddCard} className="p-4 border border-slate-700 rounded-lg bg-slate-900 space-y-4">
                                <h4 className="font-medium text-white">새 카드 추가</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            placeholder="카드 번호"
                                            className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white"
                                            value={newCard.number}
                                            onChange={e => setNewCard({ ...newCard, number: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="MM/YY"
                                        className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white"
                                        value={newCard.exp}
                                        onChange={e => setNewCard({ ...newCard, exp: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="CVC"
                                        className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white"
                                        value={newCard.cvc}
                                        onChange={e => setNewCard({ ...newCard, cvc: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">추가</button>
                                    <button type="button" onClick={() => setShowAddCard(false)} className="px-4 py-2 border border-slate-700 rounded-md hover:bg-slate-800 text-white">취소</button>
                                </div>
                            </form>
                        ) : (
                            <button onClick={() => setShowAddCard(true)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium">
                                <Plus className="w-4 h-4" /> 새 카드 추가
                            </button>
                        )}
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-white">알림 설정</h3>
                            <p className="text-sm text-slate-400">알림 수신 여부를 설정하세요.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-slate-800">
                                <span className="text-slate-300">이메일 알림</span>
                                <button
                                    onClick={() => handleToggleNotification('email', !emailNotifications)}
                                    className={`w-11 h-6 rounded-full relative transition-colors ${emailNotifications ? 'bg-blue-600' : 'bg-slate-700'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${emailNotifications ? 'right-1' : 'left-1'
                                        }`}></div>
                                </button>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-slate-800">
                                <span className="text-slate-300">앱 푸시 알림</span>
                                <button
                                    onClick={() => handleToggleNotification('push', !pushNotifications)}
                                    className={`w-11 h-6 rounded-full relative transition-colors ${pushNotifications ? 'bg-blue-600' : 'bg-slate-700'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${pushNotifications ? 'right-1' : 'left-1'
                                        }`}></div>
                                </button>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="text-slate-300">마케팅 정보 수신</span>
                                <button
                                    onClick={() => handleToggleNotification('marketing', !marketingEmails)}
                                    className={`w-11 h-6 rounded-full relative transition-colors ${marketingEmails ? 'bg-blue-600' : 'bg-slate-700'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${marketingEmails ? 'right-1' : 'left-1'
                                        }`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-white">보안</h3>
                            <p className="text-sm text-slate-400">계정 보안을 강화하세요.</p>
                        </div>
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="w-full text-left px-4 py-3 border border-slate-700 rounded-lg hover:bg-slate-800 flex justify-between items-center"
                        >
                            <span className="font-medium text-slate-300">비밀번호 변경</span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>

                    </div>
                );
        }
    };

    return (
        <div className="bg-slate-950 min-h-screen py-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-white mb-8">설정</h1>

                <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900">
                        <div className="p-6 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                    <h2 className="font-bold text-white truncate">{user?.user_metadata?.name || '사용자'}</h2>
                                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                        <nav className="p-4 space-y-1">
                            <button
                                onClick={() => setActiveSection('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <User className="w-4 h-4" /> 프로필 설정
                            </button>
                            <button
                                onClick={() => setActiveSection('notifications')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === 'notifications' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Bell className="w-4 h-4" /> 알림 설정
                            </button>
                            <button
                                onClick={() => setActiveSection('security')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === 'security' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Shield className="w-4 h-4" /> 보안
                            </button>
                            <button
                                onClick={() => setActiveSection('payment')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === 'payment' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <CreditCard className="w-4 h-4" /> 결제 관리
                            </button>
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8">
                        {message && (
                            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
                                {message.type === 'success' && <Check className="w-4 h-4" />}
                                {message.text}
                            </div>
                        )}
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-800">
                        <h3 className="text-xl font-bold text-white mb-4">비밀번호 변경</h3>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">새 비밀번호</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="6자 이상 입력"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">비밀번호 확인</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="비밀번호 재입력"
                                    required
                                />
                            </div>

                            {passwordError && (
                                <p className="text-red-400 text-sm">{passwordError}</p>
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
                                    className="flex-1 px-4 py-2 border border-slate-700 rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? '변경 중...' : '변경하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
