---
title: "URL 기반 필터 상태에서 Suspense + 스켈레톤 UI까지"
description: "필터 상태의 SSOT를 URL로 확립하고, Suspense와 Suspensive를 도입해 스피너 기반 로딩을 스켈레톤 UI 부분 로딩으로 전환한 과정을 정리한다."
date: "2026-01-05"
tags: ["React", "Suspense", "Suspensive", "useSearchParams", "Next.js"]
published: true
---

## 필터 상태 관리의 한계

기존 구현에서는 필터 값이 React state, 필터 모달, 서버 쿼리 파라미터에 분산되어 있었다. 세 가지 문제가 생겼다.

- 페이지 새로고침 시 필터 값이 초기화됨
- UI 표시와 모달 상태 간 불일치
- 실제 서버 요청과 표시된 필터 간 불일치

## URL을 단일 진실의 원천으로

URL을 필터 상태의 유일한 원천으로 확립하면서 역할 분리가 명확해졌다.

- **URL이 기준을 세운다** — 필터의 진실은 URL에만 존재
- **UI state는 URL을 임시로 표현한다** — 모달이나 컴포넌트 상태는 URL의 파생
- **서버 요청은 URL 파라미터를 직접 사용한다** — 중간 상태 없이 URL에서 바로 요청

## useSearchParams와 빌드 에러

`useSearchParams()`를 page.tsx에서 사용하자 빌드 에러가 발생했다.

> "useSearchParams() should be wrapped in a suspense boundary."

브라우저 URL은 빌드 타임에 결정되지 않는다. 하이드레이션 시점에만 알 수 있는 값이라 서버 렌더링이 불가능하다. Next.js는 이런 컴포넌트를 클라이언트 사이드 렌더링으로 전환하는데(CSR Bailout), Suspense가 어떤 컴포넌트 경계에서 지연이 필요한지를 명시적으로 정의해 이 문제를 해결한다.

## 컴포넌트 책임 분리

Suspense를 도입하기 전, 기존 컴포넌트는 로딩·에러·UI 렌더링을 모두 직접 처리하고 있었다.

```typescript
export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const {
    data: session,
    isLoading,
    error,
  } = useQuery(sessionQueries.detail(sessionId));

  if (isLoading) return <Spinner />;
  if (error) return <ErrorFallback error={error} />;

  return <div>{/* 세션 상세 정보 렌더링 */}</div>;
}
```

컴포넌트가 "데이터 상태에 따라 무엇을 보여줄지"를 직접 판단하고 있다. 조건부 렌더링 분기가 늘어나고, UI 수정 시 로딩/에러 로직까지 함께 건드려야 한다.

Suspense와 ErrorBoundary로 책임을 분리하면 구조가 달라진다.

```typescript
<Suspense fallback={<Spinner />}>
  <ErrorBoundary fallback={<ErrorFallback />}>
    <SessionDetailContent sessionId={sessionId} />
  </ErrorBoundary>
</Suspense>
```

```typescript
function SessionDetailContent({ sessionId }: { sessionId: number }) {
  const { data: session } = useSuspenseQuery(
    sessionQueries.detail(sessionId)
  );

  return <div>{/* 세션 상세 정보 렌더링 */}</div>;
}
```

- 데이터 로딩 → Suspense
- 에러 처리 → ErrorBoundary
- 컴포넌트 → 데이터가 있다는 전제 하에 UI만 담당

조건문이 사라지고 컴포넌트는 더 작고 읽기 쉬워졌다.

## 스피너 대신 스켈레톤 UI

스피너 기반 로딩의 가장 큰 UX 문제는 로딩 중에 사용자가 아무 정보도 얻지 못한다는 것이다. 현재 페이지가 어떤 구조인지, 어떤 정보가 어디에 표시될지 알 수 없다.

스켈레톤 UI는 실제 UI와 동일한 레이아웃을 유지하면서 "앞으로 무엇이 렌더링될지"를 미리 보여준다. 사용자는 로딩 중에도 페이지 구조를 인지하고 콘텐츠가 점진적으로 채워지는 흐름을 자연스럽게 받아들인다.

## Fine-grained Suspense로 부분 로딩

페이지 전체를 하나의 Suspense로 감싸면, 가장 느린 요청이 전체 렌더링을 지연시킨다. 섹션별로 Suspense 경계를 독립적으로 나누면 이 문제를 해결한다.

- 레이아웃과 정적 요소는 즉시 렌더링
- 이미 준비된 데이터는 바로 표시
- 아직 준비되지 않은 섹션만 스켈레톤으로 대체
- 데이터가 도착하는 순서대로 화면이 채워짐

실제 로딩 시간을 줄이지 않더라도 사용자의 체감 성능은 나아진다.

Suspense 경계를 세분화하지 않으면, `useSearchParams`나 `useSuspenseQuery`처럼 렌더링 시점에 비동기 값을 필요로 하는 훅 때문에 페이지 전체가 불필요하게 대기 상태에 들어갈 수 있다.

## Suspensive 라이브러리 도입

Toss의 Suspensive는 React 네이티브 Suspense를 실무에서 쓰기 편하게 강화한 라이브러리다.

- Suspense + ErrorBoundary 보일러플레이트 감소
- SSR 안전성을 위한 `clientOnly` 옵션
- `useSuspenseQuery`를 통한 React Query 통합
- `ErrorBoundaryGroup`으로 배치 에러 처리

## 정리

이 과정은 단순히 도구를 도입한 게 아니라 일관된 기준을 세운 것이었다.

1. **상태 기준을 세운다** — URL을 필터의 단일 진실 원천으로
2. **렌더링 경계를 설계한다** — Fine-grained Suspense로 섹션별 독립 로딩
3. **에러 처리 프로토콜을 정한다** — ErrorBoundary + ErrorBoundaryGroup

이 순서가 핵심이었다.
