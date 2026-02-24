
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Try to load dotenv from backend node_modules
try {
    require('./backend/node_modules/dotenv').config();
} catch (e) {
    console.log('Could not load dotenv from backend, trying standard require');
    try {
        require('dotenv').config();
    } catch (e2) {
        console.log('dotenv not found');
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Use ANON key for now, or SERVICE_ROLE if available

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Seeding test drill...');

    // First, get a user to be the creator
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    let creatorId;
    if (users && users.length > 0) {
        creatorId = users[0].id;
        console.log('Using existing user as creator:', creatorId);
    } else {
        // If we can't list users (no admin access with anon key), we might need to create one or use a dummy ID
        // But with anon key we can't list users.
        // We will try to fetch from 'creators' table if public
        const { data: creators } = await supabase.from('creators').select('id').limit(1);
        if (creators && creators.length > 0) {
            creatorId = creators[0].id;
            console.log('Using existing creator:', creatorId);
        } else {
            console.log('No creators found. Using a random UUID (might fail RLS)');
            creatorId = '00000000-0000-0000-0000-000000000000';
        }
    }

    const drill = {
        title: 'Test Drill (Seeded)',
        description: 'This is a test drill created by the seed script.',
        creator_id: creatorId,
        category: 'Standing',
        difficulty: 'Beginner',
        thumbnail_url: 'https://placehold.co/600x400/png',
        vimeo_url: 'https://vimeo.com/76979871',
        duration_minutes: 5,
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('drills')
        .insert(drill)
        .select()
        .single();

    if (error) {
        console.error('Error creating drill:', error);
    } else {
        console.log('Drill created successfully:', data);
    }
}

seed();
