---
title: "useState가 클로저로 만들어진걸 알고 계신가요?"
description: "React useState의 내부 동작을 클로저 관점에서 분석하고, 직접 구현해보며 상태 관리의 본질을 이해합니다."
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

`createCounter`는 이미 실행이 끝났지만, 반환된 `increment`와 `getCount`는 여전히 `count` 변수에 접근할 수 있다. 이것이 클로저다.

## useState를 직접 구현해보기

React의 `useState`를 단순화해서 직접 만들어보자.

```javascript
const React = (() => {
  let hooks = [];
  let currentIndex = 0;

  function useState(initialValue) {
    const index = currentIndex;

    if (hooks[index] === undefined) {
      hooks[index] = initialValue;
    }

    const setState = (newValue) => {
      hooks[index] = newValue; // 클로저로 index를 기억
    };

    currentIndex++;
    return [hooks[index], setState];
  }

  function render(Component) {
    currentIndex = 0; // 렌더링할 때마다 인덱스 초기화
    const result = Component();
    return result;
  }

  return { useState, render };
})();
```

핵심은 `setState` 함수가 클로저를 통해 자신의 `index`를 기억한다는 점이다.

## 동작 확인

```javascript
function Counter() {
  const [count, setCount] = React.useState(0);
  const [name, setName] = React.useState("Shion");

  console.log(`count: ${count}, name: ${name}`);

  return { count, setCount, name, setName };
}

let app = React.render(Counter); // count: 0, name: Shion
app.setCount(1);
app = React.render(Counter);    // count: 1, name: Shion
app.setName("Park");
app = React.render(Counter);    // count: 1, name: Park
```

두 개의 `useState`가 각각 독립적으로 상태를 유지한다. 이것이 가능한 이유는:

1. `hooks` 배열이 클로저 외부에서 상태를 저장
2. 각 `setState`가 클로저로 자신의 `index`를 포착
3. `render`할 때마다 `currentIndex`를 0으로 리셋하여 같은 순서로 훅 접근

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

`hooks` 배열의 인덱스 기반으로 상태를 관리하기 때문에, 호출 순서가 바뀌면 엉뚱한 상태를 읽게 된다.

## 실제 React와의 차이

위 구현은 핵심 개념만 담은 단순화 버전이다. 실제 React는:

- **Fiber 아키텍처** 기반으로 훅을 링크드 리스트로 관리
- **배치 업데이트**로 여러 `setState`를 묶어서 한 번만 리렌더링
- **함수형 업데이트** `setState(prev => prev + 1)` 지원
- **Object.is** 비교로 불필요한 리렌더링 방지

하지만 클로저를 통해 상태를 포착한다는 근본 원리는 동일하다.

## 정리

- `useState`는 클로저를 활용해 컴포넌트의 상태를 외부 저장소에서 관리한다
- 각 `setState`는 클로저로 자신의 인덱스를 기억하여 올바른 상태를 갱신한다
- Hook 호출 순서가 중요한 이유는 인덱스 기반 상태 매핑 때문이다
- 매일 사용하는 API의 내부를 이해하면, 디버깅 시 문제의 원인을 더 빠르게 좁힐 수 있다
