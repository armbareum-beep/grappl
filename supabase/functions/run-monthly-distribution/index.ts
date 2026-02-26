import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * 월별 구독 수익 배분 실행
 *
 * 사용법:
 * 1. 관리자 수동 실행: POST /run-monthly-distribution (Authorization 필요)
 * 2. Cron 자동 실행: POST /run-monthly-distribution?cron_secret=YOUR_SECRET
 *
 * Body (optional):
 * - target_month: "2024-01-01" (지정하지 않으면 전월 자동 계산)
 */
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // 인증 확인 (관리자 또는 cron_secret)
        const url = new URL(req.url)
        const cronSecret = url.searchParams.get('cron_secret')
        const expectedCronSecret = Deno.env.get('CRON_SECRET')

        let isAuthorized = false
        let adminId: string | null = null

        // 1. Cron secret으로 인증
        if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
            isAuthorized = true
            console.log('Authorized via cron secret')
        }
        // 2. 관리자 토큰으로 인증
        else {
            const authHeader = req.headers.get('Authorization')
            if (authHeader) {
                const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
                    authHeader.replace('Bearer ', '')
                )

                if (!authError && user) {
                    const { data: userData } = await supabaseClient
                        .from('users')
                        .select('is_admin')
                        .eq('id', user.id)
                        .single()

                    if (userData?.is_admin) {
                        isAuthorized = true
                        adminId = user.id
                        console.log(`Authorized via admin token: ${user.id}`)
                    }
                }
            }
        }

        if (!isAuthorized) {
            throw new Error('Unauthorized: Admin access or valid cron secret required')
        }

        // 대상 월 결정
        let targetMonth: string

        try {
            const body = await req.json()
            targetMonth = body.target_month
        } catch {
            // Body가 없으면 전월 자동 계산
            targetMonth = ''
        }

        if (!targetMonth) {
            // 전월 계산 (예: 현재 2024-02-15 -> 2024-01-01)
            const now = new Date()
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            targetMonth = lastMonth.toISOString().split('T')[0]
        }

        console.log(`Running subscription distribution for: ${targetMonth}`)

        // PostgreSQL 함수 호출
        const { data, error } = await supabaseClient.rpc(
            'calculate_monthly_subscription_distribution',
            { target_month: targetMonth }
        )

        if (error) {
            console.error('Distribution error:', error)
            throw new Error(`배분 실행 실패: ${error.message}`)
        }

        // 배분 결과 조회
        const startDate = new Date(targetMonth)
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)

        const { data: distributionResults, error: queryError } = await supabaseClient
            .from('revenue_ledger')
            .select(`
                creator_id,
                creator_revenue,
                creators!inner (name)
            `)
            .eq('product_type', 'subscription_distribution')
            .gte('recognition_date', targetMonth)
            .lt('recognition_date', endDate.toISOString().split('T')[0])

        const totalDistributed = distributionResults?.reduce(
            (sum, r) => sum + (r.creator_revenue || 0), 0
        ) || 0
        const creatorCount = distributionResults?.length || 0

        // 감사 로그 기록
        if (adminId || cronSecret) {
            try {
                await supabaseClient.from('audit_logs').insert({
                    admin_id: adminId,
                    action: 'RUN_SUBSCRIPTION_DISTRIBUTION',
                    target_type: 'revenue_ledger',
                    target_id: targetMonth,
                    details: `${targetMonth} 구독 배분 실행: ${creatorCount}명에게 ₩${totalDistributed.toLocaleString()} 배분`
                })
            } catch {
                // 감사 로그 실패 무시
            }
        }

        console.log(`Distribution completed: ${creatorCount} creators, ₩${totalDistributed}`)

        return new Response(JSON.stringify({
            success: true,
            target_month: targetMonth,
            total_distributed: totalDistributed,
            creator_count: creatorCount,
            message: `${targetMonth} 구독 수익 배분 완료: ${creatorCount}명에게 ₩${totalDistributed.toLocaleString()} 배분`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Monthly distribution error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
