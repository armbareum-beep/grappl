import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('Not authenticated')
        }

        const { mode, courseId, routineId, drillId, feedbackRequestId } = await req.json()

        if (mode === 'course') {
            // Single Course Purchase
            if (!courseId) {
                throw new Error('Course ID is required for course purchases')
            }

            const { data: course, error: courseError } = await supabaseClient
                .from('courses')
                .select('price, title')
                .eq('id', courseId)
                .single()

            if (courseError || !course) {
                throw new Error('Course not found')
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: course.price,
                currency: 'krw',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    mode: 'course',
                    courseId: courseId,
                    userId: user.id,
                    userEmail: user.email || '',
                },
            })

            return new Response(
                JSON.stringify({ clientSecret: paymentIntent.client_secret }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else if (mode === 'routine') {
            // Routine Purchase
            if (!routineId) {
                throw new Error('Routine ID is required')
            }

            const { data: routine, error: routineError } = await supabaseClient
                .from('routines')
                .select('price, title')
                .eq('id', routineId)
                .single()

            if (routineError || !routine) {
                throw new Error('Routine not found')
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: routine.price,
                currency: 'krw',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    mode: 'routine',
                    routineId: routineId,
                    userId: user.id,
                    userEmail: user.email || '',
                },
            })

            return new Response(
                JSON.stringify({ clientSecret: paymentIntent.client_secret }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else if (mode === 'drill') {
            // Drill Purchase
            if (!drillId) {
                throw new Error('Drill ID is required')
            }

            const { data: drill, error: drillError } = await supabaseClient
                .from('drills')
                .select('price, title')
                .eq('id', drillId)
                .single()

            if (drillError || !drill) {
                throw new Error('Drill not found')
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: drill.price,
                currency: 'krw',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    mode: 'drill',
                    drillId: drillId,
                    userId: user.id,
                    userEmail: user.email || '',
                },
            })

            return new Response(
                JSON.stringify({ clientSecret: paymentIntent.client_secret }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else if (mode === 'feedback') {
            // Feedback Request Purchase
            if (!feedbackRequestId) {
                throw new Error('Feedback request ID is required')
            }

            const { data: feedbackRequest, error: feedbackError } = await supabaseClient
                .from('feedback_requests')
                .select('price')
                .eq('id', feedbackRequestId)
                .single()

            if (feedbackError || !feedbackRequest) {
                throw new Error('Feedback request not found')
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: feedbackRequest.price,
                currency: 'krw',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    mode: 'feedback',
                    feedbackRequestId: feedbackRequestId,
                    userId: user.id,
                    userEmail: user.email || '',
                },
            })

            return new Response(
                JSON.stringify({ clientSecret: paymentIntent.client_secret }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else if (mode === 'subscription') {
            // Monthly Subscription
            // const subscriptionPriceId = Deno.env.get('STRIPE_SUBSCRIPTION_PRICE_ID')

            // 1. Create or retrieve Stripe Customer
            let customerId: string

            const { data: userData } = await supabaseClient
                .from('users')
                .select('stripe_customer_id')
                .eq('id', user.id)
                .single()

            if (userData?.stripe_customer_id) {
                customerId = userData.stripe_customer_id
            } else {
                const customer = await stripe.customers.create({
                    email: user.email,
                    metadata: {
                        userId: user.id,
                    },
                })
                customerId = customer.id

                await supabaseClient
                    .from('users')
                    .update({ stripe_customer_id: customerId })
                    .eq('id', user.id)
            }

            // 2. Create Subscription
            const priceId = await req.json().then(body => body.priceId).catch(() => null) || Deno.env.get('STRIPE_SUBSCRIPTION_PRICE_ID');

            if (!priceId) {
                throw new Error('Price ID is required for subscription');
            }

            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    userId: user.id,
                    userEmail: user.email || '',
                },
            })

            const invoice = subscription.latest_invoice as Stripe.Invoice
            const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent

            return new Response(
                JSON.stringify({
                    clientSecret: paymentIntent.client_secret,
                    subscriptionId: subscription.id
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else {
            throw new Error('Invalid payment mode')
        }
    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
