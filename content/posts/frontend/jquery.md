---
title: "왜 우리는 더 이상 jQuery를 사용하지 않는가"
description: "실제 DOM에 직접 접근하지 않고 최소한으로 실제 DOM에 반영해 불필요한 Reflow/Repaint를 줄이고 성능을 최적화하는 방법"
date: "2025-03-14"
tags: []
published: true
---

웹 개발을 처음 시작하면 가장 먼저 듣게 되는 이름 중 하나가 [**jQuery**](https://jquery.com/)입니다. 한때는 DOM 조작과 Ajax 요청을 손쉽게 만들어주는 혁신적인 라이브러리였죠. 하지만 오늘날의 현대적인 웹 환경에서는 jQuery가 거의 사용되지 않습니다. 대신 React, Vue, Svelte 같은 프레임워크들이 주도권을 잡고 있죠. 

그렇다면 **왜 jQuery를 사용하지 않는 걸까?**

---

## **jQuery가 등장했던 배경**

2006년, 브라우저별 DOM API는 호환성이 낮고 코드 작성도 불편했습니다.

예를 들어, 단순히 버튼 클릭 이벤트를 걸어도 브라우저마다 문법이 달랐죠.

```typescript
// 과거 방식
document.getElementById("btn").attachEvent("onclick", handler); // IE
document.getElementById("btn").addEventListener("click", handler); // Firefox
```

jQuery는 이를 단일 API로 통일했습니다.

```typescript
// jQuery 방식
$("#btn").on("click", handler);
```

즉, *“적은 코드로 모든 브라우저에서 동작한다”*는 점에서 폭발적인 인기를 끌었습니다.

---

## **jQuery가 사라진 이유**

### **(1) 브라우저 표준 API의 발전**

이제는 [querySelector](https://developer.mozilla.org/ko/docs/Web/API/Document/querySelector), [addEventListener](https://developer.mozilla.org/ko/docs/Web/API/EventTarget/addEventListener), [fetch](https://developer.mozilla.org/ko/docs/Web/API/Fetch_API) 등 브라우저 표준이 정착되어 있어 jQuery가 해결하던 문제들이 거의 사라졌습니다.

### **(2) 성능 문제: 직접 DOM 조작**

jQuery는 상태 관리 없이 **DOM을 직접 건드리는 방식**입니다.

이때 DOM 변경이 많아질수록 [**Reflow**](https://developer.mozilla.org/ko/docs/Glossary/Reflow)**(레이아웃 재계산)**와** **[**Repaint**](https://developer.mozilla.org/ko/docs/Glossary/Repaint)**(화면 다시 그리기)**가 반복되어 성능 저하가 발생합니다.

### **(3) 현대 웹의 복잡성**

[오늘날의 웹](https://news.hada.io/topic?id=21925#:~:text=JS%20%ED%94%84%EB%A0%88%EC%9E%84%EC%9B%8C%ED%81%AC%20%EB%82%A8%EC%9A%A9%EC%9C%BC%EB%A1%9C%20%EC%9B%B9%EC%82%AC%EC%9D%B4%ED%8A%B8%20%EB%B3%B5%EC%9E%A1%EC%84%B1%20%EC%8B%AC%ED%99%94;%20%EA%B0%9C%EB%B0%9C%EC%9E%90%20%EA%B2%BD%ED%97%98(DX)%EC%9D%B4%20%EC%82%AC%EC%9A%A9%EC%9E%90%20%EA%B2%BD%ED%97%98&text=%EC%98%A4%EB%8A%98%EB%82%A0%20%EC%9B%B9%EC%9D%98%20%EB%B3%B5%EC%9E%A1%EC%84%B1%EC%9D%80%20%EC%83%81%EB%8B%B9%20%EB%B6%80%EB%B6%84%20%27%EB%B9%84%EC%A6%88%EB%8B%88%EC%8A%A4%20%EB%AA%A8%EB%8D%B8%27%EC%9D%B4%20%EC%9A%94%EA%B5%AC%ED%95%98%EB%8A%94%20%ED%95%84%EC%97%B0%EC%A0%81%EC%9D%B8%20%EA%B8%B0%EB%8A%A5%EA%B3%BC)은 단순한 버튼 클릭 수준을 넘어섭니다.

- 조건부 렌더링
- 대규모 상태 관리
- 컴포넌트 기반 UI
이런 요구사항을 jQuery만으로 구현하면 코드가 **스파게티처럼 꼬이기 쉽습니다.**

### **(4) SPA와 가상 DOM의 등장**

React, Vue 같은 프레임워크는 [**Virtual DOM**](https://legacy.reactjs.org/docs/faq-internals.html)을 도입했습니다.

실제 DOM에 직접 접근하지 않고, **메모리 상에서 가상 트리를 먼저 갱신한 후, 변경된 부분만 최소한으로 실제 DOM에 반영**합니다.

이 덕분에 불필요한 Reflow/Repaint를 줄이고 성능이 최적화됩니다.

---

## **리액트의 가상 DOM과 성능 최적화**

| **jQuery** | **React** |
| --- | --- |
| 변경이 발생하면 곧바로 실제 DOM에 반영 | 변경이 발생하면 메모리 상에 존재하는 가상의 트리에 먼저 변경사항 반영 |
|  | 이전 상태와 비교(diffing) |
|  | 필요한 부분만 실제 DOM에 반영 |
| 결과: 브라우저가 계속해서 레이아웃을 다시 계산하고 화면을 다시 그려야 하기 때문에 성능 부담이 크다. | 결과: 불필요한 연산을 줄이고 성능을 효율적으로 관리할 수 있다. |

---

## **jQuery를 꼭 써야 한다면? 최적화 방법**

그럼에도 불구하고 특정 상황에서는 여전히 jQuery를 사용할 수 있다. 이 경우에는 성능 저하를 막기 위한 최적화가 필요하다. 예를 들어 다음과 같은 방법이 있다.

### DOM 조작을 최소화 → 변경될 요소만 선택

- 문서 조작 전후에 **DOM Fragment** 활용
  - 예: 리스트에 100개의 아이템을 하나씩 추가한다면?
```javascript
const ul = document.querySelector("ul");

for (let i = 0; i < 100; i++) {
  const li = document.createElement("li");
  li.textContent = `Item ${i}`;
  ul.appendChild(li); // DOM에 바로 추가됨 → 매번 Reflow/Repaint
}
```

```javascript
const ul = document.querySelector("ul");
const fragment = document.createDocumentFragment();

for (let i = 0; i < 100; i++) {
  const li = document.createElement("li");
  li.textContent = `Item ${i}`;
  fragment.appendChild(li); // 화면에는 안 보임, 메모리 상에서만 작업
}

ul.appendChild(fragment);
```

### CSS 클래스 토글 방식으로 상태 표현

```javascript
const box = document.querySelector(".box");

// 숨기기
box.style.display = "none";

// 보이기
box.style.display = "block";
```

```css
/* CSS 정의 */
.hidden {
  display: none;
}
```

```javascript
const box = document.querySelector(".box");

// 숨기기
box.classList.add("hidden");

// 보이기
box.classList.remove("hidden");

// 토글
box.classList.toggle("hidden");
```

### 이벤트 위임(Event Delegation) 활용

아이템이 많을수록 이벤트 리스너가 계속 늘어나서 성능이 떨어지는 반면,
이벤트 위임 방식은 

```javascript
const items = document.querySelectorAll("li");

items.forEach((item) => {
  item.addEventListener("click", (e) => {
    console.log(`${e.target.textContent} clicked`);
  });
});
```

```javascript
const ul = document.querySelector("ul");

ul.addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    console.log(`${e.target.textContent} clicked`);
  }
});
```

하지만 이런 최적화도 결국 **React/Vue 같은 프레임워크의 기본 원리**와 겹치기 때문에, 
근본적으로는 프레임워크를 사용하는 것이 더 나은 선택입니다.
