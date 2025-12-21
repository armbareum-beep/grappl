const https = require('https');

// URL from check_backend_status.cjs
const videoBackendUrl = 'https://grappl-video-backend.onrender.com/version';

console.log(`Checking Backend Status at: ${videoBackendUrl}`);

const req = https.get(videoBackendUrl, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            console.log('Status Code:', res.statusCode);
            const json = JSON.parse(data);
            console.log('Version:', json.version);
            console.log('Valid Response received.');
        } catch (e) {
            console.error('Failed to parse response:', data);
            console.log('Raw body:', data);
        }
    });
});

req.on('error', (err) => {
    console.error('Error connecting to backend:', err.message);
});
