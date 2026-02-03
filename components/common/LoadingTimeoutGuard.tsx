import React, { useEffect, useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { hardReload } from '../../lib/utils';

interface LoadingTimeoutGuardProps {
    loading: boolean;
    timeoutMs?: number;
}

export const LoadingTimeoutGuard: React.FC<LoadingTimeoutGuardProps> = ({
    loading,
    timeoutMs = 5000
}) => {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        if (loading) {
            timeout = setTimeout(() => {
                setShowModal(true);
            }, timeoutMs);
        } else {
            setShowModal(false);
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [loading, timeoutMs]);

    const handleClearCache = async () => {
        await hardReload();
    };

    return (
        <ConfirmModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={handleClearCache}
            title="로딩이 지연되고 있습니다"
            message={`네트워크 상태가 좋지 않거나 데이터 캐시 문제일 수 있습니다.\n\n캐시를 삭제하고 새로고침 하시겠습니까?\n(로그아웃 될 수 있습니다)`}
            confirmText="캐시 삭제 및 새로고침"
            cancelText="더 기다리기"
            variant="warning"
        />
    );
};
