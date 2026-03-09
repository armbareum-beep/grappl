-- Enhance recurring events and add internal registration toggle
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[],
ADD COLUMN IF NOT EXISTS monthly_option TEXT,
ADD COLUMN IF NOT EXISTS use_internal_registration BOOLEAN DEFAULT true;
