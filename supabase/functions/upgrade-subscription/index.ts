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

// PortOne에서 예약된 결제 취소
async function cancelScheduledPayment(paymentScheduleId: string): Promise<boolean> {
    try {
        const accessToken = await getPortoneAccessToken()

        const response = await fetch(
            `https://api.portone.io/payment-schedules/${paymentScheduleId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Failed to cancel scheduled payment: ${errText}`);
            return false;
        }

        console.log(`Cancelled scheduled payment: ${paymentScheduleId}`);
        return true;
    } catch (error) {
        console.error('Error cancelling scheduled payment:', error);
        return false;
    }
}

// PortOne에서 빌링키 삭제
async function deleteBillingKey(billingKey: string): Promise<boolean> {
    try {
        const accessToken = await getPortoneAccessToken()

        const response = await fetch(
            `https://api.portone.io/billing-keys/${billingKey}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Failed to delete billing key: ${errText}`);
            return false;
        }

        console.log(`Deleted billing key: ${billingKey}`);
        return true;
    } catch (error) {
        console.error('Error deleting billing key:', error);
        return false;
    }
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

        const { currentSubscriptionId } = await req.json()

        if (!currentSubscriptionId) {
            throw new Error('currentSubscriptionId is required')
        }

        console.log(`Processing upgrade for subscription: ${currentSubscriptionId}`)

        // 1. 현재 구독 조회
        const { data: currentSub, error: subError } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('id', currentSubscriptionId)
            .single()

        if (subError || !currentSub) {
            throw new Error(`Subscription not found: ${subError?.message}`)
        }

        // 2. 구독 상태 검증
        if (currentSub.status !== 'active') {
            throw new Error('Only active subscriptions can be upgraded')
        }

        if (currentSub.plan_interval !== 'month') {
            throw new Error('Only monthly subscriptions can be upgraded to yearly')
        }

        // 3. 남은 기간 계산
        const remainingMs = new Date(currentSub.current_period_end).getTime() - Date.now()
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))

        if (remainingDays < 1) {
            throw new Error('Not enough days remaining for upgrade (minimum 1 day)')
        }

        console.log(`Subscription has ${remainingDays} days remaining`)

        // 4. Proration 크레딧 계산
        const dailyRate = currentSub.amount / 30
        const creditAmount = Math.floor(dailyRate * remainingDays)

        // 5. 연간 가격 결정
        const yearlyPrice = currentSub.subscription_tier === 'premium' ? 390000 : 290000
        const finalAmount = yearlyPrice - creditAmount

        console.log(`Proration: daily_rate=${dailyRate}, credit=${creditAmount}, final=${finalAmount}`)

        // 6. PortOne에서 예약된 결제 취소
        if (currentSub.scheduled_payment_id) {
            console.log(`Cancelling scheduled payment: ${currentSub.scheduled_payment_id}`)
            const cancelled = await cancelScheduledPayment(currentSub.scheduled_payment_id)
            if (!cancelled) {
                console.warn('Failed to cancel scheduled payment, but proceeding with upgrade')
            }
        }

        // 7. PortOne에서 빌링키 삭제
        if (currentSub.billing_key) {
            console.log(`Deleting billing key: ${currentSub.billing_key}`)
            const deleted = await deleteBillingKey(currentSub.billing_key)
            if (!deleted) {
                console.warn('Failed to delete billing key, but proceeding with upgrade')
            }
        }

        // 8. 기존 구독을 'upgraded' 상태로 변경
        const { error: updateError } = await supabaseClient
            .from('subscriptions')
            .update({
                status: 'upgraded',
                billing_key: null,
                scheduled_payment_id: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentSubscriptionId)

        if (updateError) {
            throw new Error(`Failed to update subscription: ${updateError.message}`)
        }

        console.log(`Subscription marked as upgraded: ${currentSubscriptionId}`)

        // 9. Revenue ledger에 크레딧 기록 (음수)
        const { error: creditError } = await supabaseClient
            .from('revenue_ledger')
            .insert({
                subscription_id: currentSubscriptionId,
                amount: -creditAmount,
                platform_fee: 0,
                creator_revenue: 0,
                product_type: 'subscription_upgrade_credit',
                status: 'processed',
                recognition_date: new Date().toISOString().split('T')[0]
            })

        if (creditError) {
            console.error(`Failed to record credit: ${creditError.message}`)
            // Continue anyway - this is not critical
        } else {
            console.log(`Recorded upgrade credit: -${creditAmount}`)
        }

        // 10. 업그레이드 상세 정보 반환
        return new Response(
            JSON.stringify({
                success: true,
                upgradeDetails: {
                    currentSubscription: {
                        id: currentSub.id,
                        subscription_tier: currentSub.subscription_tier,
                        amount: currentSub.amount,
                        current_period_end: currentSub.current_period_end
                    },
                    remainingDays: remainingDays,
                    dailyRate: dailyRate,
                    creditAmount: creditAmount,
                    yearlyPrice: yearlyPrice,
                    finalAmount: finalAmount
                }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Upgrade subscription error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
