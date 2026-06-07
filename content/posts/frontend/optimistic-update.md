---
title: "왜 useOptimistic 훅이 낙관적 업데이트를 단순화해주지 않는가"
description: "React 19의 useOptimistic이 Concurrent React 환경에서 race condition을 해결하지 못하는 이유와, React Query 기반 접근을 선택한 과정을 정리합니다."
date: "2026-01-22"
tags: ["Optimistic Update", "React19", "useOptimistic"]
published: true
---

## 낙관적 UI 업데이트란

낙관적 업데이트는 서버 요청 전에 UI를 미리 변경하는 기법입니다. 요청이 성공할 것이라 가정하고 사용자에게 즉각적인 반응을 제공합니다. 좋아요 버튼이나 장바구니 수량 변경 같은 기능에 사용되어 사용자 경험을 개선합니다.

## 현재 프로젝트에서의 구현

프로젝트에서는 React Query의 mutation lifecycle을 활용합니다:

- **mutationFn**: 찜 여부에 따라 서버에 다른 요청을 보낸다
- **onMutate**: 뮤테이션 실행 직전 실행되며 context를 반환. 이전 데이터를 저장하고 UI를 즉시 업데이트
- **onError**: 요청 실패 시 캐시를 이전 상태로 복구
- **onSettled**: 성공/실패 여부와 관계없이 관련 데이터를 무효화하고 갱신

## React 19의 useOptimistic

### 등장 배경

나이브한 접근법은 setState로 UI를 먼저 변경한 후 서버 응답으로 동기화합니다. 그러나 이 방식은 여러 가정을 암묵적으로 포함합니다:

- "요청은 항상 하나씩만 전송된다" — 사용자는 연타함
- "서버 응답은 요청 순서대로 온다" — 네트워크는 순서를 보장하지 않음
- "setState는 즉시 UI를 변경한다" — Concurrent React에서 렌더링 지연 가능

Concurrent React에서는 렌더링을 중단·재개·우선순위 조정하므로 단순한 상태 업데이트 순서 가정이 불가능합니다.

### useOptimistic은 낙관적 업데이트를 단순화했을까?

useOptimistic은 transition 내에서 UI를 즉시 업데이트하고 자동 롤백을 처리하지만, **여러 비동기 요청 간의 순서를 판단하지는 않기 때문에 여전히 race condition을 막지 못합니다.**

Race condition 예시:

1. A 요청(느린 응답) → B 요청(빠른 응답)
2. B 응답 먼저 도착
3. A 응답 나중에 도착해 B의 결과를 덮어씀

[useOptimistic Won't Save You](https://www.columkelly.com/blog/use-optimistic) 글에서도 다음을 지적합니다:

- useOptimistic은 낙관적 UI를 자동으로 해결해주지 않음
- Concurrent React 환경에서는 구현 난도가 올라감
- race condition, transition, 에러 처리를 직접 고려해야 함

## 우리가 선택한 해결 방식

프로젝트는 React Query의 mutation lifecycle을 기준으로 한 접근을 선택했습니다:

- **cancelQueries**: race 방지
- **snapshot**: 롤백 기준
- **invalidate**: 서버를 단일 진실로 유지

이 방식은 transition 우선순위, optimistic 렌더링 타이밍, 요청 순서를 직접 관리하지 않아도 됩니다.

## useOptimistic을 사용하기 적절한 경우

**적합한 경우:**
- 폼 submit 같이 요청이 겹칠 확률이 적은 단발성 액션
- 댓글 작성, 메시지 전송, 게시글 작성 같은 임시 항목 추가

**부적합한 경우:**
- 동일 리소스를 반복 수정하는 좋아요/팔로우 기능
- 빠른 연속 클릭이 가능한 토글 버튼
- 캐시 기반 UI (invalidate 필요)

## 정리

useOptimistic은 모든 낙관적 업데이트에 적용할 도구는 아닙니다. Concurrent React 환경에서 낙관적 업데이트는 단순 상태 문제가 아니라 렌더링 우선순위, 요청 순서, 롤백 시점을 함께 고려해야 합니다.

결과적으로 우리는 낙관적 UI 자체보다 **어디까지를 React의 책임으로 둘 것인가**를 선택한 셈입니다.
