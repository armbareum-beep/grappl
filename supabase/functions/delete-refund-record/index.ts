import { createClient } from 'npm:@supabase/supabase-js@2'

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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Verify admin user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('No authorization header')
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        )

        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        // Check if user is admin
        const { data: userData } = await supabaseClient
            .from('users')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        if (!userData?.is_admin) {
            throw new Error('Admin access required')
        }

        const { recordId, deleteCount } = await req.json()

        if (recordId) {
            // Delete single record
            const { error } = await supabaseClient
                .from('revenue_ledger')
                .delete()
                .eq('id', recordId)

            if (error) throw error

            return new Response(JSON.stringify({
                success: true,
                message: '기록이 삭제되었습니다.'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        } else if (deleteCount) {
            // Delete most recent N refund records
            const { data: refunds } = await supabaseClient
                .from('revenue_ledger')
                .select('id')
                .eq('product_type', 'refund')
                .order('created_at', { ascending: false })
                .limit(deleteCount)

            if (refunds && refunds.length > 0) {
                const ids = refunds.map(r => r.id)
                const { error } = await supabaseClient
                    .from('revenue_ledger')
                    .delete()
                    .in('id', ids)

                if (error) throw error

                return new Response(JSON.stringify({
                    success: true,
                    deleted: ids.length,
                    message: `${ids.length}개의 환불 기록이 삭제되었습니다.`
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }
        }

        return new Response(JSON.stringify({
            success: false,
            error: 'recordId 또는 deleteCount가 필요합니다.'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })

    } catch (error: any) {
        console.error('Delete refund record error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
