import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
        return new Response('Missing signature or webhook secret', { status: 400 })
    }

    try {
        const body = await req.text()
        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            webhookSecret,
            undefined,
            cryptoProvider
        )

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        console.log(`Received event: ${event.type}`)

        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent
                const { mode, courseId, routineId, drillId, feedbackRequestId, userId } = paymentIntent.metadata

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
                }
                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice
                const subscription = invoice.subscription as string

                if (subscription) {
                    const stripeSubscription = await stripe.subscriptions.retrieve(subscription)
                    const userId = stripeSubscription.metadata.userId

                    // Determine Tier based on metadata (preferred) or Product ID (fallback)
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
                        endDate.setDate(endDate.getDate() + 30) // Default to 30 days, should ideally check interval

                        // Update Users Table
                        const { error: userError } = await supabaseClient
                            .from('users')
                            .update({
                                is_subscriber: true,
                                subscription_tier: tier,
                                subscription_end_date: endDate.toISOString(),
                                stripe_subscription_id: subscription,
                            })
                            .eq('id', userId)

                        if (userError) {
                            console.error('Error updating user subscription:', userError)
                            throw userError
                        }

                        // Update/Insert Subscriptions Table
                        // Check if subscription exists
                        const { data: existingSub } = await supabaseClient
                            .from('subscriptions')
                            .select('id')
                            .eq('stripe_subscription_id', subscription)
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
                                    stripe_subscription_id: subscription,
                                    subscription_tier: tier,
                                    status: 'active',
                                    plan_interval: 'month', // Default, ideally fetch from price
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
                                stripe_subscription_id: subscription,
                            })

                        console.log(`Subscription activated for user ${userId} with tier ${tier}`)
                    }
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const userId = subscription.metadata.userId

                if (userId) {
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
                        throw error
                    }

                    console.log(`Subscription cancelled for user ${userId}`)
                }
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Webhook error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
