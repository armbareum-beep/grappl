-- Add columns to gym_member_verifications if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='gym_member_verifications' AND column_name='brand_id'
  ) THEN
    ALTER TABLE public.gym_member_verifications ADD COLUMN brand_id UUID REFERENCES public.event_brands(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='gym_member_verifications' AND column_name='verification_type'
  ) THEN
    ALTER TABLE public.gym_member_verifications ADD COLUMN verification_type TEXT DEFAULT 'gym';
  END IF;
END $$;
