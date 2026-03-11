# PayPal 정기 결제(Subscription) 설정 가이드

페이팔 정기 결제를 활성화하기 위해 필요한 **Plan ID**를 생성하고 확인하는 방법입니다.

## 1. 페이팔 개발자 대시보드 접속
- [PayPal Developer Dashboard](https://developer.paypal.com/)에 로그인합니다.
- 상단 우측의 스위치를 통해 **Sandbox**(테스트) 또는 **Live**(실제 결제) 모드를 선택합니다. (먼저 Sandbox에서 테스트하시는 것을 추천합니다.)

## 2. 상품(Product) 생성
정기 결제 플랜을 만들기 전에 먼저 '상품'을 정의해야 합니다.
1. 왼쪽 메뉴에서 **Subscriptions** > **Products**를 클릭합니다.
2. **Create Product** 버튼을 누릅니다.
3. 상품명(예: Grapplay Membership)과 설명을 입력하고 유형(SERVICE) 및 카테고리를 선택한 후 저장합니다.

## 3. 플랜(Plan) 생성
생성한 상품에 대해 결제 주기와 금액을 설정합니다.
1. 왼쪽 메뉴에서 **Subscriptions** > **Plans**를 클릭합니다.
2. **Create Plan**을 클릭합니다.
3. 생성한 상품(Grapplay Membership)을 선택합니다.
4. 결제 방식(Fixed Pricing 또는 Quantity Pricing)을 선택합니다.
5. 주기와 금액을 설정합니다.
   - **Monthly**: 1 Month 당 20.28 USD
   - **Yearly**: 12 Months 당 (할인된 금액) USD
6. 플랜의 이름을 정하고(예: Monthly Pass) 저장을 완료합니다.
7. 마지막 단계에서 **Activate Plan**을 눌러 활성화해야 합니다.

## 4. Plan ID 확인하기
1. **Subscriptions** > **Plans** 목록으로 이동합니다.
2. 생성된 플랜을 클릭합니다.
3. 상세 페이지 상단에 있는 **Plan ID** (예: `P-5ML4271244454362WM6A6YUI`)를 복사합니다.

## 5. 프로젝트 설정 (환경 변수)
복사한 ID를 프로젝트의 `.env` 파일 또는 Vercel 환경 변수에 등록합니다.

```env
# 1개월권 플랜 ID
VITE_PAYPAL_PLAN_ID_MONTHLY=P-XXXXXXXXXXXX
# 1년권 플랜 ID
VITE_PAYPAL_PLAN_ID_YEARLY=P-YYYYYYYYYYYY
```

> [!TIP]
> **Sandbox**와 **Live**의 Plan ID는 서로 다릅니다. 테스트가 끝나고 실결제 배포 시에는 반드시 **Live** 모드에서 생성한 ID로 교체해 주셔야 합니다.
