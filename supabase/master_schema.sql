-- ============================================================================
-- Grappl - 프리미엄 주짓수 기술 영상 플랫폼
-- Supabase 데이터베이스 마스터 스키마
-- ============================================================================
-- 이 파일은 모든 테이블, RLS 정책, 함수, 트리거를 올바른 순서로 통합합니다.
-- Supabase SQL Editor에서 이 파일을 한 번에 실행하세요.
-- ============================================================================

-- ============================================================================
-- 1. 확장 기능 활성화
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. 핵심 테이블 생성
-- ============================================================================

-- 2.1 Users 테이블 (Supabase auth.users 확장)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  is_subscriber BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 Creators 테이블
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT,
  profile_image TEXT,
  subscriber_count INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 Videos 테이블
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  thumbnail_url TEXT,
  length TEXT,
  price INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4 Courses 테이블
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  thumbnail_url TEXT,
  price INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.5 Lessons 테이블
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_number INTEGER NOT NULL,
  vimeo_url TEXT,
  length TEXT,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. 관계 테이블 생성
-- ============================================================================

-- 3.1 User Videos (구매한 비디오)
CREATE TABLE IF NOT EXISTS user_videos (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- 3.2 User Courses (구매한 코스)
CREATE TABLE IF NOT EXISTS user_courses (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  price_paid INTEGER NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

-- 3.3 Lesson Progress (학습 진도)
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ============================================================================
-- 4. 기능 테이블 생성
-- ============================================================================

-- 4.1 Notifications 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4.2 Subscriptions 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_interval TEXT CHECK (plan_interval IN ('month', 'year')),
  amount INTEGER,
  status TEXT, -- 'active', 'cancelled', 'past_due'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 Revenue Ledger (수익 인식)
CREATE TABLE IF NOT EXISTS revenue_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount INTEGER,
  recognition_date DATE,
  status TEXT DEFAULT 'pending', -- 'pending', 'recognized', 'refunded'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.4 Creator Payouts (크리에이터 정산)
CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  amount INTEGER,
  payout_period_start DATE,
  payout_period_end DATE,
  status TEXT DEFAULT 'draft', -- 'draft', 'processing', 'paid'
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. 인덱스 생성 (성능 최적화)
-- ============================================================================

CREATE INDEX IF NOT EXISTS lessons_course_id_idx ON lessons(course_id);
CREATE INDEX IF NOT EXISTS lessons_lesson_number_idx ON lessons(lesson_number);
CREATE INDEX IF NOT EXISTS user_courses_user_id_idx ON user_courses(user_id);
CREATE INDEX IF NOT EXISTS user_courses_course_id_idx ON user_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);

-- ============================================================================
-- 6. 함수 생성
-- ============================================================================

-- 6.1 비디오 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_video_views(video_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE videos
  SET views = views + 1
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql;

-- 6.2 신규 사용자 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.3 Lesson Progress 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_lesson_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.4 알림 생성 함수
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- 7. 트리거 생성
-- ============================================================================

-- 7.1 신규 사용자 자동 생성 트리거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7.2 Lesson Progress 업데이트 시간 자동 갱신 트리거
DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_progress_updated_at();

-- ============================================================================
-- 8. Row Level Security (RLS) 활성화
-- ============================================================================

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. RLS 정책 생성
-- ============================================================================

-- 9.1 Creators 정책
DROP POLICY IF EXISTS "Public creators read access" ON creators;
CREATE POLICY "Public creators read access"
  ON creators FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update creator approval" ON creators;
CREATE POLICY "Admins can update creator approval"
  ON creators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- 9.2 Videos 정책
DROP POLICY IF EXISTS "Public videos read access" ON videos;
CREATE POLICY "Public videos read access"
  ON videos FOR SELECT
  USING (true);

-- 9.3 Users 정책
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- 9.4 User Videos 정책
DROP POLICY IF EXISTS "Users can view their purchased videos" ON user_videos;
CREATE POLICY "Users can view their purchased videos"
  ON user_videos FOR SELECT
  USING (auth.uid() = user_id);

-- 9.5 Courses 정책
DROP POLICY IF EXISTS "Public courses read access" ON courses;
CREATE POLICY "Public courses read access"
  ON courses FOR SELECT
  USING (true);

-- 9.6 Lessons 정책
DROP POLICY IF EXISTS "Public lessons read access" ON lessons;
CREATE POLICY "Public lessons read access"
  ON lessons FOR SELECT
  USING (true);

-- 9.7 User Courses 정책
DROP POLICY IF EXISTS "Users can view their own purchased courses" ON user_courses;
CREATE POLICY "Users can view their own purchased courses"
  ON user_courses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own course purchases" ON user_courses;
CREATE POLICY "Users can insert their own course purchases"
  ON user_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 9.8 Lesson Progress 정책
DROP POLICY IF EXISTS "Users can view their own progress" ON lesson_progress;
CREATE POLICY "Users can view their own progress"
  ON lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own progress" ON lesson_progress;
CREATE POLICY "Users can insert their own progress"
  ON lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON lesson_progress;
CREATE POLICY "Users can update their own progress"
  ON lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- 9.9 Notifications 정책
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications (mark as read)" ON notifications;
CREATE POLICY "Users can update their own notifications (mark as read)"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 10. 게이미피케이션 & XP 시스템 (누락된 테이블 추가)
-- ============================================================================

-- 10.1 User Progress (XP 및 벨트)
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    belt_level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    last_quest_reset TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.2 Daily Quests (일일 미션)
CREATE TABLE IF NOT EXISTS daily_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_type TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    xp_reward INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    quest_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.3 XP Transactions (XP 획득 로그)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source TEXT NOT NULL,
    source_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.4 XP Activities (활동 로그)
CREATE TABLE IF NOT EXISTS xp_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    activity_type TEXT NOT NULL,
    xp_earned INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.5 Login Streak (로그인 스트릭)
CREATE TABLE IF NOT EXISTS user_login_streak (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    current_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    longest_streak INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.6 RLS 설정
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_streak ENABLE ROW LEVEL SECURITY;

-- 정책 생성
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
CREATE POLICY "Users can view their own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress;
CREATE POLICY "Users can update their own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress;
CREATE POLICY "Users can insert their own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own quests" ON daily_quests;
CREATE POLICY "Users can view their own quests" ON daily_quests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quests" ON daily_quests;
CREATE POLICY "Users can update their own quests" ON daily_quests FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quests" ON daily_quests;
CREATE POLICY "Users can insert their own quests" ON daily_quests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own transactions" ON xp_transactions;
CREATE POLICY "Users can view their own transactions" ON xp_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON xp_transactions;
CREATE POLICY "Users can insert their own transactions" ON xp_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own XP activities" ON xp_activities;
CREATE POLICY "Users can view their own XP activities" ON xp_activities FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own login streak" ON user_login_streak;
CREATE POLICY "Users can view their own login streak" ON user_login_streak FOR SELECT USING (auth.uid() = user_id);

-- 10.7 함수 정의

-- add_xp 함수
CREATE OR REPLACE FUNCTION add_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT,
    p_source_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_current_xp INTEGER;
    v_total_xp INTEGER;
BEGIN
    -- Get current progress
    SELECT total_xp INTO v_total_xp FROM user_progress WHERE user_id = p_user_id;

    -- If no progress, create it
    IF v_total_xp IS NULL THEN
        INSERT INTO user_progress (user_id, belt_level, current_xp, total_xp)
        VALUES (p_user_id, 1, 0, 0)
        RETURNING total_xp INTO v_total_xp;
    END IF;

    -- Update total XP
    v_total_xp := v_total_xp + p_amount;

    -- Update user_progress
    UPDATE user_progress
    SET total_xp = v_total_xp, current_xp = current_xp + p_amount, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO xp_transactions (user_id, amount, source, source_id)
    VALUES (p_user_id, p_amount, p_source, p_source_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. 기존 사용자 데이터 마이그레이션
-- ============================================================================

-- 기존 auth.users를 public.users로 복사
INSERT INTO public.users (id, email, created_at, is_admin)
SELECT 
  id,
  email,
  created_at,
  false as is_admin
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. 테이블 코멘트 (문서화)
-- ============================================================================

COMMENT ON TABLE revenue_ledger IS 'Tracks revenue recognition chunks (e.g. 1/12th of yearly sub)';
COMMENT ON TABLE creator_payouts IS 'Records monthly payout amounts calculated for each creator';
COMMENT ON TABLE lesson_progress IS 'Tracks user learning progress for each lesson';
COMMENT ON TABLE notifications IS 'User notifications for various events';

-- ============================================================================
-- 완료!
-- ============================================================================
-- 다음 단계:
-- 1. Storage 버킷 설정 (setup_profile_storage.sql 참조)
-- 2. 관리자 계정 설정 (아래 쿼리 실행)
-- 3. 시드 데이터 삽입 (선택사항)
-- ============================================================================

-- 관리자 계정 설정 (이메일을 본인의 이메일로 변경하세요)
-- UPDATE public.users SET is_admin = true WHERE email = 'YOUR_EMAIL_HERE@example.com';
