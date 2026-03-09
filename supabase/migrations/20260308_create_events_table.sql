-- Events table for organizer system
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,

  -- Basic info
  type TEXT NOT NULL CHECK (type IN ('competition', 'seminar', 'openmat')),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,

  -- Location
  venue_name TEXT,
  address TEXT,
  address_detail TEXT,
  region TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  kakao_place_id TEXT,

  -- Date & Time
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  registration_deadline TIMESTAMPTZ,
  registration_deadline_days INTEGER DEFAULT 1, -- 이벤트 며칠 전까지 등록 가능

  -- Recurring events
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'monthly')),
  recurrence_day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
  recurrence_end_date DATE, -- 반복 종료일
  parent_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL, -- 반복 이벤트의 부모

  -- Participation
  eligibility TEXT,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,

  -- Payment
  price INTEGER DEFAULT 0,
  payment_type TEXT DEFAULT 'free' CHECK (payment_type IN ('free', 'bank_transfer', 'external_link')),
  external_payment_link TEXT,
  bank_account JSONB, -- { bankName, accountNumber, holderName }

  -- Competition specific
  competition_format TEXT CHECK (competition_format IN ('individual', 'team')),
  team_size INTEGER,
  wins_required INTEGER,

  -- Scoreboard
  public_scoreboard BOOLEAN DEFAULT true,
  scoreboard_url_key TEXT UNIQUE,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
CREATE INDEX IF NOT EXISTS idx_events_region ON public.events(region);
CREATE INDEX IF NOT EXISTS idx_events_scoreboard_key ON public.events(scoreboard_url_key);
CREATE INDEX IF NOT EXISTS idx_events_parent_event ON public.events(parent_event_id);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view published events
CREATE POLICY "Anyone can view published events" ON public.events
  FOR SELECT USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = events.organizer_id
      AND creators.id = auth.uid()
    )
  );

-- Organizers can insert their own events
CREATE POLICY "Organizers can create events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = organizer_id
      AND creators.id = auth.uid()
    )
  );

-- Organizers can update their own events
CREATE POLICY "Organizers can update own events" ON public.events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = events.organizer_id
      AND creators.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = organizer_id
      AND creators.id = auth.uid()
    )
  );

-- Organizers can delete their own events
CREATE POLICY "Organizers can delete own events" ON public.events
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = events.organizer_id
      AND creators.id = auth.uid()
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

-- View count increment function
CREATE OR REPLACE FUNCTION increment_event_view_count(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.events
  SET view_count = view_count + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
