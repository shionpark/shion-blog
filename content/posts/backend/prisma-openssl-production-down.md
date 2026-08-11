---
title: "Docker 베이스 이미지 업그레이드가 만든 프로덕션 7.5시간 다운"
description: "node:20-slim이 Bullseye에서 Bookworm으로 올라가면서 OpenSSL 버전이 바뀌고, Prisma 엔진 바이너리가 로드에 실패해 서버가 943번 재시작된 장애를 추적하고 해결한 기록입니다."
date: "2026-07-08"
tags: ["Prisma", "Docker", "버그", "장애대응"]
published: true
---

## 문제 발견

7월 8일 새벽, 카카오 로그인이 안 된다는 보고가 들어왔습니다. 처음에는 카카오 OAuth 쪽 문제인 줄 알고 FE/BE 코드를 병렬로 조사했는데, 카카오 관련 코드에는 변경 이력이 없었습니다.

EC2에 SSH로 접속해서 컨테이너 상태를 확인해 보니, 카카오 로그인 문제가 아니었습니다. **BE 서버 자체가 기동에 실패**하고 있었습니다.

```bash
$ docker ps
CONTAINER  STATUS                        RESTARTS
intalk-be  Restarting (1) 2 seconds ago  943
```

컨테이너가 943번 재시작되고 있었습니다. 서버가 올라가자마자 크래시하고, 다시 올라가고, 다시 크래시하는 무한 루프였습니다.

## 원인 추적

### 환경변수부터 확인

EC2 인스턴스에 접속해서 환경변수를 먼저 확인했습니다. 최근에 누군가 `.env`를 잘못 수정했을 가능성을 의심했는데, 환경변수는 정상이었습니다.

### 컨테이너 로그에서 단서 발견

컨테이너 로그를 열어보니 원인이 명확했습니다.

```
PrismaClientInitializationError:
Unable to require(`/app/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node`).

 Prisma cannot find the query engine.
 This is likely caused by a platform incompatibility.

 Expected engine: debian-openssl-1.1.x
 Found engines:   (none available for debian-openssl-3.0.x)
```

Prisma 엔진 바이너리가 `debian-openssl-1.1.x`용으로 빌드되어 있는데, 런타임 환경은 `debian-openssl-3.0.x`를 요구하고 있었습니다.

### 원인: Dockerfile 변경 + 베이스 이미지 업그레이드

전일(7/7) 커밋을 추적해 보니, Dockerfile에서 Prisma 관련 처리 방식을 변경한 이력이 있었습니다.

```dockerfile
# Before: 런타임 스테이지에서 직접 prisma generate 실행
RUN npx prisma generate

# After: 빌더 스테이지의 .prisma를 복사
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
```

빌더 스테이지에서 생성한 Prisma 클라이언트를 런타임 스테이지로 복사하는 방식으로 바꾼 것 자체는 합리적인 최적화였습니다. `prisma generate`를 런타임에서 다시 실행할 필요 없이 빌드 결과물만 가져오니까요.

문제는 **`node:20-slim` 베이스 이미지가 업데이트된 시점**과 겹쳤다는 것입니다.

```
node:20-slim (이전) → Debian Bullseye → OpenSSL 1.1.x
node:20-slim (현재) → Debian Bookworm → OpenSSL 3.0.x
```

빌더 스테이지의 이미지 캐시에는 아직 Bullseye 기반이 남아 있었고, 런타임 스테이지에서 새로 pull된 이미지는 Bookworm이었습니다. 결과적으로 빌더에서 `debian-openssl-1.1.x`용으로 생성된 Prisma 엔진 바이너리를 `debian-openssl-3.0.x` 환경에 복사한 셈이 된 것입니다.

이전 방식(`prisma generate`를 런타임에서 직접 실행)이었다면 런타임 환경의 OpenSSL 버전에 맞는 바이너리가 자동으로 생성되었을 것입니다. 복사 방식으로 바꾸면서 빌드 환경과 런타임 환경의 OpenSSL 버전 일치가 암묵적 전제가 되었고, 그 전제가 깨진 것입니다.

## 해결

`schema.prisma`에 `binaryTargets`를 명시적으로 추가했습니다.

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

`native`는 빌드 머신의 OpenSSL 버전에 맞는 바이너리를 생성하고, `debian-openssl-3.0.x`는 Bookworm 런타임용 바이너리를 별도로 생성합니다. 두 바이너리가 모두 `.prisma` 디렉토리에 포함되므로, 어떤 환경에서든 올바른 바이너리를 찾을 수 있습니다.

로컬에서 빌드 검증 후 GitHub Actions로 배포했습니다. 빌드부터 배포 완료까지 7분 29초 걸렸고, 컨테이너가 정상적으로 기동되는 것을 확인했습니다.

다운타임은 7/7 18:00경부터 7/8 01:43까지, 약 **7.5시간**이었습니다.

## 교훈

### 멀티스테이지 빌드에서 바이너리 복사는 환경 일치를 전제한다

Docker 멀티스테이지 빌드에서 바이너리를 빌더에서 런타임으로 복사하는 패턴은 흔합니다. 하지만 네이티브 바이너리(Prisma 엔진 같은)를 복사할 때는 **두 스테이지의 OS/라이브러리 버전이 일치하는지** 반드시 확인해야 합니다.

특히 `node:20-slim`처럼 태그가 고정되지 않은 이미지는, 같은 태그라도 pull 시점에 따라 내용물이 다를 수 있습니다. Bullseye에서 Bookworm으로의 전환처럼 메이저 변경이 태그 변경 없이 일어나기도 합니다.

### 태그를 고정하거나, 바이너리 타겟을 명시하거나

두 가지 방어 방법이 있습니다:

```dockerfile
# 방법 1: 베이스 이미지 태그 고정
FROM node:20-slim@sha256:abc123... AS builder
FROM node:20-slim@sha256:abc123... AS runtime

# 방법 2: schema.prisma에서 binaryTargets 명시 (이번에 적용한 방식)
# → 여러 환경의 바이너리를 동시에 생성
```

이번에는 방법 2를 선택했습니다. 이미지 digest를 고정하면 보안 패치를 받지 못하는 단점이 있고, `binaryTargets` 명시는 이미지가 바뀌더라도 안전합니다. 이미지 크기가 약간 늘어나는 트레이드오프가 있지만, 프로덕션 안정성이 우선입니다.

### 실패를 로컬에서 재현할 수 있는 구조를 만들자

이번 장애는 CI/CD 파이프라인에서 빌드한 이미지를 EC2에 배포하는 과정에서만 발생했습니다. 로컬 개발 환경에서는 `prisma generate`를 직접 실행하기 때문에 문제가 드러나지 않았습니다.

`docker build` + `docker run`을 로컬에서 실행하는 것만으로도 이 문제를 사전에 발견할 수 있었습니다. Dockerfile을 변경했을 때 로컬에서 프로덕션과 동일한 방식으로 이미지를 빌드하고 실행해 보는 습관이 필요합니다.
