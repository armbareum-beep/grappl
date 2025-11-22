import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Admin Debug Component
 * Add this temporarily to any page to debug admin status
 * Usage: <AdminDebug />
 */
export const AdminDebug: React.FC = () => {
    const { user, isAdmin, isCreator } = useAuth();
    const [dbAdminStatus, setDbAdminStatus] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkDB() {
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error checking admin status:', error);
            } else {
                setDbAdminStatus(data?.is_admin ?? false);
            }
            setLoading(false);
        }

        checkDB();
    }, [user]);

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white border-2 border-purple-500 rounded-lg shadow-lg p-4 max-w-sm z-50">
            <h3 className="font-bold text-purple-600 mb-2">🔍 Admin Debug Info</h3>
            <div className="text-sm space-y-1">
                <p><strong>User ID:</strong> {user.id.substring(0, 8)}...</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>isAdmin (Context):</strong>
                    <span className={isAdmin ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {' '}{isAdmin ? '✓ TRUE' : '✗ FALSE'}
                    </span>
                </p>
                <p><strong>isAdmin (DB):</strong>
                    {loading ? ' Loading...' : (
                        <span className={dbAdminStatus ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            {' '}{dbAdminStatus ? '✓ TRUE' : '✗ FALSE'}
                        </span>
                    )}
                </p>
                <p><strong>isCreator:</strong>
                    <span className={isCreator ? 'text-green-600' : 'text-slate-400'}>
                        {' '}{isCreator ? '✓ TRUE' : '✗ FALSE'}
                    </span>
                </p>
            </div>
            {!loading && isAdmin !== dbAdminStatus && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    ⚠️ Mismatch detected! Try logging out and back in.
                </div>
            )}
        </div>
    );
};
