import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function DebugAccess() {
    const { user } = useAuth();
    const [debugInfo, setDebugInfo] = useState<any>(null);

    useEffect(() => {
        async function fetchDebugInfo() {
            if (!user) return;

            // Get user data
            const { data: userData } = await supabase
                .from('users')
                .select('id, email, is_subscriber, is_complimentary_subscription, is_admin, subscription_tier')
                .eq('id', user.id)
                .single();

            // Get first course
            const { data: courses } = await supabase
                .from('courses')
                .select('id, title, vimeo_url, preview_vimeo_id')
                .limit(5);

            // Get first lesson
            const { data: lessons } = await supabase
                .from('lessons')
                .select('id, title, vimeo_url')
                .limit(5);

            setDebugInfo({
                user: userData,
                contextOwnedIds: user.ownedVideoIds,
                courses,
                lessons
            });
        }

        fetchDebugInfo();
    }, [user?.id]);

    if (!user) return <div className="p-8">로그인이 필요합니다.</div>;
    if (!debugInfo) return <div className="p-8">로딩 중...</div>;

    return (
        <div className="p-8 bg-gray-900 text-white min-h-screen">
            <h1 className="text-2xl font-bold mb-6">접근 권한 디버그 정보</h1>

            <div className="space-y-6">
                {/* User Info */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3">사용자 정보</h2>
                    <div className="space-y-2 font-mono text-sm">
                        <div><span className="text-gray-400">ID:</span> {debugInfo.user.id}</div>
                        <div><span className="text-gray-400">Email:</span> {debugInfo.user.email}</div>
                        <div><span className="text-gray-400">구독자:</span> {debugInfo.user.is_subscriber ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-400">무료 구독:</span> {debugInfo.user.is_complimentary_subscription ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-400">관리자:</span> {debugInfo.user.is_admin ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-400">구독 티어:</span> {debugInfo.user.subscription_tier || 'None'}</div>
                    </div>
                </div>

                {/* Owned Video IDs from DB - REMOVED */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3">DB owned_video_ids (제거됨)</h2>
                    <p className="text-gray-400 text-sm">컬럼이 삭제되었습니다.</p>
                </div>

                {/* Owned Video IDs from Context */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3">Context ownedVideoIds (처리됨)</h2>
                    <pre className="bg-gray-900 p-3 rounded overflow-x-auto text-xs">
                        {JSON.stringify(debugInfo.contextOwnedIds, null, 2)}
                    </pre>
                </div>

                {/* Courses */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3">샘플 코스 (처음 5개)</h2>
                    {debugInfo.courses?.map((course: any) => (
                        <div key={course.id} className="mb-4 p-3 bg-gray-900 rounded">
                            <div className="font-semibold mb-2">{course.title}</div>
                            <div className="space-y-1 font-mono text-xs">
                                <div><span className="text-gray-400">ID:</span> {course.id}</div>
                                <div><span className="text-gray-400">vimeo_url:</span> {course.vimeo_url || 'null'}</div>
                                <div><span className="text-gray-400">preview_vimeo_id:</span> {course.preview_vimeo_id || 'null'}</div>
                                <div className="mt-2">
                                    <span className="text-gray-400">매칭 여부:</span>{' '}
                                    {debugInfo.contextOwnedIds?.some((oid: string) =>
                                        oid === course.id.toLowerCase() ||
                                        oid === course.vimeo_url?.toLowerCase() ||
                                        oid === course.preview_vimeo_id?.toLowerCase()
                                    ) ? (
                                        <span className="text-green-400">✓ 매칭됨</span>
                                    ) : (
                                        <span className="text-red-400">✗ 매칭 안됨</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Lessons */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-3">샘플 레슨 (처음 5개)</h2>
                    {debugInfo.lessons?.map((lesson: any) => (
                        <div key={lesson.id} className="mb-4 p-3 bg-gray-900 rounded">
                            <div className="font-semibold mb-2">{lesson.title}</div>
                            <div className="space-y-1 font-mono text-xs">
                                <div><span className="text-gray-400">ID:</span> {lesson.id}</div>
                                <div><span className="text-gray-400">vimeo_url:</span> {lesson.vimeo_url || 'null'}</div>
                                <div className="mt-2">
                                    <span className="text-gray-400">매칭 여부:</span>{' '}
                                    {debugInfo.contextOwnedIds?.some((oid: string) =>
                                        oid === lesson.id.toLowerCase() ||
                                        oid === lesson.vimeo_url?.toLowerCase()
                                    ) ? (
                                        <span className="text-green-400">✓ 매칭됨</span>
                                    ) : (
                                        <span className="text-red-400">✗ 매칭 안됨</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
