import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getBundles, createBundle, createCoupon, getCourses } from '../../lib/api';
import { Bundle, Course } from '../../types';
import { Package, Tag, Plus } from 'lucide-react';

export const AdminMarketingTab: React.FC = () => {
    const { user } = useAuth();
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
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
            getCourses()
        ]);

        if (bundlesRes.data) {
            setBundles(bundlesRes.data);
        }
        setAllCourses(coursesData);
    };

    const handleCreateBundle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || selectedCourses.length === 0) return;

        const { error } = await createBundle({
            creatorId: user.id, // Admin ID
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
            creatorId: user.id, // Admin ID for platform-wide coupons
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
        alert('플랫폼 전체 쿠폰이 생성되었습니다!');
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
        <div className="space-y-8">
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

                {/* Bundle Creation Form */}
                {showBundleForm && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
                        <h3 className="font-semibold text-white mb-4">새 플랫폼 번들 만들기</h3>
                        <form onSubmit={handleCreateBundle} className="space-y-4">
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
                                <p className="text-xs text-slate-500 mt-2">
                                    {selectedCourses.length}개 강좌 선택됨
                                    {selectedCourses.length > 0 && (
                                        <span className="ml-2">
                                            • {new Set(allCourses.filter(c => selectedCourses.includes(c.id)).map(c => c.creatorName)).size}명의 크리에이터
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={selectedCourses.length === 0}
                                >
                                    번들 생성
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowBundleForm(false)}
                                    className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Bundle List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bundles.length === 0 ? (
                        <p className="text-slate-500 col-span-3 text-center py-8">
                            아직 생성된 번들이 없습니다.
                        </p>
                    ) : (
                        bundles.map((bundle) => (
                            <div
                                key={bundle.id}
                                className="bg-slate-900 rounded-xl border border-slate-800 p-6 hover:border-slate-700 transition-colors"
                            >
                                <h3 className="font-semibold text-white mb-2">{bundle.title}</h3>
                                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{bundle.description}</p>
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

                {/* Coupon Creation Form */}
                {showCouponForm && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                        <h3 className="font-semibold text-white mb-4">새 플랫폼 쿠폰 만들기</h3>
                        <form onSubmit={handleCreateCoupon} className="space-y-4">
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
                                    쿠폰 생성
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCouponForm(false)}
                                    className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
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
