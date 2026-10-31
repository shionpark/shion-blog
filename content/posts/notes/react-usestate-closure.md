---
title: "클로저로 useState 직접 만들어보기"
description: "React useState의 내부 동작을 클로저 관점에서 분석하고, 순수 JavaScript로 3단계에 걸쳐 직접 구현해보며 상태 관리의 본질을 이해합니다."
date: "2025-08-26"
tags: ["React", "JavaScript", "클로저", "useState"]
published: true
---

## 왜 이 주제인가

`useState`를 매일 사용하지만, 왜 컴포넌트가 리렌더링될 때마다 상태가 유지되는지 설명하라고 하면 막히는 순간이 있었다. 함수형 컴포넌트는 매 렌더마다 함수가 다시 호출되는데, 어떻게 이전 상태를 기억할까?

답은 **클로저(Closure)**에 있다.

## 클로저란

클로저는 함수가 선언될 때의 렉시컬 환경을 기억하는 함수다. 간단한 예시를 보자.

```javascript
function createCounter() {
  let count = 0;

  return {
    increment: () => ++count,
    getCount: () => count,
  };
}

const counter = createCounter();
counter.increment();
counter.increment();
console.log(counter.getCount()); // 2
```

`createCounter`는 이미 실행이 끝났지만 반환된 `increment`와 `getCount`는 여전히 `count` 변수에 접근할 수 있다. 이것이 클로저다.

이 원리가 `useState`의 핵심이다. 이제 이걸 활용해서 직접 만들어보자.

## 직접 만들어보기

### 1. 단일 상태

가장 단순한 형태부터 시작하자.

```javascript
function createState(initialValue) {
  let state = initialValue;

  function getState() {
    return state;
  }

  function setState(newValue) {
    state = newValue;
    render(); // 상태가 바뀌면 다시 그린다
  }

  return [getState, setState];
}
```

```javascript
const [getCount, setCount] = createState(0);

console.log(getCount()); // 0
setCount(1);
console.log(getCount()); // 1
```

동작하지만 React의 `useState`와는 다르다. React는 `getCount()`가 아니라 `count` 값을 직접 반환한다.

### 2. 값을 직접 반환하기

React처럼 값을 직접 반환하려면 렌더링 사이클이라는 개념이 필요하다.

```javascript
const MyReact = (() => {
  let stateValue;
  let renderCallback;

  function useState(initialValue) {
    if (stateValue === undefined) {
      stateValue = initialValue;
    }

    function setState(newValue) {
      stateValue = newValue;
      rerender();
    }

    return [stateValue, setState];
  }

  function rerender() {
    if (renderCallback) renderCallback();
  }

  function mount(callback) {
    renderCallback = callback;
    renderCallback();
  }

  return { useState, mount };
})();
```

```javascript
function Counter() {
  const [count, setCount] = MyReact.useState(0);

  document.getElementById("app").innerHTML = `
    <p>Count: ${count}</p>
  `;

  document.getElementById("app").querySelector("p").onclick = () => {
    setCount(count + 1);
  };
}

MyReact.mount(Counter);
```

이제 `count`를 값으로 직접 받을 수 있다. 하지만 상태를 하나밖에 관리하지 못한다.

### 3. 여러 상태와 함수형 업데이트

실제 컴포넌트에서는 `useState`를 여러 번 호출한다. 배열과 인덱스를 도입하자.

```javascript
const MyReact = (() => {
  const hooks = [];
  let hookIndex = 0;
  let rootComponent;

  function useState(initialValue) {
    const currentIndex = hookIndex;

    if (hooks[currentIndex] === undefined) {
      hooks[currentIndex] = initialValue;
    }

    function setState(newValue) {
      // 함수형 업데이트 지원
      if (typeof newValue === "function") {
        hooks[currentIndex] = newValue(hooks[currentIndex]);
      } else {
        hooks[currentIndex] = newValue;
      }
      rerender();
    }

    hookIndex++;
    return [hooks[currentIndex], setState];
  }

  function rerender() {
    hookIndex = 0; // 인덱스 리셋 — Hook 규칙의 이유
    rootComponent();
  }

  function mount(component) {
    rootComponent = component;
    rootComponent();
  }

  return { useState, mount };
})();
```

```javascript
function App() {
  const [name, setName] = MyReact.useState("Shion");
  const [count, setCount] = MyReact.useState(0);

  const app = document.getElementById("app");
  app.innerHTML = `
    <h1>Hello, ${name}!</h1>
    <p>Count: ${count}</p>
    <button id="btn-count">+1</button>
    <button id="btn-name">이름 변경</button>
  `;

  app.querySelector("#btn-count").onclick = () => {
    setCount((prev) => prev + 1); // 함수형 업데이트
  };

  app.querySelector("#btn-name").onclick = () => {
    setName(name === "Shion" ? "Park" : "Shion");
  };
}

MyReact.mount(App);
```

두 개의 `useState`가 각각 독립적으로 상태를 유지한다. 이것이 가능한 이유는:

1. `hooks` 배열이 클로저 외부에서 상태를 저장
2. 각 `setState`가 클로저로 자신의 `currentIndex`를 포착
3. `rerender`할 때마다 `hookIndex`를 0으로 리셋하여 같은 순서로 훅 접근

## Hook 규칙이 존재하는 이유

React 공식 문서에서 "훅은 최상위에서만 호출하라"고 강조하는 이유가 여기에 있다.

```javascript
// ❌ 조건문 안에서 호출하면 인덱스가 밀린다
function BadComponent() {
  const [name, setName] = React.useState("Shion");

  if (name === "Shion") {
    const [age, setAge] = React.useState(20); // 조건에 따라 호출됐다 안됐다
  }

  const [count, setCount] = React.useState(0); // 인덱스가 꼬임
}
```

`hooks` 배열의 인덱스 기반으로 상태를 관리하기 때문에 호출 순서가 바뀌면 엉뚱한 상태를 읽게 된다.

## 실제 React와 비교

| 특성 | 우리 구현 | React |
| --- | --- | --- |
| 상태 저장 | 배열 (`hooks[]`) | Fiber 노드의 링크드 리스트 |
| 리렌더링 | 즉시 동기 실행 | 배치 처리 + 스케줄링 |
| DOM 업데이트 | `innerHTML` 전체 교체 | Virtual DOM diff |
| 함수형 업데이트 | ✅ 지원 | ✅ 지원 |
| 컴포넌트 트리 | 단일 컴포넌트 | 트리 구조 재귀 |

하지만 클로저로 상태를 포착한다는 근본 원리는 동일하다.

## 정리

- `useState`는 클로저를 활용해 컴포넌트의 상태를 외부 저장소(`hooks` 배열)에서 관리한다
- 각 `setState`는 클로저로 자신의 인덱스를 기억하여 올바른 상태를 갱신한다
- Hook 호출 순서가 중요한 이유는 인덱스 기반 상태 매핑 때문이다
- 리렌더링은 곧 함수 재호출이다 — 상태가 바뀌면 컴포넌트 함수를 처음부터 다시 실행한다
- 프레임워크의 마법처럼 느껴지던 것들이 결국 JavaScript의 기본 개념(클로저, 배열, 함수 호출)으로 구성되어 있다

> **참고 자료**
>
> - [useState가 클로저로 만들어진걸 알고 계신가요?](https://zomins.tistory.com/entry/useState%EA%B0%80-%ED%81%B4%EB%A1%9C%EC%A0%80%EB%A1%9C-%EB%A7%8C%EB%93%A4%EC%96%B4%EC%A7%84%EA%B1%B8-%EC%95%8C%EA%B3%A0-%EA%B3%84%EC%8B%A0%EA%B0%80%EC%9A%94)
> - [Vanilla Javascript로 React UseState Hook 만들기 — 개발자 황준일](https://junilhwang.github.io/TIL/Javascript/Design/Vanilla-JS-Make-useSate-hook/)
