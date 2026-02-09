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

// Cancel scheduled payment
async function cancelScheduledPayment(paymentId: string): Promise<boolean> {
    try {
        const accessToken = await getPortoneAccessToken();

        const response = await fetch(`https://api.portone.io/payment-schedules?paymentId=${paymentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Failed to cancel scheduled payment: ${errText}`);
            return false;
        }

        console.log(`Cancelled scheduled payment: ${paymentId}`);
        return true;
    } catch (error) {
        console.error('Error cancelling scheduled payment:', error);
        return false;
    }
}

// Delete billing key
async function deleteBillingKey(billingKey: string): Promise<boolean> {
    try {
        const accessToken = await getPortoneAccessToken();

        const response = await fetch(`https://api.portone.io/billing-keys/${billingKey}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Failed to delete billing key: ${errText}`);
            return false;
        }

        console.log(`Deleted billing key: ${billingKey}`);
        return true;
    } catch (error) {
        console.error('Error deleting billing key:', error);
        return false;
    }
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

        // Get user from auth header
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

        const { subscriptionId, cancelImmediately = false } = await req.json()

        console.log(`Canceling subscription: ${subscriptionId} for user: ${user.id}, immediate: ${cancelImmediately}`)

        // Get subscription
        const { data: subscription, error: subError } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('id', subscriptionId)
            .eq('user_id', user.id)
            .single()

        if (subError || !subscription) {
            throw new Error('Subscription not found')
        }

        // Cancel scheduled payment if exists
        if (subscription.scheduled_payment_id) {
            await cancelScheduledPayment(subscription.scheduled_payment_id)
        }

        // Delete billing key to prevent future charges
        if (subscription.billing_key) {
            await deleteBillingKey(subscription.billing_key)
        }

        if (cancelImmediately) {
            // Immediate cancellation - end subscription now
            await supabaseClient
                .from('subscriptions')
                .update({
                    status: 'canceled',
                    canceled_at: new Date().toISOString(),
                    billing_key: null,
                    scheduled_payment_id: null
                })
                .eq('id', subscriptionId)

            // Update user's subscription status
            await supabaseClient
                .from('users')
                .update({
                    is_subscriber: false,
                    subscription_tier: null,
                    subscription_end_date: new Date().toISOString()
                })
                .eq('id', user.id)
        } else {
            // Cancel at end of period - user keeps access until current_period_end
            await supabaseClient
                .from('subscriptions')
                .update({
                    status: 'canceling', // Will be canceled at period end
                    canceled_at: new Date().toISOString(),
                    billing_key: null,
                    scheduled_payment_id: null
                })
                .eq('id', subscriptionId)
        }

        // Create notification
        await supabaseClient.from('notifications').insert({
            user_id: user.id,
            type: 'subscription_canceled',
            title: '구독 취소 완료',
            message: cancelImmediately
                ? '구독이 즉시 취소되었습니다.'
                : `구독이 ${new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}에 종료됩니다.`,
            link: '/settings',
            is_read: false
        })

        console.log(`Subscription ${subscriptionId} canceled successfully`)

        return new Response(JSON.stringify({
            success: true,
            message: cancelImmediately
                ? '구독이 즉시 취소되었습니다.'
                : `구독이 ${new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}에 종료됩니다.`,
            canceledAt: new Date().toISOString(),
            effectiveEndDate: cancelImmediately
                ? new Date().toISOString()
                : subscription.current_period_end
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Cancel subscription error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
