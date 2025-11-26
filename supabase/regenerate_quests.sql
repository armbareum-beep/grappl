-- Clean up and regenerate daily quests
-- Step 1: Delete all existing quests
DELETE FROM daily_quests;

-- Step 2: Get current user ID (replace with your actual user ID)
-- You can find your user ID by running: SELECT id FROM auth.users LIMIT 1;

-- Step 3: Insert new quests for your user
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users table

INSERT INTO daily_quests (user_id, quest_type, target_count, current_count, xp_reward, completed, created_at)
VALUES
    -- Replace 'YOUR_USER_ID_HERE' with your actual UUID
    ('YOUR_USER_ID_HERE', 'watch_lesson', 1, 0, 10, false, NOW()),
    ('YOUR_USER_ID_HERE', 'write_log', 1, 0, 20, false, NOW()),
    ('YOUR_USER_ID_HERE', 'complete_drill', 1, 0, 30, false, NOW()),
    ('YOUR_USER_ID_HERE', 'sparring_review', 1, 0, 30, false, NOW()),
    ('YOUR_USER_ID_HERE', 'complete_routine', 1, 0, 50, false, NOW()),
    ('YOUR_USER_ID_HERE', 'tournament', 1, 0, 50, false, NOW());

-- Alternative: If you want to do this for ALL users at once:
-- First, delete all quests
-- DELETE FROM daily_quests;

-- Then insert for all users
-- INSERT INTO daily_quests (user_id, quest_type, target_count, current_count, xp_reward, completed, created_at)
-- SELECT 
--     u.id,
--     quest_type,
--     1,
--     0,
--     xp_reward,
--     false,
--     NOW()
-- FROM auth.users u
-- CROSS JOIN (
--     VALUES 
--         ('watch_lesson', 10),
--         ('write_log', 20),
--         ('complete_drill', 30),
--         ('sparring_review', 30),
--         ('complete_routine', 50),
--         ('tournament', 50)
-- ) AS quests(quest_type, xp_reward);
