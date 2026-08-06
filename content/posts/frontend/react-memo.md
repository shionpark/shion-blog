---
title: "React.memo() 현명하게 사용하기"
description: "React.memo를 언제 써야 하고 언제 피해야 하는지, 실제 프로젝트에서 겪은 사례와 함께 정리합니다."
date: "2025-08-26"
tags: ["React", "성능최적화", "React.memo", "useMemo"]
published: true
---

## React.memo가 필요한 이유

React는 부모 컴포넌트가 리렌더링되면 자식 컴포넌트도 함께 리렌더링된다. props가 바뀌지 않았어도.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>+</button>
      <ExpensiveChild /> {/* count와 무관하지만 매번 리렌더링 */}
    </div>
  );
}
```

`React.memo`는 이전 props와 새 props를 얕은 비교(shallow comparison)하여, 변경이 없으면 리렌더링을 건너뛴다.

```jsx
const ExpensiveChild = React.memo(function ExpensiveChild() {
  // 무거운 연산이나 복잡한 렌더링
  return <div>{/* ... */}</div>;
});
```

## 효과가 있는 경우

### 1. 무거운 계산이 포함된 컴포넌트

```jsx
const Chart = React.memo(function Chart({ data }) {
  // 수천 개의 데이터 포인트를 차트로 변환
  const processedData = processChartData(data);

  return <canvas>{/* 차트 렌더링 */}</canvas>;
});
```

### 2. 리스트의 개별 아이템

```jsx
const MemberRow = React.memo(function MemberRow({ member, onSelect }) {
  return (
    <tr onClick={() => onSelect(member.id)}>
      <td>{member.name}</td>
      <td>{member.status}</td>
    </tr>
  );
});
```

리스트가 100개인데 하나만 변경되었을 때, 나머지 99개의 리렌더링을 막을 수 있다.

### 3. 자주 리렌더링되는 부모 아래의 정적 컴포넌트

타이머, 애니메이션, 실시간 데이터 등으로 부모가 자주 리렌더링되는 경우.

## 효과가 없는 경우 — 흔한 실수

### 1. 매번 새로운 객체/함수를 props로 전달

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 렌더링마다 새 객체 생성 → memo 무력화
  return <MemoChild style={{ color: "red" }} onClick={() => doSomething()} />;
}
```

`React.memo`는 얕은 비교를 하기 때문에 `{} !== {}`다. 해결 방법:

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // ✅ 참조 안정성 확보
  const style = useMemo(() => ({ color: "red" }), []);
  const handleClick = useCallback(() => doSomething(), []);

  return <MemoChild style={style} onClick={handleClick} />;
}
```

### 2. props가 거의 매번 바뀌는 컴포넌트

```jsx
// ❌ 비교 비용만 추가되고 스킵은 거의 안 됨
const CurrentTime = React.memo(function CurrentTime({ timestamp }) {
  return <span>{timestamp}</span>;
});
```

비교 자체도 비용이다. 어차피 매번 바뀔 props라면 memo를 감싸는 것이 오히려 손해.

### 3. 이미 가벼운 컴포넌트

```jsx
// ❌ 과도한 최적화
const Label = React.memo(function Label({ text }) {
  return <span>{text}</span>;
});
```

이 정도 컴포넌트의 리렌더링 비용은 props 비교 비용과 비슷하거나 더 작다.

## 커스텀 비교 함수

기본 얕은 비교가 충분하지 않을 때 두 번째 인자로 비교 함수를 전달할 수 있다.

```jsx
const MemberCard = React.memo(
  function MemberCard({ member, lastUpdated }) {
    return (
      <div>
        <h3>{member.name}</h3>
        <p>{member.status}</p>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // member.id가 같으면 리렌더링 스킵
    return prevProps.member.id === nextProps.member.id
      && prevProps.member.status === nextProps.member.status;
  }
);
```

단, 비교 함수가 복잡해지면 유지보수 부담이 커진다. 대부분의 경우 `useMemo`/`useCallback`으로 참조를 안정시키는 편이 낫다.

## 판단 기준

`React.memo`를 적용하기 전에 스스로에게 물어보자:

1. **이 컴포넌트의 렌더링 비용이 비교 비용보다 큰가?** — 아니라면 불필요
2. **props가 실제로 자주 같은 값으로 내려오는가?** — 매번 바뀌면 무의미
3. **참조 안정성이 보장되는가?** — 인라인 객체/함수가 있으면 먼저 해결
4. **DevTools Profiler로 측정했는가?** — 추측 대신 측정

## 정리

| 상황 | 적용 |
|---|---|
| 무거운 렌더링 + props 자주 같음 | ✅ |
| 리스트의 개별 아이템 | ✅ |
| 자주 갱신되는 부모의 정적 자식 | ✅ |
| 가벼운 컴포넌트 | ❌ |
| props가 매번 바뀜 | ❌ |
| 인라인 객체/함수 props 미해결 | ❌ (먼저 참조 안정화) |

성능 최적화는 측정이 먼저다. React DevTools의 Profiler로 실제 병목을 확인한 뒤, 해당 컴포넌트에만 `React.memo`를 적용하는 것이 현명한 접근이다.
