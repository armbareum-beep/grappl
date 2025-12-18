const fs = require('fs');
const path = require('path');

const results = {
    env: [],
    code: [],
    config: []
};

function check(category, name, passed, message) {
    results[category].push({ name, passed, message });
}

// 1. Check Environment Variables (.env.production)
const envPath = path.join(process.cwd(), '.env.production');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            envVars[parts[0].trim()] = parts[1].trim();
        }
    });

    // PayPal
    check('env', 'PayPal Client ID',
        !!envVars['VITE_PAYPAL_CLIENT_ID'],
        envVars['VITE_PAYPAL_CLIENT_ID'] ? 'Present' : 'Missing');

    check('env', 'PayPal Environment',
        envVars['VITE_PAYPAL_ENV'] === 'live',
        envVars['VITE_PAYPAL_ENV'] === 'live' ? 'Set to Live mode' : 'Not set to Live (Sandbox?)');

    check('env', 'PayPal Secret Key',
        !!envVars['PAYPAL_SECRET_KEY'],
        envVars['PAYPAL_SECRET_KEY'] ? 'Present' : 'Missing');

    // Vimeo
    check('env', 'Vimeo Token',
        !!envVars['VITE_VIMEO_ACCESS_TOKEN'],
        envVars['VITE_VIMEO_ACCESS_TOKEN'] ? 'Present' : 'Missing');

    // Supabase
    check('env', 'Supabase URL',
        !!envVars['VITE_SUPABASE_URL'],
        'Checked presence');
    check('env', 'Supabase Anon Key',
        !!envVars['VITE_SUPABASE_ANON_KEY'],
        'Checked presence');

    // Auth
    check('env', 'Google Client ID',
        !!envVars['VITE_GOOGLE_CLIENT_ID'],
        'Required for Social Login');

} else {
    check('env', '.env.production', false, 'File not found');
}

// 2. Check Code Configurations
// Analytics
const indexPath = path.join(process.cwd(), 'index.html');
if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    check('code', 'GA4 Tag', content.includes('googletagmanager.com/gtag/js'), 'Checking index.html for GTM/GA4 script');
}

// Legal Links in Footer
function findFile(dir, filename) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                const found = findFile(fullPath, filename);
                if (found) return found;
            }
        } else if (file === filename) {
            return fullPath;
        }
    }
    return null;
}

const actualFooterPath = findFile(process.cwd(), 'Footer.tsx');
if (actualFooterPath) {
    const content = fs.readFileSync(actualFooterPath, 'utf8');
    const hasTerms = content.includes('/terms') || content.includes('이용약관');
    const hasPrivacy = content.includes('/privacy') || content.includes('개인정보');
    check('code', 'Legal Links (Footer)', hasTerms && hasPrivacy, `Terms: ${hasTerms}, Privacy: ${hasPrivacy}`);
} else {
    check('code', 'Footer Component', false, 'Footer.tsx not found to verify links');
}

// 3. Config / Edge Functions
const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
if (fs.existsSync(functionsDir)) {
    check('config', 'PayPal Verification Function', fs.existsSync(path.join(functionsDir, 'verify-paypal-payment')), 'Folder exists');
}

console.log(JSON.stringify(results, null, 2));
