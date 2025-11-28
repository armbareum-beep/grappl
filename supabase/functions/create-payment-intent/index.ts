import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

        const body = await req.json()
        const { mode, courseId, routineId, drillId, feedbackRequestId, priceId } = body

        if (mode === 'course') {
            // Single Course Purchase
            if (!courseId) {
                throw new Error('Course ID is required for course purchases')
            }

            const { data: course } = await supabaseClient
                .from('courses')
                .select('*')
                .eq('id', courseId)
                .single()

            if (!course) {
                throw new Error('Course not found')
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: course.price * 100,
                currency: 'krw',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    mode: 'course',
                    courseId: course.id,
                    userId: user.id,
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

            const { data: routine } = await supabaseClient
                .from('routines')
                .select('*')
                .eq('id', routineId)
                .single()

            if (!routine) {
                throw new Error('Routine not found')
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: routine.price * 100,
                currency: 'krw',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    mode: 'routine',
                    routineId: routine.id,
                    userId: user.id,
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

            const { data: drill } = await supabaseClient
                .from('drills')
                .select('*')
                .eq('id', drillId)
                .single()

            if (!drill) {
                throw new Error('Drill not found')
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: drill.price * 100,
                currency: 'krw',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    mode: 'drill',
                    drillId: drill.id,
                    userId: user.id,
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

            const { data: feedback } = await supabaseClient
                .from('feedback_requests')
                .select('*, creator:profiles!feedback_requests_creator_id_fkey(feedback_price)')
                .eq('id', feedbackRequestId)
                .single()

            if (!feedback) throw new Error('Feedback request not found')

            // Handle case where creator might be null or price missing
            const price = feedback.creator?.feedback_price || 10000 // Fallback

            const paymentIntent = await stripe.paymentIntents.create({
                amount: price * 100,
                currency: 'krw',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    mode: 'feedback',
                    feedbackRequestId: feedback.id,
                    userId: user.id,
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
            const priceId = body.priceId || Deno.env.get('STRIPE_SUBSCRIPTION_PRICE_ID');

            if (!priceId) {
                throw new Error('Price ID is required for subscription');
            }

            // Determine tier
            const BASIC_PRICE_IDS = ['price_1SWs3iDWGN6smyu7MNbjs5kM', 'price_1SYHwZDWGN6smyu74bzDxySW'];
            const PREMIUM_PRICE_IDS = ['price_1SYHxWDWGN6smyu7qHuppVy5', 'price_1SYI2UDWGN6smyu7BhMUtAQN'];

            let tier = 'basic';
            if (PREMIUM_PRICE_IDS.includes(priceId)) tier = 'premium';

            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    userId: user.id,
                    userEmail: user.email || '',
                    tier: tier,
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
