import React, { useEffect, useState } from 'react';
import { getSiteSettings, updateSiteSettings } from '../../lib/api-admin';
import { SiteSettings } from '../../types';
import { ArrowLeft, Globe, Building, Type, Save, Loader2, ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { AdminTestimonialsTab } from '../../components/admin/AdminTestimonialsTab';

export const AdminSiteSettings: React.FC = () => {
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'hero' | 'content' | 'business' | 'testimonials'>('hero');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: dbData } = await getSiteSettings();

            // Initialize with an empty object if no data exists
            const data = (dbData || {
                id: 'default',
                logos: {},
                hero: {},
                sectionContent: {},
                sections: {},
                footer: {}
            }) as any;

            // Initialize sections if missing
            if (!data.sections || Object.keys(data.sections).length === 0) {
                data.sections = {
                    dailyFreePass: true,
                    instructors: true,
                    classShowcase: true,
                    drillReels: true,
                    sparringShowcase: true,
                    roadmap: true,
                    routinePromotion: true,
                    testimonials: true,
                    finalCTA: true
                };
            }

            // Helper to merge objects prioritizing non-empty values
            const mergeWithDefaults = (defaults: any, current: any) => {
                const result = { ...defaults, ...(current || {}) };
                Object.keys(defaults).forEach(key => {
                    if (!current || current[key] === undefined || current[key] === null || current[key] === '') {
                        result[key] = defaults[key];
                    }
                });
                return result;
            };

            // Granular initialization for Hero
            const defaultHero = {
                title: '유튜브엔 없는 \n {블랙벨트의 진짜 디테일}',
                subtitle: '파편화된 영상은 이제 그만. \n 매트 위에서 실제로 작동하는 {단 1%의 디테일}을 경험하세요.',
                mediaUrl: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?auto=format&fit=crop&q=80',
                mediaType: 'image' as const
            };
            data.hero = mergeWithDefaults(defaultHero, data.hero);

            // Granular initialization for sectionContent
            const defaultContent: any = {
                dailyFreePass: { title: "TODAY'S {FREE PASS}", subtitle: '매일 프리미엄 콘텐츠가 무료로 공개됩니다.' },
                instructors: { title: '검증되지 않은 기술은 \n {배우지 마세요}', subtitle: 'IBJJF, ADCC 챔피언부터 전,현직 국가대표까지. \n 최고들의 노하우만 담았습니다.' },
                classShowcase: { title: '블랙벨트의 독점 \n {마스터리 커리큘럼}', subtitle: '1분 미리보기로 강의 스타일을 확인하고, 자신에게 맞는 기술을 찾으세요. \n 기초부터 심화까지 이어지는 블랙벨트의 완성된 로드맵을 제시합니다.' },
                drillReels: { title: '오늘의 무료 드릴부터, \n 언제든지 체험 가능한 무료 기술까지.', subtitle: '따로 결제 없이 지금 바로 체험해보세요. \n 상하로 넘겨 60초의 핵심 디테일을 경험하실 수 있습니다.' },
                sparringShowcase: { title: '이론이 실전이 되는 \n {순간을 확인하세요}.', subtitle: '블랙벨트의 기술은 스파링에서 완성됩니다. \n 컷 편집 없는 생생한 스파링 영상으로 기술의 타이밍과 흐름을 직접 체득하세요.' },
                roadmap: { title: '길을 잃지 않는 수련, \n {당신의 다음 테크닉은 무엇입니까?}', subtitle: '단편적인 기술 습득은 성장을 늦출 뿐입니다. \n 레슨과 드릴을 연결하여 당신의 주짓수를 끊김 없는 하나의 흐름으로 만듭니다.' },
                routinePromotion: { title: '반복이 \n 실력을 만듭니다. \n {지치지 않는 꾸준함.}', subtitle: '생각하기 전에 몸이 먼저 반응해야 합니다. \n 오늘 연습할 기술과 연결 동작들을 주간 단위로 플래닝하고 실천하세요.' },
                finalCTA: { title: '성실함이 성장을 보장하던 \n {시대는 끝났습니다.}', subtitle: '똑같은 시간 수련하고도 나만 뒤처지는 기분, 단순히 재능 탓일까요? \n 전략 없는 땀방울은 가장 느린 성장의 지름길입니다.', buttonText: '지금 바로 훈련 시작' }
            };

            const currentContent = (data.sectionContent || {}) as any;
            const mergedContent: any = {};

            Object.keys(defaultContent).forEach(key => {
                const currentSection = currentContent[key] || {};
                mergedContent[key] = mergeWithDefaults(defaultContent[key], currentSection);
            });
            data.sectionContent = mergedContent;

            // Granular initialization for Footer
            const defaultFooter = {
                companyName: '그래플레이',
                representative: '이바름',
                registrationNumber: '111-39-34149',
                mailOrderNumber: '진행 중',
                address: '서울 동작대로29길 119, 102-1207',
                email: 'coach0179@naver.com',
                phone: '02-599-6315'
            };
            data.footer = mergeWithDefaults(defaultFooter, data.footer);

            console.log('Final merged settings:', data);
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            toastError('설정을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const { id, updatedAt, ...rest } = settings;
            const { error } = await updateSiteSettings(rest);
            if (error) throw error;
            success('사이트 설정이 저장되었습니다.');
        } catch (error) {
            console.error('Error saving settings:', error);
            toastError('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div></div>;

    const sectionsList = [
        { id: 'dailyFreePass', label: '오늘의 무료 릴스', desc: 'Daily Free Pass 섹션' },
        { id: 'instructors', label: '인스트럭터 캐러셀', desc: '강사진 소개 섹션' },
        { id: 'classShowcase', label: '강좌 쇼케이스', desc: '주요 클래스 카드 리스트' },
        { id: 'drillReels', label: '드릴 릴스', desc: '모바일형 숏폼 영상 섹션' },
        { id: 'sparringShowcase', label: '스파링 쇼케이스', desc: '실전 영상 섹션' },
        { id: 'roadmap', label: '학습 로드맵', desc: '성장 경로 비쥬얼 섹션' },
        { id: 'routinePromotion', label: '루틴 프로모션', desc: '훈련 루틴 기능 소개' },
        { id: 'testimonials', label: '수강 후기', desc: '사용자 리뷰 섹션' },
        { id: 'finalCTA', label: '하단 가입 유도', desc: '페이지 최하단 CTA' }
    ];

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => navigate('/admin')} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"><ArrowLeft className="w-5 h-5" /></button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">사이트 상세 설정</h1>
                            <p className="text-zinc-500 text-sm mt-1">강조할 문구는 <span className="text-violet-400 font-bold">{"{괄호}"}</span>로 감싸주세요.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-violet-900/20"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? '저장 중...' : '변경사항 저장'}
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-1.5 mb-12 flex flex-wrap gap-1">
                    {[
                        { id: 'hero', label: '히어로 (대문)', icon: Globe },
                        { id: 'content', label: '섹션 문구 수정', icon: Type },
                        { id: 'testimonials', label: '수강 후기 관리', icon: Star },
                        { id: 'business', label: '사업자 정보', icon: Building }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveTab(tab.id as any);
                            }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">


                    {/* 2. Hero Tab */}
                    {activeTab === 'hero' && (
                        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-3xl p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-400 mb-2">메인 타이틀 (Title)</label>
                                        <input
                                            type="text"
                                            value={settings?.hero.title || ''}
                                            onChange={(e) => setSettings(prev => prev ? ({ ...prev, hero: { ...prev.hero, title: e.target.value } }) : null)}
                                            className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none transition-all"
                                            placeholder="유튜브엔 없는..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-400 mb-2">서브 타이틀 (Subtitle)</label>
                                        <textarea
                                            rows={4}
                                            value={settings?.hero.subtitle || ''}
                                            onChange={(e) => setSettings(prev => prev ? ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }) : null)}
                                            className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none resize-none transition-all"
                                            placeholder="파편화된 영상은 이제 그만..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-400 mb-2">미디어 타입 & URL</label>
                                        <div className="flex gap-2 mb-3">
                                            {['image', 'video'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setSettings(prev => prev ? ({ ...prev, hero: { ...prev.hero, mediaType: type as any } }) : null)}
                                                    className={`flex-1 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${settings?.hero.mediaType === type ? 'bg-violet-600 border-violet-500 text-white' : 'bg-transparent border-zinc-800 text-zinc-500'}`}
                                                >
                                                    {type === 'image' ? 'Image' : 'Video'}
                                                </button>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={settings?.hero.mediaUrl || ''}
                                            onChange={(e) => setSettings(prev => prev ? ({ ...prev, hero: { ...prev.hero, mediaUrl: e.target.value } }) : null)}
                                            className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Content Tab ( 문구 수정 ) */}
                    {activeTab === 'content' && (
                        <div className="space-y-6">
                            {sectionsList.map((section) => (
                                <div key={section.id} className="bg-zinc-900/60 border border-zinc-800/50 rounded-3xl p-8 hover:border-zinc-700 transition-all">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-xl font-black">{section.label} 문구 설정</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-tighter mb-2">섹션 타이틀</label>
                                            <input
                                                type="text"
                                                value={(settings?.sectionContent?.[section.id as keyof typeof settings.sectionContent] as any)?.title || ''}
                                                onChange={(e) => setSettings(prev => {
                                                    if (!prev) return null;
                                                    const content = { ...prev.sectionContent } as any;
                                                    content[section.id] = {
                                                        ...(content[section.id] || {}),
                                                        title: e.target.value
                                                    };
                                                    return { ...prev, sectionContent: content };
                                                })}
                                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-violet-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-tighter mb-2">섹션 설명 (Subtitle)</label>
                                            <input
                                                type="text"
                                                value={(settings?.sectionContent?.[section.id as keyof typeof settings.sectionContent] as any)?.subtitle || ''}
                                                onChange={(e) => setSettings(prev => {
                                                    if (!prev) return null;
                                                    const content = { ...prev.sectionContent } as any;
                                                    content[section.id] = {
                                                        ...(content[section.id] || {}),
                                                        subtitle: e.target.value
                                                    };
                                                    return { ...prev, sectionContent: content };
                                                })}
                                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-violet-500 outline-none"
                                            />
                                        </div>
                                        {section.id === 'finalCTA' && (
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-tighter mb-2">버튼 텍스트 (CTA Button)</label>
                                                <input
                                                    type="text"
                                                    value={(settings?.sectionContent?.finalCTA as any)?.buttonText || ''}
                                                    onChange={(e) => setSettings(prev => {
                                                        if (!prev) return null;
                                                        const content = { ...prev.sectionContent };
                                                        content.finalCTA = {
                                                            ...(content.finalCTA || {}),
                                                            buttonText: e.target.value
                                                        } as any;
                                                        return { ...prev, sectionContent: content };
                                                    })}
                                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-violet-500 outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 4. Business Tab */}
                    {activeTab === 'business' && (
                        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-3xl p-8 animate-in fade-in duration-300">
                            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                                <Building className="w-5 h-5 text-violet-500" />
                                푸터 노출 사업자 정보
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {[
                                    { key: 'companyName', label: '상호명' },
                                    { key: 'representative', label: '대표자' },
                                    { key: 'registrationNumber', label: '사업자등록번호' },
                                    { key: 'mailOrderNumber', label: '통신판매업 신고번호' },
                                    { key: 'email', label: '이메일' },
                                    { key: 'phone', label: '전화번호' },
                                    { key: 'address', label: '주소' }
                                ].map((field) => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-bold text-zinc-400 mb-2">{field.label}</label>
                                        <input
                                            type="text"
                                            value={(settings?.footer as any)?.[field.key] || ''}
                                            onChange={(e) => setSettings(prev => prev ? ({ ...prev, footer: { ...prev.footer, [field.key]: e.target.value } }) : null)}
                                            className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 5. Testimonials Tab */}
                    {activeTab === 'testimonials' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <AdminTestimonialsTab />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
