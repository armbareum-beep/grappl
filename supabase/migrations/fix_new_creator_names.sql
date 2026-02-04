-- Update creators table: Replace "NEW creator" with actual email
-- This script updates all creators whose name is "NEW creator" to use their email instead

UPDATE creators
SET name = COALESCE(email, name)
WHERE name = 'NEW creator' OR name LIKE 'NEW creator%';

-- Verify the update
SELECT id, name, email, created_at
FROM creators
ORDER BY created_at DESC
LIMIT 20;
