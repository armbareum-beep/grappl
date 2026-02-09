import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getPortoneAccessToken() {
    const apiSecret = Deno.env.get('PORTONE_API_SECRET')

    const response = await fetch('https://api.portone.io/login/api-secret', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            apiSecret: apiSecret
        })
    })

    if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json()
    return data.accessToken
}

// Schedule next month's payment using PortOne V2 API
async function scheduleNextPayment(
    billingKey: string,
    amount: number,
    userId: string
): Promise<{ scheduleId: string; scheduledPaymentId: string } | null> {
    try {
        const accessToken = await getPortoneAccessToken();

        // Calculate next payment date (1 month from now)
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
                    amount: {
                        total: amount,
                        currency: 'KRW'
                    },
                    customer: {
                        id: userId
                    }
                },
                timeToPay: nextPaymentDate.toISOString()
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Failed to schedule next payment: ${errText}`);
            return null;
        }

        const scheduleData = await response.json();
        console.log(`Scheduled next payment: ${scheduledPaymentId} for ${nextPaymentDate.toISOString()}`);

        return {
            scheduleId: scheduleData.schedule?.id || scheduledPaymentId,
            scheduledPaymentId: scheduledPaymentId
        };
    } catch (error) {
        console.error('Error scheduling next payment:', error);
        return null;
    }
}

async function verifyPortonePayment(paymentId: string) {
    const accessToken = await getPortoneAccessToken()

    const response = await fetch(`https://api.portone.io/payments/${paymentId}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error(`Failed to verify payment: ${response.statusText}`);
    }

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

        const { paymentId, mode, id, userId, billingKey, amount } = await req.json()

        console.log(`Verifying Portone payment: payment=${paymentId}, mode=${mode}, user=${userId}, billingKey=${billingKey ? 'present' : 'missing'}`)

        let paymentDetails;
        let effectivePaymentId = paymentId;

        // 1. Verify or Execute Payment
        if (billingKey && amount) {
            // 1a. Execute Payment with Billing Key (Recurring Initial Charge)
            const accessToken = await getPortoneAccessToken();
            const newPaymentId = `sub_${crypto.randomUUID()}`;

            const payRes = await fetch(`https://api.portone.io/payments/${newPaymentId}/billing-key`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    billingKey,
                    orderName: 'Monthly Subscription (Initial)',
                    amount: {
                        total: amount,
                        currency: 'KRW'
                    },
                    customer: {
                        id: userId
                    }
                })
            });

            if (!payRes.ok) {
                const errText = await payRes.text();
                throw new Error(`Billing Key Payment Failed: ${errText}`);
            }

            paymentDetails = await payRes.json();
            effectivePaymentId = newPaymentId; // Update paymentId to the new one generated for this charge
        } else {
            // 1b. Standard Verification
            paymentDetails = await verifyPortonePayment(paymentId)
        }

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
                    price_paid: amountValue
                }, { onConflict: 'user_id,drill_id' })
        } else if (mode === 'sparring') {
            await supabaseClient
                .from('user_videos')
                .upsert({
                    user_id: userId,
                    video_id: id,
                    purchased_at: new Date().toISOString(),
                }, { onConflict: 'user_id,video_id' })
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
        } else if (mode === 'subscription' || mode === 'subscription_upgrade') {
            const isUpgrade = mode === 'subscription_upgrade'

            let tier: string
            let endDate: Date

            if (isUpgrade) {
                // For upgrades, tier is determined from the old subscription
                const { data: oldSub } = await supabaseClient
                    .from('subscriptions')
                    .select('subscription_tier')
                    .eq('id', id)
                    .single()

                tier = oldSub?.subscription_tier || 'basic'

                // Upgrade to yearly
                endDate = new Date()
                endDate.setFullYear(endDate.getFullYear() + 1)
            } else {
                // New subscription
                const isPro = id?.includes('price_1SYHx') || id?.includes('price_1SYI2')
                const isYearly = id?.includes('price_1SYHw') || id?.includes('price_1SYI2')
                tier = isPro ? 'premium' : 'basic'

                endDate = new Date()
                if (isYearly) {
                    endDate.setFullYear(endDate.getFullYear() + 1)
                } else {
                    endDate.setMonth(endDate.getMonth() + 1)
                }
            }

            // Update user subscription status
            await supabaseClient
                .from('users')
                .update({
                    is_subscriber: true,
                    subscription_tier: tier,
                    subscription_end_date: endDate.toISOString(),
                })
                .eq('id', userId)

            // Create new subscription (upgrades always create yearly)
            const { data: subData, error: subError } = await supabaseClient
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    status: 'active',
                    subscription_tier: tier,
                    plan_interval: 'year', // Upgrades are always yearly
                    current_period_start: new Date().toISOString(),
                    current_period_end: endDate.toISOString(),
                    portone_payment_id: effectivePaymentId,
                    billing_key: null, // No billing key for yearly
                    amount: amountValue
                })
                .select()
                .single()

            if (!subError && subData) {
                // For annual subscriptions, recognition is split into 12 months in revenue_ledger
                // Note: Subscription revenue split among creators is usually handled by a separate monthly job.
                // For now, we record the platform-level revenue.
                const months = 12
                const monthlyAmount = Math.floor(amountValue / months)

                for (let i = 0; i < months; i++) {
                    const recognitionDate = new Date()
                    recognitionDate.setMonth(recognitionDate.getMonth() + i)

                    await supabaseClient.from('revenue_ledger').insert({
                        subscription_id: subData.id,
                        amount: monthlyAmount,
                        platform_fee: monthlyAmount,
                        creator_revenue: 0,
                        product_type: isUpgrade ? 'subscription_upgrade' : 'subscription',
                        status: 'pending',
                        recognition_date: recognitionDate.toISOString().split('T')[0]
                    })
                }

                // No scheduled payment for yearly subscriptions
                // (billing_key is null, scheduled_payment_id is null)
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

        // 2.1 Course/Routine/Drill/Sparring/Bundle Revenue Splitting (8:2)
        if (mode === 'course' || mode === 'routine' || mode === 'drill' || mode === 'sparring' || mode === 'bundle') {
            let tableName = '';
            if (mode === 'course') tableName = 'courses';
            else if (mode === 'routine') tableName = 'routines';
            else if (mode === 'drill') tableName = 'drills';
            else if (mode === 'sparring') tableName = 'sparring_videos';
            else if (mode === 'bundle') tableName = 'bundles';

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
