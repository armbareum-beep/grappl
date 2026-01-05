const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env.local manually to ensure we read what Vite reads
const envPath = path.resolve(process.cwd(), '.env.local');

console.log('--- Debugging Environment ---');
console.log('Reading .env.local from:', envPath);

if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local file not found!');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        envVars[match[1].trim()] = value;
    }
});

const url = envVars['VITE_SUPABASE_URL'];
const key = envVars['VITE_SUPABASE_ANON_KEY'];

console.log('\n--- Variable Check ---');
console.log('VITE_SUPABASE_URL found:', !!url);
if (url) console.log('VITE_SUPABASE_URL:', url);

console.log('VITE_SUPABASE_ANON_KEY found:', !!key);
if (key) {
    console.log('VITE_SUPABASE_ANON_KEY length:', key.length);
    console.log('VITE_SUPABASE_ANON_KEY start:', key.substring(0, 10) + '...');
    if (!key.startsWith('eyJ')) {
        console.warn('WARNING: Key does not look like a JWT (should start with eyJ)');
    }
} else {
    console.error('ERROR: VITE_SUPABASE_ANON_KEY is missing!');
}

if (!url || !key) {
    console.log('\nCannot proceed with connection test.');
    process.exit(1);
}

console.log('\n--- Connection Test ---');
console.log('Testing connection to Supabase...');

const requestUrl = `${url}/rest/v1/users?select=count&limit=1`;
const options = {
    method: 'GET',
    headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
    }
};

const req = https.request(requestUrl, options, (res) => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Headers:', JSON.stringify(res.headers, null, 2));

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Response Body:', data);
        if (res.statusCode === 200 || res.statusCode === 206) {
            console.log('\nSUCCESS: Connection confirmed! The keys are valid.');
        } else {
            console.log('\nFAILURE: Connection failed. See response body for details.');
            if (data.includes('No API key found in request')) {
                console.log('  -> This indicates the apikey header was stripped or not accepted.');
            }
        }
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e);
});

req.end();
