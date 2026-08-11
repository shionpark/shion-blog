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

지역 기반으로 러닝 크루와 세션을 탐색하는 플랫폼입니다.

## 내가 만든 것

- **URL 기반 필터 상태 SSOT** — `useSearchParams`를 SSOT로 확립하여 필터 상태의 일관성 보장, 공유·북마크·뒤로가기 자연스럽게 동작
- **섹션 단위 Suspense Boundary** — 페이지 전체가 아니라 섹션별로 로딩을 분리하여 병목 제거
- **Suspensive 라이브러리 도입** — `useSuspenseQuery`를 활용한 선언적 데이터 로딩 패턴 적용

## URL 기반 필터 상태

필터를 컴포넌트 내부 상태(`useState`)로 관리하면 URL을 공유했을 때 필터가 초기화되고, 뒤로가기 시 이전 검색 조건이 날아갑니다. `useSearchParams`를 SSOT로 두고 필터 변경 시 URL 쿼리 파라미터를 직접 업데이트하는 구조로 바꿨습니다. 컴포넌트는 URL에서 현재 필터를 읽기만 하면 됩니다.

## Suspense Boundary 설계

필터를 바꿀 때마다 전체 페이지가 로딩 스피너로 교체되는 문제가 있었습니다. 크루 목록과 세션 목록의 데이터 소스가 다른데 한 Suspense로 묶여있어서, 둘 중 느린 쪽이 전체를 블로킹했습니다. 섹션별로 Suspense Boundary를 분리하고, Suspensive의 `useSuspenseQuery`로 데이터 로딩을 선언적으로 처리했습니다. 크루 목록은 먼저 보이고 세션 데이터는 준비되면 채워지는 구조입니다.
