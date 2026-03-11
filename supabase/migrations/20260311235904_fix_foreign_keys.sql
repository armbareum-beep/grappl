-- Add foreign key constraint to student_id referencing users(id) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'gym_member_verifications_student_id_fkey'
  ) THEN
    ALTER TABLE public.gym_member_verifications 
      ADD CONSTRAINT gym_member_verifications_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'gym_member_verifications_instructor_id_fkey'
  ) THEN
    ALTER TABLE public.gym_member_verifications 
      ADD CONSTRAINT gym_member_verifications_instructor_id_fkey 
      FOREIGN KEY (instructor_id) REFERENCES public.creators(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Force PostgREST to reload the schema cache so the UI can detect the new relationship
NOTIFY pgrst, 'reload schema';
