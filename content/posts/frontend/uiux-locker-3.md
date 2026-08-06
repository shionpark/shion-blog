---
title: "락커 그리드 미리보기 및 스타일링 개선 – 재사용 가능한 컴포넌트 만들기 (Part 3)"
description: "락커 Part3. 지난 락커 기능도 복습해보자"
date: "2024-06-17"
tags: ["Recoil", "Atom", "\baxios", "React Query", "React"]
published: true
---

이 글은 락커 그룹 생성 기능의 UX를 완성하기 위해, 미리보기 상태에서 발생할 수 있는 문제들을 해결하고, 기존 그리드 UI를 더 유연하고 재사용 가능하게 구성한 과정을 기록해두기 위한 글이다.

### 지난 포스팅 복습

🔗 [락커 그룹 생성하기 - part 1](https://velog.io/@shionpark/%EB%9D%BD%EC%BB%A4-Part1-%EC%84%9C%EB%A1%9C-%EB%8B%A4%EB%A5%B8-%EB%B0%B0%EC%B9%98%EB%8F%84%EB%A5%BC-%EA%B0%80%EC%A7%84-%EB%9D%BD%EC%BB%A4-%EA%B7%B8%EB%A3%B9-%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0)

락커 그룹이 서로 다른 배치를 갖도록 하기 위해 설정값(`column`, `quantity`)을 만들었다.
락커 그룹 생성 시 락커 개수(`quantity`)와 열(`column`)의 개수를 지정해줘야 하고,
미리보기 기능을 추가해 입력한 값에 따라 어떻게 생성되는지 볼 수 있도록 했다.

🔗 [락커 그룹 조회하기 - part 2](https://velog.io/@shionpark/%EB%9D%BD%EC%BB%A4-Part2-%EC%A7%80%EC%A0%90-%EB%B3%84-%EB%9D%BD%EC%BB%A4-%EA%B7%B8%EB%A3%B9-%EB%AA%A9%EB%A1%9D%EA%B3%BC-%EC%84%A0%ED%83%9D%ED%95%9C-%EA%B7%B8%EB%A3%B9%EC%9D%98-%EB%9D%BD%EC%BB%A4%EB%A3%B8-%EB%B3%B4%EC%97%AC%EC%A3%BC%EA%B8%B0)

생성한 락커 그룹과 그룹 내 락커들의 데이터 구조를 살폈다.
모든 데이터를 불러오지만 선택한 값만 필터링하여 보여주기 위해
선택한 락커그룹id, 락커id 상태값을 전역에 생성했다.

## 구현하고 싶은 기능

Part 1과 2에서 락커 그룹을 생성하고, 지점/그룹 단위로 필터링하여 락커들을 보여줄 수 있게 되었다.

이번에는 다음과 같은 추가적인 기능과 개선이 필요했다.

- 락커 그룹 생성 폼에서 값을 입력하면 미리보기 화면이 실시간으로 반영되도록 하기
- 데이터가 없는 상태(미리보기)와 있는 상태(실제 서버 데이터)를 **동일한 그리드 컴포넌트로 렌더링**하기
- 선택된 락커 그룹에 **스타일을 조건부로 적용**하고, 지점을 변경하면 기본 그룹이 자동 선택되도록 구성
Part2에서 발생한 Undefined 에러를 해결하고, 락커 그리드를 꾸며줘야겠다.
스타일링을 할 때 이런 기능이 있으면 좋겠다.

- 모드에 따른 락커 그리드 변화
- 락커 그룹 선택 시 디자인 변화
- 지점 변경 시 맨 처음 락커 그룹 자동 선택
# 해결해야 하는 문제

## 1. 락커그룹 생성 모달에서 출력되는 undefined

현재 락커관리 페이지, 락커그룹 모달에서 `LockerGrid` 컴포넌트를 사용하고 있다.
LockerGrid 컴포넌트를 재사용한 이유는 동일한 데이터 타입(`ILockerResponse[]`)을 받아 동일한 스타일로 보여지기 때문이다.

저장된 락커를 불러와서 화면에 보여주는 '락커관리 페이지'는 항상 락커 배열이 존재하지만,
미리보기 기능을 지원하는 '락커그룹 모달'은 값을 입력하지 않으면 락커 배열이 존재하지 않는다.

> ⬇️ 락커 그룹 모달 (값을 입력하기 전)

나는 Part2에서 락커 그룹 타이틀을 만들어주기 위해 lockers 배열에 인덱스로 접근했었다.
아래의 코드는 '락커그룹 모달'에서 undefined 에러가 발생한다.

```typescript
const lockerGroupTitle = selectedLockerGroup.map((lockerGroup) => {
  const firstNum = lockerGroup.lockers[0].number;
  const lastNum = lockerGroup.lockers[lockerGroup.lockers.length - 1].number;
  return `${lockerGroup.name} (${firstNum} ~ ${lastNum})`;
});
```

이를 해결하기 위해 컴포넌트 내부 로직에서 prop에 따라 다르게 검색하고 컴포넌트를 보여주도록 `preview`라는 prop을 추가해주었다.
최초 상태에 락커가 존재하지 않는 경우는 '락커그룹 모달'에서만 적용될 것이기 때문에 기본값은 false로 두었다.

### 공통 컴포넌트 LockerGrid

```typescript
interface ILockerGridProps {
  name: string;
  column: number;
  lockerIds?: number[];
  lockers?: ILockerResponse[];
  preview?: boolean;
}

const LockerGrid = ({
  name,
  column,
  lockerIds,
  lockers,
  preview = false,
}: ILockerGridProps) => {
  const previewMode = preview === true;

  const { lockersRange } = usePreviewLockerGroup();

  return (
    <Styled.GridWrapper>
      {previewMode && (
        <Styled.LockerName>
          {name}
          {lockersRange}
        </Styled.LockerName>
      )}
      <Styled.LockerGridSection cols={column}>
        {previewMode
          ? lockerIds?.map((id) => (
              <LockerItem key={id} lockerId={id} isPreview />
            ))
          : lockers?.map((locker) => (
              <LockerItem
                key={locker.id}
                locker={locker}
                lockerId={locker.id}
                member={locker.member}
              />
            ))}
      </Styled.LockerGridSection>
    </Styled.GridWrapper>
  );
};

```

### LockerGrid 사용 시

락커그룹 모달에서는 락커id가 존재하는 배열을(`lockerIds`),
락커관리 페이지에서는 서버에 존재하는 락커그룹 데이터(`lockers`)를 prop으로 넘겨준다.

```typescript
const LockerGroupForm = () => {
  // ...
  return (
    // ...
    <LockerGrid
      name={name}
      column={column}
      lockerIds={lockerRooms}
      preview
      />
    // ...
  );
};
```

```typescript
const LockerGroupGridSection = () => {
  // ...
  return (
	// ...
    <LockerGrid
      name={lockerGroup.name}
      column={lockerGroup.column}
      lockers={lockerGroup.lockers}
      />
    // ...
  );
};
```

### usePreviewLockerGroup 훅 살펴보기

락커그룹 모달 form에 값을 입력하면 락커그룹을 생성하고, 생성되는 락커 그룹을 미리 볼 수 있도록 모수를 생성하는 로직은 usePreviewLockerGroup 훅에서 처리되고 있다.

기본적으로 서버에 POST 요청을 보내기 전 form에 입력된 input값을 저장하고 불러와서 요청을 보내는 과정은 도메인 구분없이 비슷하므로 빠르게 짚고 넘어가겠다.

> 락커그룹 생성에 필요한 상태값을 담은 createLockerGroupAtom을 생성하고

```typescript
interface ICreateLockerGroupAtom {
  id?: number;
  branchId: number;
  name: string;
  quantity: number;
  column: number;
  lockerIds?: number[];
}

export const createLockerGroupAtom = atom<ICreateLockerGroupAtom>({
  key: 'createLockerGroupAtom',
  default: {
    id: 1,
    branchId: 1,
    name: '',
    quantity: 0,
    column: 1,
    lockerIds: [],
  },
});
```

form > input에 onChange 이벤트핸들러를 걸어주고,

```typescript
const LockerGroupForm = () => {
  const {
    handleCreateFormBranchId,
    handleNumberInput,
    handleStringInput,
    branchId,
    name,
    quantity,
    column,
    lockerRooms,
  } = usePreviewLockerGroup();
  // ...
  return (
    <>
      // ...
		<Styled.FormCard onSubmit={onSubmit}>
            <LabelField label="지점" vertical bold>
              <Select name="branch" onChange={handleCreateFormBranchId} wide>
                <option>지점 선택</option>
                {branches &&
                  branches.map((branch) => (
                    <option key={branch.branchId} value={branch.branchId}>
                      {branch.name}
                    </option>
                  ))}
              </Select>
            </LabelField>
            <LabelField label="그룹명" vertical bold>
              <Input
                name="name"
                type="text"
                value={name}
                onChange={handleStringInput}
              />
            </LabelField>
            <LabelField label="락커 보유 수량" vertical bold>
              <Input
                name="quantity"
                type="number"
                value={quantity}
                onChange={handleNumberInput}
              />
            </LabelField>
            <LabelField label="열" vertical bold>
              <Input
                name="column"
                type="number"
                value={column}
                onChange={handleNumberInput}
              />
            </LabelField>
            <SquareButton type="submit" size="small">
              설정 완료
            </SquareButton>
          </Styled.FormCard>
      // ...
      </>
    )
}
```

입력받는 값으로 상태를 업데이트한다.

```typescript
export const usePreviewLockerGroup = () => {
  const [lockerGroupState, setLockerGroupState] = useRecoilState(
    createLockerGroupAtom,
  );
  const { branchId, name, quantity, column } = lockerGroupState;
  const handleStringInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const {
        currentTarget: { value },
      } = e;
      setLockerGroupState((prev) => ({ ...prev, name: value }));
    },
    [name],
  );
  const handleNumberInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const {
        currentTarget: { name, value },
      } = e;
      setLockerGroupState((prev) => ({ ...prev, [name]: +value }));
    },
    [quantity, column],
  );
  const handleCreateFormBranchId = useCallback(
    (e: React.FormEvent<HTMLSelectElement>) => {
      const {
        currentTarget: { value },
      } = e;
      setLockerGroupState((prev) => ({ ...prev, branchId: +value }));
    },
    [branchId],
  );
  // ...
}
```

이 훅에서 눈여겨봐야 할 점은 **락커 모수를 생성하는 함수와 처리 방식**이다.

```typescript
export const usePreviewLockerGroup = () => {
  const [lockerGroupState, setLockerGroupState] = useRecoilState(
    createLockerGroupAtom,
  );

  // ...

  const createlockerRooms = useCallback(
    (locker: number) => {
      return Array.from({ length: locker }, (_, index) => index + 1);
    },
    [quantity],
  );

  const lockerRooms = createlockerRooms(+quantity);

  const lockersRange = lockerRooms?.length
    ? ` (${lockerRooms[0]}~${lockerRooms[lockerRooms.length - 1]})`
    : '';

  return {
	// ...
    lockerRooms,
    lockersRange,
  };
};
```

`createLockerRooms`  함수는 useCallback에 의해 보유수량(`quantity`) 값에 의존하여 실행된다.
보유수량을 입력할 때마다 락커 모수가 생성되고 화면에 그려지도록 했다.
이렇게 생성된 락커 모수는 화면에 보여지기만 할 뿐 서버에 요청하지는 않는다.

> ✅ 동일한 컴포넌트를 렌더링할 때 데이터 유무에 따라 발생하는 에러를 props으로 해결했다!

## 2. 락커 그룹 선택 시 디자인 변화

지점별 락커 그룹 필터링 기능은 Part2에서 작업했다.
(Select 태그로 지점을 선택하면, 해당 지점의 락커 그룹이 보여짐)

락커 그룹 목록은 `LockerGroupsContainer`컴포넌트에서 렌더링 되는데,
최초에 어떤 지점, 락커 그룹도 선택하지 않은 경우 디자인은 다음과 같다.

![](https://velog.velcdn.com/images/shionpark/post/44c31ec4-ed69-44d8-9487-291f3a769f7f/image.png)

내가 원하는 기능은, 지점을 선택하면 가장 먼저 보여지는 락커 그룹이 자동으로 선택되는 것과,
선택된 락커 그룹의 디자인이 변화하는 것이다.

먼저, 락커 그리드를 어떻게 구현했는지부터 설명하고자 한다.

### 2.1 락커 레이아웃 설정

LockerGrid 컴포넌트는 `cols` props을 받아서 그리드의 열 수를 설정한다.

```typescript
<Styled.LockerGridSection cols={column}>
  {previewMode
    ? lockerIds?.map((id) => (
        <LockerItem key={id} lockerId={id} isPreview />
      ))
    : lockers?.map((locker) => (
        <LockerItem
          key={locker.id}
          locker={locker}
          lockerId={locker.id}
          member={locker.member}
        />
      ))}
</Styled.LockerGridSection>
```

`cols` 수만큼의 열을 가지고, 각 열의 최소 너비는 `itemHeight`이며, 최대 너비는 자동으로 설정된다.
가로 간격이 넓어지면 화면을 넘어가기 때문에 스크롤을 추가해주었다.

```typescript
// LockerGrid.styles.tsx
import styled from '@emotion/styled';
import { styles, theme } from '@/styles';

interface IAlignGridProps {
  cols?: number;
}

const minWidth = 13.6; // 최소 너비

export const LockerGridSection = styled.div<IAlignGridProps>`
  display: grid;
  grid-template-columns: ${({ cols }) =>
    `repeat(${cols}, minmax(${minWidth}rem, auto))`};
  gap: ${styles.space.level2}rem;
  padding-top: ${styles.space.level2}rem;
  overflow-x: auto;
`;
```

> 팀원들과 공통 스타일 속성을 공유하고 있어요

### 2.2 락커 그룹 조건부 스타일링

```typescript
const LockerGroupsContainer = () => {
  const { data: branchData } = useFetchBranches();
  const {
    handleSelectedBranchId,
    lockerGroupsOfBranch,
    lockerGroupIdState,
    setLockerGroupIdState,
  } = useFilterLockerGroup();

  return (
    <Styled.Wrapper>
      <Select onChange={handleSelectedBranchId}>
        {branchData?.map((branch) => (
          <option key={branch.branchId} value={branch.branchId}>
            {branch.name}
          </option>
        ))}
      </Select>
      <Styled.LockerGroups>
        {lockerGroupsOfBranch?.map((lockerGroup) => (
          <Styled.LockerGroup
            key={lockerGroup.id}
            active={lockerGroup.id === lockerGroupIdState}
            onClick={() => setLockerGroupIdState(lockerGroup.id)}
          >
            {lockerGroup.name}
          </Styled.LockerGroup>
        ))}
      </Styled.LockerGroups>
    </Styled.Wrapper>
  );
};
```

```typescript
interface ILockerGroupProps {
  active?: boolean;
}

export const LockerGroup = styled.button<ILockerGroupProps>`
  background: white;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 4rem;
  font-size: ${styles.fontSize.small}rem;
  border-width: ${styles.border.level2}rem;
  border-radius: 1rem;
  border-style: solid;
  cursor: pointer;

  ${({ active }) =>
    active
      ? css`
          border-color: ${theme.color.gray};
          background: ${theme.color.gray};
          color: white;
          font-weight: bold;
        `
      : css`
          border-color: ${theme.color.lightGray};
          background: white;
          &:hover {
            background: ${theme.color.lightGray};
            border-color: ${theme.color.lightGray};
            color: white;
            opacity: 0.8;
          }
        `}

  ${styles.transition.button}
`;
```

### 2.3 지점별 가장 맨 앞의 락커 그룹 선택

```typescript
export const useFilterLockerGroup = () => {
  const [branchIdState, setBranchIdState] = useRecoilState(branchIdAtom);

  const filterLockerGroup = (selectedBranchId: number) => {
    const filteredLockerGroups = lockerGroups
      ? lockerGroups.filter(
          (lockerGroup) => lockerGroup.branchId === selectedBranchId,
        )
      : [];

    setLockerGroupIdState(
      filteredLockerGroups.length ? filteredLockerGroups[0].id : 12,
    );
  };

  useEffect(() => {
    filterLockerGroup(branchIdState);
  }, [branchIdState]);

  // ...
}
```

![](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/de959d5b-dcfa-41ef-83fa-b94397bd3e30/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466YHPHYMZR%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152925Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF8aCXVzLXdlc3QtMiJGMEQCIBN%2FvRk1s67B5z%2FJ7e2JBslea3lT%2BouLYDvF7LQYewNQAiB8y%2Ff5sEHiGUB1%2F3SXn74KLTLzkPo9QnXfR7x6PKc1uyr%2FAwgnEAAaDDYzNzQyMzE4MzgwNSIMY3dOcfe5Ck8s1rEXKtwDiOWRazDx%2FDQYj9De7ajkpUbnX2WcibxR%2BK5TN%2B1oxtJ6xzZLNlMkzVpiP4z90B%2BJg49QGHWypomB35BaK6WdqE51EyuR5swjoVtIJITmqYQWSu38o46bzCt0xTdJmsfZFlSgzombeF8GVH6dCPSL%2B25VvraARdGm%2FTDMO%2B8GWAK%2BGaXm%2BPQz63TKVgMzwFkSarKfwE63oLzIywkbO8S4S1B7KGqewLEOv7JwGBfZYiyCVhsC%2BAm53RdecuZ41FJS73z2AAWk0DvU9SMcThKQFLtmRV2QnMSHMq%2ByO5hyRluE19fn%2B60r%2FivDV65jlYi9vlw%2FjvZpwjgUf%2FAuJo%2B5uHFBbGS3jZ5XcR6tLNXEYuJ90xG6kUTubWSD%2BMnqfVazs6mwEPJYtaqgerPQxkOyNOWpj5jzNFuU%2FFbxqDebomrbJarUWKVEu3%2BkWu1A%2BWcSnoJtt%2BWQNJ9jN0liGQI%2FjsaFOiDT974%2Bogneo1KzU4N8X2WjTXnJetHMxytgKQu7Efq%2B%2FcIVtrf4Dpd%2FMb%2FA6vJhCD60GSLLzpkTWTGWBDyiuo%2BWrf6lNdO27wj0pLvU1%2F%2BySE8jz9t09MOF2vSWCPtVlZ3JraIeIzGYbYngN1G1j7qlFoo1e5og0m0who7N0wY6pgEzUsEGW1tgDnKBVDcCEAXC7e1kdQoKlu7O56pry5E2hs81wlOvuni%2BYnZTofih0VqphlYoKQTVTywMXwCZe0UGl4MdbzQEpXxgmLPtC1O9okI8C0fzEP5mhF5V3c82WJn4czutvDQGdOgckPmvS1oE2XH%2FXx52qqXZGu792%2B5IYphx2UeyP0CzRugdD604KBegkEkCyWnvBjhixqTqeJ4Y%2B0C%2BKATT&X-Amz-Signature=6d259cf64a5011aace38afc6b363670e52fd527bafe109ad0b7f7b996e0c443d&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

락커관리 페이지

![](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/f27e29b0-8653-4655-a438-242142862ed1/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RARTJUAU%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152925Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF8aCXVzLXdlc3QtMiJGMEQCIEH5ZxjBmP%2FOR27ZEkWi8v0kGLzWgLJufMKvX9DAhB3YAiA07nC0WIxGl%2Fj4%2BidysIMn5oHw6W982cEz4qIEtEDLTCr%2FAwgnEAAaDDYzNzQyMzE4MzgwNSIMBXTMQbC9x1zUDEdyKtwDCX9uUv9rQhiF0vjguk%2B%2FIyz7NnYPkfOyZprtXD9KLPvMUlqwLu2p1rxTw9O9x8a5g7b%2FbHQfrZgLoGzr9hBJspgXQq%2BUeSnUMIAQ7ZaRXQhLJbl7ALe7hRViO44bBH6j7Fz93BGHi0RbGL%2BMDWOGRSGwKZB02bCQ1RCyILM18Es0nhXZES1Zy93rVhB34g7UlKlBCOcA5Jy9P0PtMmUVR%2FZFwwJ1LDS34tnYWU1VskmqUDJULP1gOcybx%2FOX1Q8UQBQHRyWl9C084y3bfvzZMC9cJM7dmJtKucjc5ZRKGlp7cYWEdU6RivfJDCdCLH%2BQaHX%2F0ENrKBGW8lE4DQvQOiUC37jiqV9o9wLmVkTwiOya65Me6%2FBkDSX8dg1%2B3I3uNFes%2Fx16Z7Bawbq%2Bs2C55QD76cIBYGA0RaRQNeOVkuujrs3ZUx1gNtxkuYO6hDf%2BDzxYJGlMulLN2%2FO7cszFZ%2FatbCYY3cI2lXFZ0isrnBJFuE6O8I17H5v67DMtYDL%2BtYOc5a4DC%2BSlYJtwb%2BdboBM7a7MsZpuIBB2Z9B94E4XZxqo2YD5BRmJJ77ndVjFLn%2FYhkvTk8s8JIngT1pQLxfTRHa26eo9ZPycgKEaiSrfBJa9jxG1OUgYYVcYw0IzN0wY6pgEbNqC9M98EQ3eoIZrr7rbP4F5gGnBACP8UEp%2FuKfk3IjuO2StMb3%2FWhGYBOkVaT90ANowhYHIr9JBJFbLiDbBPV%2B096WSo4l46KpinwIzovSsRteAk5mOG8BY5ZWHfUny1u1lLqWCKgtmTnwICS8gua2B5Cs9YnqMRrqb8qMFBdTU68qPoYA%2BvSNwDmD5YmmP9MkcGmy9dcTr3SxyQG4P1Jis%2F4lsZ&X-Amz-Signature=28cfd3372a343f602a9449a6a83817fd442575f670f2a9fb9562b15eedcd0634&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

락커그룹 모달

다음 포스팅에서는 회원 할당을 위한 회원 검색 기능과 락커 모달 상태 관리 로직에 대해 얘기해보도록 하겠다!
