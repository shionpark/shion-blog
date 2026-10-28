---
title: "캡차를 AI로 풀어 하이픈 가입을 중계하는 FastAPI 서비스"
description: "NestJS 옆에 붙인 FastAPI 보험 조회 서비스가 하이픈 가입·인증·계정 찾기의 다단계 흐름을 어떻게 중계하는지, 5xx 재시도와 자동 배포까지 정리한다."
date: "2026-08-24"
tags: ["FastAPI", "마이크로서비스", "인톡 파트너스", "Python"]
published: true
---

## 이 서비스가 하는 일

인톡 파트너스는 설계사가 GA 전환 전에 현재 보유 계약을 확인하도록 보험 조회를 붙였다. 조회는 외부 API인 하이픈(Hyphen)을 쓴다. 문제는 조회 전에 하이픈 계정이 필요하다는 점이었다. 가입은 여러 단계다. 아이디 확인, 캡차, SMS나 PASS 앱 인증, 이메일 인증을 차례로 거친다.

이 다단계 흐름을 NestJS 백엔드 옆에 둔 FastAPI 서비스(`insurance_service`)가 맡는다. 4월 9일 기존 ALIV 서비스에서 가져온 코드로 첫 커밋을 올렸다. 가입·인증 흐름, 재시도, 배포 설정은 내가 이어서 작업했다. 7월에 같은 서비스에 보장분석 엔진이 들어왔지만 그건 다른 팀원 작업이다.

## 가입 흐름

NestJS가 `POST /insurance/verify/init`을 부르면 FastAPI가 이렇게 처리한다.

```
입력 검증 (ID 6-12자, PW 9-20자)
  → 아이디 중복 확인 (하이픈)
  → [최대 3회] 캡차 이미지 받기 → 인식 → 제출
  → 비밀번호 Fernet 암호화
  → 응답: 다음 단계 데이터 + 암호화된 비밀번호
```

캡차는 `captcha_solver.py`에서 Claude Haiku 4.5의 Vision으로 읽는다. 이 부분은 ALIV 코드를 가져온 것이다. 틀리면 최대 3번까지 새 캡차로 다시 한다. 이어서 `/verify/sms`가 PASS 앱 승인 또는 SMS 인증번호를 받고, `/verify/email`이 이메일 코드를 받아 가입을 끝낸다. 하이픈이 "이미 가입" 에러를 주면 아이디 찾기 흐름으로 자동 전환한다.

아이디 찾기와 비밀번호 찾기·변경(`/verify/recovery/*`)도 같은 방식이다. 7월 2일에 이 흐름의 모든 단계에 PASS와 SMS 중 인증 방식을 고르는 `auth_type` 파라미터를 넣고, 하이픈 원본 응답을 그대로 돌려주도록 고쳤다.

## 암호화

비밀번호는 Fernet으로 암호화해서 NestJS가 DB에 저장하고, 복호화는 이 서비스가 한다. 암호화 구현은 [Fernet 글](/posts/fernet-cross-platform-encryption)에 있다.

## 5xx는 재시도, 4xx는 그대로

하이픈은 원천 사이트 장애로 5xx를 간헐적으로 낸다. 4월 24일 `HyphenClient._post`에 재시도를 넣었다.

```python
for attempt in range(self.max_retries + 1):
    try:
        resp = await self.client.post(endpoint, headers=self._headers(), json=body)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code not in RETRYABLE_STATUS_CODES:
            raise          # 4xx는 비즈니스 에러라 바로 올린다
        last_error = e
    except httpx.RequestError as e:
        last_error = e

    if attempt < self.max_retries:
        await asyncio.sleep(self.backoff_base * (3 ** attempt))
```

기본은 2번 재시도, 간격은 `HYPHEN_RETRY_BACKOFF_BASE`(1초)에 3의 거듭제곱을 곱한다. 네트워크 오류와 타임아웃도 같이 재시도한다. 4xx는 입력이 틀렸다는 뜻이라 재시도하지 않고 호출자에게 넘긴다.

재시도를 넣을 때 502 메시지도 사용자에게 보이는 문구로 바꿨다. 9월에는 하이픈의 인증·권한 오류를 502로 잘못 분류하던 것을 고쳤다(INS-BUG-002).

## 테스트와 배포

테스트는 pytest다. 하이픈 클라이언트(14개), 라우트(10개), 암호화(8개)를 검증한다. 하이픈 호출은 모킹해서 실제 API를 부르지 않는다.

배포는 `main`에 푸시하면 GitHub Actions가 Docker 이미지를 빌드하고, NAT 인스턴스를 점프 호스트로 EC2에 SSH 접속해 컨테이너를 교체한 뒤 헬스체크를 한다. 4월 9일 첫 커밋과 같은 날 넣었다.

## 남은 것

- 서비스에는 라우트가 15개 있는데 NestJS가 실제로 부르는 건 8개뿐이다. 7개는 쓰이지 않는다. 보험 조회(계약 현황)는 NestJS가 하이픈을 직접 부르는 쪽으로 구현돼서, 이 서비스의 조회 엔드포인트는 남아만 있다.
- 캡차 인식은 3번 시도해서 모두 실패하면 가입 흐름이 거기서 끝난다.
