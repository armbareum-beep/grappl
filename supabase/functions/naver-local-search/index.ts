import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const NAVER_CLIENT_ID = 'TahwkchOOox9oAwaQSTo';
const NAVER_CLIENT_SECRET = 'dNOSyGtt5O';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NaverLocalResult {
    title: string;
    link: string;
    category: string;
    description: string;
    telephone: string;
    address: string;
    roadAddress: string;
    mapx: string;
    mapy: string;
}

interface NaverLocalResponse {
    lastBuildDate: string;
    total: number;
    start: number;
    display: number;
    items: NaverLocalResult[];
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const query = url.searchParams.get('query');

        if (!query) {
            return new Response(
                JSON.stringify({ error: 'Query parameter is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Call Naver Local Search API
        const naverUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`;

        const response = await fetch(naverUrl, {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Naver API error:', errorText);
            return new Response(
                JSON.stringify({ error: 'Naver API error', details: errorText }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data: NaverLocalResponse = await response.json();

        // Transform results
        // Naver Local Search returns coordinates in KATEC format
        // mapx, mapy are integers representing coordinates * 10^7
        const results = data.items.map((item) => {
            // Naver uses KATEC coordinate system
            // mapx = longitude * 10^7, mapy = latitude * 10^7
            const mapx = parseInt(item.mapx, 10);
            const mapy = parseInt(item.mapy, 10);

            // Convert from KATEC (multiplied by 10^7) to WGS84
            // Note: This is approximate. For more accuracy, proper KATEC->WGS84 conversion is needed
            const lng = mapx / 10000000;
            const lat = mapy / 10000000;

            return {
                title: item.title.replace(/<[^>]*>/g, ''), // Remove HTML tags
                category: item.category,
                address: item.address,
                roadAddress: item.roadAddress,
                telephone: item.telephone,
                lat,
                lng,
                // Also return raw coords for debugging
                rawMapx: mapx,
                rawMapy: mapy,
            };
        });

        return new Response(
            JSON.stringify({ results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
