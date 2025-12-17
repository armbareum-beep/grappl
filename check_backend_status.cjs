const https = require('https');

const videoBackendUrl = 'https://grappl-video-backend.onrender.com/version';

console.log(`Checking Backend Status at: ${videoBackendUrl}`);

https.get(videoBackendUrl, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('--- Backend Status ---');
            console.log('Version:', json.version);
            console.log('Supabase Connected:', json.supabaseConnected);
            console.log('Is Service Role (Admin):', json.isServiceRole); // CRITICAL CHECK
            console.log('Vimeo Checks:', json.vimeoCheck);
            console.log('Env Checks:', json.envCheck);
            console.log('----------------------');

            if (!json.isServiceRole) {
                console.error('CRITICAL ISSUE: Backend is NOT running as Admin (Service Role). DB Updates will fail.');
            } else if (!json.vimeoCheck.hasToken) {
                console.error('CRITICAL ISSUE: Backend missing Vimeo Token.');
            } else {
                console.log('Backend seems healthy.');
            }

        } catch (e) {
            console.error('Failed to parse response:', data);
        }
    });

}).on('error', (err) => {
    console.error('Error connecting to backend:', err.message);
});
