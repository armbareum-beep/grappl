import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { createNotification } from '../lib/api-notifications';

export const TossCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        // URL 파라미터 추출
        const authKey = searchParams.get('authKey');
        const customerKey = searchParams.get('customerKey');
        const code = searchParams.get('code'); // 에러 코드
        const message = searchParams.get('message'); // 에러 메시지
        const amount = searchParams.get('amount');
        const returnUrl = searchParams.get('returnUrl');

        // 에러 처리
        if (code) {
            setError(message || '결제 인증에 실패했습니다.');
            return;
        }

        // 필수 파라미터 검증
        if (!authKey || !customerKey) {
            setError('결제 인증 정보가 누락되었습니다.');
            return;
        }

        if (!user) {
            setError('로그인이 필요합니다.');
            return;
        }

        try {
            // Supabase 세션 가져오기
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
            }

            // 백엔드에 빌링 처리 요청
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toss-billing`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        authKey,
                        customerKey,
                        amount: parseInt(amount || '29000', 10),
                        userId: user.id,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '결제 처리에 실패했습니다.');
            }

            // 성공 알림
            createNotification({
                type: 'payment_success',
                user_id: user.id,
                title: '구독 시작',
                message: '월간 멤버십 결제가 완료되었습니다.',
                link: '/settings',
            }).catch(console.error);

            success('월간 멤버십 결제가 완료되었습니다!');

            // 완료 페이지로 이동
            navigate('/payment/complete', {
                state: { returnUrl: returnUrl || undefined }
            });
        } catch (err: any) {
            console.error('Toss callback error:', err);
            setError(err.message);

            // 실패 알림
            if (user) {
                createNotification({
                    type: 'payment_failed',
                    user_id: user.id,
                    title: '결제 실패',
                    message: err.message,
                    link: '/pricing',
                }).catch(console.error);
            }
        }
    };

    if (error) {
        return (
            <ErrorScreen
                title="결제 처리 실패"
                error={error}
                resetMessage="결제 페이지로 돌아가서 다시 시도해주세요."
                onReset={() => navigate('/pricing')}
            />
        );
    }

    return <LoadingScreen message="결제를 처리하고 있습니다..." />;
};
