-- ==================== Organizer System Schema ====================
-- Created: 2026-03-08
-- Description: Complete schema for event hosting system (competition, seminar, openmat)

-- ==================== 0. Extend users table (for event registration pre-fill) ====================

-- Add BJJ profile fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS belt_level TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_class TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- ==================== 1. Extend creators table ====================

-- Add organizer role fields
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  creator_type TEXT DEFAULT 'instructor'
    CHECK (creator_type IN ('instructor', 'organizer', 'both'));

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  can_host_events BOOLEAN DEFAULT FALSE;

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  verified_organizer BOOLEAN DEFAULT FALSE;

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  total_events_hosted INTEGER DEFAULT 0;

-- Instructor invitation fields (legacy)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  min_invitation_fee INTEGER DEFAULT 0;

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  invitation_description TEXT;

-- Event type-specific invitation settings
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  accept_competition_invitations BOOLEAN DEFAULT FALSE;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  min_competition_fee INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  accept_seminar_invitations BOOLEAN DEFAULT FALSE;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  min_seminar_fee INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  accept_openmat_invitations BOOLEAN DEFAULT FALSE;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  min_openmat_fee INTEGER DEFAULT 0;

-- Instructor bank account for invitations (revealed when accepted)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  bank_account_for_invitation JSONB;
  -- { bank_name, account_number, holder_name }

-- ==================== 2. Events table ====================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('competition', 'seminar', 'openmat')),

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,

  -- Location (Map API ready)
  venue_name TEXT,
  address TEXT,
  address_detail TEXT,
  region TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  kakao_place_id TEXT,

  -- Schedule
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  registration_deadline TIMESTAMPTZ,

  -- Eligibility
  eligibility JSONB DEFAULT '{}',
  max_participants INTEGER,

  -- Payment
  price INTEGER DEFAULT 0,
  payment_type TEXT DEFAULT 'free'
    CHECK (payment_type IN ('free', 'bank_transfer', 'external_link')),
  external_payment_link TEXT,
  bank_account JSONB,  -- { bank_name, account_number, holder_name }

  -- Competition specific
  competition_format TEXT DEFAULT 'individual'
    CHECK (competition_format IN ('individual', 'team')),
  team_size INTEGER DEFAULT 3,
  wins_required INTEGER DEFAULT 2,

  -- Live scoreboard
  public_scoreboard BOOLEAN DEFAULT TRUE,
  scoreboard_url_key TEXT UNIQUE,

  -- Status
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),

  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_region ON events(region);

-- ==================== 3. Event Registrations table ====================

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable for manual entries

  -- Participant info
  participant_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  belt_level TEXT,
  weight_class TEXT,
  team_name TEXT,

  -- Manual entry flag
  is_manual_entry BOOLEAN DEFAULT FALSE,

  -- Bank transfer payment
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'confirmed', 'cancelled', 'refunded', 'waitlist')),
  payment_proof_image TEXT,
  paid_amount INTEGER,
  paid_at TIMESTAMPTZ,

  -- Organizer confirmation
  confirmed_by_organizer BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,

  organizer_note TEXT,
  participant_note TEXT,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Waitlist
  waitlist_position INTEGER,

  -- Weigh-in
  weigh_in_status TEXT DEFAULT 'pending'
    CHECK (weigh_in_status IN ('pending', 'passed', 'failed', 'no_show')),
  weigh_in_weight DECIMAL(5, 2),
  weigh_in_at TIMESTAMPTZ,
  weigh_in_note TEXT,

  -- Competition result
  result TEXT,  -- '1st', '2nd', '3rd', 'participated'
  result_note TEXT,

  -- Call system (future)
  called_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON event_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON event_registrations(phone);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON event_registrations(email);

-- ==================== 4. Instructor Invitations table ====================

CREATE TABLE IF NOT EXISTS instructor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  -- Fee (hybrid: instructor minimum + organizer proposal)
  min_fee_snapshot INTEGER NOT NULL,
  proposed_fee INTEGER NOT NULL,

  invitation_message TEXT,

  -- Instructor response
  instructor_response TEXT DEFAULT 'pending'
    CHECK (instructor_response IN ('pending', 'accepted', 'declined')),
  response_message TEXT,
  responded_at TIMESTAMPTZ,

  -- Instructor bank account (snapshot when accepted)
  instructor_bank_account JSONB,
  -- { bank_name, account_number, holder_name }

  -- Bank transfer status
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN (
      'pending',           -- Waiting for instructor response
      'awaiting_payment',  -- Accepted, waiting for payment
      'paid',              -- Organizer marked as paid
      'confirmed',         -- Instructor confirmed receipt
      'declined',          -- Declined
      'cancelled'          -- Cancelled
    )),
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_min_fee CHECK (proposed_fee >= min_fee_snapshot),
  UNIQUE(event_id, instructor_id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_event ON instructor_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_invitations_instructor ON instructor_invitations(instructor_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON instructor_invitations(payment_status);

-- ==================== 5. Event Videos table ====================

CREATE TABLE IF NOT EXISTS event_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  drill_id UUID REFERENCES drills(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  sparring_id UUID REFERENCES sparring_videos(id) ON DELETE SET NULL,

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_videos_event ON event_videos(event_id);

-- ==================== 6. Organizer Reviews table ====================

CREATE TABLE IF NOT EXISTS organizer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_reviews_organizer ON organizer_reviews(organizer_id);

-- ==================== 7. Competition Categories table ====================

CREATE TABLE IF NOT EXISTS competition_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  belt_level TEXT,
  weight_class TEXT,
  gender TEXT DEFAULT 'mixed',
  age_group TEXT,

  -- Team event flag
  is_team_event BOOLEAN DEFAULT FALSE,

  bracket_type TEXT DEFAULT 'single_elimination',
  bracket_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_event ON competition_categories(event_id);

-- ==================== 8. Competition Teams table (for team matches) ====================

CREATE TABLE IF NOT EXISTS competition_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES competition_categories(id) ON DELETE CASCADE,

  team_name TEXT NOT NULL,

  -- Team members (event_registration IDs)
  member_ids UUID[] NOT NULL,

  -- Order of participants (선봉, 중견, 대장)
  member_order UUID[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_category ON competition_teams(category_id);

-- ==================== 9. Team Matches table ====================

CREATE TABLE IF NOT EXISTS team_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES competition_categories(id) ON DELETE CASCADE,

  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,

  team1_id UUID REFERENCES competition_teams(id),
  team2_id UUID REFERENCES competition_teams(id),

  -- Individual match results
  individual_match_ids UUID[],

  team1_wins INTEGER DEFAULT 0,
  team2_wins INTEGER DEFAULT 0,

  winner_team_id UUID REFERENCES competition_teams(id),

  next_match_id UUID REFERENCES team_matches(id),
  next_match_slot INTEGER,

  status TEXT DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_matches_category ON team_matches(category_id);

-- ==================== 10. Competition Matches table (individual) ====================

CREATE TABLE IF NOT EXISTS competition_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES competition_categories(id) ON DELETE CASCADE,

  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,

  player1_id UUID REFERENCES event_registrations(id),
  player2_id UUID REFERENCES event_registrations(id),

  player1_bye BOOLEAN DEFAULT FALSE,
  player2_bye BOOLEAN DEFAULT FALSE,

  -- Result
  winner_id UUID REFERENCES event_registrations(id),
  win_method TEXT,

  -- Score
  player1_points INTEGER DEFAULT 0,
  player2_points INTEGER DEFAULT 0,
  player1_advantages INTEGER DEFAULT 0,
  player2_advantages INTEGER DEFAULT 0,
  player1_penalties INTEGER DEFAULT 0,
  player2_penalties INTEGER DEFAULT 0,

  match_duration INTEGER,

  -- Next match link
  next_match_id UUID REFERENCES competition_matches(id),
  next_match_slot INTEGER,

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  live_status TEXT DEFAULT 'waiting'
    CHECK (live_status IN ('waiting', 'ready', 'in_progress', 'completed')),

  -- Extensions
  mat_number INTEGER DEFAULT 1,
  video_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_category ON competition_matches(category_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON competition_matches(status);

-- ==================== 11. Link past registrations on signup ====================

CREATE OR REPLACE FUNCTION link_past_registrations()
RETURNS TRIGGER AS $$
BEGIN
  -- Link by phone or email
  UPDATE event_registrations
  SET user_id = NEW.id
  WHERE user_id IS NULL
    AND (
      (phone IS NOT NULL AND phone = NEW.raw_user_meta_data->>'phone')
      OR (email IS NOT NULL AND email = NEW.email)
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_link_registrations'
  ) THEN
    CREATE TRIGGER trigger_link_registrations
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION link_past_registrations();
  END IF;
END;
$$;

-- ==================== 12. Event video access check function ====================

CREATE OR REPLACE FUNCTION check_event_video_access(
  p_user_id UUID,
  p_content_id UUID,
  p_content_type TEXT  -- 'drill', 'lesson', 'sparring'
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM event_registrations er
    JOIN event_videos ev ON er.event_id = ev.event_id
    WHERE er.user_id = p_user_id
      AND er.payment_status = 'confirmed'
      AND (
        (p_content_type = 'drill' AND ev.drill_id = p_content_id) OR
        (p_content_type = 'lesson' AND ev.lesson_id = p_content_id) OR
        (p_content_type = 'sparring' AND ev.sparring_id = p_content_id)
      )
  );
END;
$$ LANGUAGE plpgsql;

-- ==================== 13. RLS Policies ====================

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_matches ENABLE ROW LEVEL SECURITY;

-- Events: Public read, organizer write
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (status = 'published' OR status = 'completed');

DROP POLICY IF EXISTS "Organizers can manage their events" ON events;
CREATE POLICY "Organizers can manage their events" ON events
  FOR ALL USING (
    organizer_id IN (
      SELECT id FROM creators WHERE id = organizer_id
      AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
    )
  );

-- Registrations: User can see own, organizer can see event's
DROP POLICY IF EXISTS "Users can view their registrations" ON event_registrations;
CREATE POLICY "Users can view their registrations" ON event_registrations
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create registrations" ON event_registrations;
CREATE POLICY "Users can create registrations" ON event_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Organizers can manage event registrations" ON event_registrations;
CREATE POLICY "Organizers can manage event registrations" ON event_registrations
  FOR ALL USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id IN (
        SELECT id FROM creators WHERE id = events.organizer_id
      )
    )
  );

-- Competition data: Public read for published events
DROP POLICY IF EXISTS "Competition categories are viewable" ON competition_categories;
CREATE POLICY "Competition categories are viewable" ON competition_categories
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE status IN ('published', 'completed'))
  );

DROP POLICY IF EXISTS "Competition matches are viewable" ON competition_matches;
CREATE POLICY "Competition matches are viewable" ON competition_matches
  FOR SELECT USING (
    category_id IN (
      SELECT id FROM competition_categories WHERE event_id IN (
        SELECT id FROM events WHERE status IN ('published', 'completed')
      )
    )
  );

-- ==================== 14. Update updated_at trigger ====================

CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_events_updated_at ON events;
CREATE TRIGGER trigger_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

-- ==================== 15. Increment event count trigger ====================

CREATE OR REPLACE FUNCTION increment_events_hosted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE creators
    SET total_events_hosted = total_events_hosted + 1
    WHERE id = NEW.organizer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_events ON events;
CREATE TRIGGER trigger_increment_events
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION increment_events_hosted();
