import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkVimeoPrivacy() {
    console.log('🔍 Checking Vimeo Video Privacy...');

    // Get a few lessons with vimeo links
    const { data: lessons } = await supabase
        .from('lessons')
        .select('title, vimeo_url')
        .neq('vimeo_url', '')
        .limit(3);

    if (!lessons || lessons.length === 0) {
        console.log('❌ No lessons found to test.');
        return;
    }

    for (const l of lessons) {
        console.log(`\n🎥 Testing: ${l.title}`);
        console.log(`   URL: ${l.vimeo_url}`);

        // Extract ID
        let id = l.vimeo_url;
        // If it's a URL, extract the ID
        if (l.vimeo_url.match(/\D/)) { // If contains non-digits
            const idMatch = l.vimeo_url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
            if (idMatch) {
                id = idMatch[1];
            } else {
                // Try to find any sequence of numbers if explicit url structure failed
                const numberMatch = l.vimeo_url.match(/(\d{8,})/);
                if (numberMatch) id = numberMatch[1];
                else {
                    console.log('   ❌ Could not extract ID from URL');
                    continue;
                }
            }
        }

        // Check oEmbed (Public way to check if embeddable)
        try {
            const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}`;
            const res = await fetch(oembedUrl);
            if (res.ok) {
                const data = await res.json();
                console.log(`   ✅ oEmbed OK. Author: ${data.author_name}`);
            } else {
                console.log(`   ⚠️ oEmbed Failed (${res.status}). This often means Domain Restriction or Private Video.`);
            }
        } catch (e) {
            console.log(`   ❌ Fetch Error: ${e.message}`);
        }
    }
}

checkVimeoPrivacy();
