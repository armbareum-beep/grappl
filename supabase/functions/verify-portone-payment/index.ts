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
            const isPro = id?.includes('price_1SYHx') || id?.includes('price_1SYI2')
            const isYearly = id?.includes('price_1SYHw') || id?.includes('price_1SYI2')
            const tier = isPro ? 'premium' : 'basic'

            const endDate = new Date()
            if (isYearly) {
                endDate.setFullYear(endDate.getFullYear() + 1)
            } else {
                endDate.setMonth(endDate.getMonth() + 1)
            }

            await supabaseClient
                .from('users')
                .update({
                    is_subscriber: true,
                    subscription_tier: tier,
                    subscription_end_date: endDate.toISOString(),
                })
                .eq('id', userId)

            const { data: subData, error: subError } = await supabaseClient
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    status: 'active',
                    subscription_tier: tier,
                    plan_interval: isYearly ? 'year' : 'month',
                    current_period_start: new Date().toISOString(),
                    current_period_end: endDate.toISOString(),
                    portone_payment_id: paymentId
                })
                .select()
                .single()

            if (!subError && subData) {
                // For annual subscriptions, recognition is split into 12 months in revenue_ledger
                // Note: Subscription revenue split among creators is usually handled by a separate monthly job.
                // For now, we record the platform-level revenue.
                const months = isYearly ? 12 : 1
                const monthlyAmount = Math.floor(amountValue / months)

                for (let i = 0; i < months; i++) {
                    const recognitionDate = new Date()
                    recognitionDate.setMonth(recognitionDate.getMonth() + i)

                    await supabaseClient.from('revenue_ledger').insert({
                        subscription_id: subData.id,
                        amount: monthlyAmount,
                        platform_fee: monthlyAmount, // Initially platform fee until creator split implemented
                        creator_revenue: 0,
                        product_type: 'subscription',
                        status: 'pending',
                        recognition_date: recognitionDate.toISOString().split('T')[0]
                    })
                }
            }
        } else if (mode === 'feedback') {
            // 1. Update request status
            await supabaseClient
                .from('feedback_requests')
                .update({
                    payment_status: 'paid',
                    paid_at: new Date().toISOString(),
                    status: 'pending'
                })
                .eq('id', id);

            // 2. Create payment record for accounting (Platform Fee 20%)
            const { data: request } = await supabaseClient.from('feedback_requests').select('instructor_id').eq('id', id).single();

            if (request) {
                const platformFee = Math.floor(amountValue * 0.2);
                const creatorRevenue = amountValue - platformFee;

                // Record in central ledger
                await supabaseClient
                    .from('revenue_ledger')
                    .insert({
                        creator_id: request.instructor_id,
                        amount: amountValue,
                        platform_fee: platformFee,
                        creator_revenue: creatorRevenue,
                        product_type: 'feedback',
                        product_id: id,
                        status: 'processed',
                        recognition_date: new Date().toISOString().split('T')[0]
                    });
            }
        }

        // 2.1 Course/Routine Revenue Splitting (8:2)
        if (mode === 'course' || mode === 'routine') {
            const tableName = mode === 'course' ? 'courses' : 'routines';
            const { data: product } = await supabaseClient
                .from(tableName)
                .select('creator_id')
                .eq('id', id)
                .single();

            if (product && product.creator_id) {
                const platformFee = Math.floor(amountValue * 0.2);
                const creatorRevenue = amountValue - platformFee;

                await supabaseClient
                    .from('revenue_ledger')
                    .insert({
                        creator_id: product.creator_id,
                        amount: amountValue,
                        platform_fee: platformFee,
                        creator_revenue: creatorRevenue,
                        product_type: mode,
                        product_id: id,
                        status: 'processed',
                        recognition_date: new Date().toISOString().split('T')[0]
                    });
            }
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
