import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getBundles, createBundle, updateBundle, createCoupon, updateCoupon, getCourses, getCoupons, deleteBundle, deleteCoupon } from '../../lib/api';
import { Bundle, Coupon, Course } from '../../types';
import { Package, Tag, Plus, X } from 'lucide-react';

export const AdminMarketingTab: React.FC = () => {
    const { user } = useAuth();
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
            alert(`번들 생성 실패: ${error.message}`);
            return;
        }

        clearBundleForm();
        await loadData();
        alert('번들이 생성되었습니다!');
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
            alert(`쿠폰 생성 실패: ${error.message}`);
            return;
        }

        clearCouponForm();
        await loadData();
        alert('쿠폰이 생성되었습니다!');
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
        <div className="space-y-8 relative">
            {loading && (
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-400 text-sm">불러오는 중...</p>
                    </div>
                </div>
            )}
            {/* Platform Bundles Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Package className="w-6 h-6 text-blue-400" />
                        <div>
                            <h2 className="text-2xl font-bold text-white">플랫폼 번들</h2>
                            <p className="text-sm text-slate-400">여러 크리에이터의 강좌를 묶어서 판매</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBundleForm(!showBundleForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        번들 만들기
                    </button>
                </div>

                {/* Bundle Form */}
                {showBundleForm && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
                        <h3 className="font-semibold text-white mb-4">
                            {editingBundle ? '번들 수정하기' : '새 플랫폼 번들 만들기'}
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
                                    placeholder="예: BJJ 마스터 패키지"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
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
                                    placeholder="번들에 대한 설명을 입력하세요"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
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
                                    placeholder="100000"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    포함할 강좌 선택
                                </label>
                                <div className="space-y-4 max-h-96 overflow-y-auto border border-slate-700 rounded-lg p-4 bg-slate-800/50">
                                    {Object.entries(coursesByCreator).map(([creatorName, courses]) => (
                                        <div key={creatorName} className="space-y-2">
                                            <h4 className="font-semibold text-slate-300 sticky top-0 bg-slate-900 py-1 px-2 rounded">
                                                {creatorName}
                                            </h4>
                                            {courses.map((course) => (
                                                <label
                                                    key={course.id}
                                                    className="flex items-center gap-3 p-2 hover:bg-slate-700 rounded cursor-pointer ml-4 transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCourses.includes(course.id)}
                                                        onChange={() => toggleCourseSelection(course.id)}
                                                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-sm text-slate-200">{course.title}</span>
                                                        <span className="text-xs text-slate-500 ml-2">
                                                            (₩{course.price.toLocaleString()})
                                                        </span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={selectedCourses.length === 0}
                                >
                                    {editingBundle ? '수정 완료' : '번들 생성'}
                                </button>
                                <button
                                    type="button"
                                    onClick={clearBundleForm}
                                    className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Bundle List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bundles.length === 0 ? (
                        <p className="text-slate-500 col-span-3 text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                            아직 생성된 번들이 없습니다.
                        </p>
                    ) : (
                        bundles.map((bundle) => (
                            <div
                                key={bundle.id}
                                className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col group relative hover:border-slate-700 transition-colors"
                            >
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditingBundle(bundle)}
                                        className="p-2 text-slate-500 hover:text-blue-400 bg-slate-800 rounded-lg transition-colors shadow-lg"
                                        title="수정"
                                    >
                                        <Plus className="w-4 h-4 rotate-45" />
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

            {/* Platform Coupons Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Tag className="w-6 h-6 text-green-400" />
                        <div>
                            <h2 className="text-2xl font-bold text-white">플랫폼 쿠폰</h2>
                            <p className="text-sm text-slate-400">모든 강좌에 적용되는 할인 쿠폰</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCouponForm(!showCouponForm)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        쿠폰 만들기
                    </button>
                </div>

                {/* Coupon Form */}
                {showCouponForm && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8">
                        <h3 className="font-semibold text-white mb-4">
                            {editingCoupon ? '쿠폰 수정하기' : '새 플랫폼 쿠폰 만들기'}
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
                                    placeholder="예: WELCOME2024"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
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
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
                                        placeholder={discountType === 'percent' ? '20' : '10000'}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
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
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
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
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
                                    onClick={clearCouponForm}
                                    className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Coupon List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {coupons.length === 0 ? (
                        <p className="text-slate-500 col-span-4 text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                            아직 생성된 쿠폰이 없습니다.
                        </p>
                    ) : (
                        coupons.map((coupon) => (
                            <div
                                key={coupon.id}
                                className="bg-slate-900 rounded-xl border border-slate-800 p-6 group relative hover:border-slate-700 transition-colors"
                            >
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditingCoupon(coupon)}
                                        className="p-2 text-slate-500 hover:text-blue-400 bg-slate-800 rounded-lg transition-colors shadow-lg"
                                        title="수정"
                                    >
                                        <Plus className="w-4 h-4 rotate-45" />
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
                                    <div className="flex justify-between">
                                        <span>생성자</span>
                                        <span className="text-slate-300">{coupon.creatorName || '시스템'}</span>
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
