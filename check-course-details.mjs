// Check course creation details
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCourseDetails() {
    console.log('🔍 Checking course details...\n');

    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total courses: ${data.length}\n`);

    data.forEach((course, index) => {
        console.log(`\n--- Course ${index + 1} ---`);
        console.log(`Title: ${course.title}`);
        console.log(`Published: ${course.published}`);
        console.log(`Category: ${course.category}`);
        console.log(`Difficulty: ${course.difficulty}`);
        console.log(`Description: "${course.description}"`);
        console.log(`Creator ID: ${course.creator_id}`);
        console.log(`Created: ${course.created_at}`);
        console.log(`Price: ${course.price}`);
        console.log(`Views: ${course.views}`);
    });

    // Check if there's a pattern in creator IDs
    console.log('\n\n=== Creator Analysis ===');
    const creatorIds = [...new Set(data.map(c => c.creator_id))];
    console.log(`Unique creators: ${creatorIds.length}`);
    creatorIds.forEach(id => {
        const courses = data.filter(c => c.creator_id === id);
        console.log(`\nCreator ${id}:`);
        courses.forEach(c => console.log(`  - ${c.title} (published: ${c.published})`));
    });
}

checkCourseDetails().catch(console.error);
