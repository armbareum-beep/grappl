# 주최자 시스템 (Organizer System) 기획서

> 최종 업데이트: 2026-03-09

## 📋 개요

그래플레이에서 시합, 세미나, 오픈매트를 주최할 수 있는 시스템입니다.

### 핵심 원칙
- **모든 서비스 무료** (등급 시스템 없음)
- **수익원**: 영상 판매 수수료 20% (지도자 초청은 무료 - 직접 송금)
- **주최자 = creators 테이블 확장** (별도 테이블 X)

---

## 🎯 MVP 기능 목록

| # | 기능 | 설명 |
|---|------|------|
| 1 | 주최자 계좌 정보 | 무통장입금 안내용 |
| 2 | 참가 취소 | 참가자가 직접 취소 |
| 3 | 주최자 신청 페이지 | 일반유저 → 주최자 전환 |
| 4 | 엑셀 다운로드 | 참가자 명단 |
| 5 | 대기자 명단 | 마감 후 대기 신청 |
| 6 | 공유 카드 | SNS 공유용 OG 이미지 |
| 7 | 계체 관리 | 대진표에서 계체 완료/미완료 표시 |
| 8 | 팀전 | 3:3 등 팀 대 팀 경기 |
| 9 | 수동 참가자 추가 | 주최자가 직접 추가 (결제 없이) |
| 10 | 이벤트 히스토리 | 참가자 가입 시 과거 기록 연결 |
| 11 | 이벤트 영상 접근권 | 참가자에게 해당 이벤트 영상 무료 제공 |
| 12 | 시합 성적 배지 | 프로필에 대회 전적 표시 |
| 13 | 라이브 스코어보드 | 대진표 공개 URL (관중용) |
| 14 | 캘린더 추가 | Google/Apple 캘린더 연동 |
| 15 | **참가 정보 자동입력** | 이전 참가 정보 저장 후 자동 불러오기 ✅ |
| 16 | **이벤트 브랜드** | 한 주최자가 여러 브랜드 운영 ✅ |

---

## 💰 수익 모델

| 기능 | 주최자 비용 | 그래플레이 수익 |
|------|------------|----------------|
| 주최자 등록 | **무료** | - |
| 이벤트 생성 (무제한) | **무료** | - |
| 영상 업로드 (무제한) | **무료** | - |
| 참가비 무통장입금 | **무료** (직접 수령) | - |
| **영상 판매** | 판매가의 80% | **20% 수수료** |
| **지도자 초청** | **무료** (직접 송금) | - |

> **지도자 초청 플로우**:
> 1. 주최자가 초청 제안 (금액 >= 지도자 최소 금액)
> 2. 지도자가 승낙/거절
> 3. 승낙 시 → 지도자 계좌번호가 주최자에게 공개됨
> 4. 주최자가 지도자 계좌로 직접 송금
> 5. 지도자가 입금 확인 완료

---

## 📊 데이터베이스 스키마

### 0. users 테이블 확장 (참가 정보 자동입력용)

```sql
-- BJJ 프로필 필드 추가 (이벤트 참가 시 자동 불러오기)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS belt_level TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_class TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
```

> **동작 방식**: 이벤트 참가 신청 시 users 테이블에서 정보를 불러와 자동 입력하고, 신청 완료 시 입력한 정보를 다시 users 테이블에 저장하여 다음 신청 시 재사용.

### 1. creators 테이블 확장 (기존 테이블 수정)

```sql
-- 주최자 역할 추가
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  creator_type TEXT DEFAULT 'instructor'
    CHECK (creator_type IN ('instructor', 'organizer', 'both'));

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  can_host_events BOOLEAN DEFAULT FALSE;

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  verified_organizer BOOLEAN DEFAULT FALSE;

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  total_events_hosted INTEGER DEFAULT 0;

-- 지도자 초청 관련 (레거시)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  min_invitation_fee INTEGER DEFAULT 0;

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  invitation_description TEXT;

-- 행사 유형별 초청 설정 (NEW - 시합/세미나/오픈매트)
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

-- 지도자 계좌 정보 (초청 승낙 시 공개됨)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  bank_account_for_invitation JSONB;
  -- { bank_name, account_number, holder_name }
```

### 1.5. event_brands 테이블 (신규)

> 상세 스키마는 "🏷️ 이벤트 브랜드 시스템" 섹션 참조

```sql
-- 한 주최자가 여러 브랜드를 운영할 수 있는 테이블
CREATE TABLE event_brands (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES creators(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo TEXT,
  bank_account JSONB,
  is_default BOOLEAN DEFAULT FALSE,
  -- ... 기타 필드 (상세 스키마 참조)
);
```

### 2. events 테이블 (신규)

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES event_brands(id) ON DELETE SET NULL,  -- 브랜드 연결

  type TEXT NOT NULL CHECK (type IN ('competition', 'seminar', 'openmat')),

  -- 기본 정보
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,

  -- 장소 (지도 API 연동 대비)
  venue_name TEXT,
  address TEXT,
  address_detail TEXT,
  region TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  kakao_place_id TEXT,

  -- 일정
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  registration_deadline TIMESTAMPTZ,

  -- 참가 조건
  eligibility JSONB DEFAULT '{}',
  max_participants INTEGER,

  -- 결제
  price INTEGER DEFAULT 0,
  payment_type TEXT DEFAULT 'free'
    CHECK (payment_type IN ('free', 'bank_transfer', 'external_link')),
  external_payment_link TEXT,
  bank_account JSONB,  -- { bank_name, account_number, holder_name }

  -- 시합 전용
  competition_format TEXT DEFAULT 'individual'
    CHECK (competition_format IN ('individual', 'team')),
  team_size INTEGER DEFAULT 3,
  wins_required INTEGER DEFAULT 2,

  -- 라이브 스코어보드
  public_scoreboard BOOLEAN DEFAULT TRUE,
  scoreboard_url_key TEXT UNIQUE,

  -- 상태
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),

  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_region ON events(region);
```

### 3. event_registrations 테이블 (신규)

```sql
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable (수동 추가용)

  -- 참가자 정보
  participant_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  belt_level TEXT,
  weight_class TEXT,
  team_name TEXT,

  -- 수동 추가 여부
  is_manual_entry BOOLEAN DEFAULT FALSE,

  -- 무통장입금
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'confirmed', 'cancelled', 'refunded', 'waitlist')),
  payment_proof_image TEXT,
  paid_amount INTEGER,
  paid_at TIMESTAMPTZ,

  -- 주최자 확인
  confirmed_by_organizer BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,

  organizer_note TEXT,
  participant_note TEXT,

  -- 취소
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- 대기자 순번
  waitlist_position INTEGER,

  -- 계체
  weigh_in_status TEXT DEFAULT 'pending'
    CHECK (weigh_in_status IN ('pending', 'passed', 'failed', 'no_show')),
  weigh_in_weight DECIMAL(5, 2),
  weigh_in_at TIMESTAMPTZ,
  weigh_in_note TEXT,

  -- 시합 결과
  result TEXT,  -- '1st', '2nd', '3rd', 'participated'
  result_note TEXT,

  -- 대기 호출 (향후 확장)
  called_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, user_id) -- user_id가 null이 아닐 때만 적용
);

CREATE INDEX idx_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_registrations_user ON event_registrations(user_id);
CREATE INDEX idx_registrations_status ON event_registrations(payment_status);
CREATE INDEX idx_registrations_phone ON event_registrations(phone);
CREATE INDEX idx_registrations_email ON event_registrations(email);
```

### 4. instructor_invitations 테이블 (신규)

```sql
CREATE TABLE instructor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  -- 금액 (하이브리드: 지도자 최소 + 주최자 제안)
  min_fee_snapshot INTEGER NOT NULL,
  proposed_fee INTEGER NOT NULL,

  invitation_message TEXT,

  -- 지도자 응답
  instructor_response TEXT DEFAULT 'pending'
    CHECK (instructor_response IN ('pending', 'accepted', 'declined')),
  response_message TEXT,
  responded_at TIMESTAMPTZ,

  -- 지도자 계좌 (승낙 시 스냅샷 저장)
  instructor_bank_account JSONB,
  -- { bank_name, account_number, holder_name }

  -- 무통장입금 상태
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN (
      'pending',      -- 대기 중 (지도자 응답 전)
      'awaiting_payment',  -- 승낙됨, 입금 대기
      'paid',         -- 주최자가 입금 완료 표시
      'confirmed',    -- 지도자가 입금 확인
      'declined',     -- 거절됨
      'cancelled'     -- 취소됨
    )),
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_min_fee CHECK (proposed_fee >= min_fee_snapshot),
  UNIQUE(event_id, instructor_id)
);

CREATE INDEX idx_invitations_event ON instructor_invitations(event_id);
CREATE INDEX idx_invitations_instructor ON instructor_invitations(instructor_id);
CREATE INDEX idx_invitations_status ON instructor_invitations(payment_status);
```

### 5. event_videos 테이블 (신규)

```sql
CREATE TABLE event_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  drill_id UUID REFERENCES drills(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  sparring_id UUID REFERENCES sparring_videos(id) ON DELETE SET NULL,

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_videos_event ON event_videos(event_id);
```

### 6. organizer_reviews 테이블 (신규)

```sql
CREATE TABLE organizer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_org_reviews_organizer ON organizer_reviews(organizer_id);
```

### 7. competition_categories 테이블 (신규)

```sql
CREATE TABLE competition_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  belt_level TEXT,
  weight_class TEXT,
  gender TEXT DEFAULT 'mixed',
  age_group TEXT,

  -- 팀전 여부
  is_team_event BOOLEAN DEFAULT FALSE,

  bracket_type TEXT DEFAULT 'single_elimination',
  bracket_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_event ON competition_categories(event_id);
```

### 8. competition_teams 테이블 (신규 - 팀전용)

```sql
CREATE TABLE competition_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES competition_categories(id) ON DELETE CASCADE,

  team_name TEXT NOT NULL,

  -- 팀 구성원 (event_registration IDs)
  member_ids UUID[] NOT NULL,

  -- 출전 순서 (선봉, 중견, 대장)
  member_order UUID[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_category ON competition_teams(category_id);
```

### 9. team_matches 테이블 (신규 - 팀전용)

```sql
CREATE TABLE team_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES competition_categories(id) ON DELETE CASCADE,

  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,

  team1_id UUID REFERENCES competition_teams(id),
  team2_id UUID REFERENCES competition_teams(id),

  -- 개인전 결과 연결
  individual_match_ids UUID[],

  team1_wins INTEGER DEFAULT 0,
  team2_wins INTEGER DEFAULT 0,

  winner_team_id UUID REFERENCES competition_teams(id),

  next_match_id UUID REFERENCES team_matches(id),
  next_match_slot INTEGER,

  status TEXT DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_matches_category ON team_matches(category_id);
```

### 10. competition_matches 테이블 (신규 - 개인전)

```sql
CREATE TABLE competition_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES competition_categories(id) ON DELETE CASCADE,

  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,

  player1_id UUID REFERENCES event_registrations(id),
  player2_id UUID REFERENCES event_registrations(id),

  player1_bye BOOLEAN DEFAULT FALSE,
  player2_bye BOOLEAN DEFAULT FALSE,

  -- 결과
  winner_id UUID REFERENCES event_registrations(id),
  win_method TEXT,

  -- 점수
  player1_points INTEGER DEFAULT 0,
  player2_points INTEGER DEFAULT 0,
  player1_advantages INTEGER DEFAULT 0,
  player2_advantages INTEGER DEFAULT 0,
  player1_penalties INTEGER DEFAULT 0,
  player2_penalties INTEGER DEFAULT 0,

  match_duration INTEGER,

  -- 다음 매치 연결
  next_match_id UUID REFERENCES competition_matches(id),
  next_match_slot INTEGER,

  -- 상태
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  live_status TEXT DEFAULT 'waiting'
    CHECK (live_status IN ('waiting', 'ready', 'in_progress', 'completed')),

  -- 확장용
  mat_number INTEGER DEFAULT 1,
  video_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_category ON competition_matches(category_id);
CREATE INDEX idx_matches_status ON competition_matches(status);
```

### 11. 가입 시 과거 참가 기록 연결 트리거

```sql
CREATE OR REPLACE FUNCTION link_past_registrations()
RETURNS TRIGGER AS $$
BEGIN
  -- 전화번호 또는 이메일로 기존 참가 기록 연결
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

-- auth.users에 트리거 연결 (Supabase)
CREATE TRIGGER trigger_link_registrations
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_past_registrations();
```

### 12. 이벤트 영상 접근 권한 함수

```sql
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
```

---

## 📝 TypeScript 타입 (types.ts에 추가)

```typescript
// ==================== Event & Organizer Types ====================

export type EventType = 'competition' | 'seminar' | 'openmat';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type PaymentType = 'free' | 'bank_transfer' | 'external_link';
export type RegistrationPaymentStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'waitlist';
export type WeighInStatus = 'pending' | 'passed' | 'failed' | 'no_show';
export type CompetitionFormat = 'individual' | 'team';
export type InvitationPaymentStatus = 'pending' | 'awaiting_payment' | 'paid' | 'confirmed' | 'declined' | 'cancelled';
export type InstructorResponse = 'pending' | 'accepted' | 'declined';

export interface Event {
  id: string;
  organizerId: string;
  organizerName?: string;
  organizerProfileImage?: string;
  type: EventType;
  title: string;
  description?: string;
  coverImage?: string;

  // 장소
  venueName?: string;
  address?: string;
  addressDetail?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  kakaoPlaceId?: string;

  // 일정
  eventDate: string;
  startTime?: string;
  endTime?: string;
  registrationDeadline?: string;

  // 참가 조건
  eligibility?: {
    beltMin?: string;
    beltMax?: string;
    ageMin?: number;
    ageMax?: number;
    gender?: string;
    weightClasses?: string[];
  };
  maxParticipants?: number;
  currentParticipants?: number;

  // 결제
  price: number;
  paymentType: PaymentType;
  externalPaymentLink?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };

  // 시합 전용
  competitionFormat?: CompetitionFormat;
  teamSize?: number;
  winsRequired?: number;

  // 라이브 스코어보드
  publicScoreboard?: boolean;
  scoreboardUrlKey?: string;

  status: EventStatus;
  viewCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId?: string;

  participantName: string;
  phone?: string;
  email?: string;
  beltLevel?: string;
  weightClass?: string;
  teamName?: string;

  isManualEntry: boolean;

  paymentStatus: RegistrationPaymentStatus;
  paymentProofImage?: string;
  paidAmount?: number;
  paidAt?: string;

  confirmedByOrganizer: boolean;
  confirmedAt?: string;

  organizerNote?: string;
  participantNote?: string;

  cancelledAt?: string;
  cancelReason?: string;

  waitlistPosition?: number;

  // 계체
  weighInStatus: WeighInStatus;
  weighInWeight?: number;
  weighInAt?: string;
  weighInNote?: string;

  // 결과
  result?: string;
  resultNote?: string;

  createdAt: string;

  // Joined
  event?: Event;
  user?: {
    name: string;
    profileImage?: string;
  };
}

export interface InstructorInvitation {
  id: string;
  eventId: string;
  organizerId: string;
  instructorId: string;

  minFeeSnapshot: number;
  proposedFee: number;

  invitationMessage?: string;

  instructorResponse: InstructorResponse;
  responseMessage?: string;
  respondedAt?: string;

  // 지도자 계좌 (승낙 시 공개)
  instructorBankAccount?: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };

  // 무통장입금 상태
  paymentStatus: InvitationPaymentStatus;
  paidAt?: string;
  confirmedAt?: string;

  createdAt: string;

  // Joined
  event?: Event;
  instructor?: Creator;
  organizer?: Creator;
}

export interface CompetitionCategory {
  id: string;
  eventId: string;
  name: string;
  beltLevel?: string;
  weightClass?: string;
  gender?: string;
  ageGroup?: string;
  isTeamEvent: boolean;
  bracketType: 'single_elimination' | 'double_elimination' | 'round_robin';
  bracketData?: any;
  participantCount?: number;
  createdAt: string;
}

export interface CompetitionTeam {
  id: string;
  categoryId: string;
  teamName: string;
  memberIds: string[];
  memberOrder: string[];
  members?: EventRegistration[];
  createdAt: string;
}

export interface TeamMatch {
  id: string;
  categoryId: string;
  round: number;
  matchNumber: number;
  team1Id?: string;
  team2Id?: string;
  team1?: CompetitionTeam;
  team2?: CompetitionTeam;
  individualMatchIds: string[];
  team1Wins: number;
  team2Wins: number;
  winnerTeamId?: string;
  nextMatchId?: string;
  nextMatchSlot?: number;
  status: string;
  createdAt: string;
}

export interface CompetitionMatch {
  id: string;
  categoryId: string;
  round: number;
  matchNumber: number;

  player1Id?: string;
  player2Id?: string;
  player1?: EventRegistration;
  player2?: EventRegistration;

  player1Bye: boolean;
  player2Bye: boolean;

  winnerId?: string;
  winMethod?: string;

  player1Points: number;
  player2Points: number;
  player1Advantages: number;
  player2Advantages: number;
  player1Penalties: number;
  player2Penalties: number;

  matchDuration?: number;

  nextMatchId?: string;
  nextMatchSlot?: number;

  status: 'pending' | 'in_progress' | 'completed';
  liveStatus: 'waiting' | 'ready' | 'in_progress' | 'completed';

  matNumber: number;
  videoUrl?: string;

  createdAt: string;
}

export interface OrganizerReview {
  id: string;
  organizerId: string;
  eventId?: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  rating: number;
  content?: string;
  createdAt: string;
}
```

---

## 📁 파일 구조 (✅ = 구현됨)

```
pages/
├── Events.tsx                      # ✅ 이벤트 목록 (내 참가 내역 버튼 포함)
├── EventDetail.tsx                 # ✅ 이벤트 상세 (행사 영상 표시)
├── MyEvents.tsx                    # ✅ 참가자 이벤트 히스토리 (NEW)
├── Organizers.tsx                  # ✅ 주최자 목록
├── OrganizerProfile.tsx            # ✅ 주최자 프로필 (영상 탭 포함)
├── BecomeOrganizer.tsx             # ✅ 주최자 신청
├── LiveScoreboard.tsx              # ✅ 공개 스코어보드 (NEW)
├── BrandProfile.tsx                # ✅ 공개 브랜드 프로필 (NEW)
├── organizer/
│   ├── OrganizerDashboard.tsx      # ✅ 주최자 대시보드 (브랜드 관리 섹션 포함)
│   ├── ManageBrand.tsx             # ✅ 브랜드 생성/수정 (NEW)
│   ├── CreateEvent.tsx             # ✅ 이벤트 생성/수정 (브랜드 선택 + 지도자 초청)
│   ├── ManageParticipants.tsx      # ✅ 참가자 관리
│   ├── InviteInstructor.tsx        # ✅ 지도자 초청
│   ├── EventInvitations.tsx        # ✅ 주최자용 초청 관리 (NEW)
│   ├── CompetitionManager.tsx      # ✅ 시합 카테고리 관리 (NEW)
│   ├── BracketEditor.tsx           # ✅ 대진표 생성/편집 (NEW)
│   ├── WeighInManager.tsx          # ✅ 계체 관리 (NEW)
│   └── MatchControl.tsx            # ✅ 경기 컨트롤 + 타이머 (NEW)
└── creator/
    └── InstructorInvitations.tsx   # ✅ 지도자용 초청 관리 (NEW)

components/
├── creator/
│   └── EventInvitationSettingsTab.tsx # ✅ 행사 초청 설정 탭 (NEW)
├── organizer/
│   ├── EventCard.tsx
│   ├── OrganizerCard.tsx
│   ├── ParticipantList.tsx
│   ├── EventRegistrationModal.tsx  # 참가 신청
│   ├── CancelRegistrationModal.tsx # 참가 취소
│   ├── AddParticipantModal.tsx     # 수동 추가
│   ├── BankTransferInfo.tsx        # 무통장입금 안내
│   ├── WaitlistBadge.tsx           # 대기 순번
│   ├── ExportParticipants.tsx      # 엑셀 다운로드
│   ├── EventShareCard.tsx          # 공유 카드
│   └── AddToCalendar.tsx           # 캘린더 추가
└── competition/
    ├── TournamentBracket.tsx       # 대진표 표시
    ├── TeamBracket.tsx             # 팀전 대진표
    ├── MatchScoreboard.tsx         # 점수판
    ├── WinnerSelector.tsx          # 승자 선택
    ├── WeighInStatus.tsx           # 계체 상태 배지
    └── LiveScoreboard.tsx          # 공개 스코어보드

hooks/
├── use-events.ts
├── use-organizers.ts
├── use-registrations.ts
└── use-competition.ts

lib/
├── api-events.ts
├── api-organizers.ts
├── api-registrations.ts
├── api-competition.ts
├── export-excel.ts
├── generate-share-card.ts
└── calendar.ts
```

---

## 🛤️ 라우트 (App.tsx) - ✅ = 구현됨

```typescript
// Public
✅ <Route path="/events" element={<Events />} />
✅ <Route path="/event/:id" element={<EventDetail />} />
✅ <Route path="/organizers" element={<Organizers />} />
✅ <Route path="/organizer/:id" element={<OrganizerProfile />} />
✅ <Route path="/brand/:id" element={<BrandProfile />} />
✅ <Route path="/scoreboard/:urlKey" element={<LiveScoreboard />} />

// Protected - 사용자
✅ <Route path="/my-events" element={<ProtectedRoute><MyEvents /></ProtectedRoute>} />
✅ <Route path="/become-organizer" element={<ProtectedRoute><BecomeOrganizer /></ProtectedRoute>} />

// Protected - 주최자
✅ <Route path="/organizer/dashboard" element={<ProtectedRoute><OrganizerDashboard /></ProtectedRoute>} />
✅ <Route path="/organizer/brand/new" element={<ProtectedRoute><ManageBrand /></ProtectedRoute>} />
✅ <Route path="/organizer/brand/:id" element={<ProtectedRoute><ManageBrand /></ProtectedRoute>} />
✅ <Route path="/organizer/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
✅ <Route path="/organizer/event/:id/edit" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
✅ <Route path="/organizer/event/:id/participants" element={<ProtectedRoute><ManageParticipants /></ProtectedRoute>} />
✅ <Route path="/organizer/event/:eventId/invite" element={<ProtectedRoute><InviteInstructor /></ProtectedRoute>} />
✅ <Route path="/organizer/event/:eventId/invitations" element={<ProtectedRoute><EventInvitations /></ProtectedRoute>} />
✅ <Route path="/organizer/event/:eventId/competition" element={<ProtectedRoute><CompetitionManager /></ProtectedRoute>} />
✅ <Route path="/organizer/event/:eventId/bracket/:categoryId" element={<ProtectedRoute><BracketEditor /></ProtectedRoute>} />
✅ <Route path="/organizer/event/:eventId/weigh-in" element={<ProtectedRoute><WeighInManager /></ProtectedRoute>} />
✅ <Route path="/organizer/event/:eventId/match-control" element={<ProtectedRoute><MatchControl /></ProtectedRoute>} />

// Protected - 지도자
✅ <Route path="/creator/invitations" element={<ProtectedRoute><InstructorInvitations /></ProtectedRoute>} />
```

---

## 🔧 기존 코드 수정 필요

### 1. Creator 인터페이스 확장 (types.ts)

```typescript
// 기존 Creator에 추가
export interface Creator {
  // ... 기존 필드들 ...

  // 주최자 관련 (추가)
  creatorType?: 'instructor' | 'organizer' | 'both';
  canHostEvents?: boolean;
  verifiedOrganizer?: boolean;
  totalEventsHosted?: number;

  // 지도자 초청 관련 - 레거시
  minInvitationFee?: number;
  invitationDescription?: string;

  // 행사 유형별 초청 설정 (NEW)
  acceptCompetitionInvitations?: boolean;
  minCompetitionFee?: number;
  acceptSeminarInvitations?: boolean;
  minSeminarFee?: number;
  acceptOpenmatInvitations?: boolean;
  minOpenmatFee?: number;

  // 지도자 계좌 (초청 승낙 시 공개됨)
  bankAccountForInvitation?: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };
}
```

### 2. PaymentModal 확장

```typescript
// 기존 type에 'invitation' 추가
type: 'course' | 'subscription' | 'routine' | 'invitation';
```

### 3. 영상 접근 권한 체크 (api.ts)

```typescript
// 기존 구매 체크에 이벤트 참가 체크 추가
const canWatch = hasPurchased || hasEventAccess || isSubscriber;
```

---

## 📋 구현 순서

### Phase 1: 기반 (1주) ✅ 완료
1. ✅ DB 스키마 적용
2. ✅ types.ts 타입 추가
3. ✅ Creator 인터페이스 확장
4. ✅ api-events.ts, api-organizers.ts 작성

### Phase 2: 주최자 기본 (1주) ✅ 완료
5. ✅ BecomeOrganizer.tsx (주최자 신청)
6. ✅ Organizers.tsx (목록)
7. ✅ OrganizerProfile.tsx (프로필) - 영상 탭 포함
8. ✅ OrganizerDashboard.tsx (대시보드) - 영상 업로드 활성화 버튼 포함

### Phase 3: 이벤트 CRUD (1주) ✅ 완료
9. ✅ CreateEvent.tsx (생성) - 행사 영상 연결 포함
10. ✅ EditEvent.tsx (수정) - CreateEvent 재사용
11. ✅ Events.tsx (목록) - 내 참가 내역 버튼 추가
12. ✅ EventDetail.tsx (상세) - 참가자용 행사 영상 표시

### Phase 4: 참가 시스템 (1주) ✅ 완료
13. ✅ EventRegistrationModal.tsx (신청)
14. ✅ ManageParticipants.tsx (관리)
15. ✅ AddParticipantModal.tsx (수동 추가)
16. ✅ CancelRegistrationModal.tsx (취소)
17. ✅ 대기자 명단
18. ✅ 엑셀 다운로드

### Phase 5: 지도자 초청 (1주) ✅ 완료
19. ✅ InviteInstructor.tsx
20. ✅ EventInvitations.tsx (주최자용 초청 관리)
21. ✅ InstructorInvitations.tsx (지도자용 초청 관리)
22. ✅ 직접 송금 플로우 (20% 수수료 없음)

### Phase 6: 대진표 & 시합 (2주) ✅ 완료
23. ✅ CompetitionManager.tsx (카테고리 관리)
24. ✅ BracketEditor.tsx (대진표 생성/편집)
25. ✅ TeamBuilder.tsx (팀 구성 - 선봉/중견/대장)
26. ✅ WeighInManager.tsx (계체 관리)
27. ✅ MatchControl.tsx (경기 컨트롤 + 타이머)
28. ✅ LiveScoreboard.tsx (공개 스코어보드)
29. ✅ Supabase Realtime 연동

### Phase 7: 부가 기능 (1주) ✅ 완료
30. ⏸️ 공유 카드 - SSR 필요로 스킵 (선택사항)
31. ✅ 캘린더 추가 (generateCalendarUrl)
32. ✅ MyEvents.tsx (참가자 이벤트 히스토리)
33. ✅ 이벤트 영상 접근권 (event_videos, checkEventVideoAccess)
34. ⏸️ 시합 성적 배지 - 스킵

---

## ⚠️ 주의사항

1. **기존 Tournament 타입과 충돌 주의**: types.ts에 이미 Tournament 관련 타입이 있음. Event라는 이름 사용으로 충돌 없음.

2. **creators 테이블 수정 시**: 기존 데이터에 영향 없도록 DEFAULT 값 설정 필수.

3. **결제 시스템**: 모든 결제는 무통장입금 (그래플레이 경유 X). 참가비는 주최자 계좌로, 지도자 초청비는 지도자 계좌로 직접 송금.

4. **user_id nullable**: event_registrations.user_id는 nullable. 수동 추가된 참가자는 user_id가 null.

5. **지도자 계좌 공개**: 지도자가 초청을 승낙해야만 계좌번호가 주최자에게 공개됨. 승낙 시 bank_account_for_invitation이 instructor_bank_account에 스냅샷 저장됨.

---

## 📝 최근 변경 사항 (2026-03-08)

### 1. 행사 유형별 초청 설정

지도자가 각 행사 유형(시합/세미나/오픈매트)별로 초청 수락 여부와 최소 금액을 개별 설정할 수 있도록 개선.

**새 컬럼:**
- `accept_competition_invitations`, `min_competition_fee` (시합)
- `accept_seminar_invitations`, `min_seminar_fee` (세미나)
- `accept_openmat_invitations`, `min_openmat_fee` (오픈매트)

**새 컴포넌트:**
- `EventInvitationSettingsTab.tsx` - 크리에이터 대시보드의 "행사 초청" 탭

### 2. CreateEvent 지도자 초청 개선

- 폼 하단에 지도자 초청 섹션 추가
- 저장 전 지도자 선택 가능 (미리 선택 후 저장 시 실제 초청)
- 세미나는 필수 표시 (violet 테마), 시합/오픈매트는 선택 사항
- 행사 유형에 따른 최소 금액 자동 적용

### 3. API 개선

- `fetchAvailableInstructors()`: eventType 파라미터 추가하여 해당 유형 초청 가능한 지도자만 필터링
- `createInvitation()`: 행사 유형에 따른 최소 금액 검증
- `updateOrganizerProfile()`: 행사 유형별 초청 설정 지원

---

## 🏷️ 이벤트 브랜드 시스템 (Event Brands)

> 추가: 2026-03-09

### 개요

한 주최자(creator) 계정에서 여러 이벤트 브랜드를 운영할 수 있는 시스템.

**시나리오 예시:**
- 정성훈 (인스트럭터) → "러픈매트" 브랜드로 오픈매트 운영
- 한 사람이 "OPMT" (시합)와 "COS" (시합) 두 브랜드 운영
- 각 브랜드별로 별도의 로고, 이름, 설명, 계좌 관리

### 데이터 구조

```
auth.users
    ↓
creators (기존 유지 - 인스트럭터/주최자 프로필)
    ↓
event_brands (NEW - 여러 브랜드 가능)
    ↓
events (brand_id → event_brands.id)
```

### 데이터베이스 스키마

```sql
-- event_brands 테이블
CREATE TABLE event_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- 브랜드 기본 정보
  name TEXT NOT NULL,
  slug TEXT UNIQUE,           -- URL용 (예: russian-openmat)
  logo TEXT,
  cover_image TEXT,
  description TEXT,

  -- 연락처
  contact_email TEXT,
  contact_phone TEXT,

  -- 소셜 미디어
  instagram TEXT,
  youtube TEXT,
  website TEXT,

  -- 결제 정보 (브랜드별 계좌)
  bank_account JSONB,         -- { bank_name, account_number, holder_name }

  -- 기본 브랜드 여부 (한 크리에이터당 하나만)
  is_default BOOLEAN DEFAULT FALSE,

  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,

  -- 통계 (자동 업데이트)
  total_events INTEGER DEFAULT 0,
  total_participants INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- events 테이블에 brand_id 추가
ALTER TABLE events ADD COLUMN brand_id UUID REFERENCES event_brands(id) ON DELETE SET NULL;
```

### TypeScript 타입

```typescript
// types.ts
export interface EventBrand {
  id: string;
  creatorId: string;
  name: string;
  slug?: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };
  isDefault: boolean;
  isActive: boolean;
  verified: boolean;
  totalEvents: number;
  totalParticipants: number;
  createdAt: string;
  updatedAt: string;
  creator?: Creator;  // joined
}

// Event 인터페이스에 추가
export interface Event {
  // ... 기존 필드 ...
  brandId?: string;
  brand?: EventBrand;
}
```

### API 함수 (lib/api-organizers.ts)

```typescript
// 브랜드 CRUD
fetchBrandsByCreator(creatorId: string): Promise<EventBrand[]>
fetchBrandById(brandId: string): Promise<EventBrand>
fetchBrandBySlug(slug: string): Promise<EventBrand>
createBrand(data: Partial<EventBrand>): Promise<EventBrand>
updateBrand(brandId: string, data: Partial<EventBrand>): Promise<EventBrand>
deleteBrand(brandId: string): Promise<void>
setDefaultBrand(brandId: string): Promise<void>

// 브랜드 통계
getBrandStats(brandId: string): Promise<{
  totalEvents: number;
  totalParticipants: number;
  upcomingEvents: number;
  completedEvents: number;
}>

// 브랜드별 이벤트
fetchEventsByBrand(brandId: string): Promise<Event[]>

// 활성 브랜드 목록 (공개)
fetchActiveBrands(): Promise<EventBrand[]>
```

### 라우트

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/brand/:id` | BrandProfile.tsx | 공개 브랜드 프로필 |
| `/organizer/brand/new` | ManageBrand.tsx | 새 브랜드 생성 |
| `/organizer/brand/:id` | ManageBrand.tsx | 브랜드 수정 |

### 파일 구조

```
pages/
├── BrandProfile.tsx              # ✅ 공개 브랜드 프로필
└── organizer/
    ├── OrganizerDashboard.tsx    # ✅ 브랜드 목록 섹션 추가
    ├── ManageBrand.tsx           # ✅ 브랜드 생성/수정
    └── CreateEvent.tsx           # ✅ 브랜드 선택 드롭다운 추가

lib/
└── api-organizers.ts             # ✅ 브랜드 CRUD 함수 추가
```

### UI 흐름

**1. 주최자 대시보드 (OrganizerDashboard.tsx)**
```
┌─────────────────────────────────────────┐
│  주최자 대시보드                          │
├─────────────────────────────────────────┤
│  내 브랜드 (2)                           │
│                                         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │ 🏆 OPMT     │  │ 🥋 러픈매트   │       │
│  │ 시합 브랜드  │  │ 오픈매트     │       │
│  │ 이벤트 12   │  │ 이벤트 8    │       │
│  │ [관리]      │  │ [관리]      │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
│  [+ 새 브랜드 추가]                       │
└─────────────────────────────────────────┘
```

**2. 이벤트 생성 시 브랜드 선택 (CreateEvent.tsx)**
```
┌─────────────────────────────────────────┐
│  브랜드 선택 *                           │
│  ┌──────────────────────────────────┐   │
│  │ ▼ OPMT (기본)                    │   │
│  ├──────────────────────────────────┤   │
│  │   🏆 OPMT (기본)                 │   │
│  │   🥋 러픈매트                     │   │
│  │   ─────────────────              │   │
│  │   + 새 브랜드 추가                │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**3. 공개 브랜드 프로필 (BrandProfile.tsx)**
- 브랜드 커버 이미지, 로고, 이름
- 인증 배지 (verified)
- 소셜 미디어 링크
- 통계 (총 이벤트, 총 참가자, 예정 이벤트)
- 다가오는 이벤트 목록
- 지난 이벤트 목록
- 주최자 정보 링크

### 자동 기능

1. **기본 브랜드 자동 생성**: 주최자 권한 부여 시 크리에이터 이름으로 기본 브랜드 자동 생성
2. **슬러그 자동 생성**: 브랜드 이름에서 URL용 슬러그 자동 생성 (중복 시 숫자 추가)
3. **통계 자동 업데이트**: 이벤트/등록 변경 시 트리거로 브랜드 통계 자동 갱신
4. **계좌 정보 연동**: 브랜드 선택 시 해당 브랜드의 계좌 정보가 이벤트에 자동 적용

### RLS 정책

```sql
-- 공개: 활성 브랜드 누구나 조회 가능
CREATE POLICY "Anyone can view active brands"
  ON event_brands FOR SELECT
  USING (is_active = TRUE);

-- 소유자만 관리 가능 (creator_id = auth.uid())
CREATE POLICY "Creators can manage their own brands"
  ON event_brands FOR ALL
  USING (creator_id = auth.uid());
```

### 구현 현황

| 항목 | 상태 |
|------|------|
| DB 마이그레이션 (20260309100000_event_brands.sql) | ✅ 완료 |
| TypeScript 타입 (EventBrand) | ✅ 완료 |
| API 함수 (api-organizers.ts) | ✅ 완료 |
| OrganizerDashboard 브랜드 섹션 | ✅ 완료 |
| ManageBrand 페이지 | ✅ 완료 |
| CreateEvent 브랜드 선택 | ✅ 완료 |
| BrandProfile 공개 페이지 | ✅ 완료 |
| App.tsx 라우트 추가 | ✅ 완료 |

---

## 🗺️ 이벤트 탐색 시스템 (Event Explore)

> 추가: 2026-03-09

### 개요

고객이 이벤트를 직관적으로 찾을 수 있는 탐색 페이지. 두 가지 뷰 모드 지원:
- **지도 모드**: 위치 기반 이벤트 발견
- **캘린더 모드**: 시간 기반 이벤트 일정 파악

### 라우팅

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/explore` | EventExplore.tsx | 이벤트 탐색 (지도/캘린더) |
| `/events` | Events.tsx | 이벤트 목록 (기존, 유지) |
| `/event/:id` | EventDetail.tsx | 이벤트 상세 (기존, 유지) |

### 메뉴 변경

```typescript
// components/Layout.tsx
// 변경 전
{ name: '훈련 루틴', href: '/training-routines', icon: Dumbbell }

// 변경 후
{ name: '이벤트', href: '/explore', icon: Calendar }
```

### 컴포넌트 구조

```
pages/
  EventExplore.tsx              # 메인 탐색 페이지

components/explore/
  EventCalendarView.tsx         # 캘린더 뷰
  EventMapView.tsx              # 지도 뷰 (Naver Maps)
  EventCard.tsx                 # 이벤트 카드 (공통)
  ViewToggle.tsx                # 뷰 전환 토글
```

### 캘린더 뷰

```
┌─────────────────────────────────────────┐
│  ◀  2026년 3월  ▶         🗺️ 📅      │
├─────────────────────────────────────────┤
│ 일   월   화   수   목   금   토        │
│                          1    2         │
│  3    4    5    6    7   8●   9         │
│ 10   11   12●  13   14  15   16         │
│ 17   18   19   20●  21  22   23         │
│ 24   25   26   27   28  29   30         │
│ 31                                      │
├─────────────────────────────────────────┤
│ 3월 12일 이벤트                          │
│ ┌─────────────────────────────────┐     │
│ │ 🏆 시합명 | 14:00 | 서울        │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

- 이벤트 있는 날짜에 색상 dot 표시 (타입별)
- 날짜 클릭 → 해당 날짜 이벤트 목록
- 이벤트 카드 클릭 → `/event/:id` 상세 페이지

### 지도 뷰

```
┌─────────────────────────────────────────┐
│  이벤트 탐색             🗺️ 📅        │
├─────────────────────────────────────────┤
│                                         │
│     [Naver Map]                         │
│                                         │
│        📍                               │
│           📍   📍                       │
│                                         │
│              📍                         │
│                                         │
├─────────────────────────────────────────┤
│ 이벤트 목록 (3)                          │
│ ┌─────────────────────────────────┐     │
│ │ 이벤트 카드                      │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

- Naver Maps API 사용
- 이벤트 마커 표시 (타입별 색상)
- 마커 클릭 → 인포윈도우 (이벤트 요약)
- 인포윈도우에서 "자세히 보기" → `/event/:id`

### 이벤트 타입별 색상

| 타입 | 색상 | 용도 |
|------|------|------|
| competition (시합) | red-500 | 마커, dot, 라벨 |
| seminar (세미나) | blue-500 | 마커, dot, 라벨 |
| openmat (오픈매트) | green-500 | 마커, dot, 라벨 |

### Naver Maps 설정

**index.html:**
```html
<script src="https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=API_KEY&submodules=geocoder"></script>
```

**환경변수:**
```
VITE_NAVER_MAP_CLIENT_ID=your_client_id
```

### API 활용

```typescript
// lib/api-events.ts
fetchEvents({
  type?: 'competition' | 'seminar' | 'openmat',
  status: 'published',
  // 날짜 필터 (캘린더용)
  dateFrom?: string,
  dateTo?: string,
})
```

### 구현 현황

| 항목 | 상태 |
|------|------|
| EventExplore.tsx 메인 페이지 | ✅ 완료 |
| 캘린더 뷰 | ✅ 완료 |
| 지도 뷰 | ⏳ 예정 (Naver Maps 연동 필요) |
| 메뉴 변경 | ✅ 완료 |
| Naver Maps 연동 | ⏳ 예정 |
