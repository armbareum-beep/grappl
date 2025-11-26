-- Migrate existing user XP to new system
-- Multiply all existing XP by 10 to match new requirements

UPDATE user_progress
SET 
    total_xp = total_xp * 10,
    current_xp = current_xp * 10,
    updated_at = NOW()
WHERE total_xp > 0;

-- Recalculate belt levels based on new XP
UPDATE user_progress
SET belt_level = CASE
    -- White Belt
    WHEN total_xp < 500 THEN 1
    WHEN total_xp < 1200 THEN 2
    WHEN total_xp < 2000 THEN 3
    WHEN total_xp < 3000 THEN 4
    WHEN total_xp < 5000 THEN 5
    -- Blue Belt
    WHEN total_xp < 7500 THEN 6
    WHEN total_xp < 10500 THEN 7
    WHEN total_xp < 14000 THEN 8
    WHEN total_xp < 18000 THEN 9
    WHEN total_xp < 24000 THEN 10
    -- Purple Belt
    WHEN total_xp < 31000 THEN 11
    WHEN total_xp < 39000 THEN 12
    WHEN total_xp < 48000 THEN 13
    WHEN total_xp < 58000 THEN 14
    WHEN total_xp < 72000 THEN 15
    -- Brown Belt
    WHEN total_xp < 88000 THEN 16
    WHEN total_xp < 106000 THEN 17
    WHEN total_xp < 126000 THEN 18
    WHEN total_xp < 148000 THEN 19
    WHEN total_xp < 180000 THEN 20
    -- Black Belt
    WHEN total_xp < 220000 THEN 21
    WHEN total_xp < 270000 THEN 22
    WHEN total_xp < 330000 THEN 23
    WHEN total_xp < 400000 THEN 24
    WHEN total_xp < 480000 THEN 25
    WHEN total_xp < 570000 THEN 26
    WHEN total_xp < 700000 THEN 27
    -- Master Belts
    WHEN total_xp < 900000 THEN 28
    WHEN total_xp < 1200000 THEN 29
    ELSE 30
END,
updated_at = NOW();
