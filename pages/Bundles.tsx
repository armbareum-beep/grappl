import React, { useState, useEffect } from 'react';
import { getBundles } from '../lib/api';
import { Bundle } from '../types';
import { Package, Search, BookOpen } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { BundleCard } from '../components/BundleCard';

export const Bundles: React.FC = () => {
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadBundles();
    }, []);

    const loadBundles = async () => {
        setLoading(true);
        const { data, error } = await getBundles();
        if (data) {
            setBundles(data);
        }
        setLoading(false);
    };

    const filteredBundles = bundles.filter(bundle =>
        bundle.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bundle.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <LoadingScreen message="번들 목록을 불러오는 중..." />;

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            {/* Header Section */}
            <div className="relative pt-20 pb-16 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium mb-2">
                            <Package className="w-4 h-4 mr-2" />
                            Value Bundles
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                            올인원 <span className="text-blue-500">강좌 번들</span>
                        </h1>
                        <p className="max-w-2xl text-slate-400 text-lg">
                            여러 개의 프리미엄 강좌를 하나로 묶어 합리적인 가격에 만나보세요.
                            한 번의 구매로 관련 기술을 완벽하게 마스터할 수 있습니다.
                        </p>
                    </div>

                    {/* Search & Filter */}
                    <div className="mt-12 max-w-2xl mx-auto">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="번들 제목이나 내용을 검색하세요..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600 backdrop-blur-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bundles Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {filteredBundles.length === 0 ? (
                    <div className="text-center py-24 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                        <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">검색 결과가 없습니다</h3>
                        <p className="text-slate-500">다른 키워드로 검색해보거나 곧 추가될 신규 번들을 기대해주세요.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredBundles.map((bundle) => (
                            <BundleCard key={bundle.id} bundle={bundle} />
                        ))}
                    </div>
                )}
            </div>

            {/* Why Bundles Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-20">
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[120px] -mr-48 -mt-48 rounded-full"></div>
                    <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black text-white leading-tight">
                                왜 번들로 <br />구매해야 하나요?
                            </h2>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <DollarSign className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">최대 50% 할인</h4>
                                        <p className="text-sm text-slate-400">개별 강좌를 각각 구매하는 것보다 훨씬 합리적인 가격으로 구성됩니다.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <BookOpen className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">체계적인 커리큘럼</h4>
                                        <p className="text-sm text-slate-400">서로 보완되는 강좌들로 구성되어 기술의 체계를 잡기에 최적화되어 있습니다.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <div className="aspect-square bg-slate-800/30 rounded-3xl border border-slate-700/50 flex items-center justify-center relative overflow-hidden">
                                <Package className="w-32 h-32 text-blue-500/20 absolute -bottom-8 -right-8 rotate-12" />
                                <div className="relative z-10 text-center space-y-4 p-8">
                                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-900/40">
                                        <Package className="w-8 h-8 text-white" />
                                    </div>
                                    <p className="text-white font-bold text-lg">번들 하나로 <br />모든 관련 지식을 습득하세요</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DollarSign: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);
