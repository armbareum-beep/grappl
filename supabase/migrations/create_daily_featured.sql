-- Create daily_featured_content table
CREATE TABLE IF NOT EXISTS daily_featured_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    featured_type VARCHAR(50) NOT NULL CHECK (featured_type IN ('course', 'drill', 'sparring')),
    featured_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_daily_featured_date ON daily_featured_content(date);

-- Enable RLS
ALTER TABLE daily_featured_content ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view (read-only)
DROP POLICY IF EXISTS "Everyone can view daily featured content" ON daily_featured_content;
CREATE POLICY "Everyone can view daily featured content"
    ON daily_featured_content FOR SELECT
    USING (true);

-- Policy: Only admins/service_role can insert/update
DROP POLICY IF EXISTS "Admins can manage daily featured content" ON daily_featured_content;
CREATE POLICY "Admins can manage daily featured content"
    ON daily_featured_content FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON daily_featured_content TO anon, authenticated;
GRANT ALL ON daily_featured_content TO service_role;

-- Add comment
COMMENT ON TABLE daily_featured_content IS '매일 12시마다 공개되는 레슨/드릴/스파링 콘텐츠 관리';
COMMENT ON COLUMN daily_featured_content.featured_type IS 'course, drill, sparring 중 하나';
COMMENT ON COLUMN daily_featured_content.featured_id IS '해당 콘텐츠의 ID (course_id, drill_id, sparring_video_id)';
