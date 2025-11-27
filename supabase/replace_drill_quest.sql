-- Update quest_type constraint to replace complete_drill with give_feedback

-- Step 1: Drop the old check constraint
ALTER TABLE daily_quests 
DROP CONSTRAINT IF EXISTS daily_quests_quest_type_check;

-- Step 2: Add new check constraint with give_feedback instead of complete_drill
ALTER TABLE daily_quests
ADD CONSTRAINT daily_quests_quest_type_check 
CHECK (quest_type IN (
    'watch_lesson',
    'write_log',
    'tournament',
    'give_feedback',
    'sparring_review',
    'master_skill',
    'complete_routine'
));

-- Step 3: Update existing complete_drill quests to give_feedback
UPDATE daily_quests
SET quest_type = 'give_feedback'
WHERE quest_type = 'complete_drill';
