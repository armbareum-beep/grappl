import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getPayPalAccessToken() {
    const clientId = Deno.env.get('VITE_PAYPAL_CLIENT_ID')
    const secret = Deno.env.get('PAYPAL_SECRET_KEY')
    const env = Deno.env.get('VITE_PAYPAL_ENV') || 'sandbox'

    const authUrl = env === 'live'
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token'

    const auth = btoa(`${clientId}:${secret}`)
    const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    })

    const data = await response.json()
    return data.access_token
}

async function verifyPayPalOrder(orderId: string) {
    const env = Deno.env.get('VITE_PAYPAL_ENV') || 'sandbox'
    const orderUrl = env === 'live'
        ? `https://api-m.paypal.com/v2/checkout/orders/${orderId}`
        : `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`

    const accessToken = await getPayPalAccessToken()
    const response = await fetch(orderUrl, {
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

        const { orderID, mode, id, userId } = await req.json()

        console.log(`Verifying PayPal payment: order=${orderID}, mode=${mode}, user=${userId}`)

        // 1. Verify with PayPal
        const orderDetails = await verifyPayPalOrder(orderID)

        if (orderDetails.status !== 'COMPLETED') {
            throw new Error(`Order status is ${orderDetails.status}, not COMPLETED`)
        }

        const amountValue = orderDetails.purchase_units[0].amount.value
        const currencyCode = orderDetails.purchase_units[0].amount.currency_code

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
                price_paid: parseFloat(amountValue)
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
                    paypal_order_id: orderID
                })
                .select()
                .single()

            if (!subError && subData) {
                const months = isYearly ? 12 : 1
                const numericAmount = parseFloat(amountValue);
                const krwAmount = Math.round(numericAmount * 1450);
                const monthlyAmount = Math.floor(krwAmount / months)

                for (let i = 0; i < months; i++) {
                    const recognitionDate = new Date()
                    recognitionDate.setMonth(recognitionDate.getMonth() + i)

                    await supabaseClient.from('revenue_ledger').insert({
                        subscription_id: subData.id,
                        amount: monthlyAmount,
                        platform_fee: monthlyAmount,
                        creator_revenue: 0,
                        product_type: 'subscription',
                        status: 'pending',
                        recognition_date: recognitionDate.toISOString().split('T')[0]
                    })
                }
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
                // PayPal amount is in USD string like "10.00"
                const numericAmount = parseFloat(amountValue);
                const platformFee = Math.floor(numericAmount * 0.2 * 100) / 100; // Keep cents
                const creatorRevenue = numericAmount - platformFee;

                await supabaseClient
                    .from('revenue_ledger')
                    .insert({
                        creator_id: product.creator_id,
                        amount: Math.round(numericAmount * 1450), // Approx KRW
                        platform_fee: Math.round(platformFee * 1450),
                        creator_revenue: Math.round(creatorRevenue * 1450),
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
                amount: Math.round(parseFloat(amountValue) * 100), // Convert to base units if needed, but let's store it as is or consistent with schema
                currency: currencyCode,
                status: 'completed',
                payment_method: 'paypal',
                paypal_order_id: orderID,
                mode: mode,
                target_id: id
            })

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('PayPal Verification Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
