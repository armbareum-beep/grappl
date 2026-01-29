
// ==================== Content Review ====================

export async function rejectContent(id: string, type: 'course' | 'drill' | 'sparring', reason: string) {
    const tableMap = {
        'course': 'courses',
        'drill': 'drills',
        'sparring': 'sparring_videos'
    };

    const { data, error } = await supabase
        .from(tableMap[type])
        .update({
            approved: false,
            status: 'rejected',
            rejection_reason: reason
        })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
}

export async function approveContent(id: string, type: 'course' | 'drill' | 'sparring') {
    const tableMap = {
        'course': 'courses',
        'drill': 'drills',
        'sparring': 'sparring_videos'
    };

    const { data, error } = await supabase
        .from(tableMap[type])
        .update({
            approved: true,
            status: 'published',
            rejection_reason: null // Clear reason on approval
        })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
}
