---
title: "Python Fernet 암호문을 Node.js에서 주고받기"
description: "보험 조회 서비스(Python)가 복호화하는 비밀번호를 NestJS에서 같은 Fernet 포맷으로 암호화해야 했다. npm 패키지 대신 스펙을 읽고 직접 구현한 기록."
date: "2026-06-05"
tags: ["Node.js", "암호화", "Fernet", "보안"]
published: true
---

## 왜 직접 구현했나

보험 조회 기능을 만들면서 사용자의 보험 조회용 비밀번호를 DB에 저장해야 했다. NestJS 백엔드는 암호화한 문자열만 저장하고, 복호화는 Python으로 만든 보험 조회 서비스(FastAPI)가 한다. 이 Python 쪽 암호화 코드는 기존 ALIV 서비스의 `cryptography.Fernet` 구현에서 가져온 것이라, NestJS가 같은 형식으로 암호화해야 했다.

Node.js에는 Fernet 공식 구현이 없다. npm에 몇 개 있지만 유지보수가 끊겼거나 스펙을 다 구현하지 않았다. 그래서 Fernet 스펙대로 직접 만들었다.

## Fernet 구조

```
Fernet 키 (32바이트)
├── 앞 16바이트 → HMAC-SHA256 서명 키
└── 뒤 16바이트 → AES-128-CBC 암호화 키

토큰: Version(1B) | Timestamp(8B) | IV(16B) | Ciphertext | HMAC(32B)
```

단순 AES가 아니라 버전, 시각, HMAC 검증까지 들어간 포맷이다.

## 구현 (hyphen-crypto.util.ts)

키는 환경변수 `HYPHEN_ENCRYPTION_KEY`를 SHA-256으로 해시해서 만든다. Python 쪽도 같은 방식(`sha256` → `urlsafe_b64encode`)으로 Fernet 키를 만든다.

```typescript
function deriveFernetKey(rawKey: string) {
  const keyBytes = crypto.createHash('sha256').update(rawKey, 'utf8').digest();
  return {
    signingKey: keyBytes.subarray(0, 16),
    encryptionKey: keyBytes.subarray(16, 32),
  };
}
```

암호화는 버전 `0x80`, 현재 시각, 랜덤 IV, AES-128-CBC 암호문을 이어 붙이고 그 전체에 HMAC을 붙인다.

```typescript
const payload = Buffer.concat([version, timestamp, iv, ciphertext]);
const hmac = crypto.createHmac('sha256', signingKey).update(payload).digest();
return Buffer.concat([payload, hmac]).toString('base64url') + '==';
```

복호화는 형식과 서명부터 확인하고, 통과한 뒤에만 복호화한다.

```typescript
if (tokenBytes.length < 57 || tokenBytes[0] !== 0x80) {
  throw new Error('Invalid Fernet token');
}
const expectedHmac = crypto.createHmac('sha256', signingKey).update(payload).digest();
if (!crypto.timingSafeEqual(tokenHmac, expectedHmac)) {
  throw new Error('Invalid Fernet token: HMAC mismatch');
}
```

HMAC 비교에 `===` 대신 `timingSafeEqual`을 쓴 이유는 단순 비교가 첫 번째로 다른 바이트에서 바로 끝나서 응답 시간 차이로 서명을 추측당할 수 있기 때문이다.

## 쓰이는 곳

`insurance.service.ts`에서 사용자가 입력한 Hyphen 비밀번호를 `encryptHyphenPw`로 암호화해 `hyphenUserPwEnc` 컬럼에 저장하고, 조회할 때 `decryptHyphenPw`로 푼다. 조회 결과는 Redis에 30일 캐싱하고, 갱신은 24시간에 5회로 제한한다.

## 확인할 것

- 이 모듈이 Python Fernet과 실제로 호환되는지 확인하는 방법은 Python에서 만든 토큰을 Node에서 풀고, 그 반대도 해 보는 것이다. 레포의 테스트는 암호화 함수를 mock으로 대체하고 있어서 이 교차 테스트는 없다.
- `base64url` 뒤에 `==`를 고정으로 붙인다. 토큰 길이에 따라 필요한 패딩 개수가 달라질 수 있어서, 길이별로 Python이 문제없이 받는지 확인이 필요하다.