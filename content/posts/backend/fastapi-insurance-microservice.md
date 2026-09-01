---
title: "FastAPI로 보험 조회 마이크로서비스 설계하기 — 인증 분기부터 자동 배포까지"
description: "NestJS 메인 서버와 별도로 FastAPI 마이크로서비스를 설계한 이유, SMS·이메일·PASS 앱 3가지 인증 분기 처리, pytest 32개 테스트 케이스, Docker + GitHub Actions 자동 배포까지의 과정을 정리한다."
date: "2026-08-24"
tags: ["FastAPI", "마이크로서비스", "인톡 파트너스", "Python"]
published: true
---

## 배경

인톡 파트너스는 보험설계사 육성을 위한 B2B SaaS 플랫폼이다. 설계사가 GA(법인보험대리점)로 전환하려면 현재 보유 계약 현황을 파악하는 게 필수적인데, 플랫폼에 이 기능이 없었다. 설계사들은 각 보험사 앱에 일일이 로그인해서 계약 정보를 확인하고 있었다.

외부 보험 조회 API인 하이픈(Hyphen)을 활용하면 본인 인증 한 번으로 전 보험사의 계약 현황을 한꺼번에 조회할 수 있었다. 문제는 하이픈 API가 Python SDK 기반이라는 점이었다. 우리 메인 백엔드는 NestJS인데, Python SDK를 Node.js에서 직접 쓸 수는 없었다.

마이크로서비스를 분리하기로 했다.

## 왜 FastAPI로 분리했는가

NestJS 안에서 Python 프로세스를 child_process로 호출하는 방법도 검토했다. 하지만 세 가지 이유로 독립 서비스가 낫다고 판단했다.

**첫째, Python SDK 호환.** 하이픈 API의 공식 SDK가 Python으로 제공된다. SDK가 인증 토큰 관리, 요청 서명, 응답 파싱을 모두 처리해주는데, 이걸 Node.js로 재구현하는 건 시간 낭비다.

**둘째, 독립 배포.** 보험 조회 로직은 메인 서비스의 배포 주기와 무관하게 변경될 수 있다. 하이픈 API 스펙이 바뀌면 조회 서비스만 빠르게 수정·배포할 수 있어야 한다.

**셋째, 장애 격리.** 외부 API 호출은 태생적으로 불안정하다. 하이픈 서버가 느려지거나 타임아웃이 나도 메인 서비스의 응답 시간에 영향을 주지 않아야 한다.

FastAPI를 선택한 건 비동기 지원이 기본이고, Python 생태계와의 호환이 자연스럽기 때문이다. 타입 힌트 기반 자동 문서화(Swagger)도 팀 내 커뮤니케이션에 유용했다.

## 15개 엔드포인트 설계

보험 조회 플로우는 크게 네 단계로 나뉜다.

```
인증 요청 → 인증 확인 → 보험 조회 → 결과 반환
```

여기에 SMS, 이메일, PASS 앱 세 가지 인증 방식이 있으므로, 각 방식별로 엔드포인트를 설계했다.

```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/insurance")

# 인증 요청 (3개)
router.post("/auth/sms/request")
router.post("/auth/email/request")
router.post("/auth/pass/request")

# 인증 확인 (3개)
router.post("/auth/sms/verify")
router.post("/auth/email/verify")
router.post("/auth/pass/verify")

# 보험 조회 (4개)
router.post("/contracts/life")        # 생명보험
router.post("/contracts/non-life")    # 손해보험
router.post("/contracts/all")         # 전체 조회
router.get("/contracts/{request_id}") # 조회 결과

# 유틸리티 (5개)
router.get("/health")
router.get("/auth/methods")
router.post("/auth/status")
router.post("/encrypt")
router.post("/decrypt")
```

## 인증 방식 분기

가장 까다로운 부분이 인증 방식별 API 호출 플로우 차이였다. 세 방식은 겉으로는 비슷해 보이지만, 내부 호출 구조가 상당히 다르다.

```python
from enum import Enum
from dataclasses import dataclass

class AuthMethod(str, Enum):
    SMS = "sms"
    EMAIL = "email"
    PASS_APP = "pass"

@dataclass
class AuthRequest:
    user_name: str
    user_phone: str
    resident_number: str  # Fernet 암호화 상태로 수신
    auth_method: AuthMethod

async def request_authentication(auth_request: AuthRequest) -> dict:
    """인증 방식에 따라 하이픈 API 호출 플로우를 분기한다."""

    decrypted_resident = decrypt_fernet(auth_request.resident_number)

    if auth_request.auth_method == AuthMethod.SMS:
        # SMS: 인증번호 발송 → 사용자 입력 → 검증 (2-step)
        response = await hyphen_client.request_sms_auth(
            name=auth_request.user_name,
            phone=auth_request.user_phone,
            resident_number=decrypted_resident,
        )
        return {"transaction_id": response.tx_id, "requires_input": True}

    elif auth_request.auth_method == AuthMethod.EMAIL:
        # 이메일: 인증 링크 발송 → 사용자 클릭 → 폴링으로 확인 (2-step + polling)
        response = await hyphen_client.request_email_auth(
            name=auth_request.user_name,
            phone=auth_request.user_phone,
            resident_number=decrypted_resident,
        )
        return {"transaction_id": response.tx_id, "requires_polling": True}

    elif auth_request.auth_method == AuthMethod.PASS_APP:
        # PASS: 앱 푸시 → 사용자 승인 → 폴링으로 확인 (1-step + polling)
        response = await hyphen_client.request_pass_auth(
            name=auth_request.user_name,
            phone=auth_request.user_phone,
            resident_number=decrypted_resident,
        )
        return {"transaction_id": response.tx_id, "requires_polling": True}
```

SMS는 인증번호를 사용자가 직접 입력해야 하고, 이메일과 PASS 앱은 외부에서 인증이 완료되므로 서버 측에서 폴링으로 상태를 확인한다. 이 차이가 프론트엔드 UI 설계에도 직접적으로 영향을 줬다.

## Fernet 암호화 적용

주민등록번호처럼 민감한 정보는 Fernet 암호화 상태로 주고받는다. 프론트엔드에서 암호화된 값을 전송하면, FastAPI 서비스에서 복호화해서 하이픈 API에 전달하는 구조다. Fernet 암호화의 구현 세부 사항은 [이전 글](/posts/backend/fernet-cross-platform-encryption)에서 다뤘다.

NestJS 메인 서버에서는 Node.js로 Fernet을 구현했지만, FastAPI 서비스에서는 Python의 `cryptography` 라이브러리를 그대로 쓸 수 있어서 구현이 훨씬 간결했다.

```python
from cryptography.fernet import Fernet

class EncryptionService:
    def __init__(self, secret_key: str):
        self.fernet = Fernet(self._derive_key(secret_key))

    def _derive_key(self, secret: str) -> bytes:
        """NestJS 측과 동일한 키 유도 로직."""
        import hashlib, base64
        hashed = hashlib.sha256(secret.encode()).digest()
        return base64.urlsafe_b64encode(hashed)

    def encrypt(self, plaintext: str) -> str:
        return self.fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, token: str) -> str:
        return self.fernet.decrypt(token.encode()).decode()
```

## 5xx 에러 재시도 로직

하이픈 API는 간헐적으로 504 Gateway Timeout을 반환했다. 특히 전체 보험 조회(`/contracts/all`)처럼 여러 보험사 데이터를 한 번에 가져오는 요청에서 빈번했다. 단순 재시도로는 부족했고, exponential backoff를 적용한 재시도 데코레이터를 만들었다.

```python
import asyncio, functools, logging
from typing import TypeVar, Callable, Awaitable

T = TypeVar("T")

def retry_on_server_error(
    max_retries: int = 3,
    base_delay: float = 1.0,
    retryable_status_codes: tuple[int, ...] = (500, 502, 503, 504),
):
    """5xx 에러 시 exponential backoff로 재시도하는 데코레이터."""
    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception: Exception | None = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except HyphenApiError as error:
                    if error.status_code not in retryable_status_codes:
                        raise
                    last_exception = error
                    if attempt < max_retries:
                        delay = min(base_delay * (2 ** attempt), 10.0)
                        logging.warning(
                            "하이픈 API %d 에러, %d/%d 재시도 (%.1f초 후)",
                            error.status_code, attempt + 1, max_retries, delay,
                        )
                        await asyncio.sleep(delay)
            raise last_exception  # type: ignore[misc]
        return wrapper
    return decorator
```

이 데코레이터를 하이픈 API 호출 함수에 적용하면, 504가 나와도 1초 → 2초 → 4초 간격으로 최대 3번까지 재시도한다. 실제 운영에서 재시도 1회로 성공하는 비율이 약 85%였고, 재시도 2회까지 포함하면 97% 이상 성공했다.

## pytest 32개 테스트 케이스

외부 API 연동 서비스는 테스트가 까다롭다. 실제 API를 호출할 수는 없으니 모킹이 필수적이다. pytest fixture로 하이픈 클라이언트를 모킹하고, 인증 방식별 성공/실패 시나리오를 모두 커버했다.

```python
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient

@pytest.fixture
def mock_hyphen_client():
    """하이픈 API 클라이언트 모킹."""
    with patch("app.services.hyphen.HyphenClient") as mock:
        client = AsyncMock()
        mock.return_value = client
        yield client

@pytest.fixture
async def test_client():
    """FastAPI 테스트 클라이언트."""
    from app.main import app
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

class TestSmsAuth:
    async def test_sms_auth_request_success(
        self, test_client: AsyncClient, mock_hyphen_client: AsyncMock
    ):
        mock_hyphen_client.request_sms_auth.return_value = MockResponse(
            tx_id="tx_123", status="sent"
        )
        response = await test_client.post("/api/v1/insurance/auth/sms/request", json={
            "user_name": "홍길동",
            "user_phone": "01012345678",
            "resident_number": "encrypted_value_here",
            "auth_method": "sms",
        })
        assert response.status_code == 200
        assert response.json()["transaction_id"] == "tx_123"
```

32개 테스트는 다음과 같이 분류된다:

- 인증 요청 성공/실패: 6개 (SMS 2 + 이메일 2 + PASS 2)
- 인증 확인 성공/실패/타임아웃: 9개 (방식별 3개)
- 보험 조회 성공/부분실패/전체실패: 6개
- 에러 핸들링 (재시도, 네트워크 에러): 5개
- 암호화/복호화: 4개
- 헬스체크: 2개

## Docker + GitHub Actions CI/CD

EC2에 자동 배포하는 파이프라인을 구축했다. Docker 이미지를 빌드하고, ECR에 푸시하고, EC2에서 pull & restart하는 단순한 구조다.

```yaml
# .github/workflows/deploy-insurance-api.yml
name: Deploy Insurance API
on:
  push:
    branches: [main]
    paths: ["services/insurance-api/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r services/insurance-api/requirements.txt
      - run: pytest services/insurance-api/tests/ -v --tb=short

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: EC2 배포
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /opt/insurance-api
            docker compose pull && docker compose up -d --remove-orphans
```

`paths` 필터로 보험 조회 서비스 코드가 변경될 때만 배포가 트리거된다. 메인 NestJS 서버 배포와 완전히 독립적이다.

## 프론트엔드 연동

프론트엔드에서는 인증 방식 선택 모달을 구현했다. SMS는 인증번호 직접 입력(3분 타이머), 이메일과 PASS 앱은 외부 인증 후 폴링으로 완료를 감지하는 구조다. 기본값은 SMS로 두되, PASS 앱이 더 빠르다는 안내를 노출했다. 실측 기준 PASS 앱 평균 12초, SMS 평균 28초였다.

## 교훈

4인 스타트업에서 마이크로서비스 분리가 과하지 않을까 고민했지만, 이 케이스에서는 분리가 맞았다. 이유를 정리하면 세 가지다.

1. **언어 경계가 명확할 때 분리는 자연스럽다.** Python SDK를 써야 하는 상황에서 Node.js에 억지로 끼워넣는 것보다, 별도 서비스로 분리하고 HTTP로 통신하는 게 훨씬 깔끔했다. 하이픈 SDK 업데이트도 독립적으로 반영할 수 있다.

2. **외부 API 의존은 격리할수록 좋다.** 하이픈 API의 간헐적 타임아웃이 메인 서비스에 전파되지 않았다. 재시도 로직도 마이크로서비스 내부에서 자체 처리하므로, NestJS 쪽에서는 단순히 응답을 기다리면 된다.

3. **테스트 독립성이 올라간다.** pytest 32개 테스트가 NestJS의 Jest 테스트와 완전히 분리되어 있다. CI에서 병렬 실행이 가능하고, 한쪽이 실패해도 다른 쪽 배포에 영향을 주지 않는다.

처음에는 "서비스 하나 더 관리하는 부담"이 걱정됐지만, Docker + GitHub Actions로 배포를 자동화하니 운영 부담은 거의 없었다. 오히려 메인 서버의 복잡도를 줄여서 전체적인 유지보수성이 좋아졌다.
