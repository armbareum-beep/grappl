
import { supabase } from './supabase';

// ==================== System Logs ====================

export async function getSystemLogs(limit = 100) {
    const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    return { data, error };
}
