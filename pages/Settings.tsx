import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Bell, Shield, CreditCard, ChevronRight, Plus, Trash2, Check, Upload as UploadIcon } from 'lucide-react';
import { updateUserProfile, uploadProfileImage, updateCreatorProfileImage, getCreatorById } from '../lib/api';

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

    // Load creator profile image if user is creator
    React.useEffect(() => {
        async function loadCreatorProfile() {
            if (isCreator && user && !profileImageUrl) {
                const creator = await getCreatorById(user.id);
                if (creator) {
                    setProfileImageUrl(creator.profileImage);
                }
            }
        }
        loadCreatorProfile();
    }, [isCreator, user]);

    // Payment State (Mock)
    const [cards, setCards] = useState([
        { id: '1', last4: '4242', brand: 'Visa', exp: '12/25' },
        { id: '2', last4: '8888', brand: 'Mastercard', exp: '09/24' }
    ]);
    const [showAddCard, setShowAddCard] = useState(false);
    const [newCard, setNewCard] = useState({ number: '', exp: '', cvc: '' });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: '이미지 파일만 업로드 가능합니다.' });
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: '파일 크기는 5MB 이하여야 합니다.' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const { url, error } = await uploadProfileImage(user.id, file);
            if (error) throw error;

            if (url && isCreator) {
                // Update creator profile image
                const { error: updateError } = await updateCreatorProfileImage(user.id, url);
                if (updateError) throw updateError;
                setProfileImageUrl(url);
            }

            setMessage({ type: 'success', text: '프로필 이미지가 업데이트되었습니다.' });

            // Reload page after 1 second to reflect changes everywhere
            setTimeout(() => {
                window.location.reload();
            }, 1000);
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
            const { error } = await updateUserProfile(user?.id || '', { name: displayName });
            if (error) throw error;
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
        // Mock adding card
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

    const renderContent = () => {
        switch (activeSection) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-slate-900">프로필 설정</h3>
                            <p className="text-sm text-slate-500">계정 정보를 관리하세요.</p>
                        </div>

                        {/* Profile Image Upload - Only for creators */}
                        {isCreator && (
                            <div className="max-w-md">
                                <label className="block text-sm font-medium text-slate-700 mb-2">프로필 이미지</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
                                        {profileImageUrl ? (
                                            <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-slate-400" />
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 text-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
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
                            <h3 className="text-lg font-medium text-slate-900">결제 관리</h3>
                            <p className="text-sm text-slate-500">등록된 결제 수단을 관리하세요.</p>
                        </div>

                        <div className="space-y-4">
                            {cards.map(card => (
                                <div key={card.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-6 bg-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-600">
                                            {card.brand}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">•••• •••• •••• {card.last4}</p>
                                            <p className="text-sm text-slate-500">만료일: {card.exp}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeCard(card.id)} className="text-red-500 hover:text-red-700 p-2">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {showAddCard ? (
                            <form onSubmit={handleAddCard} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
                                <h4 className="font-medium text-slate-900">새 카드 추가</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            placeholder="카드 번호"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md"
                                            value={newCard.number}
                                            onChange={e => setNewCard({ ...newCard, number: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="MM/YY"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                                        value={newCard.exp}
                                        onChange={e => setNewCard({ ...newCard, exp: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="CVC"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                                        value={newCard.cvc}
                                        onChange={e => setNewCard({ ...newCard, cvc: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">추가</button>
                                    <button type="button" onClick={() => setShowAddCard(false)} className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100">취소</button>
                                </div>
                            </form>
                        ) : (
                            <button onClick={() => setShowAddCard(true)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                                <Plus className="w-4 h-4" /> 새 카드 추가
                            </button>
                        )}
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-slate-900">알림 설정</h3>
                            <p className="text-sm text-slate-500">알림 수신 여부를 설정하세요.</p>
                        </div>
                        <div className="space-y-4">
                            {['이메일 알림', '앱 푸시 알림', '마케팅 정보 수신'].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                                    <span className="text-slate-700">{item}</span>
                                    <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-slate-900">보안</h3>
                            <p className="text-sm text-slate-500">계정 보안을 강화하세요.</p>
                        </div>
                        <button className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex justify-between items-center">
                            <span className="font-medium text-slate-700">비밀번호 변경</span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex justify-between items-center">
                            <span className="font-medium text-slate-700">2단계 인증 설정</span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen py-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">설정</h1>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                    <h2 className="font-bold text-slate-900 truncate">{user?.user_metadata?.name || '사용자'}</h2>
                                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                        <nav className="p-4 space-y-1">
                            <button
                                onClick={() => setActiveSection('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <User className="w-4 h-4" /> 프로필 설정
                            </button>
                            <button
                                onClick={() => setActiveSection('notifications')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Bell className="w-4 h-4" /> 알림 설정
                            </button>
                            <button
                                onClick={() => setActiveSection('security')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === 'security' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Shield className="w-4 h-4" /> 보안
                            </button>
                            <button
                                onClick={() => setActiveSection('payment')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === 'payment' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <CreditCard className="w-4 h-4" /> 결제 관리
                            </button>
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8">
                        {message && (
                            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.type === 'success' && <Check className="w-4 h-4" />}
                                {message.text}
                            </div>
                        )}
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};
