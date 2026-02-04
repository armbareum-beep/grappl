const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const VIMEO_TOKEN = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;

async function checkToken() {
    if (!VIMEO_TOKEN) {
        console.error('VIMEO_TOKEN is missing');
        return;
    }

    try {
        const res = await fetch('https://api.vimeo.com/me', {
            headers: {
                'Authorization': `Bearer ${VIMEO_TOKEN}`,
                'Accept': 'application/vnd.vimeo.*+json;version=3.4'
            }
        });

        if (res.ok) {
            const data = await res.json();
            console.log('Vimeo Token is valid.');
            console.log('Account:', data.name, `(${data.link})`);
            console.log('Account Type:', data.account);
        } else {
            const err = await res.text();
            console.error('Vimeo Token is invalid or expired:', res.status, err);
        }
    } catch (e) {
        console.error('Error checking Vimeo token:', e.message);
    }
}

checkToken();
