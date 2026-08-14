---
title: "필터를 바꿀 때마다 화면이 멈추는 문제 — URL SSOT와 Suspense 경계 분리"
description: "Run Fit에서 필터 상태를 URL로 옮기고 섹션별 Suspense Boundary를 나눠 체감 속도를 높인 과정."
date: "2026-08-13"
tags: ["UX 설계", "Run Fit", "로딩"]
published: true
---

## 배경

Run Fit은 지역 기반으로 러닝 크루와 세션을 탐색하는 플랫폼이다. 지역, 요일, 시간대 등 필터를 조합해 원하는 크루와 세션을 찾는 구조인데 두 가지 문제가 있었다.

**필터 상태가 URL에 없었다.** 필터를 `useState`로 관리하고 있어서 URL을 공유하면 필터가 초기화됐고 뒤로가기를 누르면 이전 검색 조건이 날아갔다. 사용자 입장에서 "아까 본 조건으로 돌아가기"가 불가능했다.

**필터를 바꿀 때마다 전체 화면이 멈췄다.** 하나의 Suspense 안에 여러 데이터 요청이 묶여있어서 빠르게 응답하는 데이터까지 느린 데이터가 올 때까지 스피너 뒤에 숨었다.

## 필터 상태를 URL로 옮기기

`useSearchParams`를 필터 상태의 단일 진실 원천(SSOT)으로 정했다. 컴포넌트 내부에 필터 상태를 두지 않고 필터 변경 시 URL 쿼리 파라미터를 직접 업데이트한다.

```typescript
// hooks/session/useSessionFilters.ts
export const useSessionFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL에서 현재 필터 파생 — 별도 상태 없음
  const selectedDays = useMemo(
    () => searchParams.getAll('day') as DayOfWeek[],
    [searchParams],
  );

  const selectedTimeSlots = useMemo(
    () => searchParams.getAll('time') as TimeSlot[],
    [searchParams],
  );

  const applyFilters = useCallback(
    (filters: SessionFilterState) => {
      const params = new URLSearchParams();
      filters.days.forEach((day) => params.append('day', day));
      filters.timeSlots.forEach((time) => params.append('time', time));
      // ...지역 필터도 동일하게
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname],
  );

  return { selectedDays, selectedTimeSlots, applyFilters };
};
```

**URL(SearchParams)을 SSOT로 고정**하고 컴포넌트는 URL에서 현재 필터를 읽기만 한다. `useMemo`로 파생 상태를 만들기 때문에 URL이 바뀌면 필터가 자동으로 갱신된다.

이렇게 하면 공유(URL을 보내면 같은 필터 조건 재현), 뒤로가기(브라우저 히스토리에 필터 상태가 쌓임), 북마크(자주 쓰는 필터 조합 저장)가 웹 기본 동작 그대로 돌아간다.

`scroll: false` 옵션을 넣은 건 필터를 바꿨는데 페이지 맨 위로 튀어오르면 탐색 흐름이 끊기기 때문이다.

## 필터 모달의 임시 상태 분리

필터 UI가 모달 형태인데 모달 내부에서 필터를 조합하는 동안 URL이 계속 바뀌면 안 된다. 모달을 닫기 전에 여러 필터를 동시에 조정하고 "적용" 버튼을 누를 때 한 번에 URL을 업데이트해야 한다.

모달 내부는 임시 상태(draft)로 분리했다. 필터 모달이 열릴 때 현재 URL의 필터를 임시 상태로 복사하고 "적용" 시 `applyFilters`를 호출해서 URL을 한 번에 갱신한다. 임시 변경과 실제 적용이 분리되면서 FilterBar와 Modal의 역할도 나뉘었다.

## 섹션별 Suspense Boundary 분리

전체 페이지를 하나의 Suspense로 감싸는 대신, 데이터를 가져오는 각 섹션을 독립적인 Suspense Boundary로 분리했다. 크루 상세 페이지를 예로 들면 이런 구조다:

```text
Page (Suspense)
└─ CrewDetailContent
   ├─ Crew Info (useSuspenseQuery)
   ├─ Members (useSuspenseQuery)
   ├─ Suspense → RecruitingSessions (useSuspenseInfiniteQuery)
   ├─ Suspense → CompletedSessions (useSuspenseQuery)
   └─ Suspense (key={currentPage}) → CrewReviews (useSuspenseQuery)
```

기존에는 모든 데이터가 한 번에 로딩되어 한 섹션의 데이터가 느리면 전체 페이지가 늦게 렌더링됐다. 분리 후에는 크루 정보와 멤버 목록이 먼저 보이고 모집 중인 세션이나 리뷰는 각각 스켈레톤을 보여주다가 데이터가 준비되면 채워진다.

Suspensive 라이브러리의 `useSuspenseQuery`를 도입해 데이터 로딩을 선언적으로 처리했다. 기존 `useQuery` + `isLoading` 분기 대신, 컴포넌트가 데이터가 있다는 전제 아래 렌더링하고 로딩 상태는 상위 Suspense Boundary가 처리한다. 선택적 데이터(인증 필요, 조건부 로딩)에는 `useQuery + enabled`를 유지했다.

## 필터 전환 시 깜빡임 방지

필터를 바꿀 때 기존 목록이 사라지고 스켈레톤이 뜨는 게 거슬렸다. 데이터가 바뀌는 건 맞지만 이전 데이터를 보여주면서 새 데이터를 기다리는 편이 체감 속도가 낫다.

TanStack Query의 `placeholderData` 옵션으로 해결했다:

```typescript
// api/queries/sessionQueries.ts
export const sessionQueries = {
  list: (filters: SessionFilterParams) => ({
    queryKey: ['sessions', filters],
    queryFn: () => fetchSessions(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60,
  }),
};
```

`placeholderData: (previousData) => previousData`로 설정하면, 필터가 바뀌어도 이전 데이터가 자리를 지키고 있다가 새 데이터가 오면 교체된다. 사용자 눈에는 "필터를 바꿨더니 목록이 부드럽게 갱신됐다"로 보인다.

`staleTime: 1000 * 60` (1분)으로 설정해서 같은 필터 조합으로 돌아왔을 때 1분 이내면 캐시된 데이터를 바로 보여준다. 전역 기본값은 `staleTime: 5 * 60 * 1000` (5분)으로 설정했고 변경 빈도가 높은 데이터만 더 짧은 주기를 따로 지정했다. `refetchOnWindowFocus: false`로 탭 전환 시 불필요한 재요청도 방지했다.

## 트레이드오프

URL SSOT 방식은 컴포넌트 상태 vs URL 상태의 트레이드오프가 있다. `useState`가 개발은 편하지만 공유·뒤로가기가 깨지고 URL은 웹 기본 동작을 살리는 대신 파싱·직렬화 코드가 늘어난다. 필터처럼 공유 가능해야 하는 상태는 URL에 두는 게 맞다고 판단했다.

Suspense Boundary 위치 결정이 핵심 설계 판단이었다. 너무 넓으면(페이지 전체) 느린 데이터가 빠른 데이터를 블로킹하고 너무 좁으면(개별 컴포넌트마다) 스켈레톤이 산발적으로 나타나 시각적으로 산만하다. 사용자가 먼저 봐야 하는 정보 단위를 기준으로 경계를 그었다 — 크루 정보와 멤버는 즉시, 리뷰와 세션 목록은 독립적으로.

<!-- HUMANIZE-SUMMARY v1.6.1
run_id: 2026-08-14-002
metrics:
  char_in: 4680
  char_out: 4580
  change_rate: 2.1%
  self_check: 6/6
  grade: A
categories:  # before → after
  C-11 연결어미 뒤 쉼표: 10 → 0
  I-1 "~것이다" 결말: 1 → 0
  A-2 "~를 통해" 남발: 1 → 0
  J-2 따옴표 강조 과다: 8 → 3
  기타 "동작" 중복: 2 → 0
self_check:
  - 고유명사·수치·인용 100% 보존: pass
  - 변경률 30% 이하: pass (2.1%)
  - 장르 이탈 없음: pass
  - register 보존: pass (해라체 유지)
  - S1 잔존 0건: pass
  - 인공 표현 추가 없음: pass
highlights:
  - id: I-1
    before: "핵심은 URL(SearchParams)을 SSOT로 고정하고, 컴포넌트는 URL에서 현재 필터를 읽기만 하는 것이다."
    after: "URL(SearchParams)을 SSOT로 고정하고 컴포넌트는 URL에서 현재 필터를 읽기만 한다."
  - id: A-2
    before: "이 구조를 통해 '임시 변경'과 '실제 적용'이 완전히 분리됐고, FilterBar와 Modal의 역할이 명확히 나뉘었다."
    after: "임시 변경과 실제 적용이 분리되면서 FilterBar와 Modal의 역할도 나뉘었다."
  - id: C-11
    before: "묶여있어서, 빠르게 응답하는 / 초기화됐고, 뒤로가기를 / 블로킹하고, 너무 좁으면 등 10건"
    after: "연결어미 뒤 쉼표 전량 제거"
  - id: misc
    before: "웹의 기본 동작으로 자연스럽게 동작한다 / 웹의 기본 동작이 자연스럽게 동작하는"
    after: "웹 기본 동작 그대로 돌아간다 / 웹 기본 동작을 살리는"
  - id: desc
    before: "Run Fit에서 필터 상태를 URL로 옮기고, 섹션별 Suspense Boundary로 체감 속도를 개선한 과정을 정리한다."
    after: "Run Fit에서 필터 상태를 URL로 옮기고 섹션별 Suspense Boundary를 나눠 체감 속도를 높인 과정."
residual_findings: (없음)
grade_reason: "A — S1 0건, 변경률 2.1%, 자체검증 6항 통과. 기술 블로그 register 그대로."
-->
