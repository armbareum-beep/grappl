import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getBundles, createBundle, updateBundle, createCoupon, updateCoupon, getCourses, getCoupons, deleteBundle, deleteCoupon } from '../../lib/api';
import { Bundle, Coupon, Course } from '../../types';
import { Package, Tag, Plus, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const AdminMarketingTab: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [showBundleForm, setShowBundleForm] = useState(false);
    const [showCouponForm, setShowCouponForm] = useState(false);
    const [loading, setLoading] = useState(false);

    // Bundle form state
    const [bundleTitle, setBundleTitle] = useState('');
    const [bundleDescription, setBundleDescription] = useState('');
    const [bundlePrice, setBundlePrice] = useState('');
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

    // Coupon form state
    const [couponCode, setCouponCode] = useState('');
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [discountValue, setDiscountValue] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [expiresAt, setExpiresAt] = useState('');

    // Editing state
    const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'bundle' | 'coupon';
        id: string | null;
    }>({ isOpen: false, type: 'bundle', id: null });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        const [bundlesRes, couponsRes, coursesData] = await Promise.all([
            getBundles(),
            getCoupons(),
            getCourses()
        ]);

        if (bundlesRes.data) {
            setBundles(bundlesRes.data);
        }

        if (couponsRes.data) {
            setCoupons(couponsRes.data);
        }

        setAllCourses(coursesData);
        setLoading(false);
    };

    const handleDeleteBundle = async (id: string) => {
        const { error } = await deleteBundle(id);
        if (error) {
            toastError('번들 삭제 실패: ' + error.message);
        } else {
            success('번들이 삭제되었습니다.');
            await loadData();
        }
        setConfirmModal({ isOpen: false, type: 'bundle', id: null });
    };

    const handleDeleteCoupon = async (id: string) => {
        const { error } = await deleteCoupon(id);
        if (error) {
            toastError('쿠폰 삭제 실패: ' + error.message);
        } else {
            success('쿠폰이 삭제되었습니다.');
            await loadData();
        }
        setConfirmModal({ isOpen: false, type: 'coupon', id: null });
    };

    const openDeleteConfirm = (type: 'bundle' | 'coupon', id: string) => {
        setConfirmModal({ isOpen: true, type, id });
    };

    const handleConfirmAction = () => {
        if (!confirmModal.id) return;
        if (confirmModal.type === 'bundle') {
            handleDeleteBundle(confirmModal.id);
        } else {
            handleDeleteCoupon(confirmModal.id);
        }
    };

    const clearBundleForm = () => {
        setBundleTitle('');
        setBundleDescription('');
        setBundlePrice('');
        setSelectedCourses([]);
        setShowBundleForm(false);
        setEditingBundle(null);
    };

    const clearCouponForm = () => {
        setCouponCode('');
        setDiscountValue('');
        setMaxUses('');
        setExpiresAt('');
        setShowCouponForm(false);
        setEditingCoupon(null);
    };

    const startEditingBundle = (bundle: Bundle) => {
        setEditingBundle(bundle);
        setBundleTitle(bundle.title);
        setBundleDescription(bundle.description);
        setBundlePrice(bundle.price.toString());
        setSelectedCourses(bundle.courseIds || []);
        setShowBundleForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const startEditingCoupon = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setCouponCode(coupon.code);
        setDiscountType(coupon.discountType);
        setDiscountValue(coupon.value.toString());
        setMaxUses(coupon.maxUses?.toString() || '');
        setExpiresAt(coupon.expiresAt || '');
        setShowCouponForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreateBundle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || selectedCourses.length === 0) return;

        const { error } = await createBundle({
            creatorId: user.id,
            title: bundleTitle,
            description: bundleDescription,
            price: parseFloat(bundlePrice),
            courseIds: selectedCourses
        });

        if (error) {
            toastError(`번들 생성 실패: ${error.message}`);
            return;
        }

        clearBundleForm();
        await loadData();
        success('번들이 생성되었습니다!');
    };

    const handleUpdateBundle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBundle) return;

        const { error } = await updateBundle(editingBundle.id, {
            title: bundleTitle,
            description: bundleDescription,
            price: parseFloat(bundlePrice),
            courseIds: selectedCourses
        });

        if (error) {
            toastError('번들 수정 실패: ' + error.message);
        } else {
            success('번들이 수정되었습니다.');
            clearBundleForm();
            await loadData();
        }
    };

    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const { error } = await createCoupon({
            code: couponCode,
            creatorId: user.id,
            discountType,
            value: parseFloat(discountValue),
            maxUses: maxUses ? parseInt(maxUses) : undefined,
            expiresAt: expiresAt || undefined
        });

        if (error) {
            toastError(`쿠폰 생성 실패: ${error.message}`);
            return;
        }

        clearCouponForm();
        await loadData();
        success('쿠폰이 생성되었습니다!');
    };

    const handleUpdateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCoupon) return;

        const { error } = await updateCoupon(editingCoupon.id, {
            code: couponCode,
            discountType,
            value: parseFloat(discountValue),
            maxUses: maxUses ? parseInt(maxUses) : undefined,
            expiresAt: expiresAt || undefined
        });

        if (error) {
            toastError('쿠폰 수정 실패: ' + error.message);
        } else {
            success('쿠폰이 수정되었습니다.');
            clearCouponForm();
            await loadData();
        }
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourses(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    // Group courses by creator
    const coursesByCreator = allCourses.reduce((acc, course) => {
        const creatorName = course.creatorName || 'Unknown';
        if (!acc[creatorName]) {
            acc[creatorName] = [];
        }
        acc[creatorName].push(course);
        return acc;
    }, {} as Record<string, Course[]>);

    return (
        <div className="space-y-12 relative pb-20 animate-in fade-in duration-700">
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, type: 'bundle', id: null })}
                onConfirm={handleConfirmAction}
                title={confirmModal.type === 'bundle' ? '번들 삭제' : '쿠폰 삭제'}
                message={confirmModal.type === 'bundle'
                    ? '정말 이 번들을 삭제하시겠습니까?'
                    : '정말 이 쿠폰을 삭제하시겠습니까?'}
                confirmText="삭제"
                cancelText="취소"
                variant="danger"
            />

            {loading && (
                <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-[100] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Processing Data...</p>
                    </div>
                </div>
            )}

            {/* Platform Bundles Section */}
            <section className="space-y-8">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                            <Package className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">플랫폼 번들 (Bundles)</h2>
                            <p className="text-sm font-medium text-zinc-500">Cross-Creator 패키지 상품을 기획하여 구매 전환율을 높입니다.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBundleForm(!showBundleForm)}
                        className="px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold text-sm tracking-tight hover:bg-violet-700 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-500/30"
                    >
                        <Plus className="w-4 h-4" />
                        새 번들 기획하기
                    </button>
                </div>

                {/* Bundle Form */}
                {showBundleForm && (
                    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/50 p-8 backdrop-blur-xl animate-in slide-in-from-top-4 duration-500">
                        <h3 className="text-lg font-extrabold text-white mb-8 flex items-center gap-2">
                            <span className="w-1 h-6 bg-violet-500 rounded-full" />
                            {editingBundle ? '번들 스펙 수정' : '신규 번들 규격 설정'}
                        </h3>
                        <form onSubmit={editingBundle ? handleUpdateBundle : handleCreateBundle} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                                            번들 타이틀
                                        </label>
                                        <input
                                            type="text"
                                            value={bundleTitle}
                                            onChange={(e) => setBundleTitle(e.target.value)}
                                            placeholder="예: 주짓수 기본기 완성 패키지"
                                            className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 placeholder-zinc-700 transition-all font-bold"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                                            정가 설정 (KRW)
                                        </label>
                                        <input
                                            type="number"
                                            value={bundlePrice}
                                            onChange={(e) => setBundlePrice(e.target.value)}
                                            placeholder="120000"
                                            className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 placeholder-zinc-700 transition-all font-mono font-bold text-lg"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                                            상세 요약 설명
                                        </label>
                                        <textarea
                                            value={bundleDescription}
                                            onChange={(e) => setBundleDescription(e.target.value)}
                                            placeholder="사용자에게 노출될 번들의 메인 USP를 입력하세요"
                                            className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 placeholder-zinc-700 resize-none transition-all leading-relaxed font-bold"
                                            rows={4}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                                        번들 구성 강좌 라이브러리 (최소 1개 선택)
                                    </label>
                                    <div className="max-h-[380px] overflow-y-auto border border-zinc-800 rounded-2xl p-2 bg-zinc-950 custom-scrollbar">
                                        {Object.entries(coursesByCreator).map(([creatorName, courses]) => (
                                            <div key={creatorName} className="mb-4 last:mb-0">
                                                <div className="sticky top-0 bg-zinc-900/80 backdrop-blur-sm py-2 px-4 rounded-xl mb-1 flex items-center justify-between border border-zinc-800/50">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{creatorName}</span>
                                                    <span className="text-[10px] font-bold text-zinc-600">{courses.length} Courses</span>
                                                </div>
                                                <div className="space-y-1 mt-1">
                                                    {courses.map((course) => (
                                                        <label
                                                            key={course.id}
                                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedCourses.includes(course.id) ? 'bg-violet-500/10 border-violet-500/30' : 'hover:bg-zinc-900 border-transparent'}`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedCourses.includes(course.id) ? 'bg-violet-500 border-violet-500' : 'bg-zinc-800 border-zinc-700'}`}>
                                                                {selectedCourses.includes(course.id) && <Plus className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCourses.includes(course.id)}
                                                                onChange={() => toggleCourseSelection(course.id)}
                                                                className="hidden"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold text-zinc-200 truncate">{course.title}</div>
                                                                <div className="text-[10px] font-bold text-zinc-500">₩{course.price.toLocaleString()}</div>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-zinc-800/50">
                                <button
                                    type="submit"
                                    className="flex-1 px-8 py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-violet-700 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                    disabled={selectedCourses.length === 0}
                                >
                                    {editingBundle ? 'Confirm Changes' : 'Publish New Bundle'}
                                </button>
                                <button
                                    type="button"
                                    onClick={clearBundleForm}
                                    className="px-8 py-4 border border-zinc-700 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Bundle List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {bundles.length === 0 ? (
                        <div className="col-span-full py-20 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-4 text-zinc-600">
                            <Package className="w-12 h-12 opacity-20" />
                            <p className="font-bold">기획된 정기 번들 상품이 없습니다.</p>
                        </div>
                    ) : (
                        bundles.map((bundle) => (
                            <div
                                key={bundle.id}
                                className="bg-zinc-900/40 rounded-3xl border border-zinc-800/50 p-8 flex flex-col group relative hover:border-violet-500/50 transition-all backdrop-blur-sm overflow-hidden"
                            >
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-600/10 blur-[50px] rounded-full group-hover:bg-violet-600/20 transition-all" />

                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                    <button
                                        onClick={() => startEditingBundle(bundle)}
                                        className="p-2.5 bg-zinc-800 hover:bg-violet-600 text-zinc-400 hover:text-white rounded-xl transition-all shadow-xl"
                                        title="스펙 수정"
                                    >
                                        <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <button
                                        onClick={() => openDeleteConfirm('bundle', bundle.id)}
                                        className="p-2.5 bg-zinc-800 hover:bg-rose-600 text-zinc-400 hover:text-white rounded-xl transition-all shadow-xl"
                                        title="영구 삭제"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-3 block">Platform Exclusive</span>
                                    <h3 className="text-xl font-extrabold text-white mb-3 tracking-tight pr-10">{bundle.title}</h3>
                                    <p className="text-sm font-medium text-zinc-500 line-clamp-2 leading-relaxed h-[44px]">{bundle.description}</p>
                                </div>

                                <div className="mt-auto pt-8 border-t border-zinc-800/50 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Price Points</div>
                                        <div className="text-2xl font-black text-white tracking-tighter">
                                            ₩{bundle.price.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                            {bundle.courseIds?.length || 0} Modules
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Platform Coupons Section */}
            <section className="space-y-8">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pt-12 border-t border-zinc-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                            <Tag className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">통합 할인 쿠폰 (Coupons)</h2>
                            <p className="text-sm font-medium text-zinc-500">프로모션용 쿠폰 코드를 발급하고 소진 내역을 추적합니다.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCouponForm(!showCouponForm)}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm tracking-tight hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/30"
                    >
                        <Plus className="w-4 h-4" />
                        쿠폰 코드 생성
                    </button>
                </div>

                {/* Coupon Form */}
                {showCouponForm && (
                    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/50 p-8 backdrop-blur-xl animate-in slide-in-from-top-4 duration-500">
                        <h3 className="text-lg font-extrabold text-white mb-8 flex items-center gap-2">
                            <span className="w-1 h-6 bg-emerald-500 rounded-full" />
                            {editingCoupon ? '쿠폰 속성 변경' : '신규 프로모션 코드 발급'}
                        </h3>
                        <form onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                                            CODE (대문자 자동 변환)
                                        </label>
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="예: BLACKFRIDAY50"
                                            className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-zinc-700 font-black tracking-widest text-xl transition-all"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                                                할인 정책
                                            </label>
                                            <select
                                                value={discountType}
                                                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                                                className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-bold transition-all"
                                            >
                                                <option value="percent">PERCENT (%)</option>
                                                <option value="fixed">AMOUNT (KRW)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                                                VALUE
                                            </label>
                                            <input
                                                type="number"
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                placeholder={discountType === 'percent' ? '30' : '20000'}
                                                className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-zinc-700 font-black font-mono transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                                            수량 제한 (LIMIT)
                                        </label>
                                        <input
                                            type="number"
                                            value={maxUses}
                                            onChange={(e) => setMaxUses(e.target.value)}
                                            placeholder="무제한 (Blank)"
                                            className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-zinc-700 font-bold transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                                            유효 기간 종료 (EXPIRATION)
                                        </label>
                                        <input
                                            type="date"
                                            value={expiresAt}
                                            onChange={(e) => setExpiresAt(e.target.value)}
                                            className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-bold transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-zinc-800/50">
                                <button
                                    type="submit"
                                    className="flex-1 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                >
                                    {editingCoupon ? 'Apply Changes' : 'Publish Coupon Code'}
                                </button>
                                <button
                                    type="button"
                                    onClick={clearCouponForm}
                                    className="px-8 py-4 border border-zinc-700 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Coupon List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {coupons.length === 0 ? (
                        <div className="col-span-full py-20 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-4 text-zinc-600">
                            <Tag className="w-12 h-12 opacity-20" />
                            <p className="font-bold">발행된 플랫폼 쿠폰 코드가 없습니다.</p>
                        </div>
                    ) : (
                        coupons.map((coupon) => (
                            <div
                                key={coupon.id}
                                className="bg-zinc-900/40 rounded-3xl border border-zinc-800/50 p-6 group relative hover:border-emerald-500/50 transition-all backdrop-blur-sm overflow-hidden"
                            >
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-10">
                                    <button
                                        onClick={() => startEditingCoupon(coupon)}
                                        className="p-2 bg-zinc-800 hover:bg-emerald-600 text-zinc-500 hover:text-white rounded-lg transition-all shadow-xl"
                                        title="조건 수정"
                                    >
                                        <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <button
                                        onClick={() => openDeleteConfirm('coupon', coupon.id)}
                                        className="p-2 bg-zinc-800 hover:bg-rose-600 text-zinc-500 hover:text-white rounded-lg transition-all shadow-xl"
                                        title="영구 삭제"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="relative mb-6">
                                    <div className="inline-block bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 rounded-xl mb-4">
                                        <code className="text-emerald-400 font-black tracking-widest text-sm">
                                            {coupon.code}
                                        </code>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white tracking-tighter">
                                            {coupon.discountType === 'percent' ? `${coupon.value}%` : `₩${coupon.value.toLocaleString()}`}
                                        </span>
                                        <span className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Off</span>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-zinc-800/50">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-600">Usage</span>
                                        <span className={`px-2 py-0.5 rounded-md ${coupon.maxUses && coupon.usedCount >= coupon.maxUses ? 'bg-rose-500/20 text-rose-500' : 'text-zinc-300'}`}>
                                            {coupon.usedCount} / {coupon.maxUses || '∞'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-600">Issuer</span>
                                        <span className="text-zinc-300 truncate max-w-[100px]">{coupon.creatorName || 'PLATFORM'}</span>
                                    </div>
                                    {coupon.expiresAt && (
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-zinc-600">Expiry</span>
                                            <span className="text-emerald-500/80">{new Date(coupon.expiresAt).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
};
