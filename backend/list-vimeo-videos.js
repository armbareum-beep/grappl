require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch'); // Use explicit fetch if unsure about global support in shell script

const VIMEO_TOKEN = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;

async function listVideos() {
    try {
        const res = await fetch('https://api.vimeo.com/me/videos?per_page=10', {
            headers: {
                'Authorization': `Bearer ${VIMEO_TOKEN}`,
                'Accept': 'application/vnd.vimeo.*+json;version=3.4'
            }
        });

        if (res.ok) {
            const data = await res.json();
            console.log('Recent Videos:');
            data.data.forEach(v => {
                console.log(`- ${v.name} (ID: ${v.uri.split('/').pop()}) | Duration: ${v.duration}s | Status: ${v.status}`);
            });
        } else {
            const err = await res.text();
            console.error('Failed to list videos:', res.status, err);
        }
    } catch (e) {
        console.error('Error listing videos:', e.message);
    }
}

listVideos();
