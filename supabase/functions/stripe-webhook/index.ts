import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    console.log("Webhook invoked! Signature present:", !!signature);

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
                            if(userId) {
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
