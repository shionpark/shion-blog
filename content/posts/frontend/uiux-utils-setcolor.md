---
title: "카테고리와 상태에 따른 색상 관리 로직 정리"
description: "카테고리와 상태에 따른 색상 코드를 theme 기반으로 관리"
date: "2024-05-29"
tags: ["React", "styled-components"]
published: true
---

이 글에서는 상품 카테고리와 락커 상태에 따라 각각의 색상을 다르게 지정하는 방법을 정리했다. 색상 값을 공통 theme 파일에 정의하고, 도메인별 스타일 컴포넌트에서 동적으로 적용하는 구조로 관리했다.

## **배경: 색상 관리의 일관성**

운영 화면에는 다양한 상태와 유형이 존재한다. 상품은 ‘회원권’, ‘PT’, ‘운동복’, ‘락커’, ‘이벤트’와 같이 카테고리가 나뉘고, 락커는 ‘사용중’, ‘사용가능’, ‘고장’, ‘예약중’과 같이 상태가 구분된다.

이러한 도메인 정보에 따라 색상을 다르게 표현하면 사용자 입장에서 정보를 빠르게 인지할 수 있다. 하지만 스타일 파일마다 색상 코드를 직접 작성한다면 유지보수가 어려워지고, 일관된 디자인을 적용하기 어렵다.

그래서 공통 색상 테마 파일을 기준으로 도메인에 맞는 색상 맵핑을 정의하고, 스타일 컴포넌트에서는 해당 값을 동적으로 불러와 배경색으로 적용하는 구조로 정리했다.

## 공통 색상 테마 정의

```typescript
// theme.ts

const color = {
  // 상품 색상 정의
  lime: '#8EFA00',
  lightBlue: '#73FDEA',
  orange: '#FEAE00',
  mediumBlue: '#56C1FF',
  purple: '#E0A6FA',

  // 락커 색상 정의
  gold: '#FFD700',
  lawngreen: '#7CFC00',
  orangeCoral: '#FF7F50',
  aquamarine: '#7FFFD4',
};

export const theme = {
  color: {
    // 상품
    productMembership: color.lime,
    productPT: color.lightBlue,
    productUniform: color.orange,
    productLocker: color.mediumBlue,
    productEvent: color.purple,

    // 락커
    lockerAvailable: color.lawngreen,
    lockerInUse: color.gold,
    lockerBroken: color.orangeCoral,
    lockerBooked: color.aquamarine,
  },
};

export type Theme = typeof theme;
```

색상 이름을 도메인별 의미로 명확하게 구분하여 이후 컴포넌트에서도 그대로 사용할 수 있도록 구조화했다.

## **상품 카테고리별 색상 적용**

### **카테고리 코드 정의**

상품 카테고리마다 다른 색상의 배경을 갖도록 함. 카테고리 종류는 다음과 같음.

```typescript
export interface ICategoryResponse {
  id: number;
  name: string; // '회원권' | 'PT' | '운동복' | '락커' | '이벤트'
  code: string; // 'membership' | 'pt' | 'clothes' | 'locker' | 'event'
}
```

### 스타일 정의

```typescript
// ProductGridItem.styles.tsx

export const categoryColor = {
  회원권: theme.color.productMembership,
  PT: theme.color.productPT,
  운동복: theme.color.productUniform,
  락커: theme.color.productLocker,
  이벤트: theme.color.productEvent,
};

const setCategoryColor = (category: keyof typeof categoryColor) => css`
  background-color: ${categoryColor[category] || 'black'};
`;

export const CategoryWrapper = styled.div<{ category: keyof typeof categoryColor }>`
  ${({ category }) => setCategoryColor(category)}
`;
```

### 컴포넌트 적용

```typescript
// ProductGridItem.tsx

<CategoryWrapper category={category?.name as keyof typeof categoryColor}>
  <div>{category?.name}</div>
</CategoryWrapper>
```

> 카테고리 이름을 기준으로 배경색이 지정되며, 지정되지 않은 값이 들어오는 경우 fallback으로 검정색을 설정했다.

## **락커 상태별 색상 적용**

### 상태값 예시

```typescript
type LockerStatus = '사용가능' | '사용중' | '고장' | '예약중';
```

### 스타일 정의

```typescript
// LockerItem.styles.tsx

export const lockerStatusColors = {
  사용중: theme.color.lockerInUse,
  사용가능: theme.color.lockerAvailable,
  고장: theme.color.lockerBroken,
  예약중: theme.color.lockerBooked,
};

const setLockerStatusColor = (status: keyof typeof lockerStatusColors) => css`
  background-color: ${lockerStatusColors[status] || 'black'};
`;

export const StatusBtn = styled.div<{ status: keyof typeof lockerStatusColors }>`
  ${({ status }) => setLockerStatusColor(status)}
`;
```

### 컴포넌트 적용

```typescript
// LockerItem.tsx

<Styled.StatusBtn status={locker?.status as keyof typeof lockerStatusColors}>
  {locker?.status}
</Styled.StatusBtn>
```

> 락커의 상태 값에 따라 다른 색상을 적용하며, 이 역시 fallback 처리를 포함해 안정성을 확보했다.

## **정리하며**

이번 구조의 핵심은 **색상 코드와 도메인 로직을 분리한 설계**에 있다.

테마 파일에서 색상 값을 정의하고, 도메인에 따라 색상을 맵핑하는 로직을 별도로 관리함으로써 다음과 같은 장점이 있었다:

- 스타일 코드가 간결해지고 일관성을 유지할 수 있음
- 도메인 확장 시 새로운 색상 추가가 쉬움
- 디자이너와 협업 시 색상 변경 요청이 들어와도 theme 파일만 수정하면 전체 반영 가능
기존에는 스타일 컴포넌트마다 하드코딩된 색상이 반복되었지만, 구조를 분리한 이후에는 의미 기반 접근이 가능해졌다. 향후에는 색상 외에도 폰트, 간격 등 디자인 시스템 요소를 점진적으로 분리하고자 한다.
