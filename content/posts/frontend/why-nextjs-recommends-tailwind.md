---
title: "Next.js는 왜 Tailwind를 권장할까?"
description: "Next.js가 Tailwind CSS를 권장하는 이유를 SSR 호환성, 정적 최적화, 개발 경험 관점에서 분석합니다."
date: "2025-07-04"
tags: []
published: true
---

Next.js 공식 문서를 보면 스타일링 옵션 중 **TailwindCSS**를 가장 먼저 추천하는 경우가 많다. 왜 그럴까? 단순히 유행하는 라이브러리라서가 아니라, **Next.js의 렌더링 전략과 잘 맞아떨어지는 특성**이 있기 때문이다.

---

## **1. CSS-in-JS의 한계와 런타임 비용**

과거에는 styled-components나 emotion 같은 CSS-in-JS 라이브러리가 많이 사용됐다.
나 또한 React 프로젝트에서 CSS-in-JS를 주로 사용했다.

이 방식은 컴포넌트 단위로 스타일을 정의하고 props에 따라 동적으로 CSS를 생성할 수 있다는 장점이 있었다. 하지만 Next.js 같은** SSR(서버 사이드 렌더링) 환경에서는 문제가 발생**한다.

- **런타임 비용**: 매 요청마다 스타일을 생성해야 하므로 서버 성능에 부담이 된다.
- **Hydration 불일치**: 서버에서 생성된 CSS와 클라이언트에서 생성된 CSS가 달라지면 경고가 발생한다.
- **번들 크기 증가**: 런타임 스타일 처리 코드가 추가되어 최적화에 불리하다.
즉, CSR 시절에는 CSS-in-JS가 편리했지만, SSR/SSG를 사용하는 Next.js에서는 불리한 점이 많아졌다.

---

## **2. TailwindCSS의 장점: 정적 클래스 기반**

TailwindCSS는 **Utility First** 스타일링 방식이다.

미리 정의된 클래스(예: flex, bg-blue-500, mt-4)를 조합해 스타일을 구성한다. 이 방식은 Next.js와 특히 잘 맞는다.

- **정적 빌드**: Tailwind는 빌드 타임에 사용된 클래스만 추출(Purge)하여 최적화된 CSS 파일을 생성한다. → **SSR 환경에서 추가 연산이 없다.**
- **Hydration 안정성**: 서버와 클라이언트가 같은 정적 클래스 문자열을 렌더링하므로 불일치가 발생하지 않는다.
- **번들 최소화**: 사용하지 않는 클래스는 제거되므로 최종 CSS 크기가 작다.
---

## **3. 개발 경험(Developer Experience)**

Next.js는 빠른 개발 사이클과 DX를 중요하게 생각한다. Tailwind는 이 철학에 부합한다.

- **즉시성**: JSX 코드 안에서 바로 스타일링 가능 → 별도 CSS 파일 관리 부담 감소
- **일관성**: 디자인 시스템을 클래스 단위로 강제하므로, 협업 시 스타일 편차가 줄어든다
- **생산성**: VSCode 플러그인, 자동완성, 테마 설정 등 개발 경험을 크게 개선한다
---

## **4. Next.js와 Tailwind의 “철학적 궁합”**

Next.js가 추구하는 건 **최적화된 웹 경험**이다.

- 서버와 클라이언트가 일치하는 안정적인 Hydration
- 작은 번들 사이즈
- 빠른 빌드와 배포
Tailwind는 런타임에 추가 로직을 거의 남기지 않고, 빌드 시점에 모든 스타일을 확정한다. 이는 Next.js의 SSR/SSG 환경과 **철학적으로 가장 잘 맞는 스타일링 도구**다.

---

## **5. 내 경험: CSS-in-JS 남용에서 배운 점**

Gymlight 프로젝트 초기에는 styled-components를 사용했다.

props에 따라 조건부 스타일을 쉽게 처리할 수 있었지만, 점점 **코드가 무거워지고, 빌드 성능과 유지보수성이 떨어졌다.**

반대로 Tailwind를 써보니, 클래스 네이밍 고민 없이 **빠르고 가벼운 스타일링**이 가능했다. Next.js와의 SSR 환경에서도 안정적으로 동작했다.

---

## **결론**

Next.js가 Tailwind를 권장하는 이유는 단순히 트렌드 때문이 아니다.

- **SSR 친화적** (Hydration 문제 없음)
- **정적 최적화** (번들 크기 감소)
- **빠른 개발 경험** (DX 강화)
즉, **Next.js의 목표인 “빠르고 안정적인 웹”과 Tailwind의 정적 클래스 기반 철학이 잘 맞아떨어지기 때문**이다.



# 스타일 코드: Utility First CSS vs. CSS-in-JS

# Next.js의 Hydration

# 브라우저의 렌더링 과정

# 왜 최근 들어 CSR → SSR 가 유행일까?

# 과거 CSS-in-JS를 남용했던 경험

## 참고 링크

[https://velog.io/@shinhw371/CSS-why-Nextjs-recommand-Tailwind](https://velog.io/@shinhw371/CSS-why-Nextjs-recommand-Tailwind)

[https://stitchcoding.tistory.com/59](https://stitchcoding.tistory.com/59)

[https://velog.io/@houndhollis/Next-%EC%97%90%EC%84%9C-Tailwind%EB%A5%BC-%EA%B6%8C%EC%9E%A5%ED%95%98%EB%8A%94-%EC%9D%B4%EC%9C%A0with-CSS-in-JS](https://velog.io/@houndhollis/Next-%EC%97%90%EC%84%9C-Tailwind%EB%A5%BC-%EA%B6%8C%EC%9E%A5%ED%95%98%EB%8A%94-%EC%9D%B4%EC%9C%A0with-CSS-in-JS)

[https://velog.io/@hamjw0122/Next.js-Hydration](https://velog.io/@hamjw0122/Next.js-Hydration)
