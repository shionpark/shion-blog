---
title: "내가 바꾼 Dockerfile이 프로덕션을 밤새 내렸다 — Prisma 엔진과 OpenSSL"
description: "Dockerfile에서 prisma generate를 builder 결과 복사로 바꿨더니 builder와 런타임의 OpenSSL 환경이 달라 서버가 943번 재시작됐다. 카카오 로그인 장애 보고로 시작한 추적 기록."
date: "2026-07-08"
tags: ["Prisma", "Docker", "버그", "장애대응"]
published: true
---

## 카카오 로그인이 안 된다는 보고

7월 8일 오전, 카카오 로그인이 안 된다는 보고가 들어왔다. 카카오 OAuth 문제인 줄 알고 FE와 BE 코드를 같이 봤는데 카카오 관련 코드는 바뀐 게 없었다.

EC2에 접속해서 컨테이너를 보니 로그인 문제가 아니었다. BE 서버가 아예 뜨지 못하고 있었다.

```bash
$ docker ps
CONTAINER  STATUS                        RESTARTS
intalk-be  Restarting (1) 2 seconds ago  943
```

943번 재시작이었다. 올라오자마자 죽고 다시 올라오는 일을 반복하고 있었다. 환경변수부터 확인했는데 이상 없었다.

## 로그

```
PrismaClientInitializationError:
Unable to require(`/app/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node`).

 Expected engine: debian-openssl-1.1.x
 Found engines:   (none available for debian-openssl-3.0.x)
```

Prisma 엔진은 `debian-openssl-1.1.x`용으로 만들어져 있는데 런타임은 `debian-openssl-3.0.x`를 요구하고 있었다.

## 원인은 전날 내 커밋이었다

전날(7/7) 17:49에 내가 올린 커밋이 있었다. 런타임 스테이지에서 `prisma generate`를 다시 돌리던 걸 builder에서 만든 결과를 복사하도록 바꾼 거였다.

```dockerfile
# 이전
RUN npx prisma generate --schema=models/schema.prisma

# 이후
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
```

이 커밋을 넣은 건 production 단계의 `prisma generate`가 실패해서였다. `prisma-dbml-generator`가 devDependency라 production 의존성에는 없었다.

문제는 builder와 production의 환경이 같지 않았다는 점이다. 두 단계 모두 `node:20-slim`이지만, production 단계만 Playwright용 시스템 패키지를 설치하면서 OpenSSL 3 라이브러리를 갖고 있었다. 런타임이 `debian-openssl-3.0.x` 엔진을 찾은 것도 그래서다. builder 단계에는 OpenSSL이 없었고, Prisma는 OpenSSL 버전을 감지하지 못하면 1.1.x로 가정하고 엔진을 만든다. 예전에는 production에서 generate해서 3.0.x 엔진이 만들어졌는데, builder 결과를 복사하자 1.1.x 엔진이 들어갔다. 복사 방식은 두 단계의 환경이 같다는 전제가 필요했는데, 그걸 확인하지 않았다.

## 고친 것

`schema.prisma`에 `binaryTargets`를 추가했다.

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

`native`는 빌드 머신에 맞는 엔진, `debian-openssl-3.0.x`는 Bookworm 런타임용 엔진을 만든다. 두 엔진이 `.prisma`에 같이 들어가서 어느 쪽 환경에서도 맞는 걸 찾는다.

로컬에서 빌드를 확인하고 main에 푸시했다. GitHub Actions 배포가 7분 29초 걸렸고 서버가 정상으로 올라왔다. 장애는 7/7 18시경부터 7/8 10시 40분경까지였다.

약 16~17시간이다.

## 남은 것

- `binaryTargets`를 명시하면 빌드 환경에서 OpenSSL을 감지한 결과와 상관없이 런타임용 엔진이 함께 만들어진다. 대신 이미지 크기가 조금 늘어난다.
- 이 장애는 CI에서 만든 이미지를 EC2에 올렸을 때만 났다. 로컬에서는 `prisma generate`를 직접 돌리니 드러나지 않았다. Dockerfile을 바꿨다면 `docker build`와 `docker run`을 로컬에서 먼저 해 봤어야 했다.

## 배운 점

로컬에서 잘 되던 변경이 프로덕션에서만 깨진 건, 내가 바꾼 것이 코드가 아니라 실행 환경이었기 때문이다. 빌드 결과물을 다른 단계로 복사하는 순간, 그 결과물이 만들어진 환경과 실행될 환경이 같다는 가정이 생긴다. 이번에는 그 가정을 확인하지 않고 배포했다.

장애를 알게 된 경로도 돌아보게 됐다. 서버가 밤새 떠 있지 못했는데 아침에 사용자 보고로 알았다. 잘못된 커밋 하나보다, 장애가 나도 먼저 알 방법이 없었다는 점이 더 큰 빈틈이었다.
