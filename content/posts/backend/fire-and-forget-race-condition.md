---
title: "Fire-and-Forget 패턴이 만든 502 에러 — 동시 호출 Race Condition 대응기"
description: "await 없이 호출만 하는 fire-and-forget 패턴이 동시 요청과 만나 unique constraint 위반과 502 Bad Gateway를 만든 과정과 해결 방법을 공유합니다."
date: "2026-07-16"
tags: ["NestJS", "버그", "장애대응", "설계패턴"]
published: true
---

## 문제 발견

2026년 7월 15일 18시경, 프로덕션 모니터링에서 `POST /care/member` 엔드포인트의 502 Bad Gateway가 포착됐습니다. 사용자가 프로필 작성을 완료하는 시점에 발생하고 있었고, 재현 빈도는 낮지만 간헐적으로 계속 올라오고 있었습니다.

502는 보통 upstream 서버가 유효하지 않은 응답을 반환했다는 뜻입니다. 로그를 확인해 보니, Care API 쪽에서 500(SYS5001) 에러가 반환되고 있었습니다. 그런데 이상한 점이 있었습니다. Care API에는 이미 중복 회원 등록 시 PTN2002(Conflict)를 반환하는 로직이 있었는데, 그 코드가 아니라 SYS5001이 나오고 있었습니다.

## 원인 분석

### 두 갈래로 갈라진 Care API 호출

문제의 흐름을 추적해 보니, 프로필 완료 시점에 Care API가 **두 경로**에서 동시에 호출되고 있었습니다.

```
[사용자: 프로필 작성 완료]
    │
    ├─→ FE: POST /profile/complete (파트너스 BE)
    │       └─→ profile-reward.service: Care API 호출 (fire-and-forget)
    │
    └─→ FE: POST /care/member (파트너스 BE)
            └─→ care.service: Care API 호출 (await)
```

FE에서 프로필 완료 시 두 API를 거의 동시에 호출하고 있었습니다. 문제는 `profile-reward.service`의 Care API 호출 방식이었습니다.

### Fire-and-Forget의 함정

`profile-reward.service.ts`에서는 프로필 완료 보상 처리 중에 Care 회원 등록도 함께 수행하고 있었습니다. 그런데 이 호출이 **fire-and-forget** 방식이었습니다.

```typescript
// profile-reward.service.ts (문제의 코드)
async completeProfileReward(userId: string) {
  // 보상 처리 로직...
  await this.rewardService.grantReward(userId);

  // Care 회원 등록 — await 없이 호출만 하고 넘어감
  this.careService.registerMember(userId);

  return { success: true };
}
```

`await`가 없습니다. 호출만 던져놓고 결과를 기다리지 않는 패턴입니다. 응답 속도를 위해 의도적으로 이렇게 작성한 코드였습니다. Care 등록이 실패하더라도 보상 처리에는 영향을 주지 않아야 한다는 판단이었을 것입니다.

### Race Condition 발생

문제는 FE에서 `/care/member`도 직접 호출하고 있었다는 점입니다. 두 요청이 거의 동시에 Care API에 도달하면 이런 일이 벌어집니다.

```
Timeline (밀리초 단위)
─────────────────────────────────────────────
t=0    profile-reward → Care API: INSERT member (fire-and-forget)
t=5    care.service   → Care API: INSERT member (await)
t=50   Care API: 첫 번째 INSERT 성공
t=55   Care API: 두 번째 INSERT → unique constraint 위반!
```

두 요청 모두 "이 사용자가 아직 등록되지 않았다"는 상태를 보고 INSERT를 시도합니다. 첫 번째는 성공하지만, 두 번째는 unique constraint에 걸립니다.

### SYS5001이 나온 이유

Care API의 회원 등록 로직에서는 중복 체크를 먼저 수행하고, 이미 존재하면 PTN2002(Conflict)를 반환하도록 되어 있었습니다. 하지만 **두 요청이 동시에** 중복 체크를 통과한 뒤 INSERT를 시도하면, 중복 체크 로직을 우회해서 DB 레벨의 unique constraint 위반이 발생합니다.

```typescript
// Care API의 회원 등록 (의사코드)
async registerMember(data) {
  // 중복 체크 — 두 요청 모두 이 시점에서는 "없음"
  const existing = await this.memberRepo.findByUserId(data.userId);
  if (existing) {
    throw new ConflictException('PTN2002: 이미 등록된 회원');
  }

  // INSERT — 두 번째 요청은 여기서 unique constraint 위반
  return this.memberRepo.create(data);
}
```

이 unique constraint 위반은 애플리케이션 레벨에서 잡히지 않은 예외로 처리되어 SYS5001(Internal Server Error)이 반환됐고, 파트너스 BE에서는 이를 받아 502 Bad Gateway로 전파한 것입니다.

## 해결

두 가지를 수정했습니다. 방어 코드 추가와 근본 원인 제거입니다.

### 1. 방어 코드: unique constraint 위반을 ConflictException으로 처리

`care.service.ts`의 catch 블록에서 SYS5001 + unique constraint 관련 에러를 잡아 ConflictException으로 변환했습니다.

```typescript
// care.service.ts — 방어 코드 추가
async registerMember(userId: string) {
  try {
    return await this.careApiClient.createMember({ userId });
  } catch (error) {
    // Care API가 unique constraint 위반을 SYS5001로 반환하는 경우 대응
    if (this.isUniqueConstraintError(error)) {
      throw new ConflictException('이미 등록된 케어 회원입니다');
    }
    throw error;
  }
}
```

이 수정으로, 설사 race condition이 다시 발생하더라도 502 대신 409 Conflict가 반환됩니다. FE에서는 409를 받으면 "이미 등록됨"으로 처리하면 되므로 사용자 경험에 영향이 없습니다.

### 2. 근본 원인 제거: fire-and-forget 호출 삭제

`profile-reward.service.ts`에서 Care API 호출을 완전히 제거했습니다.

```typescript
// profile-reward.service.ts — 수정 후
async completeProfileReward(userId: string) {
  await this.rewardService.grantReward(userId);

  // Care 회원 등록은 FE → /care/member 단일 경로로 통일
  // (fire-and-forget Care 호출 제거)

  return { success: true };
}
```

Care 연동은 FE가 `/care/member`를 호출하는 **단일 경로**로 통일했습니다. 한 가지 작업에 두 가지 경로가 존재하는 것 자체가 문제의 근원이었습니다.

## 교훈

### Fire-and-Forget은 "결과가 필요 없는 작업"에만 써야 합니다

Fire-and-forget 패턴은 로깅, 메트릭 수집처럼 **실패해도 비즈니스에 영향이 없는** 작업에 적합합니다. 하지만 회원 등록처럼 **상태를 변경하는 작업**에 사용하면 위험합니다.

- 에러가 발생해도 호출자가 알 수 없습니다
- 같은 작업이 다른 경로에서 동시에 수행될 때 race condition을 만듭니다
- 디버깅이 어렵습니다 — await가 없으니 에러 스택트레이스에 호출자 정보가 남지 않습니다

### "같은 작업, 두 가지 경로"는 설계 냄새입니다

한 가지 상태 변경(Care 회원 등록)에 대해 두 가지 호출 경로가 존재했습니다. 이런 구조는 각 경로가 독립적으로 동작할 때는 문제가 없지만, 동시에 실행되는 순간 race condition이 됩니다. 상태를 변경하는 작업은 **단일 진입점**을 유지하는 것이 안전합니다.

### 중복 체크 로직은 DB 제약 조건을 대체하지 못합니다

`findByUserId` → 없으면 `create`라는 "체크 후 삽입" 패턴은 단일 요청에서는 동작하지만, 동시 요청에서는 TOCTOU(Time-of-Check to Time-of-Use) 문제가 발생합니다. DB의 unique constraint가 최후의 방어선이고, 애플리케이션 레벨에서는 그 제약 조건 위반을 **정상적인 비즈니스 에러로 변환**하는 catch 로직이 필요합니다.
