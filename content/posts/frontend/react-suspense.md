---
title: "URL 기반 필터 상태와 Suspensive 도입까지"
description: "필터 상태의 SSOT를 URL로 확립하고, Suspense와 Suspensive를 도입해 렌더링 경계를 설계한 과정을 공유합니다."
date: "2026-01-05"
tags: ["Suspense", "Suspensive", "useSearchParams"]
published: true
---

## 필터 상태 관리의 한계

기존 구현에서는 필터 값이 React state, 필터 모달, 서버 쿼리 파라미터에 분산되어 있었습니다. 이로 인해 세 가지 핵심 문제가 발생했습니다:

- 페이지 새로고침 시 필터 값이 초기화됨
- UI 표시와 모달 상태 간 불일치
- 실제 서버 요청과 표시된 필터 간 불일치

## URL을 단일 진실의 원천으로

URL을 필터 상태의 권위 있는 원천으로 확립하면서 명확한 역할 분리가 가능해졌습니다:

- **URL이 기준을 세운다** — 필터의 진실은 URL에만 존재
- **UI state는 URL을 임시로 표현한다** — 모달이나 컴포넌트 상태는 URL의 파생
- **서버 요청은 URL 파라미터를 직접 사용한다** — 중간 상태 없이 URL에서 바로 요청

## useSearchParams와 빌드 에러

`useSearchParams()`를 page.tsx에서 사용하자 빌드 에러가 발생했습니다:

> "useSearchParams() should be wrapped in a suspense boundary."

원인은 브라우저 URL이 빌드 타임에는 결정되지 않기 때문입니다. 하이드레이션 시점에만 알 수 있는 값이라 서버 렌더링이 불가능합니다.

## CSR Bailout

Next.js는 빌드 타임에 사용할 수 없는 값에 의존하는 컴포넌트를 클라이언트 사이드 렌더링으로 전환합니다. Suspense는 어떤 컴포넌트 경계가 지연이 필요한지를 명시적으로 정의해서 이 문제를 해결합니다.

## 섹션 단위 Suspense 패턴

페이지 전체를 Suspense로 감싸는 대신, 섹션별로 경계를 독립적으로 나누면:

- 정적 요소는 즉시 렌더링
- 섹션별 독립적인 데이터 페칭
- 점진적 콘텐츠 로딩으로 체감 성능 향상

## Suspensive 라이브러리 도입

Suspensive는 React의 네이티브 Suspense를 강화합니다:

- Suspense + ErrorBoundary 보일러플레이트 감소
- SSR 안전성을 위한 `clientOnly` 옵션
- `useSuspenseQuery`를 통한 React Query 통합
- `ErrorBoundaryGroup`으로 배치 에러 처리

## 정리

이 과정은 단순히 도구를 도입한 것이 아니라 일관된 기준을 세운 것이었습니다. **먼저 상태 기준을 세우고, 렌더링 경계를 설계하고, 에러 처리 프로토콜을 정한다** — 이 순서가 핵심이었습니다.
