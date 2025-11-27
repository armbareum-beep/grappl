-- Migration: Replace complete_drill quest with give_feedback quest
-- This updates existing daily quests and prepares for the new quest type

-- Update existing complete_drill quests to give_feedback
UPDATE daily_quests
SET quest_type = 'give_feedback'
WHERE quest_type = 'complete_drill';

-- Note: The quest generation logic should be updated to create give_feedback quests
-- instead of complete_drill quests going forward.
-- 
-- give_feedback quest completion is tracked when users:
-- 1. Add a comment/feedback to someone else's training log
-- 2. Add a comment/feedback to someone else's sparring review
-- 
-- This encourages community engagement and learning from others' experiences.
