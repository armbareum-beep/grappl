-- Add columns for flexible monthly recurrence
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS recurrence_weeks INTEGER[], -- 1, 2, 3, 4, 5 (last)
ADD COLUMN IF NOT EXISTS recurrence_months_dates INTEGER[]; -- 1 to 31
