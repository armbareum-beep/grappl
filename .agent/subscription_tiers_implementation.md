# 구독 티어 시스템 구현 완료

## 📋 개요

베이직(강의만)과 프리미엄(강의+루틴) 2-티어 구독 시스템을 구현했습니다.

---

## 💰 가격 구조

### 베이직 (강의만)
- **월간**: ₩29,000
- **연간**: ₩290,000 (월 ₩24,167 꼴, 17% 할인)

**혜택:**
- ✅ 모든 강좌 무제한 시청
- ✅ 매주 업데이트되는 신규 기술
- ✅ 스파링 분석 영상 접근
- ✅ 루틴 30% 할인 구매

### 프리미엄 (강의 + 루틴)
- **월간**: ₩39,000
- **연간**: ₩390,000 (월 ₩32,500 꼴, 17% 할인)

**혜택:**
- ✅ 베이직의 모든 혜택
- ✅ **모든 루틴 무제한 접근**
- ✅ 신규 루틴 자동 추가
- ✅ 오프라인 세미나 우선권
- ✅ 인스트럭터 Q&A 우선 답변

---

## 🗂️ 구현된 파일

### 1. **데이터베이스 마이그레이션**
`supabase/subscription_tiers_migration.sql`

- `subscriptions` 테이블에 `subscription_tier` 필드 추가
- `billing_period` 필드 추가 (monthly/yearly)
- `subscription_pricing` 테이블 생성
- RLS 정책 설정
- 헬퍼 함수 생성:
  - `has_premium_subscription(user_id)` - 프리미엄 구독 여부
  - `has_active_subscription(user_id)` - 활성 구독 여부
  - `get_subscription_tier(user_id)` - 구독 티어 조회
  - `check_routine_access(user_id, routine_id)` - 루틴 접근 권한
  - `get_routine_discount_percent(user_id)` - 루틴 할인율

### 2. **TypeScript 타입**
`types.ts`

추가된 타입:
```typescript
export type SubscriptionTier = 'basic' | 'premium';
export type BillingPeriod = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  subscriptionTier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  amount: number;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeSubscriptionId?: string;
  createdAt: string;
}

export interface SubscriptionPricing {
  id: string;
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 3. **API 함수**
`lib/api.ts`

추가된 함수:
- `getUserSubscription(userId)` - 사용자 구독 정보 조회
- `hasPremiumSubscription(userId)` - 프리미엄 구독 여부
- `hasActiveSubscription(userId)` - 활성 구독 여부
- `getSubscriptionTier(userId)` - 구독 티어 조회
- `checkRoutineAccess(userId, routineId)` - 루틴 접근 권한 확인
- `getRoutineDiscount(userId)` - 루틴 할인율 조회
- `getSubscriptionPricing()` - 모든 가격 옵션 조회
- `upsertSubscription(subscription)` - 구독 생성/업데이트

### 4. **Pricing 페이지**
`pages/Pricing.tsx`

**주요 기능:**
- 월간/연간 토글 버튼
- 2-티어 가격 카드 (베이직/프리미엄)
- 동적 가격 계산 (할인율 자동 표시)
- 선택한 티어/기간 정보를 결제 모달에 전달

---

## 🔄 다음 단계

### 1. **DB 마이그레이션 실행**
```bash
# Supabase SQL 에디터에서 실행
supabase/subscription_tiers_migration.sql
```

### 2. **결제 로직 업데이트**
- `PaymentModal` 컴포넌트에서 티어/기간 정보 처리
- Stripe 결제 시 `subscription_tier`와 `billing_period` 저장

### 3. **루틴 접근 제어 구현**
- 루틴 상세 페이지에서 `checkRoutineAccess()` 호출
- 프리미엄 구독자는 바로 접근
- 베이직 구독자는 30% 할인 가격으로 구매 옵션 표시

### 4. **AuthContext 업데이트**
```typescript
// contexts/AuthContext.tsx에 추가
const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier | 'none'>('none');

useEffect(() => {
  if (user) {
    getSubscriptionTier(user.id).then(setSubscriptionTier);
  }
}, [user]);
```

---

## 🎯 비즈니스 로직

### 강의 번들 루틴 (무료)
- 크리에이터가 강의에 루틴을 번들로 추가 가능
- 강의 구매 시 자동으로 루틴 지급
- `course_routine_bundles` 테이블 사용
- `source = 'course_bundle'`로 기록

### 루틴 단독 구매
- 베이직 구독자: 30% 할인
- 프리미엄 구독자: 무료 (무제한 접근)
- 비구독자: 정가

### 구독 혜택
| 기능 | 비구독자 | 베이직 | 프리미엄 |
|------|---------|--------|----------|
| 강의 | 개별 구매 | 무제한 | 무제한 |
| 루틴 | 정가 | 30% 할인 | 무제한 |
| 강의 번들 루틴 | 강의 구매 시 | 강의 구매 시 | 강의 구매 시 |

---

## ✅ 체크리스트

- [x] DB 스키마 작성
- [x] TypeScript 타입 정의
- [x] API 함수 구현
- [x] Pricing 페이지 UI 구현
- [ ] DB 마이그레이션 실행
- [ ] 결제 로직 업데이트
- [ ] 루틴 접근 제어 구현
- [ ] AuthContext 업데이트
- [ ] 테스트

---

## 🚀 매출 예상

### 월 1,000명 기준 (보수적)
```
베이직 (60%):   600명 × ₩29,000 = ₩17,400,000
프리미엄 (40%): 400명 × ₩39,000 = ₩15,600,000
─────────────────────────────────────
총 구독 매출:                ₩33,000,000

+ 루틴 단독 구매 (베이직 30%):  ₩3,000,000
+ 단품 강의 (비구독자):         ₩8,000,000
─────────────────────────────────────
총 매출:                     ₩44,000,000/월
```

**vs 현재 단일 ₩39,000 구독:**
- 현재: ₩39,000,000
- 증가: **+₩5,000,000 (13% 증가)**

---

## 📝 참고사항

1. **기존 구독자 처리**: 마이그레이션 시 모든 기존 구독자는 `premium` 티어로 설정됨
2. **안전한 마이그레이션**: `IF NOT EXISTS` 체크로 여러 번 실행해도 안전
3. **호환성**: 기존 `plan_interval` 필드는 유지하고 `billing_period`로 마이그레이션
4. **RLS 정책**: 모든 테이블에 적절한 보안 정책 설정됨
