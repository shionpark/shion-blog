---
title: "모달 내부 값 초기화가 되지 않는 이유, 조건부 렌더링으로 해결하다"
description: "Rendered more hooks than during the previous render 에러 해결 과정"
date: "2024-12-16"
tags: ["React"]
published: true
---

## 1. 첫번째 케이스

### [문제] 수정 폼을 렌더링할 때 에러 발생

나는 동일한 폼 컴포넌트를 사용해 서버에 등록(POST)과 수정(PATCH) 요청을 보내려고 했다.

각 요청에 필요한 데이터 타입이 달랐기 때문에, 상황에 따라 사용자의 입력값을 제한해야 했다.

다음 두 가지 방법을 생각했다.

- isEdit이라는 플래그 값으로 상황을 구분한다. 기본값은 False이며, 수정 폼일 때는 True가 된다.
- 폼의 내부 요소를 조건부 렌더링하여 상황에 따라 입력을 제한한다. 일부 input을 span으로 렌더링한다.
이 방법을 적용했더니 수정 폼을 렌더링하는 순간 **`Rendered more hooks than during the previous render.`** 에러가 발생했다.

### [원인] 훅 호출의 순서와 개수 차이 발생

**React에서 훅 호출은 컴포넌트가 렌더링되는 동안 고정된 순서와 개수로 이루어져야** 한다.

첫 렌더링에서 존재했던 input이 span으로 대체되면서 다음 렌더링에서는 사라지게 되었고, 이로 인해 훅 호출 개수가 변경되어 문제가 발생했다.

예를 들어, input이 렌더링될 때는 useRef 훅이 호출되었다가 span으로 렌더링되면서 훅이 호출되지 않게 되자

React는 '**이전 렌더링에서 호출된 훅이 현재 렌더링에서 호출되지 않았다**'고 판단했다.

(폼 내부 데이터는 useForm 커스텀 훅의 내부 useRef 훅으로 생성된 ref 값을 참조하고 있다)

또한, input이 렌더링될 때는 useRef가 존재하지만 span으로 바뀌면 useRef가 참조할 DOM 요소가 사라질 수 있다.

이로 인해 상태 관리가 꼬이거나 React가 내부적으로 훅 호출을 불일치하다고 판단할 수 있다.

### [해결] 동일한 DOM 구조를 유지하면서 속성만 변경

조건부 렌더링에서 **훅 호출 개수를 일관되게 유지**하기 위해

1. 특정 조건에서만 호출되지 않고 항상 고정된 순서로 호출되도록 작성하거나
1. *조건에 따라 다른 요소를 렌더링하기보다**** 동일한 DOM 구조를 유지하면서 속성만 변경****하거나*
1. 혹은 상태 관리를 별도로 유지하며 DOM 구조를 교체
하는 방법들이 있었는데, 나는 *2번 특정 조건(isEdit === true)에 따라 input 요소에 기본값을 설정*하는 방식을 선택했다.

```typescript
const ProductForm = () => {
// ...return (
// ...
    	<Input
            type="number"
            readOnly={categoryFlag === 'SESSION'}
            min={0}
            {...register({
              name: 'duration',
              defaultValue: initDuration || 0,
              placeholder: '기간을 입력해주세요.',
            })}
        />
	    <Select
            name="durationUnit"
            value={durationUnit}
            onChange={handleDurationUnitSelect}
            disabled={categoryFlag === 'SESSION'}
            defaultValue={initDurationUnit}
          >
            <option value="month">개월</option>
            <option value="day">일</option>
          </Select>
		<Input
              type="number"
              readOnly={categoryFlag === 'DURATION'}
              min={0}
              {...register({
                name: 'sessions',
                defaultValue: initSessions || 0,
                placeholder: '횟수를 입력해주세요.',
              })}
        />
// ...
    )
}
```

## 2. 두번째 케이스

### [문제] 모달을 열 때 에러 발생

출석관리 시스템을 구현하던 중이었다. 숫자 패드에 출석번호를 입력하면 해당 번호를 가진 회원을 조회하여 출석 등록을 처리하는 기능이었다.

등록 버튼을 클릭하면 입력된 값으로 검색한 회원 정보를 모달 내부에 표시하도록 구상했다.

버튼 클릭 시 모달이 열리도록 했고, 모달에 데이터를 전달하기 위해 모달을 여는 함수에 필요한 값들을 전달했다.

서버 데이터 조회는 비동기 작업이므로, 검색 결과가 조회되었을 때 모달을 여는 함수가 실행되도록 useEffect 훅을 사용했다.

```typescript
useEffect(() => {
  if (searchList) {
    openAttendanceMembersModal({
      phone: clickedNumPad,
      membersInfo: searchList,
    });
  }
}, [searchList]);
```

사용한 코드 일부

### [원인] 컴포넌트를 렌더링 할 때 발생하는 상태 변경

React는 렌더링 과정에서 훅의 호출 순서와 개수를 추적한다. **이전 렌더링과 현재 렌더링의 호출 순서와 개수는 동일**해야 하며, 따라서 **상태 변경은 반드시 렌더링 이후에 이루어져야 한다.**

내 코드를 자세히 보면, useEffect 내부의 모달을 여는 함수 openAttendanceMembersModal은 openModal 함수를 감싸고 있다.

```typescript
const openAttendanceMembersModal = (props?: IAttendanceMembersProps) => {
  openModal({
    type: 'attendance-members',
    size: 'md',
    attendanceMembersProps: props,
  });
};
```

openModal은 전역 상태(Recoil)를 업데이트하는 함수이므로 **React가 렌더링 중인 시점에 상태 변경이 발생**했던 것이다!

```typescript
const { numPadState: clickedNumPad, handleNumPadState: handleNumPad } = useInputNumPad();

const [searchParam, setSearchParam] = useState<string>('');
const [errorMessage, setErrorMessage] = useState<string>('');

const { data: searchList, refetch } = useAttendanceSearchList(
	{ phone: searchParam },
	{ enabled: false }
);

const handleSearchMember = () => {
	if (clickedNumPad.length !== 4) {
		setErrorMessage('잘못된 형식입니다.');
		return;
	}
	setSearchParam(clickedNumPad);
	setErrorMessage('');
};

useEffect(() => {
	if (searchList) {
		openAttendanceMembersModal({
			phone: clickedNumPad,
			membersInfo: searchList,
		});
	}
}, [searchList]);
```

사용한 코드 일부

### [해결] 모달에 검색 결과가 아닌 파라미터를 전달

모달 컴포넌트를 먼저 렌더링한 후에 회원 정보를 조회하고 렌더링하도록 수정했다.

그 결과, 회원 검색 결과를 기다릴 필요가 없어져 속도가 개선되었고 에러도 해결되었다.

모달 내부 요소는 모달 내부에서 처리하는 것이 기존 작업 방식과도 일치했다.

## 결론 및 사소한 팁

위 두 가지 사례를 통해 React의 렌더링과 상태 관리에서 발생할 수 있는 대표적인 문제들의 원인과 해결 방법을 살펴보았다.

이 글을 읽는 분들도 React의 동작 원리를 더 깊이 이해하는 시간이 되었기를 바라며—

1. 렌더링 중 훅 호출의 일관성 유지
1. **렌더링 중 상태 변경 방지**
## 핵심 요약

- React의 'Rendered more hooks than during the previous render' 에러는 렌더링 과정에서 훅 호출의 순서나 개수가 변경될 때 발생
- 조건부 렌더링 시 DOM 구조를 일관되게 유지하고 속성만 변경하는 것이 안전
- 렌더링 중에는 상태 변경을 피하고, 반드시 렌더링 완료 후 상태를 변경해야 함
- 모달과 같은 UI 컴포넌트는 먼저 렌더링한 후 내부 데이터를 처리하는 것이 효율적
