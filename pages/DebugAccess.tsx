import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function DebugAccess() {
    const { user, isSubscribed, isAdmin, loading } = useAuth();
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [fetchStatus, setFetchStatus] = useState<string>('대기 중');

    // loading 타임아웃: 5초 후에도 loading이면 강제로 진행
    const [loadingTimedOut, setLoadingTimedOut] = useState(false);
    useEffect(() => {
        if (!loading) {
            setLoadingTimedOut(false);
            return;
        }
        const timer = setTimeout(() => {
            console.warn('[DebugAccess] Auth loading timed out after 5s');
            setLoadingTimedOut(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, [loading]);

    useEffect(() => {
        async function fetchDebugInfo() {
            if (!user) {
                setFetchStatus('user 없음 (AuthContext loading 중일 수 있음)');
                return;
            }

            try {
                setFetchStatus('DB 쿼리 시작...');

                // Get user data - EXACT same query as CourseDetail
                const { data: directUserData, error: userQueryError } = await supabase
                    .from('users')
                    .select('id, email, is_subscriber, is_complimentary_subscription, is_admin, subscription_tier')
                    .eq('id', user.id)
                    .maybeSingle();

                setFetchStatus('User 쿼리 완료, 코스 쿼리 시작...');

                // Calculate exactly like CourseDetail does
                let calculatedIsSubscribed: boolean | null = null;
                let calculatedIsAdmin: boolean | null = null;

                if (directUserData && !userQueryError) {
                    calculatedIsAdmin = !!(directUserData.is_admin);
                    calculatedIsSubscribed = !!(
                        directUserData.is_subscriber ||
                        directUserData.is_complimentary_subscription ||
                        calculatedIsAdmin
                    );
                }

                // Get sample courses WITH is_subscription_excluded
                const { data: courses, error: coursesError } = await supabase
                    .from('courses')
                    .select('id, title, is_subscription_excluded, price, published')
                    .eq('published', true)
                    .limit(5);

                setFetchStatus('코스 쿼리 완료, 레슨 쿼리 시작...');

                // Get sample lessons with course info
                const { data: lessons, error: lessonsError } = await supabase
                    .from('lessons')
                    .select('id, title, vimeo_url, course_id, is_preview')
                    .limit(5);

                setFetchStatus('완료');

                setDebugInfo({
                    rawUserData: directUserData,
                    userQueryError: userQueryError?.message,
                    calculatedIsSubscribed,
                    calculatedIsAdmin,
                    authContext: { isSubscribed, isAdmin },
                    userObject: {
                        isSubscriber: user?.isSubscriber,
                        is_complimentary_subscription: (user as any)?.is_complimentary_subscription
                    },
                    courses,
                    coursesError: coursesError?.message,
                    lessons,
                    lessonsError: lessonsError?.message,
                    canWatchSimulation: courses?.map((course: any) => {
                        // Simulate canWatchLesson logic
                        const subscriptionStatus = (calculatedIsSubscribed ?? isSubscribed) ??
                            !!(user?.isSubscriber || (user as any)?.is_complimentary_subscription);

                        const adminStatus = (calculatedIsAdmin ?? isAdmin);
                        const wouldHaveAccess =
                            adminStatus || // isAdmin check
                            (subscriptionStatus && !course.is_subscription_excluded); // subscription check

                        return {
                            courseId: course.id,
                            title: course.title,
                            isSubscriptionExcluded: course.is_subscription_excluded,
                            subscriptionStatus,
                            wouldHaveAccess
                        };
                    })
                });
            } catch (e: any) {
                setError(`예외 발생: ${e.message}`);
            }
        }

        fetchDebugInfo();
    }, [user?.id, isSubscribed, isAdmin]);

    // 로딩 중이고 타임아웃 안 됐으면 로딩 화면 (최대 5초)
    if (loading && !loadingTimedOut) return <div className="p-8 bg-gray-900 text-yellow-400 min-h-screen">AuthContext 로딩 중...</div>;
    if (!user) return <div className="p-8 bg-gray-900 text-white min-h-screen">로그인이 필요합니다.</div>;
    if (error) return <div className="p-8 bg-gray-900 text-red-400 min-h-screen">{error}</div>;
    if (!debugInfo) return (
        <div className="p-8 bg-gray-900 text-white min-h-screen">
            <div>상태: {fetchStatus}</div>
            <div className="mt-2 text-gray-400">AuthContext isSubscribed: {isSubscribed ? 'Yes' : 'No'}</div>
            <div className="text-gray-400">AuthContext isAdmin: {isAdmin ? 'Yes' : 'No'}</div>
        </div>
    );

    return (
        <div className="p-8 bg-gray-900 text-white min-h-screen">
            <h1 className="text-2xl font-bold mb-6">전체 권한 디버그</h1>

            <div className="space-y-6">
                {/* Raw DB Query Results */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3 text-blue-400">1. DB 직접 쿼리 결과 (CourseDetail과 동일)</h2>
                    {debugInfo.userQueryError ? (
                        <div className="text-red-400">쿼리 에러: {debugInfo.userQueryError}</div>
                    ) : !debugInfo.rawUserData ? (
                        <div className="text-red-400">데이터 없음 (null)</div>
                    ) : (
                        <div className="space-y-2 font-mono text-sm">
                            <div><span className="text-gray-400">is_subscriber:</span> <span className={debugInfo.rawUserData.is_subscriber ? 'text-green-400' : 'text-red-400'}>{String(debugInfo.rawUserData.is_subscriber)}</span></div>
                            <div><span className="text-gray-400">is_complimentary_subscription:</span> <span className={debugInfo.rawUserData.is_complimentary_subscription ? 'text-green-400' : 'text-red-400'}>{String(debugInfo.rawUserData.is_complimentary_subscription)}</span></div>
                            <div><span className="text-gray-400">is_admin:</span> <span className={debugInfo.rawUserData.is_admin ? 'text-green-400' : 'text-red-400'}>{String(debugInfo.rawUserData.is_admin)}</span></div>
                            <div><span className="text-gray-400">subscription_tier:</span> {debugInfo.rawUserData.subscription_tier || 'null'}</div>
                        </div>
                    )}
                </div>

                {/* Calculated Values (CourseDetail Logic) */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3 text-yellow-400">2. 계산된 값 (CourseDetail 로직)</h2>
                    <div className="space-y-2 font-mono text-sm">
                        <div>
                            <span className="text-gray-400">calculatedIsSubscribed:</span>{' '}
                            <span className={debugInfo.calculatedIsSubscribed ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                {debugInfo.calculatedIsSubscribed === null ? 'null' : String(debugInfo.calculatedIsSubscribed)}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">calculatedIsAdmin:</span>{' '}
                            <span className={debugInfo.calculatedIsAdmin ? 'text-green-400' : 'text-red-400'}>
                                {debugInfo.calculatedIsAdmin === null ? 'null' : String(debugInfo.calculatedIsAdmin)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* AuthContext Values */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3 text-orange-400">3. AuthContext 값</h2>
                    <div className="space-y-2 font-mono text-sm">
                        <div>
                            <span className="text-gray-400">isSubscribed:</span>{' '}
                            <span className={debugInfo.authContext.isSubscribed ? 'text-green-400' : 'text-red-400'}>
                                {String(debugInfo.authContext.isSubscribed)}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">isAdmin:</span>{' '}
                            <span className={debugInfo.authContext.isAdmin ? 'text-green-400' : 'text-red-400'}>
                                {String(debugInfo.authContext.isAdmin)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* User Object Values */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3 text-purple-400">4. User 객체 값 (폴백용)</h2>
                    <div className="space-y-2 font-mono text-sm">
                        <div>
                            <span className="text-gray-400">user.isSubscriber:</span>{' '}
                            <span className={debugInfo.userObject.isSubscriber ? 'text-green-400' : 'text-red-400'}>
                                {String(debugInfo.userObject.isSubscriber ?? 'undefined')}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">user.is_complimentary_subscription:</span>{' '}
                            <span className={debugInfo.userObject.is_complimentary_subscription ? 'text-green-400' : 'text-red-400'}>
                                {String(debugInfo.userObject.is_complimentary_subscription ?? 'undefined')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* canWatchLesson Simulation */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3 text-green-400">5. canWatchLesson 시뮬레이션</h2>
                    {debugInfo.canWatchSimulation?.map((sim: any) => (
                        <div key={sim.courseId} className="mb-3 p-3 bg-gray-900 rounded">
                            <div className="font-semibold mb-2">{sim.title}</div>
                            <div className="space-y-1 font-mono text-xs">
                                <div>
                                    <span className="text-gray-400">isSubscriptionExcluded:</span>{' '}
                                    <span className={sim.isSubscriptionExcluded ? 'text-yellow-400' : 'text-green-400'}>
                                        {String(sim.isSubscriptionExcluded)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400">subscriptionStatus:</span>{' '}
                                    <span className={sim.subscriptionStatus ? 'text-green-400' : 'text-red-400'}>
                                        {String(sim.subscriptionStatus)}
                                    </span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                    <span className="text-gray-400">접근 가능:</span>{' '}
                                    <span className={sim.wouldHaveAccess ? 'text-green-400 font-bold text-lg' : 'text-red-400 font-bold text-lg'}>
                                        {sim.wouldHaveAccess ? '✓ YES' : '✗ NO'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Query Errors */}
                {(debugInfo.coursesError || debugInfo.lessonsError) && (
                    <div className="bg-red-900 p-4 rounded">
                        <h2 className="text-xl font-semibold mb-3">쿼리 에러</h2>
                        {debugInfo.coursesError && <div>Courses: {debugInfo.coursesError}</div>}
                        {debugInfo.lessonsError && <div>Lessons: {debugInfo.lessonsError}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
