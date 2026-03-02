import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

// Verify webhook signature from PortOne
async function verifyWebhookSignature(
    body: string,
    webhookId: string,
    webhookTimestamp: string,
    webhookSignature: string
): Promise<boolean> {
    const webhookSecret = Deno.env.get('PORTONE_WEBHOOK_SECRET')

    if (!webhookSecret) {
        console.warn('PORTONE_WEBHOOK_SECRET not set, skipping signature verification')
        return true // Allow if secret not configured (for backwards compatibility)
    }

    try {
        // PortOne V2 uses "whsec_" prefix
        const secretBytes = new TextEncoder().encode(webhookSecret.replace('whsec_', ''))

        // Create signed payload: webhook_id.webhook_timestamp.body
        const signedPayload = `${webhookId}.${webhookTimestamp}.${body}`
        const payloadBytes = new TextEncoder().encode(signedPayload)

        // Import key for HMAC
        const key = await crypto.subtle.importKey(
            'raw',
            secretBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )

        // Generate signature
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadBytes)
        const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))

        // PortOne sends multiple signatures separated by space, check if any matches
        const signatures = webhookSignature.split(' ')
        for (const sig of signatures) {
            // Format: v1,<base64_signature>
            const [version, signature] = sig.split(',')
            if (version === 'v1' && signature === expectedSignature) {
                return true
            }
        }

        console.error('Webhook signature verification failed')
        return false
    } catch (error) {
        console.error('Error verifying webhook signature:', error)
        return false
    }
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

// Schedule next month's payment
async function scheduleNextPayment(
    billingKey: string,
    amount: number,
    userId: string
): Promise<string | null> {
    try {
        const accessToken = await getPortoneAccessToken();

        const nextPaymentDate = new Date();
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

        const scheduledPaymentId = `scheduled_${crypto.randomUUID()}`;

        const response = await fetch(`https://api.portone.io/payments/${scheduledPaymentId}/schedule`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                payment: {
                    billingKey: billingKey,
                    orderName: 'Grapplay Monthly Subscription',
                    amount: { total: amount, currency: 'KRW' },
                    customer: { id: userId }
                },
                timeToPay: nextPaymentDate.toISOString()
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Failed to schedule next payment: ${errText}`);
            return null;
        }

        console.log(`Scheduled next payment: ${scheduledPaymentId} for ${nextPaymentDate.toISOString()}`);
        return scheduledPaymentId;
    } catch (error) {
        console.error('Error scheduling next payment:', error);
        return null;
    }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get raw body for signature verification
        const body = await req.text()

        // Get webhook headers
        const webhookId = req.headers.get('webhook-id') || ''
        const webhookTimestamp = req.headers.get('webhook-timestamp') || ''
        const webhookSignature = req.headers.get('webhook-signature') || ''

        // Verify signature
        const isValid = await verifyWebhookSignature(body, webhookId, webhookTimestamp, webhookSignature)
        if (!isValid) {
            console.error('Invalid webhook signature')
            return new Response(JSON.stringify({ error: 'Invalid signature' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const webhookData = JSON.parse(body)
        console.log('PortOne Webhook received:', JSON.stringify(webhookData))

        const { type, data } = webhookData

        // Handle different webhook types
        if (type === 'Transaction.Paid') {
            // Scheduled payment completed successfully
            const paymentId = data?.paymentId

            if (!paymentId) {
                console.log('No paymentId in webhook data');
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            // Check if this is a scheduled subscription payment
            const { data: subscription } = await supabaseClient
                .from('subscriptions')
                .select('*')
                .eq('scheduled_payment_id', paymentId)
                .eq('status', 'active')
                .single()

            if (subscription && subscription.plan_interval === 'month') {
                console.log(`Processing scheduled payment for subscription: ${subscription.id}`)

                // 1. Update subscription period
                const newPeriodStart = new Date()
                const newPeriodEnd = new Date()
                newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)

                await supabaseClient
                    .from('subscriptions')
                    .update({
                        current_period_start: newPeriodStart.toISOString(),
                        current_period_end: newPeriodEnd.toISOString(),
                        portone_payment_id: paymentId
                    })
                    .eq('id', subscription.id)

                // 2. Update user's subscription end date
                await supabaseClient
                    .from('users')
                    .update({
                        subscription_end_date: newPeriodEnd.toISOString()
                    })
                    .eq('id', subscription.user_id)

                // 3. Record payment
                const accessToken = await getPortoneAccessToken()
                const paymentRes = await fetch(`https://api.portone.io/payments/${paymentId}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                })
                const paymentDetails = await paymentRes.json()
                const amountValue = paymentDetails?.amount?.total || subscription.amount || 29000

                await supabaseClient.from('payments').insert({
                    user_id: subscription.user_id,
                    amount: amountValue,
                    currency: 'KRW',
                    status: 'completed',
                    payment_method: 'portone',
                    portone_payment_id: paymentId,
                    mode: 'subscription',
                    target_id: subscription.id
                })

                // 4. Record revenue
                await supabaseClient.from('revenue_ledger').insert({
                    subscription_id: subscription.id,
                    amount: amountValue,
                    platform_fee: amountValue,
                    creator_revenue: 0,
                    product_type: 'subscription',
                    status: 'pending',
                    recognition_date: new Date().toISOString().split('T')[0]
                })

                // 5. Schedule NEXT month's payment
                if (subscription.billing_key) {
                    const nextScheduledId = await scheduleNextPayment(
                        subscription.billing_key,
                        amountValue,
                        subscription.user_id
                    )

                    if (nextScheduledId) {
                        await supabaseClient
                            .from('subscriptions')
                            .update({ scheduled_payment_id: nextScheduledId })
                            .eq('id', subscription.id)

                        console.log(`Next payment scheduled: ${nextScheduledId}`)
                    }
                }

                console.log(`Subscription ${subscription.id} renewed successfully`)
            }
        } else if (type === 'Transaction.Failed') {
            // Scheduled payment failed
            const paymentId = data?.paymentId

            const { data: subscription } = await supabaseClient
                .from('subscriptions')
                .select('*')
                .eq('scheduled_payment_id', paymentId)
                .single()

            if (subscription) {
                console.log(`Payment failed for subscription: ${subscription.id}`)

                // Update subscription status
                await supabaseClient
                    .from('subscriptions')
                    .update({ status: 'past_due' })
                    .eq('id', subscription.id)

                // Create notification for user
                await supabaseClient.from('notifications').insert({
                    user_id: subscription.user_id,
                    type: 'payment_failed',
                    title: '결제 실패',
                    message: '구독 갱신 결제가 실패했습니다. 결제 수단을 확인해주세요.',
                    link: '/settings',
                    is_read: false
                })
            }
        } else if (type === 'BillingKey.Deleted') {
            // Billing key was deleted/expired
            const billingKey = data?.billingKey

            const { data: subscription } = await supabaseClient
                .from('subscriptions')
                .select('*')
                .eq('billing_key', billingKey)
                .single()

            if (subscription) {
                console.log(`Billing key deleted for subscription: ${subscription.id}`)

                await supabaseClient
                    .from('subscriptions')
                    .update({
                        status: 'canceled',
                        billing_key: null
                    })
                    .eq('id', subscription.id)
            }
        } else if (type === 'Transaction.Cancelled' || type === 'Transaction.PartialCancelled') {
            // 환불/취소 처리
            const paymentId = data?.paymentId
            const cancelledAmount = data?.cancellation?.totalAmount || data?.amount?.total || 0

            console.log(`Processing cancellation for payment: ${paymentId}, amount: ${cancelledAmount}`)

            if (!paymentId) {
                console.log('No paymentId in cancellation webhook')
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            // 1. Find subscription by payment ID
            const { data: subscription } = await supabaseClient
                .from('subscriptions')
                .select('*')
                .eq('portone_payment_id', paymentId)
                .single()

            if (subscription) {
                const isFullRefund = type === 'Transaction.Cancelled'

                if (isFullRefund) {
                    // 전액 환불: 구독 취소 + 미래 revenue_ledger 삭제
                    console.log(`Full refund for subscription: ${subscription.id}`)

                    // 구독 상태 변경
                    await supabaseClient
                        .from('subscriptions')
                        .update({ status: 'cancelled' })
                        .eq('id', subscription.id)

                    // 유저 구독 해제
                    await supabaseClient
                        .from('users')
                        .update({
                            is_subscriber: false,
                            subscription_tier: null,
                            subscription_end_date: null
                        })
                        .eq('id', subscription.user_id)

                    // 미래 revenue_ledger 삭제 (아직 인식 안 된 것들)
                    const today = new Date().toISOString().split('T')[0]
                    await supabaseClient
                        .from('revenue_ledger')
                        .delete()
                        .eq('subscription_id', subscription.id)
                        .gte('recognition_date', today)

                    // 환불 레코드 추가 (음수 금액)
                    await supabaseClient.from('revenue_ledger').insert({
                        subscription_id: subscription.id,
                        amount: -cancelledAmount,
                        platform_fee: -cancelledAmount,
                        creator_revenue: 0,
                        product_type: 'refund',
                        status: 'refunded',
                        recognition_date: today
                    })

                    // payments 테이블 업데이트
                    await supabaseClient
                        .from('payments')
                        .update({ status: 'refunded' })
                        .eq('portone_payment_id', paymentId)

                    console.log(`Subscription ${subscription.id} fully refunded and cancelled`)
                } else {
                    // 부분 환불: 환불 레코드만 추가
                    console.log(`Partial refund for subscription: ${subscription.id}, amount: ${cancelledAmount}`)

                    const today = new Date().toISOString().split('T')[0]
                    await supabaseClient.from('revenue_ledger').insert({
                        subscription_id: subscription.id,
                        amount: -cancelledAmount,
                        platform_fee: -cancelledAmount,
                        creator_revenue: 0,
                        product_type: 'refund',
                        status: 'refunded',
                        recognition_date: today
                    })

                    // payments 테이블에 부분 환불 기록
                    await supabaseClient
                        .from('payments')
                        .update({ status: 'partially_refunded' })
                        .eq('portone_payment_id', paymentId)
                }

                // 알림 생성
                await supabaseClient.from('notifications').insert({
                    user_id: subscription.user_id,
                    type: 'refund_processed',
                    title: isFullRefund ? '환불 완료' : '부분 환불 완료',
                    message: `₩${cancelledAmount.toLocaleString()} 환불이 처리되었습니다.`,
                    link: '/settings',
                    is_read: false
                })
            } else {
                // 구독이 아닌 일반 결제 환불 처리 (코스, 드릴 등)
                const { data: payment } = await supabaseClient
                    .from('payments')
                    .select('*')
                    .eq('portone_payment_id', paymentId)
                    .single()

                if (payment) {
                    console.log(`Refund for non-subscription payment: ${payment.id}, mode: ${payment.mode}`)

                    // payments 상태 업데이트
                    await supabaseClient
                        .from('payments')
                        .update({ status: type === 'Transaction.Cancelled' ? 'refunded' : 'partially_refunded' })
                        .eq('id', payment.id)

                    // revenue_ledger에 환불 기록
                    const today = new Date().toISOString().split('T')[0]
                    await supabaseClient.from('revenue_ledger').insert({
                        amount: -cancelledAmount,
                        platform_fee: Math.floor(-cancelledAmount * 0.2),
                        creator_revenue: Math.floor(-cancelledAmount * 0.8),
                        product_type: 'refund',
                        product_id: payment.target_id,
                        status: 'refunded',
                        recognition_date: today
                    })

                    // 구매 기록 삭제 (전액 환불인 경우)
                    if (type === 'Transaction.Cancelled' && payment.mode && payment.target_id) {
                        let tableName = ''
                        if (payment.mode === 'course') tableName = 'course_enrollments'
                        else if (payment.mode === 'drill') tableName = 'user_drills'
                        else if (payment.mode === 'routine') tableName = 'user_routines'
                        else if (payment.mode === 'sparring') tableName = 'user_videos'
                        else if (payment.mode === 'bundle') tableName = 'user_bundles'

                        if (tableName) {
                            const idColumn = payment.mode === 'course' ? 'course_id' :
                                payment.mode === 'drill' ? 'drill_id' :
                                    payment.mode === 'routine' ? 'routine_id' :
                                        payment.mode === 'sparring' ? 'video_id' :
                                            'bundle_id'

                            await supabaseClient
                                .from(tableName)
                                .delete()
                                .eq('user_id', payment.user_id)
                                .eq(idColumn, payment.target_id)

                            console.log(`Removed ${tableName} record for user ${payment.user_id}`)
                        }
                    }
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Webhook processing error:', error)
        // Return 200 to prevent PortOne from retrying
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
