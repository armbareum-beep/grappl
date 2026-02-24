const https = require('https');

// URL from .env.production
const videoBackendUrl = 'https://grapplay-backend.onrender.com/version';

console.log(`Checking Backend Status at: ${videoBackendUrl}`);

const req = https.get(videoBackendUrl, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            console.log('Status Code:', res.statusCode);
            if (res.statusCode === 200) {
                const json = JSON.parse(data);
                console.log('Version:', json.version);
                console.log('Valid Response received.');
            } else {
                console.log('Response body:', data);
            }
        } catch (e) {
            console.error('Failed to parse response:', data);
        }
    });
});

req.on('error', (err) => {
    console.error('Error connecting to backend:', err.message);
});
