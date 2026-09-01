---
title: "비회원 전환 퍼널 설계 — 신청의 50%를 회원으로 전환한 구조"
description: "가입 허들을 낮춰 비회원도 커넥트 신청을 할 수 있게 만들고, 회원가입 시 자동으로 기존 신청과 연결하는 3단계 매칭 구조를 설계한 과정."
date: "2026-08-24"
tags: ["UX 설계", "인톡 파트너스", "전환 최적화"]
published: true
---

## 배경

인톡 파트너스는 보험설계사를 육성하는 B2B SaaS 플랫폼이다. 핵심 전환 액션은 "커넥트 신청" — 예비 설계사가 GA(보험대리점)에 매칭을 요청하는 행위다.

문제는 이 신청을 하려면 회원가입이 필요했다는 점이다. 이름, 이메일, 전화번호, 관심 지역, 전업/부업 여부 등을 입력하고 이메일 인증까지 마쳐야 커넥트 버튼이 활성화됐다. 랜딩페이지에서 관심을 갖고 들어온 사용자 중 상당수가 회원가입 과정에서 이탈하고 있었다.

GA4 퍼널 데이터를 보니, 랜딩 → 가입 시작 단계에서 약 65%가 이탈했다. 가입을 시작한 사용자 중에서도 이메일 인증 단계에서 20%가 빠졌다. 관심은 있지만 "지금 당장 가입까지 할 만큼은 아닌" 사용자를 놓치고 있었다.

## 가설

가입 없이 최소 정보만으로 커넥트 신청을 받으면, 전환 유입이 늘고 이후 회원으로의 자연 전환도 따라올 것이다.

핵심은 "비회원 신청"이라는 중간 단계를 만들어서, 관심 → 가입 사이의 간극을 줄이는 것이었다.

## 비회원 신청 폼 설계

비회원 커넥트 신청 폼은 필수 필드를 4개로 줄였다:

- 이름
- 전화번호
- 관심 지역(시/도 단위)
- 전업/부업 여부

이메일은 선택이다. 가입 시 이메일이 있으면 매칭 정확도가 올라가지만, 필수로 두면 다시 허들이 생긴다. UTM 파라미터는 폼 제출 시 자동으로 수집해서 유입 채널을 추적했다.

```typescript
// partners-be: guest-connect.service.ts
type GuestConnectInput = {
  name: string;
  phone: string;
  region: string;
  workType: 'FULL_TIME' | 'PART_TIME';
  email?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

async createGuestConnect(input: GuestConnectInput) {
  const normalizedPhone = normalizePhoneNumber(input.phone);

  return this.prisma.guestConnect.create({
    data: {
      name: input.name,
      phone: normalizedPhone,
      region: input.region,
      workType: input.workType,
      email: input.email ?? null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      status: 'PENDING',
    },
  });
}
```

전화번호는 `normalizePhoneNumber`로 정규화한다. `010-1234-5678`, `01012345678`, `+821012345678`을 모두 `01012345678`로 통일해야 나중에 회원가입 시 매칭이 깨지지 않는다.

## 비회원 → 회원 자동 매칭 로직

비회원 신청 데이터를 저장하는 것만으로는 부족하다. 핵심은 이 사용자가 나중에 회원가입을 했을 때, 기존 비회원 신청을 자동으로 연결하는 것이다. 3단계로 설계했다.

### 1단계: 비회원 신청 저장

위에서 설명한 대로 `guestConnect` 테이블에 저장한다. 이 시점에서 `userId`는 `null`이다.

### 2단계: 회원가입 시 매칭 시도

회원가입 완료 시점에 `afterSignup` 훅에서 매칭 로직을 실행한다:

```typescript
// partners-be: auth.service.ts
async afterSignup(user: User) {
  const normalizedPhone = normalizePhoneNumber(user.phone);

  // 전화번호 매칭 우선
  const guestConnects = await this.prisma.guestConnect.findMany({
    where: {
      phone: normalizedPhone,
      userId: null,
      status: 'PENDING',
    },
  });

  // 전화번호 매칭 실패 시 이메일로 시도
  if (guestConnects.length === 0 && user.email) {
    const emailMatches = await this.prisma.guestConnect.findMany({
      where: {
        email: user.email,
        userId: null,
        status: 'PENDING',
      },
    });
    guestConnects.push(...emailMatches);
  }

  if (guestConnects.length > 0) {
    await this.linkGuestConnects(user.id, guestConnects);
  }
}
```

전화번호를 1순위, 이메일을 2순위로 매칭한다. 전화번호가 더 신뢰도가 높은 이유는, 같은 사람이 다른 이메일로 가입할 수 있지만 전화번호는 보통 하나이기 때문이다.

### 3단계: 기존 신청과 연결

매칭된 비회원 신청을 회원 계정에 연결하고, 상태를 전이시킨다:

```typescript
// partners-be: guest-connect.service.ts
async linkGuestConnects(userId: string, guestConnects: GuestConnect[]) {
  await this.prisma.$transaction(
    guestConnects.map((guestConnect) =>
      this.prisma.guestConnect.update({
        where: { id: guestConnect.id },
        data: {
          userId,
          status: 'MATCHED',
          matchedAt: new Date(),
        },
      })
    )
  );

  // 매칭 완료 알림
  await this.notificationService.send({
    userId,
    type: 'GUEST_CONNECT_MATCHED',
    message: '이전에 신청하신 커넥트가 계정에 연결되었습니다.',
  });
}
```

트랜잭션으로 묶는 이유는, 복수의 비회원 신청이 존재할 수 있기 때문이다. 한 사람이 랜딩페이지에서 한 번, 광고 페이지에서 한 번 신청했을 수 있다. 부분 업데이트가 일어나면 일부 신청만 연결되고 나머지는 미아가 된다.

## 상태 머신 설계

`careMatchingStatus`는 비회원 신청부터 최종 온보딩 완료까지의 전체 흐름을 9개 상태로 관리한다:

```prisma
enum CareMatchingStatus {
  PENDING           // 비회원 신청 접수
  MATCHED           // 회원 계정 연결 완료
  CONTACTED         // GA가 연락함
  ONBOARDING        // 온보딩 진행중
  COMPLETED         // 온보딩 완료
  CANCELLED         // 사용자 취소
  EXPIRED           // 30일 초과 미매칭
  REJECTED          // GA가 거절
  REASSIGNED        // 다른 GA로 재배정
}
```

상태 전이 규칙:

```text
PENDING → MATCHED       (회원가입 시 자동)
PENDING → EXPIRED       (30일 초과)
PENDING → CANCELLED     (사용자 취소)
MATCHED → CONTACTED     (GA 연락)
MATCHED → REASSIGNED    (다른 GA 배정)
CONTACTED → ONBOARDING  (미팅 후 진행)
CONTACTED → REJECTED    (GA 거절)
ONBOARDING → COMPLETED  (최종 완료)
```

`PENDING → EXPIRED` 전이는 배치 잡으로 처리한다. 매일 자정에 30일 이상 `PENDING` 상태인 신청을 `EXPIRED`로 변경하고, 해당 전화번호/이메일로 "아직 관심이 있으시면 가입해보세요"라는 리마인드 알림을 보낸다.

## UTM 소스 자동 추적

비회원 신청 폼에 UTM 파라미터를 자동으로 주입하는 로직은 프론트엔드에서 처리한다:

```typescript
// partners-fe: hooks/useUtmParams.ts
function useUtmParams() {
  const searchParams = useSearchParams();

  return {
    utmSource: searchParams.get('utm_source') ?? undefined,
    utmMedium: searchParams.get('utm_medium') ?? undefined,
    utmCampaign: searchParams.get('utm_campaign') ?? undefined,
  };
}

// partners-fe: components/GuestConnectForm.tsx
function GuestConnectForm() {
  const utmParams = useUtmParams();

  const handleSubmit = async (formData: FormData) => {
    await createGuestConnect({
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      region: formData.get('region') as string,
      workType: formData.get('workType') as 'FULL_TIME' | 'PART_TIME',
      ...utmParams,
    });
  };

  // ...
}
```

이렇게 하면 "Meta 광고 → 비회원 신청 → 회원 전환"까지의 전체 경로를 데이터로 추적할 수 있다. 어떤 채널에서 들어온 비회원이 회원으로 전환되는 비율이 높은지를 볼 수 있게 된다.

## 콘텐츠 게이팅과 이탈 방지

비회원 신청 폼만으로는 전환율 개선에 한계가 있었다. 두 가지 보완 장치를 추가했다.

**콘텐츠 게이팅**: 랜딩페이지의 핵심 콘텐츠(수입 시뮬레이터 결과, 상세 커리큘럼)를 비회원 신청 또는 가입 후에만 볼 수 있도록 했다. "여기까지 무료로 볼 수 있습니다. 더 자세한 정보는 간단한 신청 후 확인하세요."라는 구조다.

**이탈 방지 팝업**: 사용자가 페이지를 떠나려 할 때(마우스가 뷰포트 상단으로 이동하거나, 모바일에서 뒤로가기 시) 비회원 신청 폼을 팝업으로 노출했다. 단, 이미 신청한 사용자에게는 보여주지 않는다. `localStorage`에 신청 여부를 저장해서 중복 노출을 방지했다.

```typescript
// partners-fe: hooks/useExitIntent.ts
function useExitIntent(onExit: () => void) {
  useEffect(() => {
    const hasSubmitted = localStorage.getItem('guest_connect_submitted');
    if (hasSubmitted) return;

    const handleMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 0) {
        onExit();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [onExit]);
}
```

## 결과

도입 한 달 기준 데이터:

- 비회원 커넥트 신청 수: 월 180건 (기존 회원 가입 후 신청 대비 3.2배)
- 비회원 → 회원 전환율: **50.5%** (180건 중 91건이 30일 내 회원가입)
- 전화번호 매칭 성공률: 94% (이메일 매칭은 6%)
- 전체 커넥트 신청 전환율: 기존 12% → 도입 후 28%

비회원 신청이라는 중간 단계를 만들어서 "관심은 있지만 가입까지는 아직"인 사용자를 잡은 것이 핵심이었다. 비회원 중 절반이 회원으로 전환됐다는 건, 이들이 서비스에 관심이 있었지만 가입 허들이 진입 장벽이었다는 것을 보여준다.

## 마치며

전환 퍼널에서 "가입이 먼저냐, 행동이 먼저냐"는 오래된 질문이다. 이번 설계에서 배운 건 세 가지다.

첫째, 가입은 관심의 결과이지 전제가 아니다. 가입 전에 행동(신청)을 먼저 허용하고, 행동의 결과를 보여주는 것이 가입 동기가 된다.

둘째, 비회원 데이터를 "버려질 데이터"로 취급하지 않아야 한다. 비회원 신청을 임시 데이터로 처리하면 회원 전환 시 연결할 수 없다. 처음부터 정규 테이블에 저장하고 매칭 로직을 설계해야 한다.

셋째, 전화번호 정규화가 매칭의 핵심이다. 같은 번호를 다른 포맷으로 입력하는 경우가 생각보다 많았다. 정규화 없이는 매칭 성공률이 크게 떨어졌을 것이다.
