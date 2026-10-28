---
title: "인톡 파트너스"
description: "보험설계사 육성 SaaS 플랫폼. 전임 개발자가 떠난 뒤 화면과 API를 맡아 광고 전환 이벤트, 비회원 신청·Meta 리드 수집, 보험 조회 서비스를 구현했습니다."
role: "프로덕트 엔지니어"
period: "2026.03 ~ 2026.09"
stack: ["Next.js", "React", "NestJS", "FastAPI", "PostgreSQL", "Redis"]
url: "https://www.intalkpartners.com"
published: true
order: 4
---

보험설계사와 GA(보험대리점)를 연결하는 스타트업의 설계사용 플랫폼입니다. 입사 3주차에 전임 개발자가 떠난 뒤 화면과 API를 맡았고, 근무 기간 커밋 중 프론트엔드 86%, 백엔드 84%를 작성했습니다. 전임자가 만든 1st-party 이벤트 수집, A/B 테스트 프레임워크, UTM 3단계 매칭, Slack 브리핑은 제 작업이 아닙니다.

## 맡은 일

- **광고 전환 이벤트 정리** — 페르소나별 랜딩 22개에 GTM과 Meta Pixel을 설치하고 CTA 클릭과 상담 신청 완료를 전환 이벤트로 보냈습니다. PageView가 GTM 태그와 HTML 코드에서 두 번 잡히는 문제와, 인증되지 않은 도메인에서 `trackCustom`이 막히는 문제를 찾아 표준 이벤트(ViewContent, Contact, Lead)로 바꿨습니다.
- **비회원 신청과 Meta 리드 수집** — 비회원 신청을 DB에 저장하고, 나중에 같은 전화번호로 가입하면 기존 신청이 계정에 연결되게 했습니다. 손으로 옮기던 Meta 리드는 10분마다 DB와 케어 API로 들어가게 바꿨고, `leadgen_id`와 전화번호 해시로 중복을 걸렀습니다. 배포 후 같은 리드가 반복해서 들어오던 문제는 긴 숫자 컬럼을 문자열로 고정해 고쳤습니다.
- **매칭 진행 상태 재설계** — 권한과 화면 분기에 쓰이는 필드는 그대로 두고, 진행 표시용 필드와 변경 이력 테이블을 따로 추가해 9개 상태로 나눴습니다. 케어 쪽 상태는 5분마다 읽어 동기화했습니다.
- **보험 조회 서비스** — Hyphen API 연동. 계약·보장 조회는 NestJS가 직접 부르고, 캡차 인식과 암호화가 필요한 인증·계정 찾기 단계는 FastAPI 서비스로 분리했습니다. 조회 결과는 Redis에 30일 캐시하고 갱신은 24시간에 5회로 제한했습니다.
- **CI** — 5개 레포에 CI를 붙였습니다. 타입 체크·빌드·테스트만 머지를 막고, 린트는 바뀐 파일만 검사해 경고로 띄웠습니다.

## 관련 글

- [GA4 · Mixpanel · 자체 DB — 3중 트래킹 불일치를 해소한 과정](/posts/triple-tracking-data-consistency)
- [Next.js에 Mixpanel 프록시를 붙이고 이벤트 이름 규칙을 정했다](/posts/mixpanel-nextjs-proxy)
- [Redis TTL로 중복을 막았더니 알림톡이 매일 다시 나갔다](/posts/notification-infinite-loop-bug)
- [Fire-and-Forget 호출이 만든 502](/posts/fire-and-forget-race-condition)
- [내가 바꾼 Dockerfile이 프로덕션을 밤새 내렸다](/posts/prisma-openssl-production-down)
- [Python Fernet 암호문을 Node.js에서 주고받기](/posts/fernet-cross-platform-encryption)
- [캡차를 AI로 풀어 하이픈 가입을 중계하는 FastAPI 서비스](/posts/fastapi-insurance-microservice)
