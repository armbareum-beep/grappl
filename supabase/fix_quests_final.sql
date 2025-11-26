-- Fix in correct order: Delete data first, then modify constraint

-- Step 1: Delete all existing quests first
DELETE FROM daily_quests;

-- Step 2: Drop the old check constraint
ALTER TABLE daily_quests 
DROP CONSTRAINT IF EXISTS daily_quests_quest_type_check;

-- Step 3: Add new check constraint with all quest types
ALTER TABLE daily_quests
ADD CONSTRAINT daily_quests_quest_type_check 
CHECK (quest_type IN (
    'watch_lesson',
    'write_log',
    'tournament',
    'complete_drill',
    'sparring_review',
    'master_skill',
    'complete_routine'
));

-- Step 4: Insert 6 new quests for all users
INSERT INTO daily_quests (user_id, quest_type, target_count, current_count, xp_reward, completed, created_at)
SELECT 
    u.id,
    quest_type,
    1,
    0,
    xp_reward,
    false,
    NOW()
FROM auth.users u
CROSS JOIN (
    VALUES 
        ('watch_lesson', 10),
        ('write_log', 20),
        ('complete_drill', 30),
        ('sparring_review', 30),
        ('complete_routine', 50),
        ('tournament', 50)
) AS quests(quest_type, xp_reward);
