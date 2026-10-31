---
title: "FSD는 만병 통치약이 아니다"
description: "Run Fit 팀에서 도메인 기준 폴더 구조를 제안했다가 그게 FSD가 아니라는 걸 확인하고, 팀 구조를 유지한 채 Next.js 관례 안에서 같이 바뀌는 코드를 가까이 두는 쪽으로 정리한 과정."
date: "2026-01-07"
tags: ["FSD", "폴더 구조", "Next.js", "협업"]
published: true
---

Run Fit은 4명이 만든 러닝 크루 탐색 서비스다. 프로젝트 초반에 폴더 구조를 정할 때 FSD(Feature-Sliced Design)도 이야기에 나왔지만 적용하지 않았다. 2주쯤 뒤 나는 도메인 기준 구조를 제안하면서 "FSD와 비슷한 구조"라고 썼는데, 문서를 다시 읽어 보니 내 구조는 FSD가 아니었다. 그 과정을 정리했다.

## 처음 정한 구조

폴더 구조는 프로젝트 첫 주에 팀이 같이 이야기하며 정했고, 준영 님이 PR로 정리했다([#16](https://github.com/runfit26/run-fit/pull/16)). `app` 아래에 페이지를 두고, 공용 컴포넌트는 `components` 아래에 ui, composite처럼 역할별로 나눴다.

컴포넌트가 늘면서 한 폴더에 같은 계층으로 쌓이는 게 불편해졌다. 그래서 컴포넌트 폴더 규칙을 정하자는 이슈를 올렸다([#127](https://github.com/runfit26/run-fit/pull/127)). 대표 파일을 `index.tsx`로 둘지, `Button.tsx`를 두고 re-export용 `index.ts`를 따로 둘지, 상위 폴더에 barrel 파일을 둘지를 비교했다. 상위 barrel은 팀 회의에서 뺐다.

나는 대표 컴포넌트를 `index.tsx`로 통일했다([#128](https://github.com/runfit26/run-fit/pull/128)). Next.js는 폴더 이름으로 개념을 나타내고, 안의 파일은 `page.tsx`, `layout.tsx`처럼 역할 이름으로 둔다. 컴포넌트도 같은 규칙을 따르면 레포 전체가 한 방식으로 읽힌다고 봤다.

```
Button/
 ┣ Button.stories.tsx
 ┣ Button.test.tsx
 ┗ index.tsx
```

## 도메인 기준 구조를 제안했다

진우 님이 크루 API에 Query Factory를 도입한 PR([#130](https://github.com/runfit26/run-fit/pull/130))에서 query와 mutation을 어디에 둘지 이야기가 나왔다. query는 `src/queries`에, mutation 훅은 `src/hooks`에 있어서 같이 바뀌는 코드가 멀리 떨어져 있다는 의견이었다.

나는 그때 회원가입과 세션 생성 폼에 Zod 검증을 붙이고 있었다. 작업해 보니 폼 컴포넌트, 폼 훅, 검증 스키마, API 호출이 늘 같은 도메인 안에서 같이 바뀌었다. 로그인 폼이 스키마를 `../../../libs/auth/userSchema`처럼 먼 경로에서 가져오는 것도 어색했다. path alias는 프로젝트 초기에 내가 설정해 두었으니([#13](https://github.com/runfit26/run-fit/pull/13)) 경로는 줄일 수 있었다. 하지만 같이 바뀌는 파일이 떨어져 있다는 사실은 그대로였다.

그래서 앞선 댓글에서 정리된 역할 구분(queryKey, fetch, query, mutation)을 이어받아, 도메인 폴더 안에 api, components, hooks, validations를 함께 두는 구조를 제안했다.

```
features/
 ┣ auth/
 ┃ ┣ api
 ┃ ┣ components
 ┃ ┣ hooks
 ┃ ┗ validations
 ┗ crews/
   ┣ api
   ┃ ┣ crew.keys.ts        // queryKey factory
   ┃ ┣ crew.fetch.ts       // 서버 통신
   ┃ ┣ crew.queries.ts     // 조회
   ┃ ┗ crew.mutations.ts   // 변경과 캐시 무효화
   ┣ components
   ┣ hooks
   ┗ validations
```

댓글에는 "고려했다가 적용하지 않았던 FSD 형태와 비슷한 구조"라고 덧붙였다.

## 내 구조는 FSD가 아니었다

팀은 준영 님이 낸 안대로 `src/api` 아래에 `fetch`, `queries`, `mutations`를 나눠 두기로 했다. 진우 님도 FSD를 고려해 봤지만, 이미 구조가 잡힌 지금 시점에 도입하기는 어렵겠다고 했다.

```
src/api/
 ┣ fetch/       // API 호출 함수
 ┣ queries/     // Query Factory
 ┗ mutations/   // Mutation 훅
```

그 뒤 FSD 문서의 React Query 가이드를 읽었다. FSD는 app, pages, widgets, features, entities, shared 같은 레이어를 두고, 각 레이어는 자기보다 아래 레이어만 가져다 쓸 수 있게 의존 방향을 정한다. 레이어 안은 다시 slice와 segment로 나눈다. 내가 제안한 건 도메인별로 폴더를 묶었을 뿐, 레이어도 의존 규칙도 없었다. FSD라기보다 기능별로 코드를 모아 두는 co-location에 가까웠다.

같은 PR에서 찾은 글도 생각을 바꾸는 데 영향을 줬다. TanStack Query 메인테이너 Dominik Dorfmeister는 queryKey와 queryFn을 떨어뜨려 둔 것이 실수였다고 말한다. queryKey는 queryFn의 의존성을 나타내니 둘은 함께 있어야 한다는 것이다. 진우 님의 Query Factory는 키와 함수를 한 객체에 같이 둔다. 폴더를 어떻게 나누든, 가장 같이 바뀌는 두 코드는 이미 붙어 있었다.

## 팀 구조 안에서 정리한 것

팀 구조는 그대로 쓰기로 했다. 대신 "같이 바뀌는 코드는 가까이 둔다"는 생각은 Next.js 관례 안에서 풀었다.

세션 필터를 리팩토링하던 중, 페이지마다 컴포넌트 위치가 제각각이라 코드를 찾기 어려웠다. 석준 님이 세션 생성 페이지에서 먼저 쓴 Next.js private folder 패턴([#248](https://github.com/runfit26/run-fit/pull/248))을 따라, 그 페이지에서만 쓰는 컴포넌트를 페이지 옆 `_components`로 옮겼다([#330](https://github.com/runfit26/run-fit/pull/330)). `_`로 시작하는 폴더는 라우트에 포함되지 않는다.

```
app/sessions/
 ┣ _components/   // 세션 목록 페이지에서만 쓰는 컴포넌트
 ┗ page.tsx
```

세션과 크루는 지역 필터 요구사항도 달랐다. 세션은 시·군·구 단위까지, 크루는 시 단위로만 거른다. 그래서 `RegionFilter`를 `SessionRegionFilter`와 `CrewRegionFilter`로 나눠 이름에 도메인을 드러냈다.

## 돌아보며

내 제안은 FSD라는 이름을 빌렸지만, 실제로 원한 건 같이 바뀌는 코드를 가까이 두는 것이었다. 이름을 먼저 붙이면 그 이름이 요구하는 규칙까지 같이 들어온다. FSD의 레이어와 의존 규칙은 구조가 커질 때 도움이 되지만, 진우 님 말대로 구조가 이미 잡힌 중간 시점에 들이면 옮기는 비용이 크다.

팀이 정한 구조가 내 안보다 나쁘지 않다면, 그 구조를 바꾸기보다 안에서 원하는 걸 이룰 방법을 찾는 편이 빨랐다. `index.tsx` 규칙과 `_components`가 그렇게 나온 결과다.

## 참고 링크

- [Feature-Sliced Design: Usage with React Query](https://feature-sliced.design/kr/docs/guides/tech/with-react-query)
- [Query Factory: queryKey factory에서 Query Factory로의 전환](https://5kdk.github.io/blog/2025/04/04/query-factory)
- [Next.js: Project structure, Private folders](https://nextjs.org/docs/app/getting-started/project-structure#route-groups-and-private-folders)
