---
title: "Next.js는 왜 Tailwind를 권장할까?"
description: "Next.js 공식 문서가 Tailwind를 먼저 소개하는 이유를 App Router의 서버 컴포넌트 제약과 빌드 방식으로 정리하고, Emotion과 Tailwind를 쓴 프로젝트에서 실제로 달랐던 점을 비교한다."
date: "2025-07-04"
tags: ["Next.js", "Tailwind CSS", "CSS-in-JS", "Emotion"]
published: true
---

Next.js 공식 문서의 CSS 가이드는 Tailwind CSS, CSS Modules, Global CSS, Sass, CSS-in-JS를 소개하는데, 그중 Tailwind를 가장 먼저 다룬다. `create-next-app`도 Tailwind를 권장 기본값에 넣었다. 헬스장 관리 시스템에서는 Emotion을, 이후 Next.js 프로젝트 두 곳에서는 Tailwind를 쓰면서 이 차이가 어디서 오는지 정리했다.

## 런타임 CSS-in-JS가 서버 렌더링에서 하는 일

Emotion이나 styled-components는 컴포넌트가 렌더링될 때 스타일 문자열을 만들고, 클래스 이름을 생성해 `<style>` 태그로 넣는다. 브라우저에서만 렌더링하는 앱이라면 이 일은 브라우저가 한다. 서버에서 렌더링하면 같은 일을 요청마다 서버가 하고, 만든 스타일을 HTML에 실어 보내는 설정도 따로 해야 한다.

여기에 Hydration이 걸린다. Hydration은 서버가 보낸 HTML에 React가 이벤트 핸들러를 붙여 화면이 동작하게 만드는 과정이다. 서버에서 렌더링한 결과와 클라이언트에서 처음 렌더링한 결과가 다르면 React는 경고를 내고 그 부분을 다시 그린다. 스타일 수집 설정이 빠지면 서버 HTML에는 스타일이 없다가 클라이언트에서 붙으면서 화면이 깜빡이거나, 생성된 클래스 이름이 서로 어긋날 수 있다.

## App Router에서 생긴 제약

App Router는 컴포넌트를 기본적으로 서버 컴포넌트로 렌더링한다. 서버 컴포넌트에서는 훅과 Context를 쓸 수 없어서, 런타임에 테마를 읽고 스타일을 만드는 CSS-in-JS는 클라이언트 컴포넌트에서만 쓸 수 있다.

공식 문서의 CSS-in-JS 가이드는 App Router에서 쓰려면 세 가지를 직접 설정하라고 안내한다. 렌더링 중 CSS 규칙을 모으는 style registry, 그 규칙을 콘텐츠보다 먼저 넣는 `useServerInsertedHTML` 훅, 첫 서버 렌더링에서 앱을 registry로 감싸는 클라이언트 컴포넌트다. 같은 문서에서 Emotion은 아직 지원 작업 중인 라이브러리로 분류돼 있다.

반면 vanilla-extract나 Panda CSS처럼 빌드할 때 CSS 파일을 뽑아내는 라이브러리는 지원 목록에 있다. 문제는 CSS-in-JS라는 작성 방식이 아니라, 스타일을 런타임에 만든다는 점이다.

## Tailwind는 빌드할 때 끝난다

Tailwind는 빌드할 때 소스 파일을 훑어 실제로 쓴 유틸리티 클래스만 모아 CSS 파일을 만든다. 컴포넌트에는 `flex mt-4` 같은 클래스 문자열만 남고, 런타임에 스타일을 만드는 코드가 없다.

그래서 서버 컴포넌트에서 그대로 쓸 수 있다. 서버와 클라이언트가 같은 클래스 문자열을 렌더링하니 스타일 때문에 Hydration 결과가 달라질 일도 없다. 결과물이 정적 CSS 파일이라 브라우저 캐시도 그대로 쓴다.

## 대신 감수하는 것

Tailwind에도 비용이 있다.

- 클래스는 빌드할 때 소스에서 문자열 그대로 찾아낸다. `bg-${color}-500`처럼 조합한 이름은 결과 CSS에 들어가지 않는다. 상태에 따라 바뀌는 스타일은 완성된 클래스 이름을 조건문으로 고르거나 CSS 변수로 넘겨야 한다.
- 같은 속성을 건드리는 클래스가 둘 붙으면 `className`에 쓴 순서가 아니라 CSS 파일 안의 순서로 이긴다. 공용 컴포넌트를 바깥에서 덮어쓰게 하려면 `tailwind-merge` 같은 도구가 필요하다.
- 조건이 늘면 클래스 문자열이 길어져 읽기 어려워진다.

## 두 방식을 쓴 프로젝트

> 2026년 11월, 이후 프로젝트 경험을 덧붙였다.

헬스장 관리 시스템(Gymlight)은 React 18과 webpack으로 빌드한, 브라우저에서만 렌더링하는 앱이었다. 스타일은 Emotion으로 썼고 컴포넌트마다 `*.styles.tsx` 파일을 따로 두어 117개가 됐다. 테마는 디자인 시스템 패키지의 Provider로 내려 주고 `emotion.d.ts`로 타입을 선언했다. 서버 렌더링이 없었으니 위의 SSR·Hydration 문제는 겪지 않았다. 이 글에서 말한 이유는 Next.js처럼 서버에서 렌더링할 때 의미가 있다.

Run Fit과 인톡 파트너스는 Next.js App Router와 Tailwind CSS v4를 썼다. Run Fit은 클래스 충돌과 긴 문자열을 다루려고 `clsx`와 `tailwind-merge`를 묶은 `cn` 함수, 변형 스타일을 정의하는 `class-variance-authority`를 함께 썼다.

Run Fit의 Calendar 컴포넌트를 고칠 때 위의 두 번째 비용을 직접 다뤘다. today, range, outside 상태가 겹치는 날짜에서 어떤 스타일이 이길지를 클래스 나열 순서에 맡기지 않고, 조건문으로 우선순위를 표현했다.

```tsx
const isRange = isStart || isMiddle || isEnd

cn(
  isStart && 'bg-brand-300 text-brand-900 rounded-l-lg',
  isEnd && 'bg-brand-300 text-brand-900 rounded-r-lg',
  isMiddle && 'text-brand-200 rounded-none',
  isToday && !isRange && 'text-brand-300 font-medium', // range가 아닐 때만 today 강조
)
```

자세한 과정은 [Calendar 글](/posts/calendar)에 있다.

## 정리

Next.js가 Tailwind를 앞세우는 건 App Router가 서버 컴포넌트를 기본으로 삼으면서, 스타일을 런타임에 만드는 방식이 설정 부담과 제약을 안게 됐기 때문이다. Tailwind는 빌드할 때 CSS를 확정해서 그 제약을 피한다. 대신 동적 클래스와 클래스 충돌은 직접 다뤄야 한다. 서버 렌더링이 없는 앱이라면 Emotion도 충분한 선택이다. 고르는 기준은 라이브러리의 유행이 아니라 앱의 렌더링 방식이다.

## 참고 링크

- [Next.js 공식 문서: CSS](https://nextjs.org/docs/app/getting-started/css)
- [Next.js 공식 문서: How to use CSS-in-JS libraries](https://nextjs.org/docs/app/guides/css-in-js)
- [Tailwind CSS 공식 문서: Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Next.js Hydration](https://velog.io/@hamjw0122/Next.js-Hydration)
