import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const VIMEO_TOKEN = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function extractVideoId(vimeoUrl: string): string | null {
    if (!vimeoUrl) return null;
    let id = vimeoUrl;
    if (id.includes('vimeo.com/')) {
        id = id.split('vimeo.com/')[1].split('?')[0];
    }
    // Handle ID:HASH format
    if (id.includes(':')) {
        id = id.split(':')[0];
    }
    // Handle /hash suffix
    if (id.includes('/')) {
        id = id.split('/')[0];
    }
    return /^\d+$/.test(id.trim()) ? id.trim() : null;
}

function needsUpdate(item: any, urlField: string): boolean {
    const val = item[urlField];
    if (!val || val === 'error' || val.toString().startsWith('ERROR')) return false;

    const hasNoDuration =
        (!item.length || item.length === '0:00' || item.length === '00:00') ||
        (!item.duration_minutes || item.duration_minutes === 0);

    const hasNoThumbnail =
        !item.thumbnail_url ||
        item.thumbnail_url.includes('placeholder') ||
        item.thumbnail_url.includes('placehold.co');

    return hasNoDuration || hasNoThumbnail;
}

async function fetchVimeoInfo(videoId: string) {
    const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
        headers: {
            'Authorization': `Bearer ${VIMEO_TOKEN}`,
            'Accept': 'application/vnd.vimeo.*+json;version=3.4'
        }
    });

    if (!response.ok) {
        return { ok: false as const, status: response.status };
    }

    const data = await response.json();

    let thumbnail = data.pictures?.base_link || null;
    if (data.pictures?.sizes?.length) {
        const sorted = [...data.pictures.sizes].sort((a: any, b: any) => b.width - a.width);
        thumbnail = sorted[0].link;
    }

    return {
        ok: true as const,
        duration: data.duration as number,
        thumbnail,
        title: data.name as string,
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const missing = [];
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_KEY) missing.push('SUPABASE_KEY');
    if (!VIMEO_TOKEN) missing.push('VIMEO_ACCESS_TOKEN');
    if (missing.length > 0) {
        return res.status(500).json({ error: `Missing environment variables: ${missing.join(', ')}` });
    }

    try {
        const { action } = req.body;

        // ── Scan: find records missing duration data ──
        if (action === 'scan') {
            const [lessonsRes, drillsRes, sparringRes] = await Promise.all([
                supabase.from('lessons').select('id, title, vimeo_url, length, duration_minutes, thumbnail_url'),
                supabase.from('drills').select('id, title, vimeo_url, length, duration_minutes, thumbnail_url'),
                supabase.from('sparring_videos').select('id, title, video_url, length, duration_minutes, thumbnail_url'),
            ]);

            if (lessonsRes.error) console.error('lessons scan error:', lessonsRes.error);
            if (drillsRes.error) console.error('drills scan error:', drillsRes.error);
            if (sparringRes.error) console.error('sparring scan error:', sparringRes.error);

            const lessons = (lessonsRes.data || []).filter(i => needsUpdate(i, 'vimeo_url'));
            const drills = (drillsRes.data || []).filter(i => needsUpdate(i, 'vimeo_url'));
            const sparring = (sparringRes.data || []).filter(i => needsUpdate(i, 'video_url'));

            return res.json({ lessons, drills, sparring });
        }

        // ── Sync: fetch from Vimeo API and update DB ──
        if (action === 'sync') {
            const { table, items } = req.body as {
                table: 'lessons' | 'drills' | 'sparring_videos';
                items: { id: string; vimeoUrl: string }[];
            };

            if (!table || !items?.length) {
                return res.status(400).json({ error: 'Missing table or items' });
            }

            const results: { id: string; status: string; updates?: any; error?: string }[] = [];

            for (const item of items) {
                const videoId = extractVideoId(item.vimeoUrl);
                if (!videoId) {
                    results.push({ id: item.id, status: 'failed', error: 'Invalid Vimeo URL' });
                    continue;
                }

                const info = await fetchVimeoInfo(videoId);

                if (!info.ok) {
                    results.push({ id: item.id, status: 'failed', error: `Vimeo API ${info.status}` });
                    continue;
                }

                const updates: Record<string, any> = {};

                if (info.duration > 0) {
                    updates.length = formatDuration(info.duration);
                    updates.duration_minutes = Math.floor(info.duration / 60);
                }

                if (info.thumbnail) {
                    updates.thumbnail_url = info.thumbnail;
                }

                if (Object.keys(updates).length > 0) {
                    const { error: updateError } = await supabase
                        .from(table)
                        .update(updates)
                        .eq('id', item.id);

                    if (updateError) {
                        results.push({ id: item.id, status: 'failed', error: updateError.message });
                    } else {
                        results.push({ id: item.id, status: 'success', updates });
                    }
                } else {
                    results.push({ id: item.id, status: 'skipped' });
                }

                // Rate limit delay
                await new Promise(r => setTimeout(r, 200));
            }

            return res.json({ results });
        }

        return res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (err: any) {
        console.error('[sync-vimeo-durations] Error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
