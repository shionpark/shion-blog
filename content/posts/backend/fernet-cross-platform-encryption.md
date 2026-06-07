---
title: "Python Fernet 암호화를 Node.js에서 구현하기"
description: "외부 보험 API가 Python Fernet으로 암호화된 데이터를 주고받는 환경에서, NestJS 백엔드와 호환되는 암호화 모듈을 직접 구현한 과정을 정리합니다."
date: "2026-06-05"
tags: ["Node.js", "암호화", "Fernet", "보안"]
published: true
---

## 배경

인톡 파트너스에서 외부 보험 조회 API(Hyphen)와 연동하는 작업을 했습니다. Hyphen의 보험 조회 서비스는 Python 기반이고, 사용자 비밀번호 같은 민감 정보를 **Fernet 암호화**로 주고받고 있었습니다.

문제는 우리 백엔드가 NestJS(Node.js)라는 것이었습니다. `cryptography.Fernet`은 Python 라이브러리이고, Node.js에는 공식 구현체가 없습니다. npm에 몇 개 패키지가 있지만 유지보수가 되지 않거나 스펙이 불완전했습니다.

직접 구현하기로 했습니다.

## Fernet이 하는 일

Fernet은 대칭키 암호화 스킴으로, 내부적으로 이런 구조입니다:

```
Fernet 키 (32바이트)
├── Signing Key (앞 16바이트) → HMAC-SHA256 서명에 사용
└── Encryption Key (뒤 16바이트) → AES-128-CBC 암호화에 사용
```

암호화된 토큰의 구조:

```
Version (1B) | Timestamp (8B) | IV (16B) | Ciphertext (가변) | HMAC (32B)
```

단순한 AES 암호화가 아니라 버전, 타임스탬프, HMAC 검증까지 포함된 패키지 포맷입니다.

## Node.js 구현

### 키 유도

Python의 Fernet은 Base64로 인코딩된 32바이트 키를 받지만, Hyphen API는 평문 비밀키에서 SHA-256 해시를 거쳐 키를 유도합니다.

```typescript
import { createHash, createCipheriv, createHmac, randomBytes } from 'crypto';

function deriveKey(secret: string): { signingKey: Buffer; encryptionKey: Buffer } {
  const hash = createHash('sha256').update(secret).digest();
  return {
    signingKey: hash.subarray(0, 16),
    encryptionKey: hash.subarray(16, 32),
  };
}
```

### 암호화

```typescript
function encrypt(plaintext: string, secret: string): string {
  const { signingKey, encryptionKey } = deriveKey(secret);

  const version = Buffer.from([0x80]);
  const timestamp = Buffer.alloc(8);
  timestamp.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)));

  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-128-cbc', encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ]);

  const payload = Buffer.concat([version, timestamp, iv, ciphertext]);

  const hmac = createHmac('sha256', signingKey).update(payload).digest();

  return Buffer.concat([payload, hmac]).toString('base64url');
}
```

### 복호화

복호화에서 가장 중요한 것은 **HMAC 검증을 먼저 하는 것**입니다. 서명이 유효하지 않으면 복호화를 시도하지 않습니다.

```typescript
import { timingSafeEqual } from 'crypto';

function decrypt(token: string, secret: string): string {
  const { signingKey, encryptionKey } = deriveKey(secret);
  const data = Buffer.from(token, 'base64url');

  // 최소 길이 검증 (version 1 + timestamp 8 + iv 16 + hmac 32 = 57)
  if (data.length < 57) {
    throw new Error('유효하지 않은 토큰입니다');
  }

  const payload = data.subarray(0, data.length - 32);
  const hmac = data.subarray(data.length - 32);

  // HMAC 검증 (타이밍 안전 비교)
  const expectedHmac = createHmac('sha256', signingKey).update(payload).digest();
  if (!timingSafeEqual(hmac, expectedHmac)) {
    throw new Error('토큰 검증에 실패했습니다');
  }

  const iv = payload.subarray(9, 25);
  const ciphertext = payload.subarray(25);

  const decipher = createDecipheriv('aes-128-cbc', encryptionKey, iv);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf-8');
}
```

## 보안 고려사항

### timingSafeEqual

`hmac === expectedHmac` 같은 단순 비교는 타이밍 공격에 취약합니다. 문자열 비교는 첫 번째 다른 바이트에서 즉시 반환하기 때문에, 공격자가 응답 시간 차이를 측정해서 올바른 HMAC을 추론할 수 있습니다.

`crypto.timingSafeEqual`은 입력 길이와 관계없이 일정한 시간에 비교를 완료합니다.

### 토큰 포맷 검증

복호화 전에 버전 바이트(`0x80`)와 최소 길이를 검증합니다. 잘못된 입력이 `createDecipheriv`까지 도달하면 예측하기 어려운 에러가 발생할 수 있습니다.

## 실제 적용

이 암호화 모듈은 Hyphen API 연동에서 다음과 같이 사용됩니다:

- 사용자의 간편인증 비밀번호를 Fernet으로 암호화해서 Redis에 30일 캐싱
- API 호출 시 복호화해서 Hyphen에 전달
- 일일 5회 조회 제한과 결합해 비용 효율 확보

## 교훈

이종 언어 간 암호화 호환을 구현할 때 중요한 점:

1. **스펙 문서를 먼저 읽자** — Fernet은 [스펙 문서](https://github.com/fernet/spec/blob/master/Spec.md)가 명확합니다. npm 패키지를 쓰기 전에 스펙을 읽으면 직접 구현이 그리 어렵지 않습니다.
2. **테스트 벡터로 검증** — Python에서 암호화한 토큰을 Node.js에서 복호화하는 테스트를 반드시 작성합니다.
3. **보안은 타협하지 않기** — `timingSafeEqual`, 포맷 검증, HMAC-then-decrypt 순서 등은 "있으면 좋은" 것이 아니라 필수입니다.
