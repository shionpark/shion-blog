---
title: "양면 마켓플레이스의 상태 동기화 설계 — 파트너스 ↔ 케어 연동 아키텍처"
description: "독립 배포되는 두 서비스 간 온보딩 상태를 어떻게 일관성 있게 동기화할 것인가에 대한 설계 과정과 트레이드오프를 정리했다."
date: "2026-08-05"
tags: ["NestJS", "Express", "Prisma", "아키텍처", "마켓플레이스", "상태동기화"]
published: true
---

## 배경

보험 설계사와 GA(보험대리점)를 연결하는 양면 마켓플레이스를 운영하고 있다. 수요 측인 **파트너스**(보험 설계사 플랫폼)와 공급 측인 **케어**(GA 매칭 플랫폼)는 각각 독립된 서비스로 배포된다.

- 파트너스: Next.js + NestJS + PostgreSQL + Redis
- 케어: Express + Prisma + PostgreSQL + Socket.IO

두 서비스는 DB도, 배포 주기도, 팀 내 담당자도 다르다. 하지만 사용자 입장에서는 "파트너스에서 신청하면 GA가 연락이 온다"는 하나의 흐름이다. 이 글에서는 이 두 독립 서비스 사이에서 온보딩 상태를 어떻게 동기화하고 있는지, 왜 이런 설계를 선택했는지를 정리한다.

## 문제 정의

파트너스에서 설계사가 "GA 매칭 신청"을 누르면 케어 쪽에서 실제 매칭이 진행된다. 케어에는 10종의 `OnboardingStatus`와 7단계 파이프라인이 존재하고, 35개의 DB 모델이 이 프로세스를 뒷받침한다.

```prisma
enum OnboardingStatus {
  pending
  contacting
  completed
  failed
  contact_failed
  meeting_scheduled
  meeting_completed
  meeting_failed
  package_purchased
  reassigned
}
```

문제는 파트너스 사용자에게 "지금 내 신청이 어떤 상태인지"를 보여줘야 한다는 점이다. 케어 DB에만 존재하는 이 10종의 상태를 파트너스가 어떻게 알 수 있을까?

## 아키텍처 선택지 비교

세 가지 방식을 검토했다.

### 1. 이벤트 기반 (Webhook / Message Queue)

케어에서 상태가 변할 때마다 파트너스로 이벤트를 보내는 방식.

```
[케어] 상태 변경 → Webhook POST → [파트너스] 수신 & DB 업데이트
```

**장점**: 실시간성이 좋다. 상태 변경 직후 파트너스에 반영된다.

**단점**: 케어 서비스에 파트너스의 존재를 알려야 한다. 케어가 독립적으로 동작해야 하는 설계 원칙에 어긋난다. 또한 Webhook 실패 시 재시도 로직, 멱등성 보장, 순서 보장 등 부수적인 인프라 비용이 크다. 2인 팀 규모에서 메시지 큐(SQS, RabbitMQ)를 도입하는 것은 과도하다고 판단했다.

### 2. 케어 API 직접 호출 (On-demand)

파트너스 사용자가 상태를 조회할 때마다 케어 API를 실시간으로 호출하는 방식.

```
[파트너스 FE] → [파트너스 BE] → [케어 API] → 응답 반환
```

**장점**: 항상 최신 상태를 보여줄 수 있다. 파트너스 DB에 상태를 저장할 필요 없다.

**단점**: 케어 서비스에 대한 런타임 의존성이 생긴다. 케어가 다운되면 파트너스의 매칭 관련 화면 전체가 깨진다. 응답 시간도 두 서비스 간 네트워크 레이턴시만큼 느려진다. 그리고 매 요청마다 케어 DB에 부하를 준다.

### 3. 주기적 폴링 + 로컬 상태 캐싱

파트너스 BE가 주기적으로 케어 DB를 조회해서 로컬 DB에 상태를 복제하는 방식.

```
[파트너스 BE 크론] → 30분 간격 → [케어 DB 조회] → 파트너스 DB 업데이트
```

**장점**: 케어 서비스 코드를 수정할 필요가 없다. 케어가 일시적으로 다운돼도 마지막 동기화 시점의 데이터를 보여줄 수 있다. 구현이 단순하다.

**단점**: 최대 30분의 지연이 발생한다. 폴링 주기를 짧게 잡으면 DB 부하가 커진다.

### 선택: 폴링

결국 3번을 선택했다. 가장 큰 이유는 **케어 서비스의 독립성을 보장**할 수 있기 때문이다. 케어는 양면 마켓플레이스에서 GA 측을 위한 플랫폼이고, 파트너스의 존재를 코드 레벨에서 알 필요가 없어야 한다. 반대로 파트너스는 케어의 데이터를 "소비"하는 입장이니, 파트너스가 능동적으로 가져오는 구조가 의존 방향에 맞다.

30분 지연은 실무적으로 문제가 되지 않았다. GA가 후보자에게 연락하고 미팅을 잡는 프로세스 자체가 수 시간에서 수일 단위로 진행되기 때문이다.

## 구현

### 인바운드: 파트너 신청 API

파트너스에서 케어로 신청을 보내는 것은 직접 API 호출로 처리한다. 이 방향은 파트너스가 능동적으로 요청하는 것이므로 폴링이 아닌 동기 호출이 자연스럽다.

3자 동의 여부에 따라 분기가 갈린다:

```typescript
// partners-be: care-application.service.ts
async applyToCare(agentId: number, payload: CareApplicationDto) {
  const agent = await this.agentRepository.findOneOrFail(agentId);

  // 3자 동의 여부에 따라 매칭 방식 분기
  const endpoint = agent.thirdPartyConsent
    ? '/api/v2/applications/member'      // 즉시 매칭
    : '/api/v2/applications/non-member'; // 내부 승인 후 예약 매칭

  const response = await this.httpService.axiosRef.post(
    `${this.careApiBaseUrl}${endpoint}`,
    {
      name: agent.name,
      phone: agent.phone,
      regionSido: agent.regionSido,
      career: agent.careerYears,
      specialties: agent.specialties,
    },
    { headers: { 'x-api-key': this.careApiKey } },
  );

  // 파트너스 DB에 신청 기록 저장
  await this.careApplicationRepository.save({
    agentId,
    careApplicationId: response.data.applicationId,
    careState: CareState.APPLIED,
    appliedAt: new Date(),
  });

  return response.data;
}
```

3자 동의가 `true`인 경우 케어 시스템이 즉시 GA 매칭을 시작한다. `false`인 경우 내부 승인 절차를 거친 뒤 예약 매칭이 진행된다. 이 분기는 보험업 규제와 관련된 것으로, 설계사의 개인정보를 GA에게 넘기기 전에 명시적 동의가 필요하다.

### 아웃바운드: 상태 폴링 크론

30분마다 케어 DB를 조회해서 파트너스 DB를 업데이트하는 크론이 핵심 동기화 메커니즘이다.

```typescript
// partners-be: care-sync.scheduler.ts
@Injectable()
export class CareSyncScheduler {
  private readonly logger = new Logger(CareSyncScheduler.name);

  constructor(
    private readonly careApplicationRepository: CareApplicationRepository,
    private readonly careSyncService: CareSyncService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncOnboardingStatus() {
    const activeApplications = await this.careApplicationRepository.findMany({
      where: {
        careState: { in: [CareState.APPLIED, CareState.IN_PROGRESS] },
      },
    });

    if (activeApplications.length === 0) return;

    const careApplicationIds = activeApplications.map(
      (application) => application.careApplicationId,
    );

    // 케어 DB에서 온보딩 상태 일괄 조회
    const onboardingStatuses = await this.careSyncService
      .fetchOnboardingStatuses(careApplicationIds);

    for (const application of activeApplications) {
      const careStatus = onboardingStatuses.get(application.careApplicationId);
      if (!careStatus) continue;

      const newCareState = this.mapOnboardingStatusToCareState(careStatus);
      if (newCareState === application.careState) continue;

      await this.careApplicationRepository.update(application.id, {
        careState: newCareState,
        careMatchingStatus: careStatus,
        lastSyncedAt: new Date(),
      });

      this.logger.log(
        `신청 ${application.id}: ${application.careState} → ${newCareState}`,
      );
    }
  }
}
```

여기서 핵심은 `mapOnboardingStatusToCareState` 메서드다.

### 상태 매핑: 10종 → 5종 축소

케어의 `OnboardingStatus` 10종을 파트너스에서 그대로 사용하지 않는다. 파트너스 사용자(설계사)에게는 세부 상태가 불필요하다. "연락 중"이든 "미팅 예정"이든, 사용자 입장에서는 "진행 중"이면 충분하다.

처음에는 `careState`를 3종(NONE/OPEN/ACTIVE)으로 설계했었다. 하지만 운영하면서 몇 가지 문제가 드러났다:

- 실패와 만료를 구분할 수 없어서 CS 대응이 어려웠다
- "신청은 했는데 아직 진행이 안 된" 상태와 "진행 중인" 상태가 뒤섞였다
- 관리자 대시보드에서 필터링이 사실상 불가능했다

그래서 5종으로 확장했다:

```typescript
// partners-be: care-state.enum.ts
enum CareState {
  NOT_APPLIED = 'NOT_APPLIED',   // 미신청
  APPLIED = 'APPLIED',           // 신청완료, 아직 처리 시작 전
  IN_PROGRESS = 'IN_PROGRESS',   // GA 매칭 진행 중
  COMPLETED = 'COMPLETED',       // 온보딩 완료
  FAILED = 'FAILED',             // 실패 또는 만료
}
```

그리고 매핑 함수:

```typescript
// partners-be: care-sync.service.ts
private mapOnboardingStatusToCareState(
  status: OnboardingStatus,
): CareState {
  const mapping: Record<OnboardingStatus, CareState> = {
    pending: CareState.APPLIED,
    contacting: CareState.IN_PROGRESS,
    contact_failed: CareState.FAILED,
    meeting_scheduled: CareState.IN_PROGRESS,
    meeting_completed: CareState.IN_PROGRESS,
    meeting_failed: CareState.FAILED,
    completed: CareState.COMPLETED,
    failed: CareState.FAILED,
    package_purchased: CareState.COMPLETED,
    reassigned: CareState.IN_PROGRESS,
  };

  return mapping[status] ?? CareState.APPLIED;
}
```

`careMatchingStatus`는 케어 원본 상태를 그대로 저장하는 필드다. `careState`가 파트너스 UI에서 사용하는 추상화된 상태라면, `careMatchingStatus`는 관리자 대시보드나 디버깅 시 케어 쪽의 실제 진행 상황을 파악하기 위한 용도로 쓴다.

### 케어 측 API: 온보딩 상태 일괄 조회

케어 BE에서는 파트너스의 폴링을 위한 경량 엔드포인트를 하나 열어둔다.

```typescript
// care-be: onboarding.controller.ts
router.post(
  '/api/v2/onboarding/status/batch',
  apiKeyAuth,
  async (req: Request, res: Response) => {
    const { applicationIds } = req.body as { applicationIds: number[] };

    if (!applicationIds?.length || applicationIds.length > 500) {
      return res.status(400).json({
        error: '조회 대상은 1~500건 사이여야 합니다',
      });
    }

    const onboardings = await prisma.onboarding.findMany({
      where: {
        purchaseId: { in: applicationIds },
      },
      select: {
        purchaseId: true,
        status: true,
        updatedAt: true,
      },
    });

    const statusMap = Object.fromEntries(
      onboardings.map((onboarding) => [
        onboarding.purchaseId,
        {
          status: onboarding.status,
          updatedAt: onboarding.updatedAt,
        },
      ]),
    );

    return res.json({ data: statusMap });
  },
);
```

한 가지 주의할 점은 인증이다. 이 엔드포인트는 내부 서비스 간 통신이므로, 사용자 인증이 아닌 API 키 기반 인증(`apiKeyAuth`)을 사용한다. 환경변수로 관리되는 공유 비밀키로 검증하는 단순한 방식이다.

### 온보딩 로그: 상태 전이 추적

케어 쪽에서는 모든 상태 변경을 `OnboardingLog` 테이블에 기록한다.

```typescript
// care-be: onboarding.service.ts
async updateOnboardingStatus(
  onboardingId: number,
  newStatus: OnboardingStatus,
  changedBy: string,
  note?: string,
) {
  const onboarding = await prisma.onboarding.findUniqueOrThrow({
    where: { id: onboardingId },
  });

  // 상태 전이 유효성 검증
  if (!this.isValidTransition(onboarding.status, newStatus)) {
    throw new BadRequestError(
      `${onboarding.status} → ${newStatus} 전이는 허용되지 않습니다`,
    );
  }

  await prisma.$transaction([
    prisma.onboarding.update({
      where: { id: onboardingId },
      data: { status: newStatus },
    }),
    prisma.onboardingLog.create({
      data: {
        onboardingId,
        oldStatus: onboarding.status,
        newStatus,
        changedBy,
        note,
      },
    }),
  ]);
}

private isValidTransition(
  current: OnboardingStatus,
  next: OnboardingStatus,
): boolean {
  const validTransitions: Record<OnboardingStatus, OnboardingStatus[]> = {
    pending: ['contacting', 'failed'],
    contacting: ['contact_failed', 'meeting_scheduled', 'failed'],
    contact_failed: ['contacting', 'reassigned', 'failed'],
    meeting_scheduled: ['meeting_completed', 'meeting_failed'],
    meeting_completed: ['completed', 'package_purchased', 'failed'],
    meeting_failed: ['meeting_scheduled', 'reassigned', 'failed'],
    completed: [],
    failed: ['pending'],   // 재시도 허용
    package_purchased: [],
    reassigned: ['contacting'],
  };

  return validTransitions[current]?.includes(next) ?? false;
}
```

상태 전이 유효성 검증은 간단하지만 강력한 안전장치다. `completed`에서 `pending`으로 되돌아가는 것 같은 비정상적인 전이를 코드 레벨에서 차단한다. 운영 데이터가 쌓이면서 `OnboardingLog`는 CS 대응과 프로세스 병목 분석에 핵심 데이터가 됐다.

## 트레이드오프

이 설계에서 의식적으로 감수한 트레이드오프들이 있다.

### 1. 최대 30분 지연

사용자가 신청 직후 상태를 확인하면 아직 "신청완료"로만 보인다. 실제로 케어 쪽에서 처리가 시작됐더라도, 다음 폴링 주기까지 반영되지 않는다.

이 문제를 완화하기 위해, 신청 직후에는 "신청이 접수되었습니다. 상태 반영까지 최대 30분이 소요될 수 있습니다"라는 안내 메시지를 보여준다. 그리고 실제 운영에서 이 30분 지연에 대한 CS 문의는 거의 없었다. GA 매칭 프로세스 자체가 빠르지 않기 때문이다.

### 2. 케어 DB에 대한 커플링

폴링 방식이라고 해서 커플링이 없는 건 아니다. 파트너스 BE가 케어 API를 호출하므로, 케어의 API 스펙이 바뀌면 파트너스도 수정해야 한다. `OnboardingStatus` enum에 새 값이 추가되면 매핑 함수도 업데이트해야 한다.

이를 방어하기 위해 매핑 함수에 `?? CareState.APPLIED` 같은 폴백을 넣어뒀다. 알 수 없는 상태가 들어오면 "신청완료"로 간주하고 에러를 내지 않는다. 완벽한 해법은 아니지만, 케어 쪽에서 enum을 추가할 때 파트너스가 즉시 배포하지 않아도 서비스가 죽지 않게 만든다.

### 3. 양방향 동기화의 부재

현재 구조에서 동기화는 단방향이다. 케어 → 파트너스로 상태를 가져올 뿐, 파트너스에서 케어의 상태를 변경하는 경로는 없다. 이는 의도적인 설계다. 상태의 원본(source of truth)은 항상 케어 DB이고, 파트너스 DB에 저장되는 것은 "읽기 전용 복제본"이다.

만약 양방향 동기화를 허용했다면 충돌 해소 로직이 필요했을 것이고, 복잡도가 급격히 올라갔을 것이다.

### 4. 상태 추상화 레벨의 손실

10종을 5종으로 축소하면서 정보 손실이 발생한다. `contacting`과 `meeting_scheduled`가 둘 다 `IN_PROGRESS`로 매핑되므로, 파트너스 사용자는 "지금 연락을 시도하고 있다"와 "미팅이 잡혔다"를 구분할 수 없다.

이 손실은 `careMatchingStatus`로 보존한다. 사용자 UI에서는 5종으로 단순화하되, 관리자 대시보드에서는 원본 상태를 볼 수 있게 했다. 향후 사용자에게 더 세분화된 상태를 보여줘야 할 때는 `careMatchingStatus` 기반으로 UI만 확장하면 된다.

## 교훈

### 의존 방향을 일관되게 유지하라

양면 마켓플레이스에서 두 서비스 간 의존 방향은 명확해야 한다. 이 프로젝트에서는 "파트너스가 케어에 의존한다"는 한 방향을 정하고 일관되게 유지했다. 파트너스가 케어 API를 호출하고, 케어 DB를 폴링한다. 케어는 파트너스의 존재를 모른다.

이 원칙 덕분에 케어 서비스를 독립적으로 개발하고 배포할 수 있었다. 케어에 새 기능을 추가할 때 파트너스 코드를 수정할 필요가 없다.

### "3종이면 충분하겠지"는 위험하다

초기에 `careState`를 NONE/OPEN/ACTIVE 3종으로 설계한 것은 실수였다. 프로덕션에 올리고 한 달이 지나자 실패/만료 구분, 신청 후 미처리 상태 추적 등 누락된 케이스가 연달아 드러났다. 상태 enum은 처음부터 조금 넉넉하게 잡는 편이 낫다. 불필요한 상태를 안 쓰는 것은 쉽지만, 나중에 상태를 추가하고 기존 데이터를 마이그레이션하는 것은 어렵다.

### 폴링은 "나쁜" 패턴이 아니다

이벤트 기반 아키텍처가 대세처럼 여겨지지만, 모든 상황에 맞는 것은 아니다. 폴링은 구현이 단순하고, 장애 내성이 좋고, 디버깅이 쉽다. 특히 다음 조건이 맞으면 폴링이 합리적인 선택이 된다:

- 상태 변경 빈도가 낮다 (분 단위가 아닌 시간~일 단위)
- 실시간성 요구가 높지 않다
- 대상 데이터 건수가 적다 (수천 건 미만)
- 팀 규모가 작아 인프라 운영 부담을 최소화해야 한다

이 네 가지가 모두 해당되는 상황이었기에 폴링을 선택했고, 6개월 넘게 운영하면서 문제가 되지 않았다.

### 추상화 레이어는 반드시 필요하다

케어의 `OnboardingStatus`를 파트너스 DB에 그대로 저장했다면, 케어가 enum 값을 변경할 때마다 파트너스에 연쇄 수정이 발생했을 것이다. `CareState`라는 추상화 레이어를 둔 덕분에, 케어에 새 상태가 추가돼도 매핑 함수 한 곳만 수정하면 된다.

원본 상태(`careMatchingStatus`)와 추상화된 상태(`careState`)를 함께 저장하는 패턴은 다른 서비스 연동에서도 재사용 가능한 범용적인 전략이다.

## 마무리

이 설계가 "정답"이라고 말하기는 어렵다. 서비스 규모가 커지거나 실시간성 요구가 높아지면 이벤트 기반으로 전환해야 할 수도 있다. 하지만 현재 단계에서 가장 적은 비용으로 가장 안정적인 동기화를 달성하고 있다고 생각한다.

양면 마켓플레이스를 독립 서비스로 운영하면서 배운 것은, 두 서비스 간의 경계를 명확하게 그리고 의존 방향을 단방향으로 유지하는 것이 기술적 복잡도를 관리하는 핵심이라는 점이다. 폴링이냐 이벤트냐는 그 다음 문제다. 경계와 방향이 흐려지면 어떤 동기화 방식을 쓰든 결국 혼란스러워진다.
