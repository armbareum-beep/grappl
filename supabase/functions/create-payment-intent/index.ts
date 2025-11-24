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

        const { mode, courseId } = await req.json()

        if (mode === 'course') {
            // Single Course Purchase
            if (!courseId) {
                throw new Error('Course ID is required for course purchases')
            }

            // 1. Get Course Price from DB
            const { data: course, error: courseError } = await supabaseClient
                .from('courses')
                .select('price, title')
                .eq('id', courseId)
                .single()

            if (courseError || !course) {
                throw new Error('Course not found')
            }

            // 2. Create PaymentIntent
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
        } else if (mode === 'subscription') {
            // Monthly Subscription
            const subscriptionPriceId = Deno.env.get('STRIPE_SUBSCRIPTION_PRICE_ID')

            if (!subscriptionPriceId) {
                throw new Error('Subscription price ID not configured')
            }

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
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: subscriptionPriceId }],
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
