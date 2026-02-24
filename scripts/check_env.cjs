require('dotenv').config();

console.log('=== Frontend Environment Variables (.env) ===');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? `${process.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('VITE_BACKEND_URL:', process.env.VITE_BACKEND_URL);
console.log('\n=== Backend Environment Variables (from Render) ===');
console.log('Check Render dashboard for:');
console.log('- SUPABASE_URL');
console.log('- SUPABASE_SERVICE_ROLE_KEY');
console.log('\nThese MUST match the frontend values!');
