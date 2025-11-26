-- Quick fix: Delete old quests and create new ones for all users

-- Step 1: Delete all existing daily quests
DELETE FROM daily_quests;

-- Step 2: Insert 6 new quests for all users
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
