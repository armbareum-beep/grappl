import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Fetch all approved courses
        const { data: courses } = await supabaseClient
            .from('courses')
            .select('id, updated_at')
            .eq('status', 'approved')
            .order('updated_at', { ascending: false })

        // Fetch all approved routines
        const { data: routines } = await supabaseClient
            .from('routines')
            .select('id, updated_at')
            .eq('status', 'approved')
            .order('updated_at', { ascending: false })

        // Fetch all creators
        const { data: creators } = await supabaseClient
            .from('creators')
            .select('id, updated_at')
            .order('updated_at', { ascending: false })

        // Fetch all approved drills
        const { data: drills } = await supabaseClient
            .from('drills')
            .select('id, updated_at')
            .eq('status', 'approved')
            .order('updated_at', { ascending: false })

        const baseUrl = 'https://grapplay.com'
        const today = new Date().toISOString().split('T')[0]

        // Static pages
        const staticPages = [
            { loc: '/', priority: '1.0', changefreq: 'daily' },
            { loc: '/browse', priority: '0.9', changefreq: 'daily' },
            { loc: '/creators', priority: '0.8', changefreq: 'weekly' },
            { loc: '/skill-tree', priority: '0.8', changefreq: 'weekly' },
            { loc: '/arena', priority: '0.8', changefreq: 'daily' },
            { loc: '/drills', priority: '0.8', changefreq: 'daily' },
            { loc: '/routines', priority: '0.8', changefreq: 'daily' },
            { loc: '/pricing', priority: '0.7', changefreq: 'monthly' },
            { loc: '/register', priority: '0.6', changefreq: 'monthly' },
            { loc: '/login', priority: '0.5', changefreq: 'monthly' },
            { loc: '/creators/apply', priority: '0.7', changefreq: 'monthly' },
            { loc: '/terms', priority: '0.3', changefreq: 'yearly' },
            { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
        ]

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`

        // Add static pages
        for (const page of staticPages) {
            xml += `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`
        }

        // Add courses
        if (courses) {
            for (const course of courses) {
                const lastmod = course.updated_at
                    ? new Date(course.updated_at).toISOString().split('T')[0]
                    : today
                xml += `  <url>
    <loc>${baseUrl}/courses/${course.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`
            }
        }

        // Add routines
        if (routines) {
            for (const routine of routines) {
                const lastmod = routine.updated_at
                    ? new Date(routine.updated_at).toISOString().split('T')[0]
                    : today
                xml += `  <url>
    <loc>${baseUrl}/routines/${routine.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`
            }
        }

        // Add drills
        if (drills) {
            for (const drill of drills) {
                const lastmod = drill.updated_at
                    ? new Date(drill.updated_at).toISOString().split('T')[0]
                    : today
                xml += `  <url>
    <loc>${baseUrl}/drills/${drill.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`
            }
        }

        // Add creators
        if (creators) {
            for (const creator of creators) {
                const lastmod = creator.updated_at
                    ? new Date(creator.updated_at).toISOString().split('T')[0]
                    : today
                xml += `  <url>
    <loc>${baseUrl}/creator/${creator.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`
            }
        }

        xml += `</urlset>`

        return new Response(xml, {
            headers: corsHeaders,
            status: 200
        })

    } catch (error) {
        console.error('Sitemap generation error:', error)
        return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://grapplay.com/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`,
            { headers: corsHeaders, status: 200 }
        )
    }
})
