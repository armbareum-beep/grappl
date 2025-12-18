import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getBundles, createBundle, updateBundle, createCoupon, updateCoupon, getCreatorCourses, getCoupons, deleteBundle, deleteCoupon } from '../../lib/api';
import { Bundle, Coupon, Course } from '../../types';
import { Package, Tag, Plus, X, Pencil } from 'lucide-react';

export const MarketingTab: React.FC = () => {
    const { user } = useAuth();
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
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

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        console.log('Loading Marketing data for user:', user.id);
        const [bundlesRes, couponsRes, coursesData] = await Promise.all([
            getBundles(),
            getCoupons(),
            getCreatorCourses(user.id)
        ]);

        console.log('Bundles result:', bundlesRes);
        console.log('Coupons result:', couponsRes);

        if (bundlesRes.data) {
            const myBundles = (bundlesRes.data as Bundle[]).filter((b: Bundle) => b.creatorId === user.id);
            setBundles(myBundles);
        }

        if (couponsRes.data) {
            const myCoupons = (couponsRes.data as Coupon[]).filter((c: Coupon) => c.creatorId === user.id);
            setCoupons(myCoupons);
        }

        setCourses(coursesData);
        setLoading(false);
    };

    const handleDeleteBundle = async (id: string) => {
        if (!window.confirm('정말 이 번들을 삭제하시겠습니까?')) return;
        const { error } = await deleteBundle(id);
        if (error) {
            alert('번들 삭제 실패: ' + error.message);
        } else {
            alert('번들이 삭제되었습니다.');
            await loadData();
        }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (!window.confirm('정말 이 쿠폰을 삭제하시겠습니까?')) return;
        const { error } = await deleteCoupon(id);
        if (error) {
            alert('쿠폰 삭제 실패: ' + error.message);
        } else {
            alert('쿠폰이 삭제되었습니다.');
            await loadData();
        }
    };

    const clearBundleForm = () => {
        setBundleTitle('');
        setBundleDescription('');
        setBundlePrice('');
        setSelectedCourses([]);
        setShowBundleForm(false);
    };

    const clearCouponForm = () => {
        setCouponCode('');
        setDiscountValue('');
        setMaxUses('');
        setExpiresAt('');
        setShowCouponForm(false);
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
            alert('번들 수정 실패: ' + error.message);
        } else {
            alert('번들이 수정되었습니다.');
            setEditingBundle(null);
            clearBundleForm();
            await loadData();
        }
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
            alert('쿠폰 수정 실패: ' + error.message);
        } else {
            alert('쿠폰이 수정되었습니다.');
            setEditingCoupon(null);
            clearCouponForm();
            await loadData();
        }
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
            console.error('Error creating bundle:', error);
            alert(`번들 생성 실패: ${error.message || '알 수 없는 오류'}`);
            return;
        }

        setBundleTitle('');
        setBundleDescription('');
        setBundlePrice('');
        setSelectedCourses([]);
        setShowBundleForm(false);
        await loadData();
        alert('번들이 생성되었습니다!');
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
            console.error('Error creating coupon:', error);
            alert(`쿠폰 생성 실패: ${error.message || '알 수 없는 오류'}`);
            return;
        }

        setCouponCode('');
        setDiscountValue('');
        setMaxUses('');
        setExpiresAt('');
        setShowCouponForm(false);
        await loadData();
        alert('쿠폰이 생성되었습니다!');
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourses(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    return (
        <div className="space-y-8 relative">
            {loading && (
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-400 text-sm">불러오는 중...</p>
                    </div>
                </div>
            )}
            {/* Bundles Section */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-200 flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <strong>주의:</strong> 번들 및 쿠폰을 통해 판매된 강좌는 구독 수익 정산에 포함되지 않습니다.
                </p>
            </div>

            <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Package className="w-6 h-6 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">강좌 번들</h2>
                    </div>
                    <button
                        onClick={() => setShowBundleForm(!showBundleForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        번들 만들기
                    </button>
                </div>

                {/* Bundle Form (Create/Edit) */}
                {showBundleForm && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
                        <h3 className="font-semibold text-white mb-4">
                            {editingBundle ? '번들 수정하기' : '새 번들 만들기'}
                        </h3>
                        <form onSubmit={editingBundle ? handleUpdateBundle : handleCreateBundle} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    번들 제목
                                </label>
                                <input
                                    type="text"
                                    value={bundleTitle}
                                    onChange={(e) => setBundleTitle(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    설명
                                </label>
                                <textarea
                                    value={bundleDescription}
                                    onChange={(e) => setBundleDescription(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    가격 (KRW)
                                </label>
                                <input
                                    type="number"
                                    value={bundlePrice}
                                    onChange={(e) => setBundlePrice(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    포함할 강좌 선택
                                </label>
                                <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-700 rounded-lg p-4 bg-slate-950">
                                    {courses.map((course) => (
                                        <label
                                            key={course.id}
                                            className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCourses.includes(course.id)}
                                                onChange={() => toggleCourseSelection(course.id)}
                                                className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700"
                                            />
                                            <span className="text-sm text-slate-300">{course.title}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    {selectedCourses.length}개 강좌 선택됨
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    disabled={selectedCourses.length === 0}
                                >
                                    {editingBundle ? '수정 완료' : '번들 생성'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowBundleForm(false);
                                        setEditingBundle(null);
                                        clearBundleForm();
                                    }}
                                    className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Bundle List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bundles.length === 0 ? (
                        <p className="text-slate-500 col-span-2 text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                            아직 생성된 번들이 없습니다.
                        </p>
                    ) : (
                        bundles.map((bundle) => (
                            <div
                                key={bundle.id}
                                className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col group relative"
                            >
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditingBundle(bundle)}
                                        className="p-2 text-slate-500 hover:text-blue-400 bg-slate-800 rounded-lg transition-colors shadow-lg"
                                        title="수정"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBundle(bundle.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 bg-slate-800 rounded-lg transition-colors shadow-lg"
                                        title="삭제"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <h3 className="font-semibold text-white mb-2 pr-8">{bundle.title}</h3>
                                <p className="text-sm text-slate-400 mb-6 line-clamp-2 flex-grow">{bundle.description}</p>
                                <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
                                    <span className="text-lg font-bold text-blue-400">
                                        ₩{bundle.price.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                                        {bundle.courseIds?.length || 0}개 강좌 포함
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Coupons Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Tag className="w-6 h-6 text-green-400" />
                        <h2 className="text-2xl font-bold text-white">쿠폰</h2>
                    </div>
                    <button
                        onClick={() => setShowCouponForm(!showCouponForm)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        쿠폰 만들기
                    </button>
                </div>

                {/* Coupon Form (Create/Edit) */}
                {showCouponForm && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8">
                        <h3 className="font-semibold text-white mb-4">
                            {editingCoupon ? '쿠폰 수정하기' : '새 쿠폰 만들기'}
                        </h3>
                        <form onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    쿠폰 코드
                                </label>
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="예: SUMMER2024"
                                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        할인 유형
                                    </label>
                                    <select
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="percent">퍼센트 (%)</option>
                                        <option value="fixed">고정 금액 (KRW)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        할인 값
                                    </label>
                                    <input
                                        type="number"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                        placeholder={discountType === 'percent' ? '10' : '10000'}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        최대 사용 횟수 (선택)
                                    </label>
                                    <input
                                        type="number"
                                        value={maxUses}
                                        onChange={(e) => setMaxUses(e.target.value)}
                                        placeholder="무제한"
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        만료일 (선택)
                                    </label>
                                    <input
                                        type="date"
                                        value={expiresAt}
                                        onChange={(e) => setExpiresAt(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    {editingCoupon ? '수정 완료' : '쿠폰 생성'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCouponForm(false);
                                        setEditingCoupon(null);
                                        clearCouponForm();
                                    }}
                                    className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                {/* Coupon List */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {coupons.length === 0 ? (
                        <p className="text-slate-500 col-span-3 text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                            아직 생성된 쿠폰이 없습니다.
                        </p>
                    ) : (
                        coupons.map((coupon) => (
                            <div
                                key={coupon.id}
                                className="bg-slate-900 rounded-xl border border-slate-800 p-6 group relative"
                            >
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditingCoupon(coupon)}
                                        className="p-2 text-slate-500 hover:text-blue-400 bg-slate-800 rounded-lg transition-colors shadow-lg"
                                        title="수정"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCoupon(coupon.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 bg-slate-800 rounded-lg transition-colors shadow-lg"
                                        title="삭제"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <code className="bg-green-900/30 text-green-400 px-3 py-1 rounded-md font-mono text-sm font-bold border border-green-900/50">
                                        {coupon.code}
                                    </code>
                                    <div className="flex-grow shadow-lg"></div>
                                </div>
                                <div className="mb-4">
                                    <span className="text-2xl font-bold text-white">
                                        {coupon.discountType === 'percent' ? `${coupon.value}%` : `₩${coupon.value.toLocaleString()}`}
                                    </span>
                                    <span className="text-slate-400 text-sm ml-1">할인</span>
                                </div>
                                <div className="flex flex-col gap-2 text-xs text-slate-500 border-t border-slate-800/50 pt-4">
                                    <div className="flex justify-between">
                                        <span>사용 횟수</span>
                                        <span className="text-slate-300">{coupon.usedCount} / {coupon.maxUses || '무제한'}</span>
                                    </div>
                                    {coupon.expiresAt && (
                                        <div className="flex justify-between">
                                            <span>만료일</span>
                                            <span className="text-slate-300">{new Date(coupon.expiresAt).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
