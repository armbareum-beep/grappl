require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const VIMEO_TOKEN = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;
const vimeoId = '1152757629';
const vimeoHash = '84af177f1e';

async function testUnlisted() {
    console.log(`Testing unlisted video ${vimeoId}:${vimeoHash}...`);

    // Test 1: Authenticated API (No hash needed for owner)
    try {
        const res = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
            headers: {
                'Authorization': `Bearer ${VIMEO_TOKEN}`,
                'Accept': 'application/vnd.vimeo.*+json;version=3.4'
            }
        });
        if (res.ok) {
            const data = await res.json();
            console.log('API (Authenticated) Success: Duration =', data.duration);
        } else {
            const err = await res.text();
            console.warn(`API (Authenticated) Failed: ${res.status}`, err.substring(0, 100));
        }
    } catch (e) {
        console.error('API (Authenticated) Exception:', e.message);
    }

    // Test 2: oEmbed with Hash
    try {
        const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}/${vimeoHash}`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
            const data = await res.json();
            console.log('oEmbed (with hash) Success: Duration =', data.duration);
        } else {
            console.warn(`oEmbed (with hash) Failed: ${res.status}`);
        }
    } catch (e) {
        console.error('oEmbed Exception:', e.message);
    }
}

testUnlisted();
