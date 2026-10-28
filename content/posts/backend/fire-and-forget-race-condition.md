---
title: "Fire-and-Forget 호출이 만든 502 — 같은 요청이 두 경로로 나가고 있었다"
description: "await 없이 부른 케어 연동 호출이 FE의 직접 호출과 겹쳐 unique constraint에 걸렸고, POST /care/member가 502를 냈다. 원인을 찾은 기록."
date: "2026-07-16"
tags: ["NestJS", "버그", "장애대응", "설계패턴"]
published: true
---

## 502가 간헐적으로 올라왔다

7월 15일 18시경 프로덕션 모니터링에서 `POST /care/member`의 502 Bad Gateway가 잡혔다. 사용자가 프로필 작성을 끝내는 시점에 나왔고, 자주는 아니지만 계속 올라왔다.

502면 upstream이 이상한 응답을 줬다는 뜻이라 로그를 봤다. Care API가 500(`SYS5001`)을 반환하고 있었다. 이상한 점은 Care API에 중복 등록이면 `PTN2002`(Conflict)를 돌려주는 처리가 이미 있다는 거였다. 그 코드가 아니라 `SYS5001`이 나오고 있었다.

## 호출이 두 갈래였다

프로필 완료 시점의 흐름을 따라가 보니 Care API가 두 경로에서 불리고 있었다.

```
[사용자: 프로필 작성 완료]
    │
    ├─→ FE: POST /profile/complete (파트너스 BE)
    │       └─→ profile-reward.service: Care 연동 (await 없음)
    │
    └─→ FE: POST /care/member (파트너스 BE)
            └─→ care.service: Care API 호출 (await)
```

`profile-reward.service.ts` 끝에 이런 코드가 있었다.

```typescript
// 11. 케어 연동 시도 (비동기, 실패해도 프로필 완성은 성공 처리)
this.submitCareApplication(userId, profileData).catch((error) => {
  this.logger.error(`케어 연동 실패 (userId: ${userId})`, error);
});
```

`await`가 없다. 케어 연동이 실패해도 프로필 완성은 성공으로 처리하려고 일부러 이렇게 쓴 코드였다. 이 코드는 1월에 전임자가 넣은 것이다.

문제는 FE가 `/care/member`도 직접 호출한다는 점이었다. 두 요청이 거의 동시에 Care API에 도착하면 둘 다 "아직 등록 안 됨"을 보고 INSERT를 시도한다. 첫 번째는 성공하고 두 번째가 DB의 unique constraint에 걸린다. 중복 체크가 있어도 체크와 INSERT 사이에 다른 요청이 끼어들면 소용이 없다. 이 위반은 애플리케이션이 잡지 못한 예외라 `SYS5001`로 나갔고, 파트너스 BE가 이를 502로 전달했다.

## 고친 것

커밋 하나에서 두 가지를 했다.

**1. unique constraint 위반을 Conflict로 바꾼다.** `care.service.ts`의 catch에서 `PTN2002`뿐 아니라 `SYS5001`이면서 메시지에 `Unique constraint`가 들어 있는 경우도 `ConflictException`으로 던진다. 두 호출이 다시 겹쳐도 502가 아니라 409가 나간다.

```typescript
if (
  error.response.data?.errorCode === 'PTN2002' ||
  (error.response.data?.errorCode === 'SYS5001' &&
    error.response.data?.message?.includes('Unique constraint'))
) {
  throw new ConflictException('이미 신청한 연락처입니다. ...');
}
```

**2. fire-and-forget 호출을 지운다.** `profile-reward.service.ts`의 케어 연동 호출을 없앴다. 케어 연동은 FE가 `/care/member`를 부르는 한 경로로 정리했다.

## 남은 것

- 에러 메시지 문자열(`Unique constraint`)로 구분하는 건 Care API의 메시지가 바뀌면 깨진다. 에러 코드를 따로 받는 쪽이 낫지만 Care API는 이 PR에서 건드리지 않았다.
- 같은 작업이 두 경로에 있으면 언젠가 겹친다. 상태를 바꾸는 호출은 한 곳에서만 부르게 두고, 코드를 읽다가 `await` 없는 호출을 보면 그 결과가 정말 필요 없는지부터 본다.
- 체크 후 INSERT는 동시 요청에서 막아 주지 못한다. 마지막에 막는 건 DB 제약이고, 앱은 그 위반을 업무 에러로 바꿔 주는 일을 해야 한다.