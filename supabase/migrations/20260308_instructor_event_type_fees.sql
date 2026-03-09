-- 지도자 행사 유형별 초청 설정
-- 각 유형(시합, 세미나, 오픈매트)별로 초청 수락 여부와 최소 금액 설정

-- 시합 초청 수락 여부 및 최소 금액
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  accept_competition_invitations BOOLEAN DEFAULT FALSE;

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  min_competition_fee INTEGER DEFAULT 0;

-- 세미나 초청 수락 여부 및 최소 금액
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  accept_seminar_invitations BOOLEAN DEFAULT FALSE;

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  min_seminar_fee INTEGER DEFAULT 0;

-- 오픈매트 초청 수락 여부 및 최소 금액
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  accept_openmat_invitations BOOLEAN DEFAULT FALSE;

ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  min_openmat_fee INTEGER DEFAULT 0;

-- 계좌 정보 (초청 수락 시 주최자에게 공개)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS
  bank_account_for_invitation JSONB;

-- 기존 min_invitation_fee가 있는 경우 각 유형 최소 금액에 복사
UPDATE creators
SET
  min_competition_fee = COALESCE(min_invitation_fee, 0),
  min_seminar_fee = COALESCE(min_invitation_fee, 0),
  min_openmat_fee = COALESCE(min_invitation_fee, 0)
WHERE min_invitation_fee > 0;

-- 인덱스 추가 (초청 가능한 지도자 검색용)
CREATE INDEX IF NOT EXISTS idx_creators_accept_competition ON creators(accept_competition_invitations) WHERE accept_competition_invitations = TRUE;
CREATE INDEX IF NOT EXISTS idx_creators_accept_seminar ON creators(accept_seminar_invitations) WHERE accept_seminar_invitations = TRUE;
CREATE INDEX IF NOT EXISTS idx_creators_accept_openmat ON creators(accept_openmat_invitations) WHERE accept_openmat_invitations = TRUE;
