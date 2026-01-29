
// ==================== User Analytics ====================

export async function getUserActivityStats(userId: string) {
    const [
        logsRes,
        coursesRes,
        purchasesRes
    ] = await Promise.all([
        supabase.from('user_activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('user_courses').select('*, course:courses(title)').eq('user_id', userId),
        supabase.from('revenue_ledger').select('*').eq('user_id', userId)
    ]);

    return {
        recentActivity: logsRes.data || [],
        enrolledCourses: coursesRes.data || [],
        purchaseHistory: purchasesRes.data || []
    };
}
