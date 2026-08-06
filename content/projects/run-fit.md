---
title: "Run Fit"
description: "지역 기반 러닝 크루·세션 탐색 플랫폼. URL 기반 필터 상태 SSOT와 섹션 단위 Suspense Boundary를 도입해 로딩 병목을 제거했습니다."
role: "프론트엔드 엔지니어"
period: "2025.12 ~ 2026.01"
stack: ["Next.js", "React", "TypeScript"]
url: "https://run-fit-eight.vercel.app/sessions"
github: "https://github.com/runfit26/run-fit"
published: true
order: 4
---

## 개요

지역 기반으로 러닝 크루와 세션을 탐색할 수 있는 플랫폼입니다. URL 기반 필터 상태 관리와 Suspense를 활용한 렌더링 최적화에 집중했습니다.

## 주요 기여

- **URL 기반 필터 상태 SSOT**: `useSearchParams`를 SSOT로 확립하여 필터 상태의 일관성 보장
- **Suspense Boundary 설계**: 섹션 단위 Suspense Boundary 도입으로 로딩 병목 제거
- **Suspensive 라이브러리 도입**: `useSuspenseQuery`를 활용한 선언적 데이터 로딩 패턴 적용
