
const { getCourseById } = require('./lib/api');
const { supabase } = require('./lib/supabase');

async function test() {
    const id = 'e90b40dd-3529-43a2-a27c-e2a172dab5da'; // "틀린 Z가드"
    console.log('Fetching course:', id);
    const { data, error } = await getCourseById(id);
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Transformed Course:', JSON.stringify(data, null, 2));
}

test();
