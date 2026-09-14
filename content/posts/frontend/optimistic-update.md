---
title: "왜 useOptimistic 훅이 낙관적 업데이트를 단순화해주지 않는가"
description: "React 19의 useOptimistic이 Concurrent React 환경에서 race condition을 해결하지 못하는 이유와, React Query 기반 접근을 선택한 과정을 정리합니다."
date: "2026-01-22"
tags: ["Optimistic Update", "React19", "useOptimistic"]
published: true
---

낙관적 업데이트는 React 19에서 `useOptimistic`이라는 공식 API를 갖게 되었지만,  
Concurrent React 환경에서는 오히려 직접 구현할 때 고려할 것이 늘어났다.  
그래서 프로젝트 팀에서는 이 문제를 컴포넌트 레벨이 아닌 React Query에 위임하는 선택을 했다.

그 과정에서 고민했던 배경과 실제 구현 방식, 그리고 글을 정리하며 발견한 한계까지 기록한다.

---

## 낙관적 UI 업데이트란

낙관적 업데이트란 서버에 요청을 보내기 전에 UI를 먼저 업데이트하는 것을 말한다.  
요청이 항상 성공한다고 가정하고, 사용자의 액션에 따른 결과를 즉시 UI에 반영하여 사용자에게 빠른 피드백을 제공할 수 있다.

좋아요 버튼, 장바구니 수량 변경 등 사용자 액션에 대한 즉각적인 피드백을 제공할 필요가 있을 때 사용된다.  
일반적인 mutation 훅으로 구현할 경우,  
서버 응답이 돌아오기 전까지 UI가 변하지 않는 latency(지연 시간)가 존재하기 때문이다.

React Query의 리턴값, `isPending`으로 서버에 요청 중일 동안  
다른 UI를 보여주거나 버튼을 잠시 비활성화할 수도 있지만  
클릭과 동시에 결과가 보여지는 게 사용자 입장에서 더 자연스럽다.

### 현재 프로젝트에서의 구현

낙관적 업데이트를 React의 렌더링 모델에 맡기지 않고, **서버 상태 캐시를 기준**으로 관리하기 위해  
React Query(TanStack Query v5)의 mutation lifecycle을 사용한다. 세션 찜하기 기능의 코드다.

#### mutationFn

현재 찜 여부(`liked`)에 따라 서버에 다른 요청을 보낸다.

```ts
mutationFn: ({ sessionId, liked }: { sessionId: number; liked: boolean }) =>
  liked ? deleteLikeSession(sessionId) : postLikeSession(sessionId),
```

#### onMutate

`onMutate`는 mutation 함수(`mutationFn`)가 실행되기 직전에 실행된다.  
이 콜백의 반환값은 이후 `onError`, `onSuccess`, `onSettled`로 전달된다.

> **onMutate의 반환값이란**
>
> onError, onSuccess, onSettled로 전달되는 **mutation 한 사이클 동안 공유되는 임시 데이터**다.
>
> mutation lifecycle을 시간 순서로 보면 다음과 같은데,
>
> 1. onMutate ← 반환값 생성
> 2. mutationFn
> 3. onError / onSuccess / onSettled ← 반환값 사용
>
> 여기서 mutationFn이 실행되기 전 상태를 이후 콜백에서 다시 쓰고 싶을 때, 이걸 안전하게 전달하기 위한 통로가 이 반환값이다.
>
> 예시:
>
> - 낙관적 업데이트 전의 캐시
> - 이전 상태 스냅샷
> - 롤백에 필요한 데이터
>
> 이전 버전에서는 이 값을 `context`라고 불렀지만, TanStack Query v5 후반 버전부터는 `onMutateResult`라는 이름으로 전달되고 마지막 인자인 `context`에는 `client`(QueryClient) 등이 담긴다. 아래 코드는 이 시그니처를 기준으로 한다.

먼저 진행 중인 세션 상세 조회 요청을 취소한다.  
이미 날아간 조회 요청의 응답이 낙관적 업데이트 이후에 도착하면, 찜 요청 이전 데이터로 화면이 덮어씌워질 수 있기 때문이다.

```ts
await context.client.cancelQueries({
  queryKey: sessionQueries.detail(sessionId).queryKey,
})
```

낙관적 업데이트에 실패할 경우를 대비해 이전 데이터를 저장하고,

```ts
const previousSessionData = context.client.getQueryData(
  sessionQueries.detail(sessionId).queryKey,
)
```

서버 요청이 성공할 것이라고 가정해 캐시의 `liked` 값을 즉시 반대로 변경한다. 사용자는 클릭과 동시에 UI가 바뀌는 것을 확인할 수 있다.

```ts
if (previousSessionData) {
  context.client.setQueryData(
    sessionQueries.detail(sessionId).queryKey,
    (oldData) => {
      if (!oldData) return oldData
      return {
        ...oldData,
        liked: !liked,
      }
    },
  )
}
```

변경 직전 데이터를 다른 콜백 함수들에게 전달하기 위해 앞서 저장한 데이터를 리턴한다.

```ts
return { previousSessionData }
```

#### onError

찜 요청을 보내던 중 오류가 발생한다면 캐시를 변경 직전의 데이터로 다시 돌려놓는다.

```ts
onError: (error, variables, onMutateResult, context) => {
  if (onMutateResult?.previousSessionData) {
    context.client.setQueryData(
      sessionQueries.detail(variables.sessionId).queryKey,
      onMutateResult.previousSessionData,
    )
  }
},
```

#### onSettled

`onSettled` 함수는 요청 성공/실패 여부와 상관없이 마지막에 실행된다. 이때 관련 데이터를 갱신해야 한다.  
따라서 세션 상세, 세션 목록, 내 찜 목록 캐시를 무효화해 서버의 최신 데이터로 다시 맞춘다.

```ts
onSettled: (data, error, variables, onMutateResult, context) => {
  context.client.invalidateQueries({
    queryKey: sessionQueries.detail(variables.sessionId).queryKey,
  })
  context.client.invalidateQueries({
    queryKey: sessionQueries.lists(),
  })
  context.client.invalidateQueries({
    queryKey: userQueries.me.likeAll(),
  })
},
```

## React 19의 `useOptimistic`

### 등장 배경 - 나이브(naive)한 낙관적 업데이트

요청 전에 setState로 UI를 먼저 바꾸고, 서버 응답이 오면 그때마다 다시 setState로 맞추는 방식을 의미한다.  
전형적인 나이브 코드 형태는 다음과 같다:

```ts
const [liked, setLiked] = useState(false)

async function onClick() {
  // 1️⃣ UI를 먼저 바꿈
  setLiked((prev) => !prev)

  try {
    // 2️⃣ 서버 요청
    const result = await toggleLike()

    // 3️⃣ 서버 응답으로 다시 동기화
    setLiked(result.liked)
  } catch (e) {
    // 4️⃣ 실패 시 되돌림
    setLiked((prev) => !prev)
  }
}
```

이 방식은 너무 많은 전제를 암묵적으로 깔고 있다:

- 요청은 항상 하나씩만 날아간다 (❌, 사용자는 연타한다)
- 서버 응답은 항상 요청 순서대로 온다 (❌, 네트워크는 순서를 보장하지 않는다)
- 실패 시 `prev`를 뒤집으면 원래 상태로 돌아간다 (❌, 그 사이 다른 클릭이 상태를 바꿨다면 엉뚱한 값으로 돌아간다)
- 이 컴포넌트만 이 상태를 쓴다 (❌)

여기에 Concurrent React에서는 transition 안의 업데이트가 중단되거나 나중에 반영될 수 있기 때문에, 언제 UI가 바뀌고 서버 응답이 언제 덮어쓸지 예측하기가 더 어려워진다. 그래서 UI 깜빡임(flicker), 상태가 왔다갔다 하는 현상과 같은 버그가 생길 수 있다.

> **Concurrent React란**
>
> React가 렌더링을 '순차적으로'가 아니라 '중단·재개·우선순위 조정'하면서 수행하는 실행 모델을 말한다.
>
> React 17까지는 이런 흐름이어서:
>
> - `상태 변경 → 렌더링 시작 → 끝날 때까지 멈추지 않음 → 커밋`
>
> 렌더링이 느릴 경우, 클릭·입력·스크롤 같은 유저 행동이 막히게 된다.
>
> React 18부터 도입된 Concurrent Rendering(동시 렌더링)에서는, `startTransition` 등으로 표시한 업데이트가 이렇게 동작한다:
>
> - `상태 변경 → 렌더링 시작 → (더 급한 업데이트 발생!) → 렌더링 중단 → 급한 업데이트 먼저 처리 → 다시 렌더링 → 필요 없으면 폐기`
>
> 즉, 렌더링이 한 번에 끝내는 작업이 아니라 **우선순위에 따라** 여러 렌더링 작업을 번갈아 가며 진행할 수 있게 된 것이다.
>
> - 우선순위: `긴급 업데이트(클릭, 입력) > transition으로 표시한 업데이트(화면 전환, 무거운 목록 렌더링 등)`

이 지점에서 `useOptimistic`가 필요해졌다.

```ts
const [optimistic, addOptimistic] = useOptimistic(base, reducer)
// base = 서버 기준 상태
// optimistic = 임시 UI 상태
```

[React 공식 문서](https://react.dev/reference/react/useOptimistic) 기준으로 `useOptimistic`은 다음과 같이 동작한다.

- **Action(transition) 안에서** `addOptimistic`을 호출하면, 작업이 끝나기 전에도 UI에 낙관 상태를 즉시 보여준다
- 낙관 상태는 **Action이 진행 중인 동안에만** 렌더링되고, 끝나면 `base` 값이 렌더링된다
- 그래서 실패해서 `base`가 바뀌지 않았다면, 별도의 롤백 코드 없이 원래 상태로 돌아간다
- Action 밖에서 호출하면 경고와 함께 낙관 상태가 잠깐 보였다가 바로 사라진다

[React 19 `useOptimistic` Deep Dive](https://dev.to/a1guy/react-19-useoptimistic-deep-dive-building-instant-resilient-and-user-friendly-uis-49fp) 글의 "First-class citizen"으로 만들었다는 표현처럼, 낙관적 업데이트 패턴이 공식적으로 인정받고 프레임워크 차원에서 직접 지원받는 개념이 된 것이다.

### `useOptimistic`는 낙관적 업데이트를 단순화했을까?

`useOptimistic` 훅을 사용해 더 단순하게 낙관적 업데이트를 구현할 수 있게 되었을까?  
`useOptimistic`은 transition 안에서도 UI를 바로 업데이트하고 롤백을 대신 처리해주지만,  
여러 비동기 요청 간의 순서를 판단하지는 않기 때문에 여전히 race condition을 막지 못한다.

> **race condition이란**
>
> 여러 비동기 작업이 동시에 실행될 때, 응답이 도착하는 순서가 보장되지 않아 UI 상태가 엉키는 현상이다.
>
> 1. A 요청 → (응답 느림)
> 2. B 요청 → (응답 빠름)
> 3. 응답 B 먼저 도착 → UI 업데이트
> 4. 응답 A 나중에 도착 → UI가 다시 A 결과로 덮어써짐
>
> 이처럼 원래 의도(가장 최근 요청 결과)가 아닌 뒤늦게 도착한 응답이 UI를 덮어써서 잘못된 상태가 되는 것을 말한다.

이 글을 쓰게 된 결정적인 계기인 [useOptimistic Won't Save You](https://www.columkelly.com/blog/use-optimistic) 글에서는 체크박스를 지연 시간이 랜덤한 환경에서 연타하는 예제로 이 문제를 보여준다.

- `useOptimistic`만으로는 연타 시 UI가 서버 상태와 어긋날 수 있다
- `useActionState`까지 함께 쓰면 요청이 순서대로 처리되어 동작은 하지만, 그러려면 여러 API의 동작 방식을 동시에 이해해야 한다
- 결국 이 API들이 낙관적 UI 구현을 크게 단순화하지는 않으며, 직접 조합하기보다 이를 내부에서 처리해주는 라이브러리·프레임워크에 맡기는 편이 낫다

## 우리가 선택한 해결 방식

우리는 React Query의 mutation lifecycle을 사용해 **서버 상태 캐시를 기준**으로 UI를 먼저 반영하고, 실패 시 캐시 스냅샷으로 복구하며, `invalidate`를 통해 최종적으로 서버와 동기화하는 방식을 선택했다.
이는 `useOptimistic`을 사용했을 때 고려해야 하는 복잡한 부분을 **React Query의 책임**으로 넘기는 구조였다.

즉, 다음과 같은 부분을 컴포넌트에서 직접 관리하지 않고:

- transition 안에서 호출해야 하는 규칙
- optimistic 렌더링 타이밍
- 롤백 시점

React Query의 mutation lifecycle로 역할을 나눴다:

- `cancelQueries` → 진행 중인 조회 응답이 낙관적 업데이트를 덮어쓰는 것 방지
- snapshot → rollback
- `invalidate` → 서버를 단일 진실로 유지

### 남은 한계: mutation끼리의 race condition

글을 정리하며 다시 살펴보니, `cancelQueries`가 막아주는 것은 **조회 요청과 mutation 사이의 충돌**까지였다.  
찜 버튼을 빠르게 두 번 누르면 **mutation 두 개가 동시에 진행**되고, 이때는 다음과 같은 일이 생길 수 있다.

1. 첫 번째 클릭(찜) → 캐시 `liked: true`
2. 두 번째 클릭(찜 취소) → 캐시 `liked: false`
3. 첫 번째 요청 완료 → `onSettled`에서 세션 상세 `invalidate` → 다시 조회
4. 두 번째 요청이 끝나기 전에 조회 응답이 도착 → 캐시가 서버 기준 `liked: true`로 돌아감
5. 두 번째 요청 완료 → 다시 조회 → `liked: false`

사용자 입장에서는 하트가 **꺼졌다 → 켜졌다 → 꺼지는** 깜빡임을 보게 된다.  
[TkDodo의 글](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)에서는 이 문제를 `mutationKey`로 같은 종류의 mutation을 묶고, **다른 mutation이 진행 중이면 invalidate를 미루는** 방식으로 해결한다.

```ts
useMutation({
  mutationKey: ['session', 'like'],
  // ...
  onSettled: (data, error, variables, onMutateResult, context) => {
    // onSettled 시점에는 자기 자신도 아직 진행 중으로 집계되므로 1과 비교한다
    if (context.client.isMutating({ mutationKey: ['session', 'like'] }) === 1) {
      context.client.invalidateQueries({
        queryKey: sessionQueries.detail(variables.sessionId).queryKey,
      })
    }
  },
})
```

마지막 mutation이 끝났을 때만 서버와 다시 동기화하기 때문에, 중간 응답이 낙관 상태를 되돌리지 않는다.  
React Query에 위임했다고 동시성 문제가 자동으로 사라지는 것은 아니고, **어떤 충돌을 어떤 도구로 막는지** 알고 써야 한다는 점을 다시 확인했다.

### 그렇다면 `useOptimistic`는 언제 쓰는 게 맞을까?

useOptimistic은

- 폼 submit 같이 요청이 겹칠 확률이 적은 '단발성 액션'이나 (요청이 직렬적: submit → 완료)
- 댓글 작성, 메시지 전송, 게시글 작성과 같은 '임시 항목 추가'에 적합하다. (동일 리소스를 수정하지 않음)

이유는, 임시 항목의 정체성이 명확하고 서버 상태와 충돌이 없기 때문이다.
서버 응답이 오면 교체 또는 제거하면 되고, 기존 데이터를 덮어쓸 위험이 없으며, 실패 시 그냥 제거하거나 사용자에게 오류 메시지를 보여주는 등 단순하게 처리 가능하다. 즉, 정합성 문제보다 UX가 중요한 경우에 useOptimistic을 고려할 수 있다.

반대로 동일 리소스를 반복 수정하는 좋아요/팔로우 기능이나, 빠른 연속 클릭이 가능한 토글 버튼, 캐시 기반 UI(invalidate 필요)에는 적합하지 않다. 이 경우에는 우리가 사용했던 패턴처럼 React Query의 캐시와 mutation lifecycle을 활용하되, 위의 동시 mutation 처리까지 함께 고려하는 것이 바람직하다.

## 정리

useOptimistic는 낙관적 UI를 단순화해주는 만능 도구가 아니다.
Concurrent React 환경에서는 낙관적 업데이트 자체가 단순한 setState 문제가 아니라
렌더링 우선순위, 요청 순서, 롤백 시점까지 함께 고려해야 하는 문제로 바뀌었기 때문이다.

useOptimistic는 이러한 환경에서 "UI를 먼저 보여주고, 이후 상태를 정리하는 패턴"을 React 차원에서 공식적으로 지원하기 위해 등장했다.
하지만 race condition이나 서버 상태 정합성까지 해결해주지는 않는다.

우리 프로젝트에서는 이 복잡함을 컴포넌트 레벨에서 직접 책임지기보다, React Query의 mutation lifecycle에 위임하는 선택을 했다.

- optimistic UI는 cache snapshot으로 처리하고
- 실패 시 rollback 기준을 명확히 하며
- invalidate를 통해 서버를 단일 진실(source of truth)로 유지한다
- 동시에 진행되는 mutation은 `isMutating`으로 마지막 요청까지 기다린 뒤 동기화한다

결과적으로 우리는 낙관적 UI 자체보다 **"어디까지를 React의 책임으로 둘 것인가"를 선택한 셈이다.**
useOptimistic는 분명 의미 있는 API지만, 모든 낙관적 업데이트에 적용할 도구는 아니다. 상황에 따라, 오히려 더 높은 수준의 추상화가 동시성 환경에서 더 안전한 선택이 될 수 있다. 다만 그 추상화가 무엇을 막아주고 무엇을 막아주지 않는지는 여전히 직접 알고 있어야 한다.
