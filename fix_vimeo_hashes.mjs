// Script to update existing Vimeo IDs with their embed hashes
const SUPABASE_URL = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3MTE2OCwiZXhwIjoyMDc5MjQ3MTY4fQ.1K9lLb4v2R6OujKpJnzvChgpOxRxpJkNNl8FjKSqaTI';
const VIMEO_TOKEN = 'b10ff235e7373951d53ed3096dd7aa4b';

async function getVimeoHash(vimeoId) {
    const res = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
        headers: {
            'Authorization': `Bearer ${VIMEO_TOKEN}`,
            'Accept': 'application/vnd.vimeo.*+json;version=3.4'
        }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const embedUrl = data.player_embed_url;
    if (embedUrl) {
        const match = embedUrl.match(/[?&]h=([a-z0-9]+)/i);
        if (match) return match[1];
    }
    return null;
}

async function updateTable(tableName, urlColumn) {
    console.log(`\nUpdating ${tableName}.${urlColumn}...`);
    
    // Fetch records
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=id,${urlColumn}&${urlColumn}=not.is.null&${urlColumn}=not.eq.`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    
    if (!res.ok) {
        console.log(`  Error fetching ${tableName}: ${res.status}`);
        return;
    }
    
    const records = await res.json();
    console.log(`  Found ${records.length} records`);
    
    for (const record of records) {
        const url = record[urlColumn];
        if (!url || url.includes(':') || url.includes('/')) {
            console.log(`  Skipping ${record.id} - already has hash or is URL`);
            continue;
        }
        
        // It's just an ID, fetch hash
        const vimeoId = url;
        console.log(`  Fetching hash for ${vimeoId}...`);
        const hash = await getVimeoHash(vimeoId);
        
        if (hash) {
            const newUrl = `${vimeoId}:${hash}`;
            console.log(`    -> ${newUrl}`);
            
            // Update record
            const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${record.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ [urlColumn]: newUrl })
            });
            
            if (updateRes.ok) {
                console.log(`    Updated!`);
            } else {
                console.log(`    Failed: ${updateRes.status}`);
            }
        } else {
            console.log(`    No hash found for ${vimeoId}`);
        }
        
        // Rate limit
        await new Promise(r => setTimeout(r, 500));
    }
}

async function main() {
    console.log('Fixing Vimeo hashes...');
    await updateTable('lessons', 'vimeo_url');
    await updateTable('drills', 'vimeo_url');
    await updateTable('sparring_videos', 'video_url');
    console.log('\nDone!');
}

main().catch(console.error);
