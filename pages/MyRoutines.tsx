import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { TrainingRoutinesTab } from '../components/arena/TrainingRoutinesTab';
import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';

const FEATURE_CHANGE_MODAL_KEY = 'training-routines-feature-change-shown';

export const MyRoutines: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const isFullScreen = searchParams.get('fullscreen') === 'true';
    const [showFeatureChangeModal, setShowFeatureChangeModal] = useState(false);

    useEffect(() => {
        const hasShown = sessionStorage.getItem(FEATURE_CHANGE_MODAL_KEY);
        if (!hasShown) {
            setShowFeatureChangeModal(true);
        }
    }, []);

    const handleCloseModal = () => {
        sessionStorage.setItem(FEATURE_CHANGE_MODAL_KEY, 'true');
        setShowFeatureChangeModal(false);
    };

    const toggleFullScreen = () => {
        const newParams = new URLSearchParams(searchParams);
        if (isFullScreen) {
            newParams.delete('fullscreen');
        } else {
            newParams.set('fullscreen', 'true');
        }
        setSearchParams(newParams);
    };

    return (
        <div className={cn(
            "text-zinc-100 flex flex-col transition-all duration-300 bg-zinc-950",
            isFullScreen
                ? "fixed inset-0 z-50 h-screen overflow-y-auto pt-4 px-4 pb-24"
                : "min-h-screen md:pl-28 pt-8 pb-24 px-6 md:px-10"
        )}>
            <div className="flex items-center justify-between mb-6">
                <h1 className={cn(
                    "font-bold text-white transition-all",
                    isFullScreen ? "text-xl" : "text-3xl"
                )}>훈련 루틴</h1>

                <button
                    onClick={toggleFullScreen}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"
                    title={isFullScreen ? "전체화면 나가기" : "전체화면"}
                >
                    {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
            </div>

            <TrainingRoutinesTab />

            {/* 기능 변경 예정 안내 모달 */}
            <Modal
                isOpen={showFeatureChangeModal}
                onClose={handleCloseModal}
                title="훈련 루틴 기능 변경 예정"
                icon={Sparkles}
                iconColor="amber"
                footer={
                    <button
                        onClick={handleCloseModal}
                        className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-2xl transition-all active:scale-[0.98]"
                    >
                        확인
                    </button>
                }
            >
                <p>훈련 루틴은 향후 다른 기능으로 변경될 예정입니다. 더 나은 서비스로 찾아뵙겠습니다!</p>
            </Modal>
        </div>
    );
};
