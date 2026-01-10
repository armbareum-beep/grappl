const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
console.log('VIMEO_ACCESS_TOKEN:', process.env.VIMEO_ACCESS_TOKEN ? 'Present' : 'Missing');
console.log('VITE_VIMEO_ACCESS_TOKEN:', process.env.VITE_VIMEO_ACCESS_TOKEN ? 'Present' : 'Missing');
console.log('Keys:', Object.keys(process.env).filter(k => k.includes('VIMEO')));
