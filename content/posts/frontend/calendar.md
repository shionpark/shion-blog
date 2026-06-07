---
title: "Radix UI 및 shadcn/ui 라이브러리로 Calendar 만들기"
description: "Calendar 컴포넌트의 UX 개선 과정에서 타입 설계 문제를 발견하고, 컴포넌트를 분리해 타입 안전성을 확보한 경험을 공유합니다."
date: "2025-12-16"
tags: ["ui/ux", "shadcn", "react-day-picker", "TypeScript"]
published: true
---

## 기존 구현의 UX 문제

기존 Calendar 컴포넌트에는 네 가지 핵심 UX 문제가 있었습니다:

1. **Range 선택 로직** — 기존 범위 내에서 새 날짜를 선택할 때 직관과 다른 결과
2. **비활성 상태** — 과거 날짜가 비활성화되었는데도 인터랙티브하게 보임
3. **반응형 레이아웃** — DayButton 크기 변화로 range 배경이 끊김
4. **스타일 우선순위 충돌** — today/range/outside 상태 간 시각적 모호함

## 해결 과정

### Range 선택: Start-Date First 패턴

세 단계 상태 패턴을 도입했습니다: **(1) 시작일 설정 → (2) 범위 확정 → (3) 리셋 후 재시작.**

```typescript
if (!current || (!current.from && !current.to)) {
  onSelect?.({ from: triggerDate, to: undefined });
}
```

명시적 상태 머신으로 사용자 의도를 코드에서 예측 가능하게 만들었습니다.

### 과거 날짜 비활성화

모드별로 로직을 처리하는 대신, CalendarRoot 컴포넌트 레벨에서 제약을 강제해 비활성 상태가 구조적으로 보장되도록 했습니다.

### 레이아웃 보정

wrapper + button 구조에 `aspect-square` CSS를 적용해 반응형 브레이크포인트에서 버튼 크기가 달라져도 시각적 연속성을 유지했습니다.

### 스타일 우선순위 확립

`range > today > outside` 순서로 명확한 우선순위를 세워 충돌하는 시각 상태를 해결했습니다.

## 구조적 문제의 발견

UX 개선을 구현하면서 더 깊은 문제가 드러났습니다: **컴포넌트의 타입 설계가 복잡한 상태 로직을 안전하게 지원하지 못한다는 것.**

react-day-picker 라이브러리는 모드별로 다른 TypeScript 타입을 사용합니다 (single은 `Date`, range는 `DateRange`). 하지만 Calendar 래퍼는 `selected`를 `Date | DateRange | undefined` 유니온으로 처리합니다.

TypeScript는 런타임 `mode` 체크만으로는 이 유니온을 안전하게 좁힐 수 없어서, 안전하지 않은 타입 단언이 강제됩니다.

## 해결: 컴포넌트 분리

`Calendar.Single`과 `Calendar.Range`로 컴포넌트를 분리해 각각 자신의 선택 모드에 대한 타입 안전성을 보장하도록 했습니다. 이를 통해 타입 캐스팅 없이도 커스텀 UX 로직을 구현할 수 있게 되었습니다.

## 정리

UX 문제를 해결하는 과정에서 아키텍처 문제가 드러났고, 반대로 타입 안전한 설계가 견고한 기능 구현을 가능하게 했습니다. 사용자 경험 문제는 종종 구조적 문제의 증상입니다.
