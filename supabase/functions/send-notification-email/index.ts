import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationEmailRequest {
    title: string;
    message: string;
    targetAudience: 'all' | 'creators' | 'users';
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (!resendApiKey) {
            throw new Error('RESEND_API_KEY is not configured')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const { title, message, targetAudience }: NotificationEmailRequest = await req.json()

        if (!title || !message || !targetAudience) {
            throw new Error('Missing required fields: title, message, targetAudience')
        }

        // Get target users based on audience
        let query = supabaseClient.from('users').select('id, email, name')

        if (targetAudience === 'creators') {
            // Get users who are creators
            const { data: creators } = await supabaseClient
                .from('creators')
                .select('user_id')

            const creatorUserIds = creators?.map(c => c.user_id) || []

            if (creatorUserIds.length === 0) {
                return new Response(JSON.stringify({
                    success: true,
                    sent: 0,
                    message: 'No creators found'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            query = query.in('id', creatorUserIds)
        } else if (targetAudience === 'users') {
            // Get users who are NOT creators
            const { data: creators } = await supabaseClient
                .from('creators')
                .select('user_id')

            const creatorUserIds = creators?.map(c => c.user_id) || []

            if (creatorUserIds.length > 0) {
                query = query.not('id', 'in', `(${creatorUserIds.join(',')})`)
            }
        }
        // 'all' - no filter needed

        const { data: users, error: usersError } = await query

        if (usersError) {
            throw new Error(`Failed to fetch users: ${usersError.message}`)
        }

        if (!users || users.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                sent: 0,
                message: 'No users found for target audience'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Filter users with valid emails
        const validUsers = users.filter(u => u.email && u.email.includes('@'))

        if (validUsers.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                sent: 0,
                message: 'No users with valid emails found'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Send emails using Resend Batch API (max 100 per request)
        const batchSize = 100
        let totalSent = 0
        const errors: string[] = []

        for (let i = 0; i < validUsers.length; i += batchSize) {
            const batch = validUsers.slice(i, i + batchSize)

            const emails = batch.map(user => ({
                from: 'Grapplay <noreply@grapplay.com>',
                to: user.email,
                subject: `[Grapplay] ${title}`,
                html: generateEmailHtml(title, message, user.name || '회원'),
            }))

            const response = await fetch('https://api.resend.com/emails/batch', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emails),
            })

            if (response.ok) {
                totalSent += batch.length
            } else {
                const errorText = await response.text()
                errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${errorText}`)
                console.error('Resend batch error:', errorText)
            }
        }

        console.log(`Notification email sent to ${totalSent}/${validUsers.length} users`)

        return new Response(JSON.stringify({
            success: true,
            sent: totalSent,
            total: validUsers.length,
            errors: errors.length > 0 ? errors : undefined
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Send notification email error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

function generateEmailHtml(title: string, message: string, userName: string): string {
    // Convert newlines to <br> for HTML
    const formattedMessage = message.replace(/\n/g, '<br>')

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding-bottom: 32px;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #a78bfa; letter-spacing: -0.5px;">
                                GRAPPLAY
                            </h1>
                        </td>
                    </tr>

                    <!-- Main Card -->
                    <tr>
                        <td style="background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                            <!-- Header -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #27272a;">
                                        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #fafafa;">
                                            ${title}
                                        </h2>
                                    </td>
                                </tr>
                            </table>

                            <!-- Body -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 32px;">
                                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #a1a1aa;">
                                            안녕하세요, ${userName}님
                                        </p>
                                        <div style="font-size: 15px; line-height: 1.7; color: #d4d4d8;">
                                            ${formattedMessage}
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 0 32px 32px 32px;">
                                        <a href="https://grapplay.com"
                                           style="display: inline-block; padding: 14px 28px; background-color: #7c3aed; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 12px;">
                                            Grapplay 방문하기
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 0 0 0; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #52525b;">
                                이 이메일은 Grapplay에서 발송되었습니다.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #3f3f46;">
                                © ${new Date().getFullYear()} Grapplay. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`
}
