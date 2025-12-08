
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
} catch (e) {
    console.log('Error reading .env:', e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Make sure .env is loaded.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPublicAccess() {
    console.log('Testing public access with APP-LIKE queries...');

    // 1. Test Drills (Simple select *)
    console.log('\n--- Testing Drills (App Query) ---');
    const { data: drills, error: drillError } = await supabase
        .from('drills')
        .select('*')
        .limit(5);

    if (drillError) {
        console.error('Error fetching drills:', drillError);
    } else {
        console.log(`Successfully fetched ${drills?.length} drills.`);
        if (drills?.length > 0) console.log('Sample Drill:', drills[0].title);
    }

    // 2. Test Routines (Simple select *)
    console.log('\n--- Testing Routines (App Query) ---');
    const { data: routines, error: routineError } = await supabase
        .from('routines')
        .select('*')
        .limit(5);

    if (routineError) {
        console.error('Error fetching routines:', routineError);
    } else {
        console.log(`Successfully fetched ${routines?.length} routines.`);
        if (routines?.length > 0) console.log('Sample Routine:', routines[0].title);
    }

    // 3. Test Courses (With Joins)
    console.log('\n--- Testing Courses (App Query with Joins) ---');
    const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select(`
            *,
            creator:creators(name),
            lessons:lessons(count)
        `)
        .limit(5);

    if (courseError) {
        console.error('Error fetching courses:', courseError);
    } else {
        console.log(`Successfully fetched ${courses?.length} courses.`);
        if (courses?.length > 0) {
            console.log('Sample Course:', courses[0].title);
            console.log('Creator:', courses[0].creator);
            console.log('Lessons:', courses[0].lessons);
        }
    }

    // 4. Test Feed (Training Logs)
    console.log('\n--- Testing Feed (Training Logs) ---');
    const { data: logs, error: logError } = await supabase
        .from('training_logs')
        .select('*')
        .eq('is_public', true)
        .limit(5);

    if (logError) {
        console.error('Error fetching logs:', logError);
    } else {
        console.log(`Successfully fetched ${logs?.length} logs.`);
    }
}

testPublicAccess();
