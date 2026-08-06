---
title: "Bearer Token을 활용한 로그인 인증 및 접근 권한 관리 방법"
description: "Bearer 토큰 기반 인증 흐름, 토큰 갱신 로직, 저장 위치별 보안 고려사항과 접근 권한 관리 전략을 정리합니다."
date: "2025-03-23"
tags: []
published: true
---

웹 애플리케이션에서 로그인은 단순히 사용자를 식별하는 절차가 아니라, **접근 권한을 제어하고 보안을 유지하는 핵심 요소**다. 그중 가장 많이 사용되는 방식이 **Bearer Token**을 활용한 인증 시스템이다. 이번 글에서는 Bearer Token이 무엇인지, 어떻게 동작하는지, 그리고 실무에서 고려해야 할 보안 및 설계 요소를 정리해보았다.

---

## **Bearer Token이란?**

**베어러 인증(Bearer Authentication)**, 혹은 **토큰 인증(Token Authentication)**은 [HTTP 인증 방식 중 하나](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication)다. 여기서 **Bearer**라는 단어는 “이 토큰을 소지한 자에게 접근 권한을 부여한다”라는 의미를 담고 있다.

서버는 사용자가 로그인 요청을 보냈을 때 암호화된 문자열 형태의 **토큰**을 발급한다. 이후 클라이언트는 보호된 리소스에 접근할 때마다 이 토큰을 HTTP 요청 헤더에 담아 전송한다.

```javascript
Authorization: Bearer <token>
```

즉, **토큰을 가진 사람은 그 자체로 권한을 증명할 수 있다.** 
서버는 클라이언트가 요청을 보낼 때 HTTP 헤더에 토큰을 포함하도록 요구하고, 이 토큰을 검증해 사용자의 권한을 확인한다.

```javascript
GET /user/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer <access_token>
```

---

## Bearer Token** 기반 인증 흐름**

1. **로그인 요청**
  사용자가 아이디/비밀번호로 로그인하면 서버는 이를 검증한다.

1. **토큰 발급**
  검증에 성공하면 서버는 Access Token과 Refresh Token을 발급한다.

1. **요청 시 토큰 첨부**
  클라이언트는 API 요청 시 헤더에 Access Token을 담아 보낸다.

1. **서버 검증**
  서버는 Access Token의 유효성을 확인한 뒤, 요청을 처리한다.

1. **토큰 갱신**
  Access Token이 만료되면, Refresh Token을 사용해 새로운 Access Token을 발급받는다.

---

## **토큰 갱신 로직 설계**

토큰 기반 인증에서 가장 중요한 문제는 **토큰의 만료 처리**다.

- Access Token은 **짧은 유효기간**을 가져야 한다. (예: 15분 ~ 1시간)
- Refresh Token은 **긴 유효기간**을 가지며, 이를 통해 Access Token을 재발급한다.
이때 고려해야 할 점은 다음과 같다.

- **보안**: Refresh Token은 절대 클라이언트 JS 코드에서 접근할 수 없도록 httpOnly 쿠키에 저장해야 한다.
- **사용자 경험**: 갱신 실패 시 사용자를 로그인 페이지로 돌려보내되, 최대한 끊김 없는 UX를 제공해야 한다.
- **성능 최적화**: 갱신 요청은 불필요하게 반복되지 않도록 클라이언트에서 한 번만 처리하도록 한다.
---

## **토큰 저장 위치: 쿠키 vs 로컬 스토리지**

- **로컬 스토리지**
  - 장점: 구현이 간단하고 접근이 쉽다.
  - 단점: XSS 공격에 취약하다.
- **쿠키(httpOnly)**
  - 장점: 브라우저에서 직접 접근할 수 없어 보안성이 높다.
  - 단점: CSRF 공격에 대비하기 위해 SameSite 옵션 등을 반드시 설정해야 한다.
실무에서는 보안이 중요한 만큼 **httpOnly 쿠키 저장 방식**이 점점 더 선호되고 있다.

---

## **접근 권한 관리 전략**

베어러 토큰 기반 시스템에서 권한 관리는 크게 두 단계로 나눌 수 있다.

1. **인증(Authentication)**: 사용자가 누구인지 확인
1. **인가(Authorization)**: 사용자가 어떤 리소스에 접근할 수 있는지 제어
예를 들어, 관리자(Admin)와 일반 사용자(User)에게 다른 권한을 부여할 수 있다. 토큰 안에 Role 정보를 담거나, 서버에서 토큰 검증 후 DB를 조회해 권한을 확인하는 방식이 일반적이다.

---

## **보안 고려사항**

- **토큰 탈취 방지**: HTTPS를 필수로 사용하고, 토큰은 절대 URL에 노출하지 않는다.
- **토큰 무효화 처리**: 로그아웃 시 서버에서 Refresh Token을 블랙리스트에 등록하거나, Redis 같은 저장소에 관리한다.
- **짧은 만료 주기**: Access Token을 짧게 가져가고 Refresh Token으로 갱신하는 방식이 가장 안전하다.
---

# 참고

- [Bearer Authentication | Swagger](https://swagger.io/docs/specification/v3_0/authentication/bearer-authentication/)
- [HTTP authentication Scheme | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication)
- [Bearer 인증 | 토스페이먼츠 개발자센터](https://docs.tosspayments.com/resources/glossary/bearer-auth)
