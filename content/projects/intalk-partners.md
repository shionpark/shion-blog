---
title: "인톡 파트너스"
description: "보험설계사 육성 SaaS 플랫폼. 화면과 API를 맡아 광고 전환 이벤트, 비회원 신청·Meta 리드 수집, 보험 조회 서비스를 구현했습니다."
role: "프론트엔드 개발자"
period: "2026.03 ~ 2026.09"
stack: ["Next.js", "React", "NestJS", "FastAPI", "PostgreSQL", "Redis"]
url: "https://www.intalkpartners.com"
published: true
order: 4
---

보험설계사와 GA(보험대리점)를 연결하는 스타트업의 설계사용 플랫폼입니다. 화면과 API를 맡았고, 근무 기간 커밋 중 프론트엔드 86%, 백엔드 84%를 작성했습니다.

## 맡은 일

- **랜딩과 전환 화면** — 랜딩페이지를 섹션 11개에서 8개로 줄이고 CTA를 적합도 검사·수익계산기로 바꿨습니다(PR #25). 이탈 방지 팝업은 데스크톱에서는 마우스가 창을 벗어날 때, 모바일에서는 30초 동안 움직임이 없을 때 띄우고 세션당 한 번만 보여 줬습니다(#33). 비로그인 사용자에게는 콘텐츠 본문과 수익계산기 결과를 흐리게 보여 주고, 가입하면 카카오 로그인을 거쳐도 원래 화면으로 돌아오게 했습니다(#44, #59).
- **대시보드와 보험 화면** — 대시보드를 커넥트 3단계 스텝퍼 중심으로 다시 만들고 학습·보험 페이지를 나눴으며, 데이터가 없을 때 차트 4종에 빈 상태 화면을 넣었습니다(#48). 보험 인증 페이지에는 아이디·비밀번호 복구 흐름을 붙였고(#51, #53), 보장분석은 소개 페이지와 분석 화면으로 라우트를 나눴습니다(#57).
- **GA 탐색과 관리자 화면** — GA 탐색 페이지를 무한 스크롤·필터·검색·상세 모달로 만들고, 관심 표현 버튼은 낙관적 업데이트로 바로 반영되게 했습니다(#62). 3,513줄짜리 관리자 사용자 페이지는 기능을 그대로 둔 채 12개 파일로 나눈 뒤 탭과 상태 뱃지를 다시 구성했습니다(#66).
- **광고 전환 이벤트 정리** — Mixpanel을 도입해 이벤트 이름 규칙과 광고 차단기를 피하는 프록시를 만들었습니다(#7). 페르소나별 랜딩 22개에 GTM과 Meta Pixel을 설치하고 CTA 클릭과 상담 신청 완료를 전환 이벤트로 보냈습니다. PageView가 GTM 태그와 HTML 코드에서 두 번 잡히는 문제와, 인증되지 않은 도메인에서 `trackCustom`이 막히는 문제를 찾아 표준 이벤트(ViewContent, Contact, Lead)로 바꿨습니다.
- **비회원 신청과 Meta 리드 수집** — 비회원 신청을 DB에 저장하고, 나중에 같은 전화번호로 가입하면 기존 신청이 계정에 연결되게 했습니다. 손으로 옮기던 Meta 리드는 10분마다 DB와 케어 API로 들어가게 바꿨고, `leadgen_id`와 전화번호 해시로 중복을 걸렀습니다. 배포 후 같은 리드가 반복해서 들어오던 문제는 긴 숫자 컬럼을 문자열로 고정해 고쳤습니다.
- **매칭 진행 상태 재설계** — 권한과 화면 분기에 쓰이는 필드는 그대로 두고, 진행 표시용 필드와 변경 이력 테이블을 따로 추가해 9개 상태로 나눴습니다. 케어 쪽 상태는 5분마다 읽어 동기화했습니다.
- **보험 조회 서비스** — Hyphen API 연동. 계약·보장 조회는 NestJS가 직접 부르고, 캡차 인식과 암호화가 필요한 인증·계정 찾기 단계는 FastAPI 서비스로 분리했습니다. 조회 결과는 Redis에 30일 캐시하고 갱신은 24시간에 5회로 제한했습니다.
- **팀 AX** — 셀피쉬클럽의 AAA Starter Kit으로 팀 볼트를 만들고, Notion 데일리스크럼을 읽어 주간 리포트를 만드는 명령어, Slack 알림, 볼트를 검색해 답하는 Slack 봇, 팀 아카이브 사이트를 붙였습니다. AX 컨설팅에서 합의한 3단계 로드맵을 문서로 정리하고 프로젝트 자동화 트랙을 맡았습니다.
- **CI** — 5개 레포에 CI를 붙였습니다. 타입 체크·빌드·테스트만 머지를 막고, 린트는 바뀐 파일만 검사해 경고로 띄웠습니다.

## 관련 글

- [GA4 · Mixpanel · 자체 DB — 3중 트래킹 불일치를 해소한 과정](/posts/triple-tracking-data-consistency)
- [Notion 스크럼을 주간 분석 리포트로 — Claude Code 명령어와 Astro 사이트로 자동 발행](/posts/team-analytics-automation)
- [Next.js에 Mixpanel 프록시를 붙이고 이벤트 이름 규칙을 정했다](/posts/mixpanel-nextjs-proxy)
- [신청이 어디서 왔는지 남기기 — 비회원 신청과 Meta 리드를 한 DB로](/posts/guest-application-lead-pipeline)
- [Redis TTL로 중복을 막았더니 알림톡이 매일 다시 나갔다](/posts/notification-infinite-loop-bug)
- [Fire-and-Forget 호출이 만든 502](/posts/fire-and-forget-race-condition)
- [내가 바꾼 Dockerfile이 프로덕션을 밤새 내렸다](/posts/prisma-openssl-production-down)
- [Python Fernet 암호문을 Node.js에서 주고받기](/posts/fernet-cross-platform-encryption)
- [하이픈 다단계 가입을 중계하는 FastAPI 서비스](/posts/fastapi-insurance-microservice)
