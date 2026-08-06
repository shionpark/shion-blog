---
title: "인톡 파트너스 2.0"
description: "보험 전문가를 위한 AI 교육 플랫폼. 외부 API 연동 보험 조회, AI 콘텐츠 자동 생성, UTM 캠페인 분석 엔진, Daily Briefing 자동화 등을 설계·구현했습니다."
role: "풀스택 개발자"
period: "2026.03 ~ 현재"
stack: ["Next.js", "React", "NestJS", "PostgreSQL", "Redis", "Claude API"]
url: "https://www.intalkpartners.com"
published: true
order: 2
---

## 개요

보험 전문가를 위한 AI 교육 플랫폼입니다. 외부 보험사 API와 연동하여 실시간 보험 상품 조회를 제공하고, AI 기반 콘텐츠 자동 생성 파이프라인을 구축했습니다.

## 주요 기여

- **외부 API 연동 보험 조회**: Python Fernet 암호화를 Node.js에서 직접 구현하여 크로스 플랫폼 암호화 호환
- **AI 콘텐츠 자동 생성**: Claude API를 활용한 Daily Briefing, 교육 콘텐츠 자동 생성 파이프라인
- **UTM 캠페인 분석 엔진**: 3단계 매칭 알고리즘으로 Meta Ads ↔ 내부 사용자 행동 데이터 연결
- **운영 자동화**: NestJS Scheduler 기반 크론 작업, Slack 알림 통합

## 기술적 도전

### Redis TTL 시간 드리프트 버그
Redis 24시간 TTL과 30분 크론 주기의 조합이 매일 30분씩 밀리면서 알림톡이 무한 발송되던 버그를 발견하고, 2단계 상태 머신으로 재설계했습니다.

### Fernet 암호화 크로스 플랫폼 구현
외부 보험사 API가 Python Fernet으로 암호화된 데이터를 주고받는 환경에서, Node.js 호환 암호화 모듈을 직접 구현했습니다.
