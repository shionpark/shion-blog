---
title: "Suspense 도입기"
description: "Toss Suspensive로 스피너 기반 로딩을 Suspense + 스켈레톤 UI 부분 로딩으로 전환해 체감 성능을 개선한 과정을 정리합니다."
date: "2026-01-05"
tags: ["React"]
published: true
---

# Toss Suspensive 라이브러리를 사용한 부분 로딩 처리

> 📅 작업 기간 − 01/01~01/05

## 기존 문제: 스피너 중심 로딩의 한계

기존 상세 페이지와 목록 페이지는
로딩, 에러 처리가 하나의 컴포넌트에 섞여 있는 구조였다.

```typescript
export default function SessionDetail({ sessionId }: SessionDetailProps) {
  // 로딩, 에러 상태 관리
  const {
    data: session,
    isLoading,
    error,
  } = useQuery(sessionQueries.detail(sessionId));

  if (isLoading) return <Spinner />;
  if (error) return <ErrorFallback error={error} />;

  // 로직과 UI를 모두 처리
  return <div>{/* 세션 상세 정보 렌더링 */}</div>;
}
```

이 방식의 문제점은 컴포넌트의 책임이 불분명하며
조건부 렌더링으로 인해 코드 복잡성이 높아진다는 것이다.

## 개선된 방식: Suspense + ErrorBoundary

### 1️⃣ 컴포넌트의 책임 분리

**🔺 Problem**

예시 코드의 컴포넌트는 ’**데이터 상태에 따라 무엇을 보여줄지’**를 직접 판단하고 있다.

이 구조에서는 
- 조건부 렌더링 분기가 늘어나고
- UI 수정 시 로딩/에러 로직까지 함께 건드리게 되며
- 컴포넌트가 커질수록 이해하기 어려워진다.

✅ **Solution**

로딩과 에러 처리를 컴포넌트 내부에서 분기하지 않고,
**Suspense와 ErrorBoundary가 각각의 책임**을 가지도록 구조를 분리했다.

- 데이터 로딩 책임 → Suspense
- 에러 처리 책임 → ErrorBoundary
→ 이로써 컴포넌트는 “정상 상태의 UI만 렌더링”한다.

코드를 살펴보면 다음과 같다.

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

컴포넌트는 무엇을 보여줄지 판단하는 책임이 제거되어
**데이터가 있다는 전제 하에 UI만 담당**하게 되었다.

이로써 컴포넌트의 역할이 명확해졌다.
또한 로딩/에러에 대한 조건문이 사라지고, 컴포넌트는 더 작고 읽기 쉬워졌다.

### 2️⃣ 스피너는 페이지 구조를 숨긴다

**🔺 Problem**

스피너 기반 로딩의 가장 큰 UX 문제는 **로딩 중에 사용자가 아무 정보도 얻지 못한다**는 것이다.
이는 사용자에게 “빈 화면에서 기다린다”는 인상을 준다.

예를 들면, 
- 현재 페이지가 어떤 구조인지, 
- 어떤 정보가 어디에 표시될지, 
- 로딩이 끝나면 무엇을 볼 수 있는지와 같은 정보들을 알 수 없다.

✅ **Solution**

이 문제를 해결하기 위해 스피너 대신 스켈레톤 UI를 기본 로딩 전략으로 전환했다.
실제 UI와 동일한 레이아웃을 유지함으로써 사용자의 체감 성능이 개선될 것이라 기대했다.

스켈레톤은 스피너가 제공하지 않는 “**앞으로 무엇이 렌더링 될지**” 미리 UI를 보여준다.

이 구조를 통해 사용자는 로딩 중에도 페이지 구조를 인지하고
**콘텐츠가 점진적으로 채워지는 흐름**을 자연스럽게 받아들일 수 있다.

### 3️⃣** Fine-grained Suspense로 “부분 로딩”**

한 페이지 안에서 여러 데이터를 불러오고 있었고,
이때 먼저 불러온 데이터를 보여주거나 
비동기 로직과 관계없는 요소(헤더, 제목 등 레이아웃)를 먼저 보여주는 것이 
사용자 경험 측면에서 더 낫다고 판단했다.

나와 같은 작업 방식이 이미 하나의 패턴으로 정리되어 있었다!
바로 Fine-grained Suspense다.

> 📌 **Fine-grained Suspense**란

Fine-grained Suspense 패턴이 필요했던 이유는,
Suspense로 감싼 컴포넌트에 렌더링 시점에 비동기 값을 필요로 하는 훅(`useSearchParams`, `useSuspenseQuery`)이 있기 때문에
Suspense 경계를 세분화하지 않을 경우 **페이지 전체가 불필요하게 대기 상태**에 들어갈 수 있기 때문이다.

**🔺 Problem**

기존 구조에서는 여러 데이터를 동시에 요청하고 
가장 느린 요청이 전체 렌더링을 지연시키는 구조였다.

✅ **Solution**

레이아웃과 정적 요소는 즉시 렌더링하고 이미 준비된 데이터는 바로 표시한다.
아직 준비되지 않은 섹션만 스켈레톤으로 대체하여 데이터가 도착하는 순서대로 화면이 채워진다.
실제 로딩 시간을 줄이지 않더라도, 사용자의 체감 성능을 개선할 수 있다.

## **Suspense **적용 기준과 범위



## **도입 과정에서 발생한 빌드 에러(ECONNREFUSED)**
