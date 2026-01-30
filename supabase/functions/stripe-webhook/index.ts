import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

Deno.serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    console.log("Webhook invoked! Signature present:", !!signature);

    if (!signature || !webhookSecret) {
        return new Response('Missing signature or webhook secret', { status: 400 })
    }

    // Helper to log to database
    const logWebhook = async (status: string, eventType: string | null, payload: any, errorMessage: string | null = null) => {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )
        await supabaseClient.from('webhook_logs').insert({
            event_type: eventType,
            status,
            payload,
            error_message: errorMessage
        })
    }

    try {
        const body = await req.text()
        let event;

        try {
            event = await stripe.webhooks.constructEventAsync(
                body,
                signature,
                webhookSecret,
                undefined,
                cryptoProvider
            )
        } catch (err: any) {
            console.error(`Webhook signature verification failed.`, err.message);
            await logWebhook('error', 'signature_verification_failed', { header: signature }, err.message);
            return new Response(JSON.stringify({ error: err.message }), { status: 400 })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        console.log(`Received event: ${event.type}`)
        await logWebhook('received', event.type, event, null);

        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent
                const { mode, courseId, routineId, drillId, bundleId, feedbackRequestId, userId, subscription_id, tier } = paymentIntent.metadata

                // Subscription Purchase (NEW)
                if (mode === 'subscription' && subscription_id && userId && tier) {
                    const endDate = new Date()
                    endDate.setDate(endDate.getDate() + 30)

                    const { error: userError } = await supabaseClient
                        .from('users')
                        .update({
                            is_subscriber: true,
                            subscription_tier: tier,
                            subscription_end_date: endDate.toISOString(),
                            stripe_subscription_id: subscription_id,
                        })
                        .eq('id', userId)

                    if (userError) {
                        console.error('Error updating user subscription:', userError)
                        await logWebhook('error', event.type, { userId, tier, subscription: subscription_id }, userError.message);
                        throw userError
                    }

                    const { data: existingSub } = await supabaseClient
                        .from('subscriptions')
                        .select('id')
                        .eq('stripe_subscription_id', subscription_id)
                        .single()

                    if (existingSub) {
                        await supabaseClient
                            .from('subscriptions')
                            .update({
                                status: 'active',
                                subscription_tier: tier,
                                current_period_end: endDate.toISOString(),
                            })
                            .eq('id', existingSub.id)
                    } else {
                        await supabaseClient
                            .from('subscriptions')
                            .insert({
                                user_id: userId,
                                stripe_subscription_id: subscription_id,
                                subscription_tier: tier,
                                status: 'active',
                                plan_interval: 'month',
                                current_period_start: new Date().toISOString(),
                                current_period_end: endDate.toISOString(),
                            })
                    }

                    await supabaseClient
                        .from('payments')
                        .insert({
                            user_id: userId,
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency,
                            status: 'completed',
                            payment_method: 'stripe',
                            stripe_subscription_id: subscription_id,
                        })

                    console.log(`Subscription activated (payment_intent) for user ${userId} with tier ${tier}`)
                    await logWebhook('success', event.type, { userId, tier, subscription: subscription_id }, null);
                }

                // Course Purchase
                if (mode === 'course' && courseId && userId) {
                    const { error } = await supabaseClient
                        .from('course_enrollments')
                        .insert({
                            user_id: userId,
                            course_id: courseId,
                            enrolled_at: new Date().toISOString(),
                        })

                    if (error) {
                        console.error('Error granting course access:', error)
                        await logWebhook('error', event.type, { mode, courseId, userId }, error.message);
                        throw error
                    }

                    await supabaseClient
                        .from('payments')
                        .insert({
                            user_id: userId,
                            course_id: courseId,
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency,
                            status: 'completed',
                            payment_method: 'stripe',
                            stripe_payment_intent_id: paymentIntent.id,
                        })

                    console.log(`Course access granted: ${courseId} to user ${userId}`)
                    await logWebhook('success', event.type, { mode, courseId, userId }, null);
                }

                // Routine Purchase
                if (mode === 'routine' && routineId && userId) {
                    const { error } = await supabaseClient
                        .from('user_routines')
                        .insert({
                            user_id: userId,
                            routine_id: routineId,
                            purchased_at: new Date().toISOString(),
                        })

                    if (error) {
                        console.error('Error granting routine access:', error)
                        await logWebhook('error', event.type, { mode, routineId, userId }, error.message);
                        throw error
                    }

                    await supabaseClient
                        .from('payments')
                        .insert({
                            user_id: userId,
                            routine_id: routineId,
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency,
                            status: 'completed',
                            payment_method: 'stripe',
                            stripe_payment_intent_id: paymentIntent.id,
                        })

                    console.log(`Routine access granted: ${routineId} to user ${userId}`)
                    await logWebhook('success', event.type, { mode, routineId, userId }, null);
                }

                // Drill Purchase
                if (mode === 'drill' && drillId && userId) {
                    const { error } = await supabaseClient
                        .from('user_drills')
                        .insert({
                            user_id: userId,
                            drill_id: drillId,
                            purchased_at: new Date().toISOString(),
                        })

                    if (error) {
                        console.error('Error granting drill access:', error)
                        await logWebhook('error', event.type, { mode, drillId, userId }, error.message);
                        throw error
                    }

                    await supabaseClient
                        .from('payments')
                        .insert({
                            user_id: userId,
                            drill_id: drillId,
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency,
                            status: 'completed',
                            payment_method: 'stripe',
                            stripe_payment_intent_id: paymentIntent.id,
                        })

                    console.log(`Drill access granted: ${drillId} to user ${userId}`)
                    await logWebhook('success', event.type, { mode, drillId, userId }, null);
                }

                // Feedback Request Payment
                if (mode === 'feedback' && feedbackRequestId && userId) {
                    const { error } = await supabaseClient
                        .from('feedback_requests')
                        .update({
                            payment_status: 'paid',
                            paid_at: new Date().toISOString(),
                        })
                        .eq('id', feedbackRequestId)

                    if (error) {
                        console.error('Error updating feedback payment:', error)
                        await logWebhook('error', event.type, { mode, feedbackRequestId, userId }, error.message);
                        throw error
                    }

                    await supabaseClient
                        .from('payments')
                        .insert({
                            user_id: userId,
                            feedback_request_id: feedbackRequestId,
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency,
                            status: 'completed',
                            payment_method: 'stripe',
                            stripe_payment_intent_id: paymentIntent.id,
                        })

                    console.log(`Feedback payment recorded: ${feedbackRequestId}`)
                    await logWebhook('success', event.type, { mode, feedbackRequestId, userId }, null);
                }

                // Bundle Purchase
                if (mode === 'bundle' && bundleId && userId) {
                    // 1. Get bundle details
                    const { data: bundle } = await supabaseClient
                        .from('bundles')
                        .select('course_ids, drill_ids')
                        .eq('id', bundleId)
                        .single();

                    if (bundle) {
                        // 2. Grant access to courses
                        if (bundle.course_ids && bundle.course_ids.length > 0) {
                            for (const courseId of bundle.course_ids) {
                                await supabaseClient
                                    .from('course_enrollments')
                                    .upsert({
                                        user_id: userId,
                                        course_id: courseId,
                                        enrolled_at: new Date().toISOString(),
                                    }, { onConflict: 'user_id,course_id' });
                            }
                        }

                        // 3. Grant access to drills
                        if (bundle.drill_ids && bundle.drill_ids.length > 0) {
                            for (const drillId of bundle.drill_ids) {
                                await supabaseClient
                                    .from('user_drills')
                                    .upsert({
                                        user_id: userId,
                                        drill_id: drillId,
                                        purchased_at: new Date().toISOString(),
                                    }, { onConflict: 'user_id,drill_id' });
                            }
                        }
                    }

                    // 4. Record in user_bundles
                    await supabaseClient
                        .from('user_bundles')
                        .insert({
                            user_id: userId,
                            bundle_id: bundleId,
                            price_paid: paymentIntent.amount / 100,
                        })

                    // 5. Record payment
                    await supabaseClient
                        .from('payments')
                        .insert({
                            user_id: userId,
                            bundle_id: bundleId,
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency,
                            status: 'completed',
                            payment_method: 'stripe',
                            stripe_payment_intent_id: paymentIntent.id,
                        })

                    console.log(`Bundle access granted: ${bundleId} to user ${userId}`)
                    await logWebhook('success', event.type, { mode, bundleId, userId, courseCount: bundle?.course_ids?.length || 0, drillCount: bundle?.drill_ids?.length || 0 }, null);
                }
                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice
                let subscriptionId = invoice.subscription as string

                if (!subscriptionId && invoice.lines?.data?.length > 0) {
                    subscriptionId = invoice.lines.data[0].subscription as string
                    console.log(`Found subscription ID in invoice lines: ${subscriptionId}`)
                }

                if (subscriptionId) {
                    try {
                        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
                        const userId = stripeSubscription.metadata.userId

                        await logWebhook('info', 'subscription_retrieved', {
                            subscriptionId,
                            metadata: stripeSubscription.metadata
                        }, null);

                        let tier = stripeSubscription.metadata.tier;

                        if (!tier) {
                            const productId = stripeSubscription.items.data[0].price.product as string
                            const PRO_PRODUCT_ID = 'prod_TVIYrF1czLhXdk'
                            const BASIC_PRODUCT_ID = 'prod_TTpj2uTu0biyyA'

                            tier = 'basic'
                            if (productId === PRO_PRODUCT_ID) tier = 'premium'
                            if (productId === BASIC_PRODUCT_ID) tier = 'basic'
                        }

                        if (userId) {
                            const endDate = new Date()
                            endDate.setDate(endDate.getDate() + 30)

                            const { error: userError } = await supabaseClient
                                .from('users')
                                .update({
                                    is_subscriber: true,
                                    subscription_tier: tier,
                                    subscription_end_date: endDate.toISOString(),
                                    stripe_subscription_id: subscriptionId,
                                })
                                .eq('id', userId)

                            if (userError) {
                                console.error('Error updating user subscription:', userError)
                                await logWebhook('error', event.type, { userId, tier, subscription: subscriptionId }, userError.message);
                                throw userError
                            }

                            const { data: existingSub } = await supabaseClient
                                .from('subscriptions')
                                .select('id')
                                .eq('stripe_subscription_id', subscriptionId)
                                .single()

                            if (existingSub) {
                                await supabaseClient
                                    .from('subscriptions')
                                    .update({
                                        status: 'active',
                                        subscription_tier: tier,
                                        current_period_end: endDate.toISOString(),
                                    })
                                    .eq('id', existingSub.id)
                            } else {
                                await supabaseClient
                                    .from('subscriptions')
                                    .insert({
                                        user_id: userId,
                                        stripe_subscription_id: subscriptionId,
                                        subscription_tier: tier,
                                        status: 'active',
                                        plan_interval: 'month',
                                        current_period_start: new Date().toISOString(),
                                        current_period_end: endDate.toISOString(),
                                    })
                            }

                            await supabaseClient
                                .from('payments')
                                .insert({
                                    user_id: userId,
                                    amount: invoice.amount_paid,
                                    currency: invoice.currency,
                                    status: 'completed',
                                    payment_method: 'stripe',
                                    stripe_subscription_id: subscriptionId,
                                })

                            console.log(`Subscription activated (invoice) for user ${userId} with tier ${tier}`)
                            await logWebhook('success', event.type, { userId, tier, subscription: subscriptionId }, null);
                        } else {
                            console.warn('No userId found in subscription metadata');
                            await logWebhook('warning', event.type, { subscription: subscriptionId, metadata: stripeSubscription.metadata }, 'No userId in metadata');
                        }
                    } catch (err: any) {
                        console.error('Error processing subscription:', err);
                        await logWebhook('error', event.type, { subscription: subscriptionId }, err.message);
                    }
                } else {
                    console.warn('No subscription ID found in invoice');
                    await logWebhook('warning', event.type, { invoiceId: invoice.id }, 'No subscription ID found in invoice object or lines');
                }
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription

                if (subscription.status === 'active') {
                    const userId = subscription.metadata.userId
                    let tier = subscription.metadata.tier

                    if (!tier) {
                        const productId = subscription.items.data[0].price.product as string
                        const PRO_PRODUCT_ID = 'prod_TVIYrF1czLhXdk'
                        const BASIC_PRODUCT_ID = 'prod_TTpj2uTu0biyyA'

                        tier = 'basic'
                        if (productId === PRO_PRODUCT_ID) tier = 'premium'
                        if (productId === BASIC_PRODUCT_ID) tier = 'basic'
                    }

                    if (userId) {
                        const endDate = new Date(subscription.current_period_end * 1000)

                        const { error: userError } = await supabaseClient
                            .from('users')
                            .update({
                                is_subscriber: true,
                                subscription_tier: tier,
                                subscription_end_date: endDate.toISOString(),
                                stripe_subscription_id: subscription.id,
                            })
                            .eq('id', userId)

                        if (userError) {
                            console.error('Error updating user subscription (updated event):', userError)
                            await logWebhook('error', event.type, { userId, tier, subscription: subscription.id }, userError.message);
                        } else {
                            console.log(`User subscription updated via subscription.updated for ${userId}`)
                            await logWebhook('success', event.type, { userId, tier, subscription: subscription.id }, null);
                        }

                        const { data: existingSub } = await supabaseClient
                            .from('subscriptions')
                            .select('id')
                            .eq('stripe_subscription_id', subscription.id)
                            .single()

                        if (existingSub) {
                            await supabaseClient
                                .from('subscriptions')
                                .update({
                                    status: 'active',
                                    subscription_tier: tier,
                                    current_period_end: endDate.toISOString(),
                                })
                                .eq('id', existingSub.id)
                        } else {
                            await supabaseClient
                                .from('subscriptions')
                                .insert({
                                    user_id: userId,
                                    stripe_subscription_id: subscription.id,
                                    subscription_tier: tier,
                                    status: 'active',
                                    plan_interval: subscription.items.data[0].plan.interval,
                                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                                    current_period_end: endDate.toISOString(),
                                })
                        }
                    } else {
                        console.warn('No userId found in subscription metadata (updated event)');
                        await logWebhook('warning', event.type, { subscription: subscription.id, metadata: subscription.metadata }, 'No userId in metadata');
                    }
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const userId = subscription.metadata.userId

                if (userId) {
                    // Check if user has a complimentary subscription before revoking
                    const { data: userData } = await supabaseClient
                        .from('users')
                        .select('is_complimentary_subscription')
                        .eq('id', userId)
                        .single()

                    if (userData?.is_complimentary_subscription === true) {
                        // User has admin-granted complimentary subscription, only clear Stripe fields
                        await supabaseClient
                            .from('users')
                            .update({
                                stripe_subscription_id: null,
                            })
                            .eq('id', userId)

                        console.log(`Stripe subscription deleted for user ${userId}, but complimentary subscription preserved`)
                        await logWebhook('success', event.type, { userId, subscription: subscription.id }, 'Stripe sub deleted, complimentary preserved');
                    } else {
                        const { error } = await supabaseClient
                            .from('users')
                            .update({
                                is_subscriber: false,
                                subscription_end_date: null,
                                stripe_subscription_id: null,
                            })
                            .eq('id', userId)

                        if (error) {
                            console.error('Error revoking subscription:', error)
                            await logWebhook('error', event.type, { userId, subscription: subscription.id }, error.message);
                            throw error
                        }

                        console.log(`Subscription cancelled for user ${userId}`)
                        await logWebhook('success', event.type, { userId, subscription: subscription.id }, 'Subscription revoked');
                    }
                }
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
                await logWebhook('ignored', event.type, null, 'Unhandled event type');
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Webhook error:', error)
        try {
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            )
            await supabaseClient.from('webhook_logs').insert({
                status: 'fatal_error',
                error_message: error.message
            })
        } catch (e) {
            // Ignore logging error
        }

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
