import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getPortoneAccessToken() {
    const apiSecret = Deno.env.get('PORTONE_API_SECRET')

    const response = await fetch('https://api.portone.io/login/api-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiSecret })
    })

    if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json()
    return data.accessToken
}

/**
 * Process refund via PortOne API and update revenue_ledger
 */
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

        const { paymentId, amount, reason = '관리자 환불 처리' } = await req.json()

        if (!paymentId) {
            throw new Error('paymentId is required')
        }

        console.log(`Processing refund for payment: ${paymentId}, amount: ${amount || 'full'}, reason: ${reason}`)

        // 1. Get PortOne access token
        const accessToken = await getPortoneAccessToken()

        // 2. Call PortOne refund API
        const refundBody: any = { reason }
        if (amount) {
            refundBody.amount = amount // Partial refund
        }

        const refundResponse = await fetch(`https://api.portone.io/payments/${paymentId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(refundBody)
        })

        if (!refundResponse.ok) {
            const errorText = await refundResponse.text()
            console.error(`PortOne refund failed: ${errorText}`)
            throw new Error(`환불 처리 실패: ${errorText}`)
        }

        const refundResult = await refundResponse.json()
        console.log('PortOne refund result:', refundResult)

        // 3. Get the actual refunded amount from response
        const refundedAmount = refundResult.cancellation?.totalAmount || amount

        // 4. Find the subscription related to this payment
        const { data: payment } = await supabaseClient
            .from('payments')
            .select('target_id, amount')
            .eq('portone_payment_id', paymentId)
            .single()

        const subscriptionId = payment?.target_id || null
        const finalRefundAmount = refundedAmount || payment?.amount || amount

        // 5. Add refund record to revenue_ledger
        const { error: ledgerError } = await supabaseClient.from('revenue_ledger').insert({
            subscription_id: subscriptionId,
            amount: -Math.abs(finalRefundAmount),
            platform_fee: -Math.abs(finalRefundAmount),
            creator_revenue: 0,
            product_type: 'refund',
            status: 'refunded',
            recognition_date: new Date().toISOString().split('T')[0]
        })

        if (ledgerError) {
            console.error('Failed to add revenue_ledger record:', ledgerError)
            // Don't throw - refund was successful, just logging failed
        }

        // 6. Update payment status
        await supabaseClient
            .from('payments')
            .update({ status: 'refunded' })
            .eq('portone_payment_id', paymentId)

        // 7. Log admin action
        await supabaseClient.from('audit_logs').insert({
            admin_id: user.id,
            action: 'PROCESS_REFUND',
            target_type: 'payment',
            target_id: paymentId,
            details: `환불 처리 완료: ₩${finalRefundAmount.toLocaleString()} - ${reason}`
        }).catch(() => { }) // Silent fail if table doesn't exist

        console.log(`Refund processed successfully: ${paymentId}, amount: ${finalRefundAmount}`)

        return new Response(JSON.stringify({
            success: true,
            refundedAmount: finalRefundAmount,
            message: `₩${finalRefundAmount.toLocaleString()} 환불이 완료되었습니다.`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Refund processing error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
