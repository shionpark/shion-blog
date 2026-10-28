---
title: "세션 필터를 URL로 옮기고 크루 상세를 섹션별로 쪼갰다"
description: "Run Fit에서 세션 필터 상태를 URL 쿼리로 옮기고, 크루 상세 페이지의 Suspense를 섹션 단위로 나눈 기록."
date: "2026-08-13"
tags: ["UX 설계", "Run Fit", "로딩"]
published: false
---

## 문제 두 가지

Run Fit은 지역 기반으로 러닝 크루와 세션을 찾는 서비스다. 세션 목록에는 정렬, 레벨, 지역, 날짜, 시간 필터가 있다. 이 필터에 문제가 두 가지 있었다.

**필터가 URL에 없었다.** URL을 공유하면 필터가 풀리고, 뒤로 가면 이전 검색 조건이 사라졌다.

**크루 상세가 한꺼번에 떴다.** 한 Suspense 안에 여러 요청이 묶여 있어서 빨리 오는 데이터도 가장 느린 데이터가 올 때까지 스피너 뒤에 있었다.

## 필터의 기준을 URL로

12월 18일에 `useSessionFilters` 훅과 `SessionFilterBar`를 만들었다. 필터 상태를 따로 들고 있지 않고, 현재 필터는 `useSearchParams()`에서 계산한다.

```typescript
const filters: SessionFilterState = useMemo(() => {
  // city, district, dateFrom, dateTo, timeFrom, timeTo, level, sort를
  // searchParams에서 읽어 필터 객체로 만든다
  ...
}, [searchParams]);

const applyFilters = (next: SessionFilterState) => {
  const params = new URLSearchParams();
  if (level) params.set('level', level);
  if (sort) params.set('sort', sort);
  // 지역은 city/district를 쌍으로 append
  ...
  router.push(`/sessions?${params.toString()}`);
};
```

URL이 바뀌면 `filters`가 다시 계산되고, API에 보낼 쿼리 객체(`queryFilters`)도 여기서 만든다. 지역은 시/도와 구가 짝이라 `city`와 `district`를 같은 순서로 쌓고, 읽을 때 둘의 개수가 같을 때만 유효한 지역으로 본다. 이렇게 하면 URL을 보내면 같은 조건이 재현되고, 뒤로 가기에 필터 상태가 남는다.

대가는 직렬화와 파싱 코드다. `useState`에 담으면 몇 줄이면 될 것을 날짜와 시간, 지역까지 문자열로 오가는 코드를 썼다. 공유할 수 있어야 하는 상태라서 감수했다.

## 모달 안의 임시 상태

필터는 모달에서 고른다. 모달 안에서 조건을 바꿀 때마다 URL이 바뀌면 안 되고, "적용"을 눌렀을 때 한 번만 바뀌어야 한다. 12월 19일에 `SessionFilterProvider`를 만들어 모달 안에서는 `draft` 상태를 쓰고, 적용할 때 `applyFilters`로 URL에 반영한다. URL의 필터가 바뀌면(`initialFilters`) `draft`도 거기에 맞춰 다시 채운다.

## 크루 상세를 섹션별로

12월 29일에 크루·세션 페이지에 ErrorBoundary와 Suspense를 넣었고, 1월 5일에 크루 상세 페이지를 섹션별 Suspense로 쪼갰다(`CrewDetailContent`, `CompletedSessions`, `CrewReviews` 등과 각각의 스켈레톤).

크루 정보와 멤버는 먼저 보이고, 모집 중 세션, 완료된 세션, 리뷰는 각자 스켈레톤을 보이다가 준비되면 채워진다. 느린 섹션이 빠른 섹션을 붙잡지 않는다.

`useSuspenseQuery`를 쓰는 건 팀원이 12월 말에 `@suspensive/react-query`를 도입해 둔 위에서 한 작업이다. 쿼리 쪽(`sessionQueries`, `placeholderData`, `staleTime`)도 다른 팀원이 만든 것이다. 나는 경계를 어디에 둘지와 스켈레톤을 맡았다.

경계 위치는 하나씩 정해야 했다. 페이지 전체를 감싸면 느린 데이터가 빠른 데이터를 막고, 컴포넌트마다 감싸면 스켈레톤이 흩어져 산만하다. 사용자가 먼저 봐야 하는 정보 단위로 나눴다. 크루 정보와 멤버가 먼저, 세션과 리뷰는 따로.