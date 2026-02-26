import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Verify admin user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('No authorization header')
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        )

        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        // Check if user is admin
        const { data: userData } = await supabaseClient
            .from('users')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        if (!userData?.is_admin) {
            throw new Error('Admin access required')
        }

        const { amount, reason = '관리자 환불 처리', subscriptionId, creatorId } = await req.json()

        if (!amount || amount <= 0) {
            throw new Error('유효한 금액을 입력하세요')
        }

        const refundAmount = -Math.abs(amount)
        const validSubscriptionId = subscriptionId && subscriptionId.trim() ? subscriptionId.trim() : null
        const validCreatorId = creatorId && creatorId.trim() ? creatorId.trim() : null

        // Calculate creator's share of refund (80% of refund goes against creator)
        const creatorRefundShare = validCreatorId ? Math.floor(refundAmount * 0.8) : 0
        const platformRefundShare = validCreatorId ? Math.floor(refundAmount * 0.2) : refundAmount

        // Insert refund record
        const { error: insertError } = await supabaseClient.from('revenue_ledger').insert({
            subscription_id: validSubscriptionId,
            creator_id: validCreatorId,
            amount: refundAmount,
            platform_fee: platformRefundShare,
            creator_revenue: creatorRefundShare,
            product_type: 'refund',
            status: 'refunded',
            recognition_date: new Date().toISOString().split('T')[0]
        })

        if (insertError) {
            console.error('Insert error:', insertError)
            throw new Error(`환불 기록 추가 실패: ${insertError.message}`)
        }

        // Log admin action (ignore errors)
        try {
            await supabaseClient.from('audit_logs').insert({
                admin_id: user.id,
                action: 'ADD_REFUND',
                target_type: 'revenue_ledger',
                target_id: validSubscriptionId || 'manual',
                details: `환불 처리: ${amount}원 - ${reason}`
            })
        } catch {
            // Ignore audit log errors
        }

        console.log(`Refund record added: ${refundAmount} by admin ${user.id}`)

        return new Response(JSON.stringify({
            success: true,
            amount: refundAmount,
            message: `₩${amount.toLocaleString()} 환불 기록이 추가되었습니다.`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Add refund record error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
