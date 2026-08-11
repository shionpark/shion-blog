---
title: "NestJS + Prisma로 크레딧 기반 과금 시스템 설계하기"
description: "SaaS 구독 대신 크레딧 모델을 선택한 이유와, 충전·차감·환불·독점 기간까지 하나의 트랜잭션으로 묶어낸 실무 설계 과정을 정리했다."
date: "2026-08-04"
tags: ["NestJS", "Prisma", "PostgreSQL", "과금", "크레딧", "카카오페이"]
published: true
---

## 배경

인톡 케어는 보험대리점(GA)이 보험 설계사 후보자를 검색하고 구매하는 매칭 플랫폼이다. GA가 후보자의 프로필을 열람하려면 크레딧을 소비해야 하고, 구매 전에는 이름·전화번호·이메일이 마스킹된 상태로만 보인다.

이 글에서는 크레딧 기반 과금 시스템을 설계하면서 고민했던 지점들을 공유한다. 왜 SaaS 구독이 아니라 크레딧이었는지, 스키마를 어떻게 잡았는지, 구매 트랜잭션에서 어떤 것들을 하나로 묶었는지.

## 왜 크레딧인가

과금 모델을 처음 설계할 때 두 가지 선택지가 있었다.

**월정액 구독 모델**: 월 N만원을 내면 후보자를 무제한(또는 N건까지) 열람할 수 있는 방식. SaaS에서 흔히 쓰는 패턴이다.

**크레딧 소비 모델**: 후보자 1명을 열람할 때마다 크레딧을 차감하는 방식. 충전은 선불로 진행한다.

구독 모델이 안 맞았던 이유는 단순하다. GA마다 채용 수요의 편차가 크다. 어떤 GA는 한 달에 후보자를 20명 열람하고, 어떤 GA는 분기에 1~2명만 필요하다. 월정액을 걸어두면 수요가 적은 GA 입장에서는 돈을 버리는 느낌이 든다.

크레딧 모델은 이 문제를 깔끔하게 해결한다.

| 비교 항목 | 월정액 구독 | 크레딧 소비 |
|---|---|---|
| 과금 단위 | 월 | 건 |
| 수요 편차 대응 | 플랜 분리 필요 | 자연스럽게 대응 |
| 매출 예측 | 비교적 안정적 | 변동성 있음 |
| 사용자 심리적 부담 | "안 쓰면 손해" | "쓴 만큼만 지불" |
| 초기 진입 장벽 | 높음 | 낮음 |

매출 예측이 어려운 건 단점이지만, 초기 플랫폼에서는 사용자 유입이 우선이라고 판단했다. 나중에 구독 모델을 얹을 수 있도록 `SubscriptionPlan` 테이블은 미리 만들어두었다.

## 스키마 설계

크레딧 시스템의 핵심 테이블은 4개다.

```prisma
// 사용자 — creditBalance가 지갑 역할
model User {
  id              Int                @id @default(autoincrement())
  email           String             @unique
  name            String
  creditBalance   Int                @default(0)
  totalSpent      Float              @default(0)

  purchases          AgentPurchase[]
  creditTransactions CreditTransaction[]
  payments           Payment[]
}

// 크레딧 거래 내역 — 모든 크레딧 변동을 기록
model CreditTransaction {
  id                Int            @id @default(autoincrement())
  userId            Int
  type              String         // "charge" | "use" | "admin_debit"
  amount            Int            // 양수=충전, 음수=차감
  relatedPurchaseId Int?
  balanceAfter      Int            // 거래 후 잔액 스냅샷
  adminName         String?
  createdAt         DateTime       @default(now())

  purchase          AgentPurchase? @relation(fields: [relatedPurchaseId], references: [id])
  user              User           @relation(fields: [userId], references: [id])

  @@index([userId])
}

// 후보자 구매 기록
model AgentPurchase {
  id             Int                    @id @default(autoincrement())
  userId         Int
  agentId        Int
  price          Int                    // 크레딧 단위 가격
  creditsUsed    Int
  exclusiveUntil DateTime?              // 독점 열람 만료 시각
  approvalStatus PurchaseApprovalStatus @default(auto_approved)
  createdAt      DateTime               @default(now())

  creditTransactions CreditTransaction[]

  @@unique([userId, agentId])           // 중복 구매 방지
  @@index([exclusiveUntil])
}

// 크레딧 플랜 — 충전 상품 정의
model CreditPlan {
  id               Int       @id @default(autoincrement())
  name             String
  price            Int       // 정가 (VAT 미포함)
  priceVat         Int       // 정가 (VAT 포함)
  discountPrice    Int?      // 할인가 — null이면 할인 없음
  discountPriceVat Int?
  discountStartAt  DateTime?
  discountEndAt    DateTime?
  credits          Int       // 제공 크레딧 수
  status           String    @default("active")
}
```

설계할 때 특히 신경 쓴 부분이 있다.

**`balanceAfter` 스냅샷**: `CreditTransaction`에 거래 후 잔액을 매번 기록한다. 나중에 "이 시점에 잔액이 얼마였지?" 하는 문의가 들어올 때, 트랜잭션 로그만 보면 된다. 전체 내역을 다 합산할 필요가 없다.

**`@@unique([userId, agentId])`**: 같은 후보자를 두 번 구매하는 케이스를 DB 레벨에서 막는다. 애플리케이션 코드에서도 체크하지만, 동시 요청이 들어올 때는 유니크 제약조건이 마지막 방어선이 된다.

**`creditBalance`를 User에 직접 둔 이유**: 별도 `Wallet` 테이블을 분리하는 방법도 있지만, 이 서비스에서 사용자 1명이 지갑을 여러 개 가질 이유가 없다. 조인을 줄이는 편이 쿼리 성능이나 코드 단순성 면에서 이득이었다.

## 핵심 로직: 충전·차감·환불

### 크레딧 충전

관리자가 크레딧을 지급하는 로직이다. 단순히 `creditBalance`를 올리는 게 아니라, 매출 계산까지 하나의 트랜잭션에서 처리한다.

```typescript
async creditCredits(userId: number, amount: number, adminName?: string) {
  if (amount <= 0) {
    throw new BusinessLogicError('지급 크레딧은 1 이상이어야 합니다.');
  }

  // 크레딧 플랜의 현재 가격으로 매출 계산
  const creditPlan = await this.pricingRepository.getActiveCreditPlan();
  let revenueAmount = 0;

  if (creditPlan) {
    const now = new Date();
    const isDiscountActive =
      creditPlan.discountPriceVat != null &&
      creditPlan.discountStartAt &&
      creditPlan.discountEndAt &&
      now >= creditPlan.discountStartAt &&
      now <= creditPlan.discountEndAt;

    revenueAmount = isDiscountActive
      ? creditPlan.discountPriceVat!
      : creditPlan.priceVat;
  }

  return this.prisma.$transaction(async (tx) => {
    // Prisma increment로 원자적 업데이트
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        creditBalance: { increment: amount },
        totalSpent: { increment: revenueAmount },
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: 'charge',
        amount,
        balanceAfter: updatedUser.creditBalance,
        adminName: adminName ?? null,
      },
    });

    return { userId, balanceAfter: updatedUser.creditBalance };
  });
}
```

`increment`를 쓰는 이유가 중요하다. `creditBalance: user.creditBalance + amount`처럼 직접 계산하면 동시에 두 요청이 들어올 때 race condition이 생긴다. Prisma의 `increment`는 DB 레벨에서 `SET credit_balance = credit_balance + N`으로 변환되므로, 원자적 업데이트가 보장된다.

### 후보자 구매 (크레딧 차감)

구매 로직은 단순한 차감이 아니다. 하나의 트랜잭션 안에서 이런 일들이 벌어진다.

1. 잔액 확인
2. 중복 구매 체크
3. 구매 레코드 생성
4. 온보딩 생성 (즉시매칭인 경우)
5. 크레딧 차감
6. 거래 내역 기록

```typescript
async purchaseAgent(userId: number, agentId: number) {
  const agent = await this.agentRepository.findById(agentId);
  if (!agent || agent.status !== 'active') {
    throw new BusinessLogicError('구매할 수 없는 후보자입니다.');
  }

  // 서버에서 가격을 직접 조회 — 클라이언트가 보낸 가격은 무시한다
  const creditsUsed = agent.price;

  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessLogicError('사용자를 찾을 수 없습니다.');

    if (user.creditBalance < creditsUsed) {
      throw new BusinessLogicError(
        `보유 크레딧이 부족합니다. (필요: ${creditsUsed}C, 보유: ${user.creditBalance}C)`
      );
    }

    // 애플리케이션 레벨 중복 체크
    const existing = await tx.agentPurchase.findFirst({
      where: { userId, agentId },
    });
    if (existing) throw new BusinessLogicError('이미 구매한 후보자입니다.');

    // 즉시매칭: 구매 시점부터 7일 독점
    const exclusiveUntil = agent.thirdPartyConsent
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : undefined;

    let purchase;
    try {
      purchase = await tx.agentPurchase.create({
        data: {
          userId,
          agentId,
          price: creditsUsed,
          creditsUsed,
          paymentStatus: 'success',
          approvalStatus: agent.thirdPartyConsent
            ? 'auto_approved'
            : 'pending_approval',
          exclusiveUntil,
        },
      });
    } catch (error: unknown) {
      // P2002: unique constraint violation — 동시 요청 방어
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BusinessLogicError('이미 구매한 후보자입니다.');
      }
      throw error;
    }

    // 크레딧 차감
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { decrement: creditsUsed } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: 'use',
        amount: -creditsUsed,
        balanceAfter: updatedUser.creditBalance,
        relatedPurchaseId: purchase.id,
      },
    });

    return {
      purchaseId: purchase.id,
      creditsUsed,
      balanceAfter: updatedUser.creditBalance,
    };
  });
}
```

주목할 부분은 **가격을 서버에서 직접 조회**한다는 점이다. 클라이언트가 `{ price: 1 }` 같은 값을 보내더라도 무시하고, DB에 저장된 `agent.price`를 사용한다. 과금 로직에서 클라이언트 입력을 신뢰하면 안 된다.

### 대량 구매

최대 5명까지 한 번에 구매할 수 있는 대량 구매 기능도 있다. 핵심은 **총액을 먼저 계산해서 잔액을 한 번에 확인**하는 것이다.

```typescript
// 총 크레딧 합산
let totalCreditsNeeded = 0;
for (const agent of agents) {
  totalCreditsNeeded += agent.price;
}

// 한 번에 잔액 확인
if (user.creditBalance < totalCreditsNeeded) {
  throw new BusinessLogicError(
    `보유 크레딧이 부족합니다. (필요: ${totalCreditsNeeded}C, 보유: ${user.creditBalance}C)`
  );
}

// 개별 구매 순회
for (const agent of agents) {
  // 구매 생성 + 크레딧 차감 + 거래 내역 기록
  // ... 단건 구매와 동일한 로직
}
```

5명을 개별적으로 구매 API를 5번 호출하는 것과 다른 점은, 하나의 트랜잭션 안에서 모든 구매가 처리된다는 것이다. 3번째 후보자에서 실패하면 1~2번째 구매도 전부 롤백된다.

### 환불

환불은 두 가지 경로가 있다.

**카카오페이 결제 환불**: 실제 결제된 금액을 카카오페이 API로 취소하고, 충전된 크레딧을 차감한다.

```typescript
async refundCreditPayment(paymentId: number, reason: string) {
  const payment = await this.prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { id: true, creditBalance: true } } },
  });

  if (payment.status !== 'approved') {
    throw new BusinessLogicError('환불 가능한 상태가 아닙니다.');
  }

  // 1. 카카오페이 결제 취소
  await this.kakaopayClient.cancel({
    tid: payment.tid,
    cancelAmount: payment.totalAmount,
    cancelTaxFreeAmount: payment.taxFreeAmount,
  });

  // 2. 결제 상태 → canceled
  await this.paymentRepository.updateStatus(payment.id, {
    status: 'canceled',
    kakaoResponse: { refundReason: reason },
  });

  // 3. 크레딧 차감 (0 미만 방지)
  const creditToDeduct = payment.creditAmount ?? 0;
  const newBalance = Math.max(0, payment.user.creditBalance - creditToDeduct);

  await this.prisma.user.update({
    where: { id: payment.userId },
    data: { creditBalance: newBalance },
  });

  return { refundedAmount: payment.totalAmount, newCreditBalance: newBalance };
}
```

`Math.max(0, ...)`를 쓰는 이유가 있다. 사용자가 10크레딧을 충전받고 8크레딧을 이미 사용한 상태에서 환불하면, 잔액이 마이너스가 되면 안 된다. 비즈니스 정책상 이미 사용한 크레딧까지 회수하지는 않기로 했다.

**구매 반려 환불**: 관리자가 예약매칭 구매를 반려하면, 사용한 크레딧을 돌려준다.

```typescript
// 구매 시 사용한 크레딧을 그대로 환불
const creditsToRefund = purchase.creditsUsed;

await this.prisma.$transaction(async (tx) => {
  // 구매 상태 → rejected
  await tx.agentPurchase.update({
    where: { id: purchaseId },
    data: { approvalStatus: 'rejected', approvalReason: reason },
  });

  // 크레딧 복구
  await tx.user.update({
    where: { id: purchase.userId },
    data: { creditBalance: { increment: creditsToRefund } },
  });
});
```

## 카카오페이 연동

크레딧 충전 결제는 카카오페이를 사용한다. 단건 결제와 정기결제 두 가지 방식을 지원한다.

### 단건 결제 플로우

```
GA가 충전 버튼 클릭
  → 서버: 카카오페이 ready API 호출 (tid 발급)
  → 클라이언트: 카카오페이 결제창 리다이렉트
  → 사용자 결제 완료
  → 서버: approve API 호출 (tid + pg_token)
  → 크레딧 충전 트랜잭션 실행
```

```prisma
model Payment {
  id             Int            @id @default(autoincrement())
  userId         Int
  type           PaymentType    // "credit" | "subscription"
  status         KakaoPayStatus @default(ready)
  tid            String?        @unique
  partnerOrderId String         @unique
  totalAmount    Int
  creditAmount   Int?           // 충전될 크레딧 수
  approvedAt     DateTime?
  kakaoResponse  Json?          // API 응답 원본 보관
}
```

`kakaoResponse`에 카카오페이 API 응답 원본을 통째로 저장해두는 게 나중에 큰 도움이 된다. 결제 관련 CS가 들어왔을 때, 카카오페이 측 응답 데이터를 바로 확인할 수 있다.

### 정기결제 (SID 기반)

구독 모델도 준비해두었다. 카카오페이 정기결제는 최초 결제 시 `SID`(Subscription ID)를 발급받고, 이후 SID로 자동 결제를 요청하는 방식이다.

```prisma
model User {
  // ...
  subscriptionSid      String? @unique  // 카카오페이 정기결제 SID
  subscriptionStatus   SubscriptionStatus @default(none)
  subscriptionExpireAt DateTime?
}
```

SID는 User 테이블에 직접 저장했다. 정기결제 갱신 시 SID로 카카오페이 API를 호출하면, 사용자 개입 없이 결제가 진행된다. 매달 크론잡이 만료 예정인 구독을 조회해서 자동 갱신을 시도하는 구조다.

## 독점 열람 기간

후보자를 구매하면 7일간 독점 열람 기간이 부여된다. 이 기간 동안 다른 GA는 해당 후보자를 구매할 수 없다.

```typescript
// 즉시매칭: 구매 시점부터 7일
const exclusiveUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
```

이걸 구현할 때 두 가지 선택지가 있었다.

**방법 1**: `Agent` 테이블에 `isExclusive` 플래그를 두고, 크론으로 만료 처리
**방법 2**: `AgentPurchase`에 `exclusiveUntil` 타임스탬프를 두고, 쿼리 시 비교

방법 2를 선택했다. 크론잡으로 상태를 변경하는 방식은 실행 시점의 미세한 차이로 예기치 못한 동작이 생길 수 있다. (실제로 다른 기능에서 크론 + TTL 조합의 시간 드리프트 버그를 경험한 적이 있다.) 타임스탬프 비교 방식이 더 안전하다.

```typescript
// 후보자 목록 조회 시 — 독점 기간 중인 후보자 제외
const availableAgents = await this.prisma.agent.findMany({
  where: {
    status: 'active',
    purchases: {
      none: {
        exclusiveUntil: { gt: new Date() },
      },
    },
  },
});
```

`exclusiveUntil`에 인덱스를 걸어두면 필터링 성능도 괜찮다.

## 마스킹: 구매 전/후 정보 공개 범위

미구매 사용자에게는 후보자의 개인정보를 마스킹해서 보여준다. 마스킹은 반드시 **백엔드에서** 처리해야 한다. 프론트엔드에서 마스킹하면 네트워크 탭에서 원본 데이터가 노출된다.

```typescript
function maskName(name: string): string {
  if (name.length <= 2) return name[0] + 'O';
  return name[0] + 'OO';
}

// API 응답 시 구매 여부에 따라 분기
function formatAgentResponse(agent: Agent, purchased: boolean) {
  return {
    id: agent.id,
    name: purchased ? agent.name : maskName(agent.name),
    phone: purchased ? decrypt(agent.encryptedPhone) : '010-****-****',
    email: purchased ? decrypt(agent.encryptedEmail) : maskEmail(agent.email),
    // 경력, 자격증 등 비식별 정보는 항상 공개
    career: agent.career,
    licenses: agent.licenses,
  };
}
```

마스킹 로직은 별도 유틸로 분리해두면 일관성을 유지하기 좋다. 이름, 전화번호, 이메일, 생년월일 각각에 대해 마스킹 함수를 만들어두었다.

## 교훈

### 과금은 반드시 트랜잭션으로 묶어야 한다

"크레딧 차감 → 구매 레코드 생성 → 온보딩 생성"이 각각 별도 쿼리였다면, 중간에 하나가 실패했을 때 데이터 정합성이 깨진다. 크레딧은 빠졌는데 구매 기록이 없는 상황이 발생할 수 있다. Prisma의 `$transaction`으로 all-or-nothing을 보장하는 게 기본이다.

### 가격은 서버가 결정한다

클라이언트가 보낸 가격을 신뢰하지 않는다. `agent.price`를 서버에서 직접 조회해서 사용한다. 이건 과금 시스템에서 가장 기본적인 원칙인데, 바빠지면 놓치기 쉽다.

### increment/decrement를 쓰자

`creditBalance: user.creditBalance + amount` 대신 `creditBalance: { increment: amount }`를 쓴다. 전자는 조회 시점과 업데이트 시점 사이에 다른 트랜잭션이 끼어들 수 있다. 후자는 DB 레벨의 원자적 연산이다.

### balanceAfter를 기록해두면 나중에 편하다

모든 크레딧 거래에 "거래 후 잔액"을 스냅샷으로 남겨둔다. CS 대응 시 "이 시점에 크레딧이 얼마였는지" 확인하는 게 매우 간편해진다. 전체 트랜잭션을 처음부터 합산할 필요가 없다.

### 중복 방지는 이중으로

애플리케이션 레벨에서 `findFirst`로 중복을 체크하고, DB 레벨에서 `@@unique` 제약조건으로 한 번 더 잡는다. 동시에 같은 후보자를 구매하는 요청이 들어올 때, 첫 번째 방어선이 뚫려도 두 번째에서 `P2002` 에러로 잡힌다.

### 환불에서 마이너스 잔액을 허용하지 않는다

`Math.max(0, balance - deduct)`로 하한선을 걸어둔다. 이미 사용한 크레딧까지 회수하는 건 비즈니스 정책적으로도 문제고, 마이너스 잔액은 후속 로직에서 예상치 못한 버그를 유발한다.

---

크레딧 시스템은 단순해 보이지만 "돈"이 오가는 영역이라 작은 실수가 큰 사고로 이어진다. 트랜잭션 경계를 명확히 잡고, 서버 주도의 가격 결정을 철저히 지키고, 모든 거래에 감사 로그를 남기는 것. 이 세 가지가 가장 중요한 원칙이었다.
