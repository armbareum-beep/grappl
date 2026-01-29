
// ==================== Payout Management ====================

export interface PayoutRecord {
    id: string;
    creator_id: string;
    creator: {
        name: string;
        email?: string;
    };
    amount: number;
    payout_period_start: string;
    payout_period_end: string;
    status: 'draft' | 'processing' | 'paid';
    processed_at?: string;
    created_at: string;
}

export async function getAdminPayouts(year?: number, month?: number) {
    let query = supabase
        .from('creator_payouts')
        .select(`
            *,
            creator:creators(name)
        `)
        .order('payout_period_start', { ascending: false });

    if (year && month) {
        // Filter by start date falling within specific month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // last day of month
        query = query.gte('payout_period_start', startDate).lte('payout_period_start', endDate);
    }

    const { data, error } = await query;
    return { data, error };
}

export async function calculatePayouts(year: number, month: number) {
    const { data, error } = await supabase
        .rpc('calculate_monthly_payouts', {
            p_year: year,
            p_month: month
        });
    return { data, error };
}

export async function updatePayoutStatus(payoutId: string, status: 'processing' | 'paid') {
    const updates: any = { status };
    if (status === 'paid') {
        updates.processed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('creator_payouts')
        .update(updates)
        .eq('id', payoutId)
        .select()
        .single();

    return { data, error };
}
