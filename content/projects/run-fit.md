---
title: "Run Fit"
description: "지역 기반 러닝 크루·세션 탐색 플랫폼. 코드잇 부트캠프 팀 프로젝트에서 URL 기반 필터 상태와 섹션별 Suspense 경계, 공용 컴포넌트를 맡았습니다."
role: "프론트엔드 개발자 (4인 팀)"
period: "2025.12 ~ 2026.01"
stack: ["Next.js", "React", "TypeScript"]
url: "https://run-fit-eight.vercel.app/sessions"
github: "https://github.com/runfit26/run-fit"
published: true
order: 5
---

지역 기반으로 러닝 크루와 세션을 탐색하는 플랫폼입니다.

## 내가 만든 것

- **URL 기반 필터 상태** — 세션·크루 필터를 `useSearchParams` 하나로 관리해 공유·북마크·뒤로가기에서도 필터가 유지되게 했습니다(PR #210, #226, #254).
- **섹션 단위 Suspense** — 페이지 전체가 아니라 섹션별로 로딩을 나누고 스피너 대신 스켈레톤을 보여 줬습니다. 인증 에러가 나도 페이지 전체가 아니라 해당 영역만 대체 화면으로 바뀝니다(#320, #324, #328).
- **회원가입·로그인과 폼 구조** — 회원가입·로그인 페이지를 만들고, 두 폼을 스키마·폼 훅·테스트로 나눈 같은 패턴으로 정리해 검증·제출·에러 처리를 컴포넌트에서 분리했습니다(#156, #166). 크루 생성·수정은 하나의 폼을 재사용하고 이미지 업로드를 연동했으며(#253, #281), 세션 생성 폼은 이미지와 좌표 검증을 강화했습니다(#302).
- **무한 스크롤** — 세션·크루 목록 API 7개를 `useInfiniteQuery` 기반으로 바꿨습니다. 세션 목록은 최근 3개 조회에도 쓰여 일반 목록과 무한 목록 두 형태를 두었습니다(#241, #304).
- **공용 컴포넌트와 Storybook** — DateTimePicker, Input, ProgressBar, Checkbox, SessionLevelCard를 stories와 함께 구현하고 Calendar·DatePicker를 개선했습니다. Storybook 배포 CI/CD도 구축했습니다(#55, #76, #88, #94, #110, #131).
- **CI/CD와 협업 규칙** — PR마다 lint·test·build를 돌리고 Preview·Production 배포를 GitHub Actions로 옮겼습니다(#111). 이슈·PR 템플릿, ESLint 규칙, 컴포넌트 폴더 규칙을 제안해 팀 규칙으로 정했습니다(#3, #64, #279, #128). Vercel 이미지 최적화 한도를 넘긴 문제는 캐시 기간(`minimumCacheTTL`)을 늘려 대응했습니다(#334).

## URL 기반 필터 상태

필터를 컴포넌트 내부 상태(`useState`)로 관리하면 URL을 공유했을 때 필터가 초기화되고, 뒤로가기 시 이전 검색 조건이 날아갑니다. `useSearchParams`를 SSOT로 두고 필터 변경 시 URL 쿼리 파라미터를 직접 업데이트하는 구조로 바꿨습니다. 컴포넌트는 URL에서 현재 필터를 읽기만 하면 됩니다.

## Suspense Boundary 설계

필터를 바꿀 때마다 전체 페이지가 로딩 스피너로 교체되는 문제가 있었습니다. 크루 목록과 세션 목록의 데이터 소스가 다른데 한 Suspense로 묶여있어서, 둘 중 느린 쪽이 전체를 블로킹했습니다. 섹션별로 Suspense Boundary를 분리했습니다. TanStack Query의 `useSuspenseQuery`와 팀에서 쓰는 Suspensive 위에서 작업했고, 크루 정보는 먼저 보이고 세션과 리뷰는 준비되면 채워지는 구조입니다.

## 관련 글

- [shadcn/ui Calendar의 Range 선택 UX 개선과 타입 설계](/posts/calendar)
- [URL 기반 필터 상태에서 Suspense + 스켈레톤 UI까지](/posts/react-suspense)
- [왜 useOptimistic 훅이 낙관적 업데이트를 단순화해주지 않는가](/posts/optimistic-update)
- [FSD는 만병 통치약이 아니다](/posts/fsd-is-not-silver-bullet)
- [GitHub Actions와 Git Hooks로 배포·협업 규칙 세우기](/posts/git-workflow)
