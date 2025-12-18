import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getPortoneAccessToken() {
    const apiKey = Deno.env.get('PORTONE_API_KEY')
    const apiSecret = Deno.env.get('PORTONE_API_SECRET')

    const auth = btoa(`${apiKey}:${apiSecret}`)
    const response = await fetch('https://api.portone.io/login/api-secret', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
    })

    const data = await response.json()
    return data.accessToken
}

async function verifyPortonePayment(paymentId: string) {
    const accessToken = await getPortoneAccessToken()

    const response = await fetch(`https://api.portone.io/payments/${paymentId}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    })

    return await response.json()
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

        const { paymentId, mode, id, userId } = await req.json()

        console.log(`Verifying Portone payment: payment=${paymentId}, mode=${mode}, user=${userId}`)

        // 1. Verify with Portone
        const paymentDetails = await verifyPortonePayment(paymentId)

        if (paymentDetails.status !== 'PAID') {
            throw new Error(`Payment status is ${paymentDetails.status}, not PAID`)
        }

        const amountValue = paymentDetails.amount.total
        const currencyCode = paymentDetails.currency

        // 2. Update Database based on mode
        if (mode === 'course') {
            await supabaseClient
                .from('course_enrollments')
                .upsert({
                    user_id: userId,
                    course_id: id,
                    enrolled_at: new Date().toISOString(),
                }, { onConflict: 'user_id,course_id' })
        } else if (mode === 'routine') {
            await supabaseClient
                .from('user_routines')
                .upsert({
                    user_id: userId,
                    routine_id: id,
                    purchased_at: new Date().toISOString(),
                }, { onConflict: 'user_id,routine_id' })
        } else if (mode === 'drill') {
            await supabaseClient
                .from('user_drills')
                .upsert({
                    user_id: userId,
                    drill_id: id,
                    purchased_at: new Date().toISOString(),
                }, { onConflict: 'user_id,drill_id' })
        } else if (mode === 'bundle') {
            const { data: bundle } = await supabaseClient
                .from('bundles')
                .select('course_ids, drill_ids')
                .eq('id', id)
                .single();

            if (bundle) {
                if (bundle.course_ids) {
                    for (const cId of bundle.course_ids) {
                        await supabaseClient.from('course_enrollments').upsert({
                            user_id: userId,
                            course_id: cId,
                            enrolled_at: new Date().toISOString()
                        }, { onConflict: 'user_id,course_id' })
                    }
                }
                if (bundle.drill_ids) {
                    for (const dId of bundle.drill_ids) {
                        await supabaseClient.from('user_drills').upsert({
                            user_id: userId,
                            drill_id: dId,
                            purchased_at: new Date().toISOString()
                        }, { onConflict: 'user_id,drill_id' })
                    }
                }
            }

            await supabaseClient.from('user_bundles').upsert({
                user_id: userId,
                bundle_id: id,
                price_paid: amountValue
            }, { onConflict: 'user_id,bundle_id' })
        } else if (mode === 'subscription') {
            const tier = id?.includes('premium') || id?.includes('pro') ? 'premium' : 'basic'
            const endDate = new Date()
            endDate.setDate(endDate.getDate() + 30)

            await supabaseClient
                .from('users')
                .update({
                    is_subscriber: true,
                    subscription_tier: tier,
                    subscription_end_date: endDate.toISOString(),
                })
                .eq('id', userId)

            await supabaseClient
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    status: 'active',
                    subscription_tier: tier,
                    plan_interval: 'month',
                    current_period_start: new Date().toISOString(),
                    current_period_end: endDate.toISOString(),
                    portone_payment_id: paymentId
                })
        }

        // 3. Record Payment
        await supabaseClient
            .from('payments')
            .insert({
                user_id: userId,
                amount: amountValue,
                currency: currencyCode,
                status: 'completed',
                payment_method: 'portone',
                portone_payment_id: paymentId,
                mode: mode,
                target_id: id
            })

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Portone Verification Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
