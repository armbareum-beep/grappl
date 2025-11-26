import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getBundles, createBundle, createCoupon, getCreatorCourses } from '../../lib/api';
import { Bundle, Coupon, Course } from '../../types';
import { Package, Tag, Plus, X } from 'lucide-react';

export const MarketingTab: React.FC = () => {
    const { user } = useAuth();
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [showBundleForm, setShowBundleForm] = useState(false);
    const [showCouponForm, setShowCouponForm] = useState(false);

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

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        const [bundlesRes, coursesData] = await Promise.all([
            getBundles(),
            getCreatorCourses(user.id)
        ]);

        if (bundlesRes.data) {
            // Filter bundles created by this user
            setBundles(bundlesRes.data.filter(b => b.creatorId === user.id));
        }
        setCourses(coursesData);
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

        if (!error) {
            setBundleTitle('');
            setBundleDescription('');
            setBundlePrice('');
            setSelectedCourses([]);
            setShowBundleForm(false);
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

        if (!error) {
            setCouponCode('');
            setDiscountValue('');
            setMaxUses('');
            setExpiresAt('');
            setShowCouponForm(false);
            alert('쿠폰이 생성되었습니다!');
        }
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourses(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    return (
        <div className="space-y-8">
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

                {/* Bundle Creation Form */}
                {showBundleForm && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
                        <h3 className="font-semibold text-white mb-4">새 번들 만들기</h3>
                        <form onSubmit={handleCreateBundle} className="space-y-4">
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
                                    번들 생성
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowBundleForm(false)}
                                    className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Bundle List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bundles.length === 0 ? (
                        <p className="text-slate-500 col-span-2 text-center py-8">
                            아직 생성된 번들이 없습니다.
                        </p>
                    ) : (
                        bundles.map((bundle) => (
                            <div
                                key={bundle.id}
                                className="bg-slate-900 rounded-xl border border-slate-800 p-6"
                            >
                                <h3 className="font-semibold text-white mb-2">{bundle.title}</h3>
                                <p className="text-sm text-slate-400 mb-4">{bundle.description}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-blue-400">
                                        ₩{bundle.price.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {bundle.courseIds?.length || 0}개 강좌
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

                {/* Coupon Creation Form */}
                {showCouponForm && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                        <h3 className="font-semibold text-white mb-4">새 쿠폰 만들기</h3>
                        <form onSubmit={handleCreateCoupon} className="space-y-4">
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
                                    쿠폰 생성
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCouponForm(false)}
                                    className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
