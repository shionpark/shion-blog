---
title: "shadcn/ui Calendar의 Range 선택 UX 개선과 타입 설계"
description: "Calendar 컴포넌트의 UX 개선 과정에서 타입 설계 문제를 발견하고, 컴포넌트를 분리해 타입 안전성을 확보한 경험을 공유합니다."
date: "2025-12-16"
tags: ["ui/ux", "shadcn", "react-day-picker", "TypeScript"]
published: true
featured: true
---

최근 프로젝트 요구사항에 맞춰 Calendar(DatePicker) 컴포넌트를 전반적으로 개선했습니다.

처음에는 단순한 UI 개선 작업이라고 생각했지만,  
구조적 리팩토링(PR [#110](https://github.com/runfit26/run-fit/pull/110))을 진행하는 과정에서  
UX 문제와 타입 설계의 한계가 자연스럽게 연결되어 있다는 점을 확인하게 되었습니다.

이 글은 **Date Picker UX 개선을 계기로**,  
Calendar 컴포넌트의 **구조와 타입 설계를 함께 재정비하게 된 과정**을 정리한 기록입니다.

구조 개선 전반에 대한 논의는  
[관련 Discussion](https://github.com/fesi12-team1/run-fit/discussions/114)에 정리되어 있으며,  
본 글에서는 **UX에 직접적인 영향을 준 문제와 그 해결 과정**에 집중합니다.

---

## 문제 발견 — 사용하면서 드러난 UX 한계

이전 PR([#55](https://github.com/runfit26/run-fit/pull/55))에서  
shadcn Calendar 기반으로 날짜/시간 선택 UI를 구성했습니다.

기본 기능은 동작했지만, 실제 사용 과정에서 다음과 같은 UX 문제가 확인되었습니다.

1. 범위 선택 UX가 직관적이지 않음  
   (예: `2~10` 선택 후 `3` 클릭 시 범위가 `2~3`으로 축소)
2. 지난 날짜(disabled)가 hover / pointer로 인해 클릭 가능한 요소처럼 보임
3. DayButton 크기가 반응형 환경에서 유지되지 않아 range 배경이 끊겨 보임
4. today / range / outside 스타일 우선순위 충돌

이 문제들은 모두 날짜 선택 경험과 직결되어 있었고,  
단순한 스타일 보완보다는 **날짜 선택 규칙 자체를 다시 정의해야 하는 문제**로 판단했습니다.

## UX 개선 방향

### Range 선택 UX 개선 — Start-Date First Selection

기존 구현에서는 range가 선택된 상태에서 날짜를 다시 클릭할 경우,  
사용자의 의도와 다른 방식으로 범위가 재조정되는 문제가 있었습니다.

예를 들어,

- 기존 선택: `2~10`
- `3` 클릭
- 실제 동작: `2~3` (react-day-picker 기본 동작)

이 동작은 내부 로직상 일관성은 있었지만,  
사용자 입장에서는 클릭 한 번에 범위의 어느 쪽이 바뀔지 예측하기 어려웠습니다.

문제는 `3`을 누른 사용자의 의도가 **시작일 변경(`3~10`)** 인지 **종료일 변경(`2~3`)** 인지 클릭만으로는 구분할 수 없다는 점이었습니다.  
어느 쪽으로 추측하든 일부 사용자에게는 틀린 동작이 됩니다.

그래서 의도를 추측하는 대신, **항상 같은 순서로 동작하는 규칙**을 정했습니다.

1. 첫 번째 클릭 → Start-Date 설정  
   `{ from: 2, to: undefined }`
2. 두 번째 클릭 → Range 확정  
   `{ from: 2, to: 10 }`
3. 기존 range가 있는 상태에서 새 날짜 클릭  
   → 기존 range 초기화 후 Start-Date 재설정

위 예시에서 `3~10`을 원하는 사용자는 `3`, `10`을 차례로 누르면 됩니다.  
클릭 수는 한 번 늘 수 있지만, **"첫 클릭은 시작, 두 번째 클릭은 끝"** 이라는 규칙이 항상 유지되어 결과를 예측할 수 있습니다.  
두 번째 클릭이 시작일보다 앞선 날짜라면 두 날짜를 자동으로 정렬해 역방향 범위가 생기지 않도록 했습니다.

이 규칙은 `onSelect` 핸들러에서 다음과 같이 코드로 명시됩니다.

```tsx
import type { DateRange, OnSelectHandler } from 'react-day-picker'

// Calendar.Range 내부 — selected, onSelect는 Range 전용 props (아래 '해결' 참고)
const handleSelect: OnSelectHandler<DateRange | undefined> = (
  _selected, // react-day-picker가 기본 규칙으로 계산한 값은 사용하지 않음
  triggerDate, // 사용자가 실제로 클릭한 날짜
) => {
  const current = selected

  if (!current || (!current.from && !current.to)) {
    onSelect?.({ from: triggerDate, to: undefined })
    return
  }

  const anchor = current.from

  if (anchor && !current.to) {
    const from = triggerDate < anchor ? triggerDate : anchor
    const to = triggerDate < anchor ? anchor : triggerDate
    onSelect?.({ from, to })
    return
  }

  onSelect?.({ from: triggerDate, to: undefined })
}
```

UX 규칙이 조건문 구조 그대로 드러나며,  
“지금 어떤 상태에서 어떤 클릭이 들어왔는지”를 코드만 보고도 파악할 수 있도록 구성했습니다.

### 지난 날짜 선택 불가(disablePastDates)

지난 날짜는 모임 생성 시 사용할 수 없기 때문에,  
단순히 선택을 막는 수준이 아니라  
**완전히 비활성화된 상태로 인식되어야 했습니다.**

이를 위해 disable 조건을 CalendarRoot 단계에서 병합했습니다.

```tsx
import { DayPicker, getDefaultClassNames, type Matcher } from 'react-day-picker'

type CalendarRootProps = React.ComponentProps<typeof DayPicker> & {
  disablePastDates?: boolean
}

function CalendarRoot({
  className,
  classNames,
  components,
  disablePastDates,
  ...props
}: CalendarRootProps) {
  const defaultClassNames = getDefaultClassNames()

  const today = new Date()
  const disabledMatchers: Matcher[] = []

  if (disablePastDates) {
    disabledMatchers.push({ before: today })
  }
  // 사용 측에서 넘긴 disabled 조건도 함께 유지
  if (props.disabled) {
    disabledMatchers.push(
      ...(Array.isArray(props.disabled) ? props.disabled : [props.disabled]),
    )
  }

  const disabled = disabledMatchers.length > 0 ? disabledMatchers : undefined

  return (
    <DayPicker
      //...
      disabled={disabled}
      classNames={{
        disabled: cn('text-gray-400', defaultClassNames.disabled),
        ...classNames,
      }}
    />
  )
}
```

이 방식은 개별 mode 로직에서 처리하는 대신,  
Calendar 공통 레이어에서 UX 규칙을 강제하는 구조입니다.

`{ before: today }`는 오늘 이전 날짜에만 매칭되므로 오늘은 선택할 수 있습니다.  
disabled로 지정된 날짜는 react-day-picker가 선택 이벤트 자체를 발생시키지 않기 때문에, range의 시작점으로도 선택되지 않습니다.

다만 선택만 막고 스타일을 그대로 두면 여전히 누를 수 있는 버튼처럼 보입니다.  
그래서 DayButton에서 `modifiers.disabled`일 때 포인터 이벤트와 hover 스타일을 함께 제거했습니다.

```tsx
<button
  className={cn(
    defaultClassNames.day,
    modifiers.disabled &&
      'pointer-events-none cursor-not-allowed text-gray-400 opacity-40',
    //...
  )}
/>
```

그 결과 지난 날짜는

- 클릭 불가
- hover / pointer 미노출
- range 시작점으로도 선택 불가

라는 규칙이 **Calendar 공통 레이어에서 보장**됩니다.

### DayButton 레이아웃 보완

반응형 환경에서 DayButton이 정사각형을 유지하지 못하면서  
range 배경이 끊겨 보이는 문제가 확인되었습니다.

이를 해결하기 위해 DayButton을 wrapper + button 구조로 분리했습니다.

```tsx
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  //...
  return (
    <div
      className={cn(
        'relative aspect-square w-full overflow-hidden',
        isRange && 'bg-brand-800',
        isStart && 'rounded-l-lg',
        isEnd && 'rounded-r-lg',
      )}
    >
      <button
        className={cn(
          defaultClassNames.day,
          //...
        )}
        //...
      />
    </div>
  )
}
```

range 배경과 radius를 wrapper에서 처리하면서,  
버튼 크기와 무관하게 **연속적인 range 표현**이 유지되도록 구성했습니다.

### today / range / outside 스타일 우선순위 재정의

기존에는 today, range, outside 상태가 겹칠 경우  
시각적으로 어떤 상태가 우선되는지 명확하지 않았습니다.

이를 다음과 같은 우선순위로 재정의했습니다.

1. **range (최우선)**
2. **today (range가 아닐 때만 강조)**
3. **outside (항상 가장 낮은 우선순위)**

클래스를 나열한 순서에 기대지 않고, 조건문으로 우선순위를 직접 표현했습니다.

```tsx
const isRange = isStart || isMiddle || isEnd

cn(
  isStart && 'bg-brand-300 text-brand-900 rounded-l-lg',
  isEnd && 'bg-brand-300 text-brand-900 rounded-r-lg',
  isMiddle && 'text-brand-200 rounded-none',
  isToday && !isRange && 'text-brand-300 font-medium', // range가 아닐 때만 today 강조
)
```

이를 통해 날짜 상태가 보다 명확하게 구분되도록 개선했습니다.

## UX 개선을 구현하며 드러난 구조적 문제

UX 개선 방향 자체는 비교적 명확했지만,  
이를 코드로 구현하는 과정에서 예상보다 큰 장벽을 마주하게 되었습니다.

바로 **Calendar 컴포넌트의 구조와 타입 설계 문제**였습니다.

기존 Calendar는 단일 날짜 선택(single)과  
범위 선택(range)을 하나의 컴포넌트에서 처리하는 구조였고,  
range UX를 구현하기 위해 `onSelect` 로직을 커스터마이징하기 시작하면서  
이 구조의 한계가 점점 드러나기 시작했습니다.

## 문제의 본질 — mode 기반 Union 타입의 한계

react-day-picker는 `mode`에 따라 `selected`와 `onSelect`의 타입이 완전히 달라집니다.

- `mode="single"` → `Date | undefined`
- `mode="multiple"` → `Date[] | undefined`
- `mode="range"` → `DateRange | undefined`

그래서 `React.ComponentProps<typeof DayPicker>`는 하나의 객체 타입이 아니라, **`mode` 값으로 구분되는 여러 타입의 union**입니다.  
여기에 `mode`를 지정하지 않은 경우(선택 기능 없음)와 `required` 옵션에 따른 경우까지 나뉘어 있습니다.

```ts
type DayPickerProps =
  | (PropsBase & { mode?: undefined })      // selected, onSelect 자체가 없음
  | (PropsBase & PropsSingle)               // mode: 'single'
  | (PropsBase & PropsMulti)                // mode: 'multiple'
  | (PropsBase & PropsRange)                // mode: 'range' (+ required 여부에 따라 onSelect 타입이 다름)
```

모든 mode를 받는 CalendarRoot 안에서 range 전용 로직을 넣으려고 하자, 다음과 같은 문제가 이어졌습니다.

```tsx
function CalendarRoot({
  mode,
  selected, // ❌ 1) Property 'selected' does not exist on type 'DayPickerProps'
  onSelect, // ❌ 1) Property 'onSelect' does not exist on type 'DayPickerProps'
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  if (mode === 'range') {
    // ❌ 2) range로 좁혀져도 required 여부에 따라 OnSelectHandler<DateRange>가 섞여 있어 대입 불가
    const rangeOnSelect: OnSelectHandler<DateRange | undefined> | undefined = onSelect
  }

  // ❌ 3) 따로 꺼낸 mode / selected / onSelect를 다시 넘기면 짝이 맞는지 보장할 수 없음
  return <DayPicker mode={mode} selected={selected} onSelect={onSelect} {...props} />
}
```

1. **`selected`, `onSelect`를 구조 분해할 수 없습니다.**  
   `mode`가 없는 경우의 타입에는 두 속성이 아예 존재하지 않기 때문입니다.
2. **`mode`로 좁혀도 한 가지 타입으로 정해지지 않습니다.**  
   `mode === 'range'`를 확인하면 `onSelect`는 range용 핸들러로 좁혀지지만, range 안에서도 `required` 옵션 여부에 따라 `OnSelectHandler<DateRange>`와 `OnSelectHandler<DateRange | undefined>`가 섞여 있습니다.  
   "선택 해제(`undefined`)를 허용하는 핸들러"로 다루려면 결국 `required`까지 따져야 합니다.
3. **다시 합쳐서 넘길 때도 에러가 납니다.**  
   구조 분해로 꺼낸 `mode`, `selected`, `onSelect`를 JSX에 다시 넘기면, TypeScript는 세 값이 같은 mode의 조합인지 확인하지 못해 `DayPickerProps`에 대입할 수 없다고 판단합니다.

결국 이 에러들을 피하려면 캐스팅이 필요해졌고,

```tsx
const current = selected as DateRange | undefined
const rangeOnSelect = onSelect as OnSelectHandler<DateRange | undefined> | undefined
```

이런 코드가 늘어날수록 "타입을 우회하고 있다"는 느낌이 강해졌습니다.

`props`를 구조 분해하지 않고 `props.mode === 'range'`로 좁히면 `props.selected`는 `DateRange | undefined`로 정상 추론됩니다.  
하지만 그렇게 해도 **하나의 컴포넌트 안에 mode마다 다른 분기가 계속 쌓이는 구조**는 그대로입니다. range UX처럼 상태 전이가 복잡한 로직이 single·multiple 분기와 같은 함수 안에 섞이게 됩니다.

정리해보면, 문제의 핵심은 다음과 같았습니다.

1. react-day-picker는 mode에 따라 완전히 다른 props 타입을 요구합니다.
2. Calendar는 모든 mode를 하나의 컴포넌트에서 처리하고 있습니다.
3. 그래서 mode별 로직을 추가할 때마다 타입 분기(또는 캐스팅)가 함께 늘어납니다.

저는 이 문제를 단순한 타입 단언이나 조건문으로 해결할 문제가 아니라,  
**컴포넌트가 너무 많은 경우를 한꺼번에 받고 있어서 생긴 구조적 문제**로 판단했습니다.

## 해결 — Calendar.Single / Calendar.Range 분리

이에 따라 Calendar를 **단일 책임 원칙에 따라 분리**했습니다.

```tsx
<Calendar.Single selected={single} onSelect={setSingle} />
```

```tsx
<Calendar.Range selected={range} onSelect={setRange} />
```

각 컴포넌트는 react-day-picker의 union 타입 대신 **자신의 mode에 맞는 props만** 정의합니다.

```tsx
type CalendarCommonProps = Omit<CalendarRootProps, 'mode' | 'selected' | 'onSelect'>

type CalendarRangeProps = CalendarCommonProps & {
  selected?: DateRange
  onSelect?: (range: DateRange | undefined) => void
}

function CalendarRange({ selected, onSelect, ...rest }: CalendarRangeProps) {
  const handleSelect: OnSelectHandler<DateRange | undefined> = (_selected, triggerDate) => {
    // 앞서 본 Start-Date First 규칙
  }

  return <CalendarRoot mode="range" selected={selected} onSelect={handleSelect} {...rest} />
}
```

이 구조에서는 `Calendar.Range` 내부에서  
`selected`가 항상 `DateRange | undefined`로 보장되고, `mode="range"`도 컴포넌트가 직접 고정하기 때문에,

- from / to 접근
- 날짜 비교
- UX 로직 커스터마이징

모두 타입 단정 없이 안전하게 처리할 수 있었습니다.

이는 단순히 타입 에러를 피하기 위한 선택이 아니라,  
**UX 요구사항을 안정적으로 구현하기 위한 구조적 결정**이었습니다.

## 정리

이번 Date Picker 개선 작업은  
단순한 UI 수정이 아니라  
**UX 규칙 정의 → 구조 문제 인식 → 타입 설계 개선**으로 이어진 과정이었습니다.

특히,

- UX 문제는 구현 단계에서 구조와 타입 설계 문제로 이어질 수 있고
- 타입 안정성은 단순한 DX 차원이 아니라
- 사용자 경험을 안정적으로 구현하기 위한 기반이라는 점을 다시 한 번 확인할 수 있었습니다.
