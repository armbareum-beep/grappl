-- Add type and metadata columns to training_logs table
-- Run this in Supabase SQL Editor

ALTER TABLE training_logs 
ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE training_logs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_training_logs_type ON training_logs(type);
CREATE INDEX IF NOT EXISTS idx_training_logs_metadata ON training_logs USING GIN (metadata);
