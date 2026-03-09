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

// 빌링키로 결제 실행
async function executeBillingPayment(
    billingKey: string,
    customerKey: string,
    amount: number,
    orderId: string
): Promise<{ success: boolean; paymentKey?: string; error?: string }> {
    try {
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
                orderName: 'Grapplay 월간 멤버십 자동결제',
            })
        })

        if (!response.ok) {
            const error = await response.json()
            return { success: false, error: error.message || response.statusText }
        }

        const data = await response.json()
        return { success: true, paymentKey: data.paymentKey }
    } catch (error: any) {
        return { success: false, error: error.message }
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

        // 오늘 또는 이미 지난 날짜에 만료되는 토스 구독 찾기
        const today = new Date()
        today.setHours(23, 59, 59, 999)

        const { data: subscriptions, error: fetchError } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('status', 'active')
            .eq('payment_provider', 'toss')
            .eq('plan_interval', 'month')
            .not('billing_key', 'is', null)
            .lte('current_period_end', today.toISOString())

        if (fetchError) {
            throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`)
        }

        console.log(`Found ${subscriptions?.length || 0} subscriptions to renew`)

        const results = {
            total: subscriptions?.length || 0,
            success: 0,
            failed: 0,
            errors: [] as string[]
        }

        for (const sub of subscriptions || []) {
            console.log(`Processing subscription ${sub.id} for user ${sub.user_id}`)

            // 결제 실행
            const orderId = `renewal_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`
            const paymentResult = await executeBillingPayment(
                sub.billing_key,
                sub.toss_customer_key,
                sub.amount,
                orderId
            )

            if (paymentResult.success) {
                // 결제 성공: 구독 기간 연장
                const newEndDate = new Date()
                newEndDate.setMonth(newEndDate.getMonth() + 1)

                await supabaseClient
                    .from('subscriptions')
                    .update({
                        current_period_start: new Date().toISOString(),
                        current_period_end: newEndDate.toISOString(),
                        toss_payment_key: paymentResult.paymentKey,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', sub.id)

                // 유저 구독 종료일 업데이트
                await supabaseClient
                    .from('users')
                    .update({
                        subscription_end_date: newEndDate.toISOString()
                    })
                    .eq('id', sub.user_id)

                // 매출 기록
                await supabaseClient.from('revenue_ledger').insert({
                    subscription_id: sub.id,
                    amount: sub.amount,
                    platform_fee: sub.amount,
                    creator_revenue: 0,
                    product_type: 'subscription_renewal',
                    status: 'pending',
                    recognition_date: new Date().toISOString().split('T')[0]
                })

                // 결제 기록
                await supabaseClient.from('payments').insert({
                    user_id: sub.user_id,
                    amount: sub.amount,
                    currency: 'KRW',
                    status: 'completed',
                    payment_method: 'toss',
                    portone_payment_id: paymentResult.paymentKey,
                    mode: 'subscription_renewal',
                    target_id: sub.id
                })

                // 유저에게 알림
                await supabaseClient.from('notifications').insert({
                    user_id: sub.user_id,
                    type: 'subscription_renewed',
                    title: '구독 자동 갱신 완료',
                    message: `월간 멤버십이 자동 갱신되었습니다. (₩${sub.amount.toLocaleString()})`,
                    link: '/settings'
                })

                results.success++
                console.log(`Subscription ${sub.id} renewed successfully`)
            } else {
                // 결제 실패: 구독 일시 중지 (3번 실패 시 취소 고려)
                await supabaseClient
                    .from('subscriptions')
                    .update({
                        status: 'past_due',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', sub.id)

                // 유저에게 결제 실패 알림
                await supabaseClient.from('notifications').insert({
                    user_id: sub.user_id,
                    type: 'payment_failed',
                    title: '자동 결제 실패',
                    message: `월간 멤버십 자동 결제에 실패했습니다. 결제 수단을 확인해주세요.`,
                    link: '/settings'
                })

                results.failed++
                results.errors.push(`${sub.id}: ${paymentResult.error}`)
                console.error(`Subscription ${sub.id} renewal failed: ${paymentResult.error}`)
            }
        }

        // 관리자 알림 (처리 완료)
        if (results.total > 0) {
            await sendTelegramNotification(
                `🔄 <b>토스 정기결제 실행 완료</b>\n` +
                `• 전체: ${results.total}건\n` +
                `• 성공: ${results.success}건\n` +
                `• 실패: ${results.failed}건` +
                (results.errors.length > 0 ? `\n• 에러: ${results.errors.slice(0, 3).join(', ')}` : '')
            )
        }

        return new Response(JSON.stringify({
            success: true,
            results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Run Toss Billing Error:', error)

        await sendTelegramNotification(
            `❌ <b>토스 정기결제 실행 오류</b>\n${error.message}`
        )

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
