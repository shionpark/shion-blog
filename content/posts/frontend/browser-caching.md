---
title: "브라우저 캐싱"
description: "HTTP 캐싱 메커니즘과 ETag를 사용해 캐싱 유효성 검증을 효율적으로 사용하는 방법"
date: "2025-05-09"
tags: []
published: true
---

# 캐싱이란

캐싱은 **주어진 리소스의 복사본을 저장하고 있다가 요청 시에 그것을 제공**하는 기술이다.

**웹 캐시**가 자신의 저장소 내에 요청된 리소스를 가지고 있다면, 
요청을 가로채 원래의 서버로부터 리소스를 다시 다운로드하는 대신 리소스의 복사본을 반환한다.
이로써, 서버의 부하를 완화하고, 클라이언트에 더 가까이 있으므로 성능이 향상된다.

![](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/f39dcf59-d5b6-426b-abf4-429bdc711e7d/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466YT2TAP3S%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152837Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJHMEUCIQCYWZmg47uZcIwvDkWyacVlyMgh59%2FaDBFB%2BfvCpiMAtwIgNMDRuWiQhownk1QP00id7jWOreCRCsa9xzIIpwXcBUcq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDPFQl%2BZS7Poq%2FqWGICrcAz7R1hyZpBOyLlh0DDAtS6t5lecZus0Qy7RbjlHbHf4kgy5t04U7x9Sg3cbAsV48e%2BVmYX9KajK52Q10rPMsVyZexfqHmr%2B2gziAt7xCDjVLbAwO1DItulwYH3u7NdxP%2BiP%2FqUEAOCnSm0TDd6FBVNwX9TQUBa6Xe2mnNqN%2BQZfB2WOd5jF4%2Bx7JcZmayK5qHxkakKRfDYioI4YBwVYfYQCJIp%2F8m5DUygd5CPsP2wYrQFB0uuRSxyW5O6I6cERSMW2HAvrcyLydCPAZt%2Ft1%2BpdEwTkucsczlQVCHmH6fTij%2BJK2%2F9cXn8frQtcjYZbjaWVHqCBRKwfzH5tGFzSt4VxHqjGKDjMqxb%2B2r7qDYjUH51YF4jZjrExhyhq97u6m5cW85sHVvaD49K%2BR8SGRO1gKYtlP2YHJEOd4yvj1X38RAVbxY95v%2Fzswxk3bTYtNQIiXNBXcfEW8IFV3Zb6Rg%2FZbnfTVCd1G7tuUe5v0P1GJ7QwZMODUn9TGPQsPAiZrIr8SjhVwQ4hNkLgsnVhB4rH5XqlDb5XqQ0oKBzCjJwpWp%2FqoNo8tqi%2FOQeRega8VV94V5KxkpX%2BXDvzVJ%2F44AbNyzeRCJ4sUp%2FR2%2B26qJH4FU1SbobtB%2FWPaktC0MI6MzdMGOqUBt7WCiTY96%2F90p6BXLtZlOtv2chvEOh09cgr7h4ltnPvMsOiRv%2BoJkH1KYTn4EBowIW0%2Bn8E54XWnpAHAZwpzg9xpGP49lDqzUSRTuHYD0SCIXfnmQnWc2TXTproFQvpZqVvZGGcf%2BVL2LR60iLl63hQC1NCs3ElOAWbeAiRALMbBlIIl1UK68%2BwGp67mNFhpETWHU9nFwrZF63OaV6BEocrod%2FCo&X-Amz-Signature=e6edb64ccb0136ef583fae33dc2e95a7bbabeeade660f6d43ed7f40f516f9508&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)



웹 사이트에서 캐싱은 높은 성능을 달성하는 데에 주요한 요소이다.
반면에 모든 리소스가 영원히 변하지 않는 것은 아니므로 리소스가 변하기 전까지만 캐싱하고 변한 이후에는 더이상 캐싱하지 않는 것이 중요하다.

## **1. 리소스 캐싱**

브라우저는 서버에서 받은 HTML, CSS, JS, 이미지 같은 정적 리소스를 **캐시 저장소(메모리/디스크)**에 저장했다가, 같은 요청이 들어오면 재사용한다.

👉 Cache-Control, ETag, Expires 같은 HTTP 헤더로 동작을 제어한다.

---

## **2. DNS 캐싱**

브라우저는 도메인 이름을 IP 주소로 바꾸기 위해 DNS 조회를 하는데, 이 결과를 일정 시간 캐싱한다.

- **브라우저 DNS 캐시**: 브라우저 내부에 저장
- **OS DNS 캐시**: 운영체제 차원에서 저장
- **ISP DNS 캐시**: 통신사 DNS 서버 차원에서 저장
👉 덕분에 같은 도메인 접속 시 **매번 DNS 서버를 조회하지 않고 바로 연결**할 수 있다.

---

## **3. CDN 캐싱 (Content Delivery Network)**

리소스 캐싱과 DNS 캐싱이 **클라이언트 측 최적화**라면, CDN은 **서버 측 최적화**다.

### **CDN이란?**

- CDN은 전 세계 곳곳에 분산된 서버 네트워크다.
- 사용자가 특정 웹사이트에 접속하면, **가장 가까운 CDN 서버**가 요청을 처리한다.
### **왜 빠를까?**

예를 들어, 구글의 원(origin) 서버가 미국에 있다면 한국 사용자가 요청할 때 물리적 거리 때문에 응답이 느리다.

하지만 서울, 도쿄 등에 설치된 **CDN 엣지 서버**가 원 서버에서 받아온 콘텐츠를 **캐싱**해두면,

한국 사용자는 미국까지 가지 않고 가까운 서울 서버에서 바로 응답을 받는다.

### **특징**

- **지리적 지연 최소화 (Latency 감소)**
- **대규모 트래픽 분산** → 서버 과부하 방지
- **보안 강화** → DDoS 방어, TLS 암호화 지원
---

## **4. 정리**

- **브라우저 리소스 캐싱** → 같은 파일 재사용
- **DNS 캐싱** → 같은 도메인-IP 매핑 재사용
- **CDN 캐싱** → 사용자 가까운 서버에 콘텐츠 저장
👉 캐싱은 결국 **속도를 높이고, 네트워크 비용을 줄이며, 사용자 경험을 개선하는 핵심 기술**이다.
