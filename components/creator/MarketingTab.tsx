import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getBundles, createBundle, updateBundle, createCoupon, updateCoupon, getCreatorCourses, getCoupons, deleteBundle, deleteCoupon, getDrills } from '../../lib/api';
import { Bundle, Coupon, Course, Drill } from '../../types';
import { Package, Tag, Plus, X, Pencil, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const MarketingTab: React.FC = () => {
    const { user } = useAuth();
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [showBundleForm, setShowBundleForm] = useState(false);
    const [showCouponForm, setShowCouponForm] = useState(false);
    const [loading, setLoading] = useState(false);

    // Bundle form state
    const [bundleTitle, setBundleTitle] = useState('');
    const [bundleDescription, setBundleDescription] = useState('');
    const [bundlePrice, setBundlePrice] = useState('');
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [selectedDrills, setSelectedDrills] = useState<string[]>([]);

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
        const [bundlesRes, couponsRes, coursesData, drillsRes] = await Promise.all([
            getBundles(),
            getCoupons(),
            getCreatorCourses(user.id),
            getDrills(user.id)
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
        if (drillsRes.data) {
            setDrills(drillsRes.data);
        }
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
        setSelectedDrills([]);
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
        setSelectedDrills(bundle.drillIds || []);
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
            courseIds: selectedCourses,
            drillIds: selectedDrills
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
        if (!user || (selectedCourses.length === 0 && selectedDrills.length === 0)) return;

        const { error } = await createBundle({
            creatorId: user.id,
            title: bundleTitle,
            description: bundleDescription,
            price: parseFloat(bundlePrice),
            courseIds: selectedCourses,
            drillIds: selectedDrills
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
        setSelectedDrills([]);
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

    const toggleDrillSelection = (drillId: string) => {
        setSelectedDrills(prev =>
            prev.includes(drillId)
                ? prev.filter(id => id !== drillId)
                : [...prev, drillId]
        );
    };

    return (
        <div className="space-y-8 relative">
            {loading && (
                <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-zinc-400 text-sm">불러오는 중...</p>
                    </div>
                </div>
            )}
            {/* Bundles Section */}
            <div className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <strong>주의:</strong> 번들 및 쿠폰을 통해 판매된 강좌는 구독 수익 정산에 포함되지 않습니다.
                </p>
            </div>

            <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/10 rounded-lg">
                            <Package className="w-6 h-6 text-violet-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">강좌 번들</h2>
                    </div>
                    <button
                        onClick={() => setShowBundleForm(!showBundleForm)}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        번들 만들기
                    </button>
                </div>

                {/* Bundle Form (Create/Edit) */}
                {showBundleForm && (
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 mb-6">
                        <h3 className="font-semibold text-white mb-4">
                            {editingBundle ? '번들 수정하기' : '새 번들 만들기'}
                        </h3>
                        <form onSubmit={editingBundle ? handleUpdateBundle : handleCreateBundle} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    번들 제목
                                </label>
                                <input
                                    type="text"
                                    value={bundleTitle}
                                    onChange={(e) => setBundleTitle(e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-600"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    설명
                                </label>
                                <textarea
                                    value={bundleDescription}
                                    onChange={(e) => setBundleDescription(e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-600"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    가격 (KRW)
                                </label>
                                <input
                                    type="number"
                                    value={bundlePrice}
                                    onChange={(e) => setBundlePrice(e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-600"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    포함할 강좌 선택
                                </label>
                                <div className="space-y-2 max-h-64 overflow-y-auto border border-zinc-700 rounded-lg p-4 bg-zinc-950">
                                    {courses.map((course) => (
                                        <label
                                            key={course.id}
                                            className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCourses.includes(course.id)}
                                                onChange={() => toggleCourseSelection(course.id)}
                                                className="w-4 h-4 text-violet-600 bg-zinc-900 border-zinc-700 rounded focus:ring-violet-500"
                                            />
                                            <span className="text-sm text-zinc-300">{course.title}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">
                                    {selectedCourses.length}개 강좌 선택됨
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    포함할 드릴 선택 (선택사항)
                                </label>
                                <div className="space-y-2 max-h-64 overflow-y-auto border border-zinc-700 rounded-lg p-4 bg-zinc-950">
                                    {drills.map((drill) => (
                                        <label
                                            key={drill.id}
                                            className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedDrills.includes(drill.id)}
                                                onChange={() => toggleDrillSelection(drill.id)}
                                                className="w-4 h-4 text-violet-600 bg-zinc-900 border-zinc-700 rounded focus:ring-violet-500"
                                            />
                                            <span className="text-sm text-zinc-300">{drill.title}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">
                                    {selectedDrills.length}개 드릴 선택됨
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
                                    disabled={selectedCourses.length === 0 && selectedDrills.length === 0}
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
                                    className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors font-medium"
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
                        <div className="col-span-1 md:col-span-2 text-center py-12 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-2">
                            <Package className="w-10 h-10 text-zinc-700" />
                            <p className="text-zinc-500">
                                아직 생성된 번들이 없습니다.
                            </p>
                        </div>
                    ) : (
                        bundles.map((bundle) => (
                            <div
                                key={bundle.id}
                                className="bg-zinc-900/40 rounded-xl border border-zinc-800 p-6 flex flex-col group relative hover:border-violet-500/20 hover:bg-zinc-900/60 transition-all"
                            >
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditingBundle(bundle)}
                                        className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-violet-600 rounded-lg transition-all shadow-lg"
                                        title="수정"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBundle(bundle.id)}
                                        className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-red-600 rounded-lg transition-all shadow-lg"
                                        title="삭제"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <h3 className="font-semibold text-white mb-2 pr-8">{bundle.title}</h3>
                                <p className="text-sm text-zinc-400 mb-6 line-clamp-2 flex-grow">{bundle.description}</p>
                                <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
                                    <span className="text-lg font-bold text-violet-400">
                                        ₩{bundle.price.toLocaleString()}
                                    </span>
                                    <div className="flex gap-2">
                                        {(bundle.courseIds?.length || 0) > 0 && (
                                            <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700/50">
                                                {bundle.courseIds?.length || 0}개 강좌
                                            </span>
                                        )}
                                        {(bundle.drillIds?.length || 0) > 0 && (
                                            <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700/50">
                                                {bundle.drillIds?.length || 0}개 드릴
                                            </span>
                                        )}
                                    </div>
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
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Tag className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">쿠폰</h2>
                    </div>
                    <button
                        onClick={() => setShowCouponForm(!showCouponForm)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        쿠폰 만들기
                    </button>
                </div>

                {/* Coupon Form (Create/Edit) */}
                {showCouponForm && (
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 mb-8">
                        <h3 className="font-semibold text-white mb-4">
                            {editingCoupon ? '쿠폰 수정하기' : '새 쿠폰 만들기'}
                        </h3>
                        <form onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    쿠폰 코드
                                </label>
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="예: SUMMER2024"
                                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-600"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        할인 유형
                                    </label>
                                    <select
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="percent">퍼센트 (%)</option>
                                        <option value="fixed">고정 금액 (KRW)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        할인 값
                                    </label>
                                    <input
                                        type="number"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                        placeholder={discountType === 'percent' ? '10' : '10000'}
                                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-600"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        최대 사용 횟수 (선택)
                                    </label>
                                    <input
                                        type="number"
                                        value={maxUses}
                                        onChange={(e) => setMaxUses(e.target.value)}
                                        placeholder="무제한"
                                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        만료일 (선택)
                                    </label>
                                    <input
                                        type="date"
                                        value={expiresAt}
                                        onChange={(e) => setExpiresAt(e.target.value)}
                                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:[color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
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
                                    className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors font-medium"
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
                        <div className="col-span-1 md:col-span-3 text-center py-12 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-2">
                            <Tag className="w-10 h-10 text-zinc-700" />
                            <p className="text-zinc-500">
                                아직 생성된 쿠폰이 없습니다.
                            </p>
                        </div>
                    ) : (
                        coupons.map((coupon) => (
                            <div
                                key={coupon.id}
                                className="bg-zinc-900/40 rounded-xl border border-zinc-800 p-6 group relative hover:border-emerald-500/20 hover:bg-zinc-900/60 transition-all flex flex-col"
                            >
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditingCoupon(coupon)}
                                        className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-violet-600 rounded-lg transition-all shadow-lg"
                                        title="수정"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCoupon(coupon.id)}
                                        className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-red-600 rounded-lg transition-all shadow-lg"
                                        title="삭제"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <code className="bg-emerald-900/30 text-emerald-400 px-3 py-1.5 rounded-md font-mono text-sm font-bold border border-emerald-900/50 tracking-wider">
                                        {coupon.code}
                                    </code>
                                    <div className="flex-grow"></div>
                                </div>
                                <div className="mb-6 flex-grow">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-white tracking-tight">
                                            {coupon.discountType === 'percent' ? `${coupon.value}%` : `₩${coupon.value.toLocaleString()}`}
                                        </span>
                                        <span className="text-zinc-400 text-sm font-medium">할인</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 text-xs text-zinc-500 border-t border-zinc-800/50 pt-4">
                                    <div className="flex justify-between items-center">
                                        <span>사용 횟수</span>
                                        <span className={`px-2 py-0.5 rounded-full ${coupon.usedCount > 0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                            {coupon.usedCount} / {coupon.maxUses || '무제한'}
                                        </span>
                                    </div>
                                    {coupon.expiresAt && (
                                        <div className="flex justify-between items-center">
                                            <span>만료일</span>
                                            <span className="text-zinc-300">{new Date(coupon.expiresAt).toLocaleDateString()}</span>
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
