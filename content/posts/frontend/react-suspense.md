---
title: "URL 기반 필터 상태에서 Suspense + 스켈레톤 UI까지"
description: "필터 상태의 SSOT를 URL로 확립하고, Suspense와 팀에서 쓰는 Suspensive로 스피너 기반 로딩을 스켈레톤 UI 부분 로딩으로 전환한 과정을 정리한다."
date: "2026-01-05"
tags: ["React", "Suspense", "Suspensive", "useSearchParams", "Next.js"]
published: true
---

팀 프로젝트에서 세션·크루 목록 페이지의 필터 로직을 개선하면서 겪은 문제와 고민의 흐름을 정리했습니다.

- 필터 상태를 URL로 옮기게 된 계기
- 그 과정에서 발생한 에러
- Next.js가 왜 CSR bail out을 선택했는지
- Suspense가 필요해진 이유
- 왜 Suspense가 아닌 Suspensive를 사용했는지

---

## 필터 상태 관리 방식의 한계

세션 데이터는 지역·날짜·시간·난이도·정렬 필터 파라미터를 가진다. 초기 구현에서는 이 필터들을 모두 React state로 관리했다.

```ts
const [region, setRegion] = useState<Record<string, string[]> | undefined>()
const [date, setDate] = useState<DateRange | undefined>()
const [time, setTime] = useState<[number, number] | undefined>()
const [level, setLevel] = useState<LevelValue | undefined>()
const [sort, setSort] = useState<SortValue>()
```

문제는 필터 값들이 하나의 기준 상태를 공유하지 못하고, 각기 다른 목적에 따라 사용되고 있었다는 점이다.

필터는 다음과 같은 위치에서 동시에 사용되고 있었다.

- 페이지 상단 필터 버튼
- 세부 필터 모달 내부 상태
- 세션 목록 데이터를 요청하는 쿼리 파라미터

이 구조에서는 사용자가 필터를 설정한 뒤 새로고침이 발생하면
모든 필터 값이 초기화됐다.  
또한 페이지에 표시된 필터 상태와 모달 내부 상태가 서로 어긋나거나,  
실제로 요청된 쿼리 파라미터와 UI가 일치하지 않는 문제도 발생했다.  
즉, 필터가 페이지 상태이면서도 단순 UI state로 취급되고 있었던 것이다.

### UI 구조와 서버 쿼리 파라미터의 간극

이 문제는 타입 구조에서도 명확하게 드러났다.

UI에서는 사용자 인터랙션에 맞춰 다음과 같은 타입을 사용하고 있었다.

```ts
type region = Record<string, string[]>
type DateRange = { from?: Date; to?: Date }
type time = [number, number]
```

UI 기준에서의 필터 예시는 다음과 같다.

```ts
{
  region: { "서울": ["강북구", "노원구"] },
  date: { from: Date, to: Date },
  time: [0, 720],
  level: "BEGINNER"
}
```

이 구조는 화면 단에서는 직관적이지만 서버 요청 파라미터로는 그대로 사용할 수 없다.  
서버가 요구하는 필터 타입은 문자열 기반의 평탄한 구조였고,

```ts
type SessionListFilters = PaginationQueryParams & {
  city?: string[]
  district?: string[]
  dateFrom?: string
  dateTo?: string
  timeFrom?: string
  timeTo?: string
  level?: LevelValue
  sort: SortValue
}
```

따라서 다음과 같은 문제를 해결해주어야 했다:

- Date 객체를 서버 요청용 문자열로 변환
- 트리 형태의 지역 구조를 배열 기반 파라미터로 분해
- 명확히 분리되어 있는 UI 타입과 서버 타입을 중간에서 조율할 기준 수립

이 시점에서 필터 state는 UI 상태이자, 서버 요청 상태이자, 페이지 상태라는 모호한 역할을 동시에 떠안고 있었다.

이 문제를 해결하기 위해 필터의 **단일 기준**(Single Source of Truth)을 다시 정의할 필요가 있었고, 그 기준으로 선택한 것이 **URL**이었다.

#### URL을 필터의 단일 진실 공급원(SSOT)으로

필터를 URL로 옮긴다는 것은 단순히 “상태를 하나 더 저장하는 것”이 아니었다.  
URL을 기준으로 삼는 순간, 필터는 다음과 같은 성격을 갖게 된다.

- 새로고침 이후에도 유지되어야 하는 페이지 상태
- 서버 요청과 1:1로 대응되는 쿼리 파라미터
- UI는 이 상태를 읽고 쓰는 표현 계층

즉, 필터 상태의 책임이 명확히 분리된다.

- **URL**: 상태의 기준
- **UI state**: URL을 표현하기 위한 임시 상태
- **서버 요청**: URL을 그대로 사용하는 결과물

이 구조를 통해 기존에 흩어져 있던 기준들을 하나로 모을 수 있었고, 이후 구현에도 직접적인 영향을 미쳤다.

- 필터 상태 복원 로직이 단순해졌고
- 모달과 페이지 간 상태 불일치 문제가 사라졌으며
- 서버 요청 파라미터와 UI가 항상 일치하게 됐다

### useSearchParams, 그리고 내가 놓친 것들

필터의 단일 기준을 URL로 정한 이후, 가장 먼저 한 일은 URL에서 필터 값을 읽어오는 것이었다.  
Next.js App Router 환경에서는 [`useSearchParams()`](https://nextjs.org/docs/app/api-reference/functions/use-search-params) 훅을 사용해 현재 URL의 쿼리 문자열을 읽을 수 있다.

필터를 읽고 쓰는 로직은 `useSessionFilters` 훅 하나로 모았다.

```ts
// 핵심 흐름만 남기고 일부 생략
export function useSessionFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // URL → UI 필터 상태
  const filters = useMemo(() => ({
    level: searchParams.get('level') ?? DEFAULT_SESSION_FILTER.level,
    sort: searchParams.get('sort') ?? DEFAULT_SESSION_FILTER.sort,
    // city/district 배열을 { 서울: ['강북구', ...] } 형태로 복원
    region: toRegion(searchParams.getAll('city'), searchParams.getAll('district')),
    // ...date, time
  }), [searchParams])

  // UI 필터 상태 → URL
  const applyFilters = (next: SessionFilterState) => {
    const params = new URLSearchParams()

    if (next.level) params.set('level', next.level)
    Object.entries(next.region ?? {}).forEach(([city, districts]) => {
      districts.forEach((district) => {
        params.append('city', city)
        params.append('district', district)
      })
    })
    // ...date, time, sort

    router.push(`/sessions?${params.toString()}`)
  }

  return { filters, applyFilters }
}
```

필터를 적용하면 state를 바꾸는 대신 URL을 바꾸고, 화면은 바뀐 URL을 다시 읽어 그린다. 서버 요청 파라미터(`queryFilters`)도 같은 `filters`에서 파생하기 때문에 세 곳이 어긋날 수 없다.

로컬 환경에서는 아무 문제 없이 동작했기 때문에, 이 에러는 전혀 예상하지 못한 지점에서 드러났다. CI 스크립트가 실행되며 빌드 단계에서 다음과 같은 에러가 발생했다.

![Build Error](/images/build-error.png)

에러 메시지에는 공식 문서([Missing Suspense boundary with useSearchParams](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout)) 링크와 함께 해결 방법이 안내되어 있었다. 안내에 따라 `useSearchParams` 훅을 사용하는 컴포넌트를 Suspense로 감싸자 에러는 바로 해결됐다.

`useSearchParams() should be wrapped in a suspense boundary at page "/crews".`라는 에러 메시지를 보고, 나는 'useSearchParams 훅은 항상 Suspense로 감싸야 하는구나'라고 단순하게 받아들였다. 하지만 멘토링 시간에 멘토님께서 Suspense를 사용하게 된 계기와, 다른 곳에도 같은 방식으로 적용할 것인지 질문하셔서 당황했다.

나는 에러를 해결하는 데만 집중해 useSearchParams 훅과 Suspense를 항상 함께 써야 한다고 생각했다. 그러나 멘토님 설명을 듣고 보니, Suspense의 원리는 훨씬 다양한 목적에 활용될 수 있다는 점을 알게 되었다.

따라서 다른 페이지에도 이 패턴을 적용하려면, 단순히 에러 해결이 아니라 Suspense의 사용 목적을 명확히 이해해야겠다고 느꼈다. 우선 왜 Suspense를 사용하면 빌드 에러가 해결되는지, 그 원인부터 살펴봤다.

#### 왜 빌드 에러가 발생했을까

`useSearchParams()`가 다루는 값은 브라우저 URL의 쿼리 문자열이다.  
세션·크루 목록 페이지는 동적 데이터 없이 **빌드 시점에 HTML을 미리 만들어 두는(정적 프리렌더링)** 페이지였다.  
그런데 빌드 시점에는 사용자가 어떤 쿼리 문자열로 접속할지 알 수 없다. 이 상황에서 Next.js는 다음과 같이 판단한다.

> **“이 컴포넌트는 빌드 시점에 확정할 수 없는 값에 의존한다.” → “이 부분은 미리 렌더링할 수 없다!”**

그래서 `useSearchParams()`를 호출한 컴포넌트는 서버에서 미리 렌더링되지 않고 **클라이언트 렌더링(CSR)으로 넘어간다(bail out)**.  
문제는 **어디까지** 넘어가느냐다. Next.js는 호출한 컴포넌트에서 가장 가까운 Suspense 경계까지를 클라이언트 렌더링 범위로 잡는다. 경계가 하나도 없으면 그 범위는 **페이지 전체**가 된다.

#### CSR bail out이 의미하는 실제 동작

Suspense 경계 없이 페이지 전체가 CSR로 전환되면 다음과 같이 동작한다.

- 미리 만들어진 HTML에 페이지 내용이 들어가지 않고
- 클라이언트에서 JS가 로드된 이후에야 렌더링이 시작된다
- 즉, 사용자는 JS가 로드될 때까지 **빈 화면**을 보게 된다

[공식 문서](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout)도 이 점을 에러의 이유로 설명한다.

> Reading search parameters through `useSearchParams()` without a Suspense boundary will opt the entire page into client-side rendering. This could cause your page to be blank until the client-side JavaScript has loaded.

Next.js가 이를 경고가 아니라 빌드 에러로 막는 이유가 여기에 있다. Suspense 경계를 두면 경계 바깥은 정적 HTML로 유지되고, 경계 안쪽은 fallback이 HTML에 들어간 채로 내려온다. **"비는 구간"을 페이지 전체가 아니라 필요한 영역으로 좁히고, 그 구간에 보여줄 UI를 명시하는 장치**가 Suspense인 것이다.

## Suspense 도입 과정

### `useSearchParams`의 사용 위치

원인을 알고 나니 "어디를 감쌀 것인가"가 중요해졌다. 페이지 컴포넌트에서 `useSearchParams()`를 직접 호출하면 그 위에 Suspense 경계를 둘 곳이 없어 페이지 전체가 CSR 범위가 된다.

Next.js는 [해결 방법](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout#possible-ways-to-fix-it)으로 다음을 안내한다.

> To keep the route statically generated, wrap the smallest subtree that calls `useSearchParams()` in `Suspense`, for example you may move its usage into a child Client Component and render that component wrapped with `Suspense`. This preserves the static shell and avoids a full CSR bailout.

즉, `useSearchParams()`를 호출하는 부분을 하위 컴포넌트로 분리하고, **그 컴포넌트만 Suspense로 감싸는** 것이다.  
이에 맞춰 세션·크루 목록 페이지의 컴포넌트 구조를 다음과 같이 변경하였다.

```
page.tsx
├─ Header (제목, 일러스트 — 정적 HTML로 즉시 렌더링)
└─ <ErrorBoundary>
   └─ <Suspense fallback={<Skeleton />}>
      └─ SessionPageContent / CrewPageContent
         ├─ useSessionFilters / useCrewFilters ← useSearchParams 사용
         └─ useSuspenseInfiniteQuery ← 목록 데이터 요청
```

핵심은 세 가지다.

1. URL에 의존하지 않는 레이아웃(헤더 등)은 Suspense 바깥에 두어 정적 HTML로 유지한다
2. URL을 읽는 로직과 그 URL로 데이터를 요청하는 로직은 하위 컴포넌트로 모은다
3. CSR bail out이 발생하는 그 하위 컴포넌트만 Suspense로 감싼다

참고로 Suspense가 유일한 해결책은 아니다. 페이지를 요청 시점 렌더링으로 바꾸거나(`connection()`), Server Component인 페이지가 받은 `searchParams`를 props로 내려주는 방법도 있다. 목록 페이지는 헤더 같은 정적 영역을 미리 렌더링해 두는 이점이 컸기 때문에, 정적 셸을 유지하는 Suspense 방식을 택했다.

### Suspense가 필요해진 지점

정리하면, 문제는 다음과 같았다.

- URL을 필터의 기준으로 삼기 위해 `useSearchParams`가 필요했고
- 이 훅은 서버에서 확정할 수 없는 값에 의존하며
- Next.js는 이를 감지하면 CSR bail out을 발생시킨다

Suspense는 이 상황에서

- “지금은 렌더링할 수 없다”는 상태를 명시적으로 표현하고
- fallback UI를 통해 사용자 경험을 보호하는 역할을 한다

이 구조는 선택이라기보다 Next.js가 의도한 패턴에 가깝다.
Suspense가 해결하는 문제는 기존의 스피너 중심의 로딩 처리와 동일한 역할처럼 보였다. 그렇다면 왜 Next.js는 Suspense를 사용해 처리하는 것을 권장하는걸까?

### 기존 로딩 처리의 한계와 Suspense의 역할

다른 컴포넌트에서는 로딩 상태를 스피너로 처리하고 있었다.
예를 들면, React Query를 사용해 데이터 요청을 보냈을 경우, 데이터를 불러오고 있는 상황 즉 `isLoading`일 경우 스피너를 렌더링한다.

```tsx
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

컴포넌트는 ’데이터 상태에 따라 무엇을 보여줄지’를 직접 판단하고 있다.
이 구조에서는

- 조건부 렌더링 분기가 늘어나고
- UI 수정 시 로딩/에러 로직까지 함께 건드리게 되며
- 컴포넌트가 커질수록 이해하기 어려워진다.

스피너 중심의 로딩을 Suspense 기반 구조로 전환하면 다음과 같은 한계를 극복할 수 있다.

- **기존 스피너 방식**은 단순히 "기다리고 있다"는 신호만 전달할 뿐,
  어떤 컴포넌트가 아직 렌더링되지 않았는지,
  어떤 영역이 먼저 렌더링될 수 있는지와 같은 정보는 구조적으로 표현하지 못한다.
- **Suspense**는 렌더링할 수 없는 컴포넌트를 **명시적으로 경계(Suspense boundary)로 분리**하고,
  그 경계 안에서 대기 중인 동안 보여줄 fallback UI를 정의할 수 있다.
  이를 통해 “어디서, 왜 렌더링이 멈췄는지”를 코드 구조로 드러낸다.

여기서 '**경계를 분리한다**'는 것은 "로딩 중인가?"를 묻는 게 아니라 "여기서부터는 지금 렌더링할 수 없다"를 선언하는 것을 의미한다. 그래서 경계를 어디에 두느냐가 곧 렌더링 책임의 범위를 구분하는 것과 같고, fallback은 그 경계가 막혔을 때 대체될 UI를 의미한다.

```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<Skeleton />}>
    <SessionDetailContent sessionId={sessionId} />
  </Suspense>
</ErrorBoundary>
```

- Suspense는 데이터 로딩 책임을, 
- ErrorBoundary는 에러 처리 책임을 갖고,
- 컴포넌트는 “정상 상태의 UI만 렌더링”한다.  

이로써 컴포넌트의 역할이 명확해졌다.   
컴포넌트는 무엇을 보여줄지 판단하는 책임이 제거되어, 데이터가 있다는 전제 하에 UI만 담당하면 된다.  
또한, 로딩/에러에 대한 조건문이 사라지면서 컴포넌트는 더 작고 읽기 쉬워졌다.

```tsx
function SessionDetailContent({ sessionId }: { sessionId: number }) {
  const { data: session } = useSuspenseQuery(
    sessionQueries.detail(sessionId)
  );

  return <div>{/* 세션 상세 정보 렌더링 */}</div>;
}
```

### 스피너 대신 스켈레톤 UI

fallback UI를 무엇으로 구성할지는 구조의 문제라기보다 UX 선택의 영역이다.  
이번 페이지에서는 스피너 대신 스켈레톤 UI를 사용했다.

스피너 기반 로딩의 가장 큰 UX 문제는 로딩 중에 사용자가 아무 정보도 얻지 못한다는 것이다.  
현재 페이지가 어떤 구조인지, 어떤 정보가 어디에 표시될지 알 수 없다.

스켈레톤 UI는 실제 UI와 동일한 레이아웃을 유지하면서 "앞으로 무엇이 렌더링될지"를 미리 보여준다.  
사용자는 로딩 중에도 페이지 구조를 인지하고, 콘텐츠가 점진적으로 채워지는 흐름을 자연스럽게 받아들인다.

### Fine-grained Suspense로 "부분 로딩"

한 페이지 안에서 여러 데이터를 불러오고 있었고,  
이때 먼저 불러온 데이터를 보여주거나  
비동기 로직과 관계없는 요소(헤더, 제목 등 레이아웃)를 먼저 보여주는 것이  
사용자 경험 측면에서 더 낫다고 판단했다.

나와 같은 작업 방식이 이미 하나의 패턴으로 정리되어 있었다!  
바로 **Fine-grained Suspense**다.

#### Fine-grained Suspense란

페이지 전체를 하나의 Suspense 경계로 감싸는 방식이 아니라,  
**데이터 페칭 단위별로 Suspense 경계를 나누는** 패턴이다.

```tsx
<h2>Section Title</h2> {/* 즉시 렌더링 */}
<Suspense fallback={<SectionSkeleton />}>
  <SectionContent /> {/* 독립적으로 로딩 */}
</Suspense>
```

- 정적 요소(제목, 탭, 레이아웃)는 즉시 렌더링
- 각 섹션은 자신이 필요한 데이터만 로딩하며 서로의 영역에 영향을 주지 않는다

Fine-grained Suspense 패턴이 필요했던 이유는,  
Suspense로 감싼 컴포넌트에 렌더링 시점에 비동기 값을 필요로 하는 훅(`useSearchParams`, `useSuspenseQuery`)이 있기 때문에  
**Suspense 경계를 세분화하지 않을 경우 페이지 전체가 불필요하게 대기 상태에 들어갈 수 있기 때문**이다.

#### Problem

하나의 Suspense로 감싸는 경우 (**coarse-grained Suspense**)  
A, B 중 하나라도 렌더링 불가능하면 전체가 fallback으로 대체되면서  
**가장 느린 요청이 전체 렌더링을 지연**시키는 구조였다.  
에러도 마찬가지로, A 요청 하나만 실패해도 정상적으로 불러온 B까지 에러 화면으로 대체된다.

```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<Spinner />}>
    <A />
    <B />
  </Suspense>
</ErrorBoundary>
```

#### Solution

각각을 Suspense boundary로 분리할 경우 (**fine-grained Suspense**)  
A와 B는 로딩도, 에러도 서로 독립적으로 처리된다.

```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<Spinner />}>
    <A />
  </Suspense>
</ErrorBoundary>

<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<Spinner />}>
    <B />
  </Suspense>
</ErrorBoundary>
```

- **레이아웃과 정적 요소는 즉시 렌더링**하고 이미 준비된 데이터는 바로 표시한다
- 아직 준비되지 않은 섹션만 스켈레톤으로 대체하여 **데이터가 도착하는 순서대로 화면이 채워진다**
- 실제 로딩 시간을 줄이지 않더라도, **사용자의 체감 성능을 개선**할 수 있다

## Suspense 위에 Suspensive를 얹은 이유

Suspense와 ErrorBoundary를 조합해 사용하다 보니 반복되는 패턴이 눈에 띄기 시작했다.

```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<Spinner />}>
    <SessionDetailContent sessionId={sessionId} />
  </Suspense>
</ErrorBoundary>
```

이 구조는 모든 페이지, 모든 섹션에서 거의 동일하게 반복됐다.  
반복 자체보다 신경 쓰였던 것은 다음 두 가지였다.

- 섹션마다 fallback을 직접 지정하다 보니, 지정하지 않은 곳의 로딩 UI가 제각각이 되기 쉽다는 점
- `useSuspenseQuery`를 쓰는 Client Component도 **서버 렌더링 단계에서 한 번 실행된다**는 점

이 문제를 다루는 데 Toss에서 만든 [Suspensive](https://suspensive.org/)의 `@suspensive/react`를 썼다. 이 라이브러리는 팀원이 프로젝트에 먼저 추가해 둔 것이고, 나는 이 구조에서 어떤 옵션이 무엇을 해결하는지 정리했다.  
Suspensive는 React의 `Suspense`와 `ErrorBoundary`를 대체하는 것이 아니라, 같은 사용법 위에 몇 가지 옵션을 더한 라이브러리다.

### Suspensive로 정리한 것들

#### 1. `clientOnly` — 서버에서는 fallback만 렌더링

React의 Suspense는 서버 렌더링 중에도 자식 컴포넌트를 렌더링하려고 시도한다.  
`useSuspenseQuery`가 있는 컴포넌트라면 서버에서 데이터 요청이 시작될 수 있다는 뜻이다.

Suspensive `Suspense`의 `clientOnly` 옵션을 쓰면 [공식 문서](https://suspensive.org/en/docs/react/Suspense)의 설명대로 **서버에서는 fallback을, 클라이언트에서는 children을** 렌더링한다.

```tsx
import { ErrorBoundary, Suspense } from '@suspensive/react'

export default function SessionDetailContainer({ sessionId }: { sessionId: number }) {
  return (
    <ErrorBoundary
      fallback={({ error }) => <SessionDetailErrorFallback error={error} />}
    >
      <Suspense fallback={<SessionDetailSkeleton />} clientOnly>
        <SessionDetail sessionId={sessionId} />
      </Suspense>
    </ErrorBoundary>
  )
}
```

- 서버: `SessionDetail`을 렌더링하지 않고 스켈레톤만 HTML에 담는다 → 서버에서 데이터 요청이 일어나지 않는다
- 클라이언트: hydration 이후 `SessionDetail`을 렌더링하고, 데이터를 기다리는 동안 같은 스켈레톤을 보여준다

서버 HTML과 첫 클라이언트 렌더링이 모두 스켈레톤이기 때문에 hydration 불일치도 생기지 않는다.  
대신 서버 HTML에는 실제 콘텐츠가 들어가지 않으므로, 검색 노출이 중요한 영역보다는 **찜한 세션 목록이나 세션 상세처럼 브라우저에서 요청하는 데이터 영역**에 적용했다.

#### 2. ErrorBoundary fallback에서 `error`, `reset` 받기

Suspensive의 `ErrorBoundary`는 fallback을 함수로 넘기면 `error`와 `reset`을 전달해준다.

```tsx
<ErrorBoundary
  fallback={({ error, reset }) => (
    <ErrorFallback error={error} onRetry={reset} />
  )}
>
  <SessionList />
</ErrorBoundary>
```

에러 종류에 따라 다른 메시지를 보여주거나(`error`), 다시 시도 버튼으로 경계를 초기화(`reset`)하는 로직을 fallback 컴포넌트 안에 둘 수 있다.  
`Suspense`와 `ErrorBoundary`를 같은 패키지에서 가져오게 되면서 사용법도 한 가지로 통일됐다.

#### 3. `DefaultPropsProvider` — 기본 fallback 통일

fallback을 따로 지정하지 않은 `Suspense`에도 같은 로딩 UI가 보이도록, 앱 최상단에서 기본값을 지정했다.

```tsx
'use client'

import { DefaultProps, DefaultPropsProvider } from '@suspensive/react'

const defaultProps = new DefaultProps({
  Suspense: {
    fallback: <Spinner />,
    clientOnly: false,
  },
})

export default function SuspensiveDefaultPropsProvider({ children }: { children: React.ReactNode }) {
  return <DefaultPropsProvider defaultProps={defaultProps}>{children}</DefaultPropsProvider>
}
```

기본 fallback은 스피너로 두고, 레이아웃이 중요한 페이지에서만 스켈레톤을 명시적으로 넘기는 방식으로 역할을 나눴다.

> 데이터 요청에 쓰는 `useSuspenseQuery`, `useSuspenseInfiniteQuery`는 TanStack Query v5부터 `@tanstack/react-query`에서 기본으로 제공하므로, 별도 래퍼 없이 그대로 사용했다.

### 결론: Suspense의 원칙을 지키면서 실용성을 더하다

Suspensive는 React의 Suspense를 대체하는 것이 아니라,  
**Suspense를 실제 서비스 환경에서 더 의도대로 쓰도록 돕는 도구**다.

- `clientOnly`로 서버와 클라이언트에서 무엇을 렌더링할지 명시하고
- `ErrorBoundary`의 `error`, `reset`으로 에러 UI를 fallback 안에서 완결하며
- `DefaultPropsProvider`로 로딩 UI의 기본값을 한 곳에서 관리한다

Suspense의 개념을 이해한 뒤 적용하니, Suspensive의 옵션 하나하나가 "어떤 문제를 위한 것인지" 분명하게 보였다.

## 마무리하며 — 상태, 렌더링, 그리고 책임의 기준

이번 리팩토링은 단순히 “필터 상태를 URL로 옮겼다”거나 “Suspense를 도입했다”는 이야기로 끝나지 않는다.

문제의 핵심은 처음부터 끝까지 기준의 부재였다.
- 필터는 UI 상태이기도 했고
- 서버 요청 파라미터이기도 했으며
- 페이지 상태이기도 했다

URL을 단일 기준으로 삼으면서 상태의 책임은 정리되었지만,
그 선택은 자연스럽게 렌더링 시점의 문제를 드러냈다.

`useSearchParams`는 이 문제를 가장 솔직하게 드러내는 훅이었고,
`Suspense`는 그 문제를 렌더링 경계라는 구조로 표현하는 도구였다.

그리고 `Suspensive`는 이 구조를 실제 서비스 코드에서 지속 가능하게 유지하기 위한 도구였다.
- `Suspense`와 `ErrorBoundary`의 반복을 줄이고
- 렌더링과 에러 처리의 책임을 명확히 하며
- 서버와 클라이언트의 차이를 코드 레벨에서 의식하게 만든다

결과적으로 이번 작업은 특정 라이브러리를 도입한 경험이라기보다,  
상태의 기준 → 렌더링의 기준 → 에러 처리의 기준을 하나씩 정리해 나간 과정에 가까웠다.

앞으로도 비슷한 문제가 다시 등장하겠지만,   
이제는 “어떤 도구를 쓸지”보다 “무엇을 기준으로 나누어야 하는지”를 먼저 고민할 수 있게 되었다.
