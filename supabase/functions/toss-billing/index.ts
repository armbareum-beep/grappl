import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 텔레그램 알림
async function sendTelegramNotification(message: string) {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

    if (!botToken || !chatId) return

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        })
    } catch (error) {
        console.error('Telegram notification failed:', error)
    }
}

// 토스페이먼츠 API 인증 헤더 생성
function getTossAuthHeader() {
    const secretKey = Deno.env.get('TOSS_SECRET_KEY')
    if (!secretKey) throw new Error('TOSS_SECRET_KEY not configured')

    const encoded = btoa(`${secretKey}:`)
    return `Basic ${encoded}`
}

// authKey로 빌링키 발급
async function issueBillingKey(authKey: string, customerKey: string) {
    const response = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
        method: 'POST',
        headers: {
            'Authorization': getTossAuthHeader(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            authKey,
            customerKey,
        })
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`빌링키 발급 실패: ${error.message || response.statusText}`)
    }

    return await response.json()
}

// 빌링키로 결제 실행
async function executeBillingPayment(
    billingKey: string,
    customerKey: string,
    amount: number,
    orderName: string,
    orderId: string
) {
    const response = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
        method: 'POST',
        headers: {
            'Authorization': getTossAuthHeader(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            customerKey,
            amount,
            orderId,
            orderName,
        })
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`결제 실패: ${error.message || response.statusText}`)
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

        const { authKey, customerKey, amount, userId } = await req.json()

        console.log(`Toss Billing: authKey present=${!!authKey}, customerKey=${customerKey}, amount=${amount}, userId=${userId}`)

        if (!authKey || !customerKey || !amount || !userId) {
            throw new Error('Missing required parameters: authKey, customerKey, amount, userId')
        }

        // 1. authKey로 빌링키 발급
        console.log('Step 1: Issuing billing key...')
        const billingData = await issueBillingKey(authKey, customerKey)
        const billingKey = billingData.billingKey
        const cardInfo = billingData.card

        console.log(`Billing key issued: ${billingKey.substring(0, 10)}..., card=${cardInfo?.number}`)

        // 2. 빌링키로 첫 결제 실행
        console.log('Step 2: Executing first payment...')
        const orderId = `sub_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`
        const paymentData = await executeBillingPayment(
            billingKey,
            customerKey,
            amount,
            'Grapplay 월간 멤버십',
            orderId
        )

        console.log(`Payment successful: orderId=${orderId}, paymentKey=${paymentData.paymentKey}`)

        // 3. 구독 종료일 계산 (1개월 후)
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 1)

        // 4. 유저 구독 상태 업데이트
        const { error: userUpdateError } = await supabaseClient
            .from('users')
            .update({
                is_subscriber: true,
                is_complimentary_subscription: false,
                subscription_tier: 'basic',
                subscription_end_date: endDate.toISOString(),
            })
            .eq('id', userId)

        if (userUpdateError) {
            throw new Error(`Failed to update user: ${userUpdateError.message}`)
        }

        // 5. 구독 레코드 생성 (빌링키 저장)
        const { data: subData, error: subError } = await supabaseClient
            .from('subscriptions')
            .insert({
                user_id: userId,
                status: 'active',
                subscription_tier: 'basic',
                plan_interval: 'month',
                current_period_start: new Date().toISOString(),
                current_period_end: endDate.toISOString(),
                billing_key: billingKey,
                toss_customer_key: customerKey,
                toss_payment_key: paymentData.paymentKey,
                amount: amount,
                payment_provider: 'toss'
            })
            .select()
            .single()

        if (subError) {
            throw new Error(`Failed to create subscription: ${subError.message}`)
        }

        console.log(`Subscription created: id=${subData?.id}`)

        // 6. 매출 장부 기록
        await supabaseClient.from('revenue_ledger').insert({
            subscription_id: subData.id,
            amount: amount,
            platform_fee: amount,
            creator_revenue: 0,
            product_type: 'subscription',
            status: 'pending',
            recognition_date: new Date().toISOString().split('T')[0]
        })

        // 7. 결제 기록 저장
        await supabaseClient.from('payments').insert({
            user_id: userId,
            amount: amount,
            currency: 'KRW',
            status: 'completed',
            payment_method: 'toss',
            portone_payment_id: paymentData.paymentKey, // 호환성 위해 동일 컬럼 사용
            mode: 'subscription',
            target_id: subData.id
        })

        // 8. 텔레그램 알림
        await sendTelegramNotification(
            `💳 <b>토스 월간 구독 시작!</b>\n` +
            `• 금액: ₩${amount.toLocaleString()}\n` +
            `• 카드: ${cardInfo?.number || 'N/A'}\n` +
            `• 다음 결제: ${endDate.toLocaleDateString('ko-KR')}`
        )

        return new Response(JSON.stringify({
            success: true,
            subscriptionId: subData.id,
            nextPaymentDate: endDate.toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Toss Billing Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
