const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkLessons() {
  console.log('Checking lessons with creator_id...\n');

  const { data } = await supabase
    .from('lessons')
    .select('id, title, creator_id, course_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Recent lessons:');
  for (const l of data || []) {
    console.log('- ' + l.title);
    console.log('  creator_id: ' + (l.creator_id || 'NULL'));
    console.log('  course_id: ' + (l.course_id || 'NULL'));
    console.log('  created_at: ' + l.created_at);

    // If creator_id exists, fetch creator name
    if (l.creator_id) {
      const { data: creator } = await supabase
        .from('creators')
        .select('name')
        .eq('id', l.creator_id)
        .single();
      console.log('  creator_name: ' + (creator?.name || 'NOT FOUND'));
    }
    console.log('');
  }

  console.log('\n---\n');

  // Get all lessons (same as getLessonsAdmin)
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select(`
      id,
      title,
      creator_id,
      course_id,
      created_at,
      vimeo_url
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (lessonsError) {
    console.error('Error fetching lessons:', lessonsError);
    return;
  }

  console.log(`Total lessons found: ${lessons?.length || 0}\n`);

  if (lessons && lessons.length > 0) {
    console.log('Recent lessons:');
    lessons.forEach((lesson, i) => {
      console.log(`${i + 1}. [${new Date(lesson.created_at).toLocaleDateString()}] ${lesson.title}`);
      console.log(`   - ID: ${lesson.id}`);
      console.log(`   - Course ID: ${lesson.course_id || 'standalone'}`);
      console.log(`   - Creator ID: ${lesson.creator_id || 'none'}`);
      console.log(`   - Vimeo URL: ${lesson.vimeo_url ? 'Yes' : 'No'}`);
      console.log('');
    });
  } else {
    console.log('No lessons found in the database!');
  }

  // Also check total count
  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true });

  console.log(`\nTotal lessons in DB: ${count}`);
}

checkLessons();
