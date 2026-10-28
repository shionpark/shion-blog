---
title: "내가 바꾼 Dockerfile이 프로덕션을 밤새 내렸다 — Prisma 엔진과 OpenSSL"
description: "Dockerfile에서 prisma generate를 builder 결과 복사로 바꿨더니 베이스 이미지의 OpenSSL이 달라져 서버가 943번 재시작됐다. 카카오 로그인 장애 보고로 시작한 추적 기록."
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

문제는 `node:20-slim`이 Debian Bullseye(OpenSSL 1.1.x)에서 Bookworm(OpenSSL 3.0.x)으로 바뀐 시점과 겹쳤다는 거였다. 이전에는 런타임에서 `prisma generate`를 돌려서 런타임 OpenSSL에 맞는 엔진이 만들어졌다. 복사 방식으로 바꾸면서 builder와 런타임의 OpenSSL 버전이 같아야 한다는 전제가 생겼는데, 그 전제가 깨질 수 있다는 점을 놓쳤다.

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

## 이후에 정한 것

- 베이스 이미지 태그 고정(digest)도 방법이었지만 보안 패치를 못 받는 단점이 있어서 `binaryTargets` 명시를 택했다. 이미지가 바뀌어도 엔진이 맞게 남는다. 이미지 크기가 조금 늘어난다.
- 이 장애는 CI에서 만든 이미지를 EC2에 올렸을 때만 났다. 로컬에서는 `prisma generate`를 직접 돌리니 드러나지 않았다. Dockerfile을 바꿨다면 `docker build`와 `docker run`을 로컬에서 먼저 해 봤어야 했다.