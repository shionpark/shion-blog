---
title: "Vanilla Javascript로 React useState Hook 만들기"
description: "프레임워크 없이 순수 JavaScript로 useState를 구현하며, React의 상태 관리 메커니즘을 이해합니다."
date: "2025-08-26"
tags: ["JavaScript", "React", "useState", "클로저"]
published: true
---

## 목표

React 없이, 순수 JavaScript만으로 `useState`와 유사한 상태 관리 시스템을 만들어본다. 직접 구현해보면 React가 왜 이런 API를 제공하는지, 그리고 내부에서 어떤 일이 벌어지는지 체감할 수 있다.

## 최소 구현

### 1단계: 단일 상태

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

### 2단계: 값을 직접 반환하기

React처럼 값을 직접 반환하려면, 렌더링 사이클이라는 개념이 필요하다.

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

### 3단계: 여러 개의 상태 지원

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

## 실제 React와 비교

| 특성 | 우리 구현 | React |
|---|---|---|
| 상태 저장 | 배열 (`hooks[]`) | Fiber 노드의 링크드 리스트 |
| 리렌더링 | 즉시 동기 실행 | 배치 처리 + 스케줄링 |
| DOM 업데이트 | `innerHTML` 전체 교체 | Virtual DOM diff |
| 함수형 업데이트 | ✅ 지원 | ✅ 지원 |
| 컴포넌트 트리 | 단일 컴포넌트 | 트리 구조 재귀 |

## 이 구현에서 배울 수 있는 것

1. **클로저의 역할**: `setState`가 `currentIndex`를 포착해야 올바른 상태를 갱신한다
2. **Hook 호출 순서의 중요성**: 인덱스 기반이므로 조건문 안에서 호출하면 어긋난다
3. **리렌더링 = 함수 재호출**: 상태가 바뀌면 컴포넌트 함수를 처음부터 다시 실행한다
4. **불변성**: `setState`에 같은 값을 넣어도 리렌더링이 발생한다 (최적화 미적용)

프레임워크의 마법처럼 느껴지던 것들이 결국 JavaScript의 기본 개념(클로저, 배열, 함수 호출)으로 구성되어 있다는 걸 확인할 수 있다.
