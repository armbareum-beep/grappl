import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Save, Trash2, Star, Globe, Instagram, Youtube, Phone, Mail, Building2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import { cn } from '../../lib/utils';
import { fetchBrandById, createBrand, updateBrand, deleteBrand, setDefaultBrand, getBrandStats, fetchPendingVerifications, updateVerificationStatus } from '../../lib/api-organizers';
import { uploadImage } from '../../lib/api';
import { EventBrand, GymMemberVerification } from '../../types';

export const ManageBrand: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isNewBrand = !id || id === 'new';
    const navigate = useNavigate();
    const { user, isOrganizer, isAdmin, loading: authLoading } = useAuth();
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(!isNewBrand);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [brand, setBrand] = useState<EventBrand | null>(null);
    const [stats, setStats] = useState<{ totalEvents: number; totalParticipants: number; upcomingEvents: number; completedEvents: number } | null>(null);

    const [pendingRequests, setPendingRequests] = useState<GymMemberVerification[]>([]);
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [logo, setLogo] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [instagram, setInstagram] = useState('');
    const [youtube, setYoutube] = useState('');
    const [website, setWebsite] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [holderName, setHolderName] = useState('');

    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!id || isNewBrand) return;

            try {
                const brandData = await fetchBrandById(id);
                setBrand(brandData);

                // Populate form
                setName(brandData.name);
                setSlug(brandData.slug || '');
                setDescription(brandData.description || '');
                setLogo(brandData.logo || '');
                setCoverImage(brandData.coverImage || '');
                setContactEmail(brandData.contactEmail || '');
                setContactPhone(brandData.contactPhone || '');
                setInstagram(brandData.instagram || '');
                setYoutube(brandData.youtube || '');
                setWebsite(brandData.website || '');
                if (brandData.bankAccount) {
                    setBankName(brandData.bankAccount.bankName || '');
                    setAccountNumber(brandData.bankAccount.accountNumber || '');
                    setHolderName(brandData.bankAccount.holderName || '');
                }

                // Fetch stats
                const statsData = await getBrandStats(id);
                setStats(statsData);

                // Fetch pending requests for this brand
                const requests = await fetchPendingVerifications(user!.id, id);
                setPendingRequests(requests);
            } catch (err: any) {
                toastError('이벤트 팀을 불러오는 중 오류가 발생했습니다.');
                navigate('/organizer/dashboard');
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading && (isOrganizer || isAdmin)) {
            fetchData();
        } else if (!authLoading && !isOrganizer && !isAdmin) {
            navigate('/home');
        }
    }, [id, isNewBrand, authLoading, isOrganizer, isAdmin, navigate, toastError]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingLogo(true);
        try {
            const url = await uploadImage(file, 'hero-images');
            setLogo(url);
            success('로고가 업로드되었습니다.');
        } catch (err: any) {
            toastError('로고 업로드 실패');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingCover(true);
        try {
            const url = await uploadImage(file, 'hero-images');
            setCoverImage(url);
            success('커버 이미지가 업로드되었습니다.');
        } catch (err: any) {
            toastError('커버 이미지 업로드 실패');
        } finally {
            setUploadingCover(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toastError('이벤트 팀 이름을 입력해주세요.');
            return;
        }

        if (!user?.id) return;

        setSaving(true);
        try {
            const brandData = {
                creatorId: user.id,
                name: name.trim(),
                slug: slug.trim() || undefined,
                description: description.trim() || undefined,
                logo: logo || undefined,
                coverImage: coverImage || undefined,
                contactEmail: contactEmail.trim() || undefined,
                contactPhone: contactPhone.trim() || undefined,
                instagram: instagram.trim() || undefined,
                youtube: youtube.trim() || undefined,
                website: website.trim() || undefined,
                bankAccount: bankName && accountNumber && holderName ? {
                    bankName: bankName.trim(),
                    accountNumber: accountNumber.trim(),
                    holderName: holderName.trim(),
                } : undefined,
            };

            if (isNewBrand) {
                const newBrand = await createBrand(brandData);
                success('이벤트 팀이 생성되었습니다!');
                navigate(`/organizer/event-team/${newBrand.id}`);
            } else if (id) {
                await updateBrand(id, brandData);
                success('이벤트 팀이 수정되었습니다.');
            }
        } catch (err: any) {
            toastError(err.message || '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !brand) return;

        if (!confirm(`"${brand.name}" 이벤트 팀을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }

        setDeleting(true);
        try {
            await deleteBrand(id);
            success('이벤트 팀이 삭제되었습니다.');
            navigate('/organizer/dashboard');
        } catch (err: any) {
            toastError(err.message || '삭제 중 오류가 발생했습니다.');
        } finally {
            setDeleting(false);
        }
    };

    const handleSetDefault = async () => {
        if (!id || !user?.id || !brand) return;

        try {
            await setDefaultBrand(id, user.id);
            setBrand({ ...brand, isDefault: true });
            success('기본 이벤트 팀으로 설정되었습니다.');
        } catch (err: any) {
            toastError('기본 이벤트 팀 설정 실패');
        }
    };

    const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
        setUpdatingRequestId(requestId);
        try {
            await updateVerificationStatus(requestId, status);
            setPendingRequests(prev => prev.filter(r => r.id !== requestId));
            success(status === 'approved' ? '승인되었습니다.' : '거절되었습니다.');
        } catch (err: any) {
            toastError('상태 변경 중 오류가 발생했습니다.');
        } finally {
            setUpdatingRequestId(null);
        }
    };

    if (authLoading || loading) {
        return <LoadingScreen message="이벤트 팀 정보 불러오는 중..." />;
    }

    if (!user || (!isOrganizer && !isAdmin)) {
        return null;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 py-6 px-4">
                <div className="max-w-3xl mx-auto">
                    <button
                        onClick={() => navigate('/organizer/dashboard')}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        대시보드로
                    </button>
                    <h1 className="text-2xl font-black">
                        {isNewBrand ? '새 이벤트 팀 만들기' : '이벤트 팀 관리'}
                    </h1>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Stats (only for existing brands) */}
                {!isNewBrand && stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-amber-500">{stats.totalEvents}</div>
                            <div className="text-sm text-zinc-500">총 이벤트</div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-amber-500">{stats.totalParticipants}</div>
                            <div className="text-sm text-zinc-500">총 참가자</div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-green-500">{stats.upcomingEvents}</div>
                            <div className="text-sm text-zinc-500">예정</div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-zinc-400">{stats.completedEvents}</div>
                            <div className="text-sm text-zinc-500">완료</div>
                        </div>
                    </div>
                )}

                {/* Pending Requests Section */}
                {!isNewBrand && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            요청 관리
                            {pendingRequests.length > 0 && (
                                <span className="px-2 py-0.5 bg-amber-500 text-black text-xs font-black rounded-full text-[10px]">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </h2>

                        {pendingRequests.length === 0 ? (
                            <p className="text-sm text-zinc-500 py-4 text-center">대기 중인 요청이 없습니다.</p>
                        ) : (
                            <div className="space-y-3">
                                {pendingRequests.map((request) => (
                                    <div key={request.id} className="flex items-center justify-between p-4 bg-zinc-800/30 border border-zinc-800/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 border border-zinc-700">
                                                {request.studentName?.charAt(0) || <Users className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-bold flex items-center gap-2">
                                                    {request.studentName}
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase",
                                                        request.verificationType === 'brand_subscription'
                                                            ? "bg-amber-500/10 text-amber-500"
                                                            : "bg-blue-500/10 text-blue-400"
                                                    )}>
                                                        {request.verificationType === 'brand_subscription' ? '구독 신청' : '관원 인증'}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-zinc-500 mt-0.5">
                                                    {new Date(request.createdAt).toLocaleDateString()} 신청
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                                disabled={updatingRequestId === request.id}
                                                className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors"
                                            >
                                                거절
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(request.id, 'approved')}
                                                disabled={updatingRequestId === request.id}
                                                className="px-4 py-1.5 text-xs font-black bg-zinc-100 text-black rounded-lg hover:bg-white transition-colors"
                                            >
                                                {updatingRequestId === request.id ? '...' : '승인'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Cover Image */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-zinc-400 mb-2">커버 이미지</label>
                    <div className="relative h-40 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        {coverImage ? (
                            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                커버 이미지 없음
                            </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleCoverUpload}
                                className="hidden"
                                disabled={uploadingCover}
                            />
                            <div className="flex items-center gap-2 text-white">
                                <Upload className="w-5 h-5" />
                                {uploadingCover ? '업로드 중...' : '커버 변경'}
                            </div>
                        </label>
                    </div>
                </div>

                {/* Logo */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-zinc-400 mb-2">로고</label>
                    <div className="flex items-center gap-4">
                        <div className="relative w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                            {logo ? (
                                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-amber-500">
                                    {name.charAt(0) || '?'}
                                </div>
                            )}
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    disabled={uploadingLogo}
                                />
                                <Upload className="w-5 h-5 text-white" />
                            </label>
                        </div>
                        <div className="text-sm text-zinc-500">
                            권장 크기: 200x200px
                        </div>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4">기본 정보</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                팀 이름 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="예: OPMT, 러픈매트"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                URL 슬러그
                            </label>
                            <div className="flex items-center">
                                <span className="text-zinc-500 mr-2">/brand/</span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="my-brand"
                                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">영문 소문자, 숫자, 하이픈만 사용 가능</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                팀 설명
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="팀을 소개해주세요"
                                rows={3}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4">연락처</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                <Mail className="w-4 h-4 inline mr-1" />
                                이메일
                            </label>
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder="contact@brand.com"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                <Phone className="w-4 h-4 inline mr-1" />
                                전화번호
                            </label>
                            <input
                                type="tel"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="010-1234-5678"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4">소셜 미디어</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                <Instagram className="w-4 h-4 inline mr-1" />
                                Instagram
                            </label>
                            <input
                                type="text"
                                value={instagram}
                                onChange={(e) => setInstagram(e.target.value)}
                                placeholder="@username 또는 전체 URL"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                <Youtube className="w-4 h-4 inline mr-1" />
                                YouTube
                            </label>
                            <input
                                type="text"
                                value={youtube}
                                onChange={(e) => setYoutube(e.target.value)}
                                placeholder="채널 URL"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                <Globe className="w-4 h-4 inline mr-1" />
                                웹사이트
                            </label>
                            <input
                                type="url"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Bank Account */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4">
                        <Building2 className="w-5 h-5 inline mr-2" />
                        계좌 정보
                    </h2>
                    <p className="text-sm text-zinc-500 mb-4">
                        참가비 입금을 받을 계좌입니다. 이벤트 생성 시 자동으로 적용됩니다.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">은행명</label>
                            <input
                                type="text"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="예: 국민은행"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">계좌번호</label>
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="숫자만 입력"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">예금주</label>
                            <input
                                type="text"
                                value={holderName}
                                onChange={(e) => setHolderName(e.target.value)}
                                placeholder="예금주 이름"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl font-bold transition-colors"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? '저장 중...' : (isNewBrand ? '이벤트 팀 만들기' : '변경사항 저장')}
                    </button>

                    {!isNewBrand && !brand?.isDefault && (
                        <button
                            onClick={handleSetDefault}
                            className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                            title="기본 이벤트 팀으로 설정"
                        >
                            <Star className="w-5 h-5" />
                        </button>
                    )}

                    {!isNewBrand && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting || (stats?.totalEvents ?? 0) > 0}
                            className="px-6 py-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 disabled:opacity-50 rounded-xl font-bold transition-colors"
                            title={(stats?.totalEvents ?? 0) > 0 ? '이벤트가 있는 이벤트 팀은 삭제할 수 없습니다' : '이벤트 팀 삭제'}
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {!isNewBrand && (stats?.totalEvents ?? 0) > 0 && (
                    <p className="text-sm text-zinc-500 text-center mt-4">
                        이벤트가 있는 이벤트 팀은 삭제할 수 없습니다. 이벤트를 먼저 삭제하거나 다른 이벤트 팀으로 이전해주세요.
                    </p>
                )}
            </div>
        </div>
    );
};
