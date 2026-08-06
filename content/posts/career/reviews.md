---
title: "사소한 변수명 변경이 불러온 리액트 컴포넌트 설계의 원칙"
description: ""
date: "2024-12-10"
tags: ["Blog"]
published: true
---

> ✏️ 매일 아침 짧게라도 책을 읽는 습관을 들이려 한다. 오늘은 『10배의 법칙』의 문장에서 시작했다.
”***목표를 낮추지 말아라. 목표를 이루지 못했을 때 나타나는 실패를 정당화하기 위한 핑계를 늘어놓지 말아라.”***
목표를 낮추지 않고 개선의 여지를 탐색한다는 점에서 개발자에게도 적용되는 말이라는 생각이 들었다. 오늘은 작은 변수명 변경에서 시작된 경험을 정리해보고자 한다.

### Dropdown 컴포넌트 다시 보기

우리 프로젝트에서는 테이블 내 각 행(row)에 드롭다운 메뉴를 배치해 수정 및 삭제 기능을 제공하고 있다.
Dropdown 컴포넌트는 다음과 같은 구조를 갖는다.

```typescript
interface IDropDownToggleButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    IMenuWrapperProps {
  button?: ReactNode;
  children: ReactNode;
  isDropdownMenuOpened: boolean;
}
```

- **button**: 클릭 시 메뉴를 펼칠 수 있는 버튼 요소. 기본 버튼 외 커스텀 버튼도 전달 가능
- **children**: 드롭다운으로 보여질 메뉴 항목. 보통 <ul><li></li></ul> 구조로 전달
즉, 내부적으로 버튼을 클릭하면 children으로 전달된 요소가 메뉴로서 렌더링된다.

```typescript
{isDropdownMenuOpened && (
  <MenuWrapper ref={ref}>
    {children}
  </MenuWrapper>
)}
```

### **변수명을 변경했던 이유**

처음에는 children이라는 prop 이름이 너무 추상적으로 느껴졌다.
실제로 이 위치에 들어오는 건 드롭다운 메뉴이기 때문에, 더 명확하게 menu라는 이름이 적절하다고 판단해 다음과 같이 변경했다.

```typescript
interface IDropDownToggleButtonProps {
  button?: ReactNode;
  menu: ReactNode;
  ...
}

{isDropdownMenuOpened && (
  <MenuWrapper ref={ref}>
    {menu}
  </MenuWrapper>
)}
```

별다른 기능 변경 없이 단순히 이름만 바꾼 것이었고, 드롭다운 관련 작업을 각자 분리해 맡고 있던 상황이라 이 변경을 따로 공유하진 않았다.

## **React에서 children을 사용해야 하는 이유**

이후 변경 사항을 확인한 동료가 다음과 같은 피드백을 주었다.

> *children은 리액트에서 컴포넌트 내부 콘텐츠를 의미하는 ****공식적이고 직관적인 prop****이다. 같은 이름을 사용할 때 리액트 사용자 또는 라이브러리에서의 동작이 달라질 수 있다.*

React는 `children`이라는 이름에 특별한 의미를 부여한다. 상위 컴포넌트에서 `<Dropdown>메뉴 내용</Dropdown>`처럼 사용할 경우, 메뉴 내용은 자동으로 `children`이라는 이름의 prop으로 전달된다. 하지만 이를 menu로 바꾸면 아래처럼 명시적으로 작성해야 한다.

```typescript
<Dropdown menu={<Menu />} />
```

이는 직관적이지 않으며, 라이브러리나 내부 구현의 일관성을 해칠 수 있다.
또한 훅이나 유틸 함수 내부에서 children 기반 로직을 사용하고 있다면 의도치 않은 오류가 발생할 수도 있다.

## **기능 영향과 코드의 확산성**

드롭다운 기능은 테이블, 카드, 상세 페이지 등 다양한 컴포넌트에 걸쳐 사용되는 **횡단 관심사(cross-cutting concern)**이다. 따라서 단순 변수명 하나를 바꾸는 것도 관련된 모든 사용처에 영향을 줄 수 있다.

실제로 children에서 menu로 변경한 이후, 열리지 않는 드롭다운, 선택이 되지 않는 메뉴 등 미묘한 오류가 발생했다. 수정하면서 이전부터 있던 드롭다운 열림/닫힘 로직의 결함도 발견했고 이를 개선하는 계기도 되었지만, 애초에 변경 전 동료와 한마디라도 나눴다면 훨씬 효율적인 개선이 가능했을 것이다.

## **마치며**

이번 경험을 통해 느낀 점은 명확하다.

> **변수명은 사소하지 않다.**

특히 리액트처럼 컨벤션이 잘 정립된 프레임워크에서는, 관습적인 이름(children, ref, props 등)을 바꾸는 것만으로도 예기치 않은 문제가 발생할 수 있다. 코드를 더 명확하게 만들고 싶다는 의도에서 시작된 변경이 오히려 기존의 일관성을 해칠 수도 있다는 점. 협업 환경이라면 더더욱, 어떤 사소한 변경이라도 **기능의 영향 범위**와 **팀원과의 컨벤션**을 고려해야 함을 다시금 느꼈다.
