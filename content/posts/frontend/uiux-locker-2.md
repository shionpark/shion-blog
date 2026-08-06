---
title: "락커 그룹 및 락커룸 필터링 – 지점별 조건 렌더링 로직 (Part 2)"
description: "락커 Part2. 지점별 락커 그룹 목록과 선택한 그룹의 락커룸 보여주기"
date: "2024-06-12"
tags: ["Recoil", "Atom", "\baxios", "React Query", "React"]
published: true
---

이 글은 헬스장 내 여러 지점에 속한 락커 그룹과 락커룸 정보를 선택된 지점 기준으로 필터링하여 표시하고, 선택된 그룹의 락커들을 그리드 형태로 보여주는 기능을 구현한 기록이다. Recoil 전역 상태와 사용자 인터랙션을 바탕으로 컴포넌트를 구성하고, 필터링 로직을 분리하여 유지보수성을 높였다.

## 구현하고 싶은 기능

- 지점을 선택하면, 해당 지점에 속한 락커 그룹 목록만 보여주기
- 락커 그룹을 클릭하면, 해당 그룹에 속한 개별 락커룸들을 **그리드 형태로 시각화**
## **문제 상황과 해결 과정**

### **문제 1. 락커 그룹은 지점마다 다르다**

헬스장은 총 5개의 지점을 운영 중이다. 지점마다 배치된 락커 그룹의 수와 구성도 모두 다르기 때문에, **사용자가 지점을 선택했을 때 해당 지점에 속한 락커 그룹 목록만 보여줘야** 한다.

![지점1의 락커 그룹 예시](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/f5932408-b61c-469d-9bfb-cf92964450fc/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4663J2I735X%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152918Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJHMEUCIQCmP0H0qjKsxOBLu8m3dzse2aXhE4n1Js63ug%2BNnRzH1wIgTrSyfVbfRuny9hgGqtQQb4COTPjhwO0fwf18VPgEGzoq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDL%2FdHIqJa739SndT5CrcAxw1DQDobTF%2Fkrp5G8VyYdAgjE%2Fg6v01XFX4qx%2F3oyHF6k3YOAk6XHGcHANhuTG4vSg6q9ZoXQcwue4lcGfk1b9gYm3n%2BlJ%2FdCN5IsOwUYIHCJTgusbhpTN7PTjJht0RTVUTesGP3eGt5GMFxwlQsV3nOLw3QiEXakkzDC5g25CtA0vUV0qQyr1KMB%2F3Byym9DNAK3qFmplJSLwaoshVVbbqfIwRNN5Z4dfweVTlqArCbTgXL8Au7zfwAR4a0z49pkLBWWMPSV7gJN0oL5x3ou8FJLLj8aQIoOr0H6S8OVJQ48wUlrJ10Kb9kvxHxOm%2BJMD2NNJ8io1JMEvHhjmidQ1sgYpsIkxck%2FwJrhAP6sAG8S7kBVU4Ux5hw7Vq2vK024dwsCDIypYGon3h26s8BfIcWbU6UPMzU%2FOawmfmRPVnjqSgm2L6T7cfbk7kcv57b6ptk9SGlU0meTTSdFRl2EQSh9R9bq0hfjinSDv2hudoRQW20TaOJMjmlb3wLGElr2uygz%2B0YutrYjJJ2QeH6N%2FGLLKPvZ9QQ%2BVQaoeUUQ1s6bw%2BYk8lDeGGrB%2FRS1Kj%2FOJztB9YKHU1s%2B%2B3Jj%2FVv3N83iopL89nGVQoON0b8Bch64c%2FHbgOrDDJe02JML2LzdMGOqUBi6Av1bgM%2B0ziQQ%2BVKMUhSJb4L8UcUrZyOaujwO%2Frq%2BRpnNVwWMXXM0wRS64%2BcQuSjn6UOyv3qD2TH16Ui8fUBTXdaDsoVv7B%2FbDxD7dCFAfTYmFXRJRMuxgGIEIReO9Qyzhnslk7%2FRTCAabJWWPhNIlSM7oG2ZT48vgyfqbFuwvVW0bECAVo4605oQR3FjhV3cteTVG2Vea19nA6Q0L5Tv%2FBIUio&X-Amz-Signature=50d355f765246e32ff421ecce4507c92909c4087d352d19f950144fb7babbba6&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

![지점2의 락커 그룹 예시](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/327b563e-e54c-47f0-85cd-d47f944b0a77/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466SAS4AEQQ%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152919Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJHMEUCIQDjgsDfKoqXYj1tTbjJr813hs5XR8kvIbMDXxyv7V7I%2BgIgeeTbzjx7l9ljGzwAcXgo51D9VTodoxxKXNIHbL%2FUNOkq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDNf4lQqFpgZx88U6RircA5Pz2An4nYoS0J4Way%2BFGAKg3ufp6T9UQ8%2Frty3rgspB3un%2FM1vAhrnQ0r76BB2GH5B2qzVYmfuYXrO9TShAibbcyiov9IFsGFUslxPUDg3CW4L27J2pFy%2BGiTYcu%2BuQDV0css%2Ft28IeJ7LUDdbU8mq7RdbHjZ35UHw%2BLQ3GIQ18V8Gb8c6XfHsuC2%2FtabetqQB5sZiVetozJOurcQJZTBGLxFt0hp6UaEDK9i0HWH7eTCZknw14qHfsly5JqkiHJ6M%2B%2B60NnU4F6%2BvuqaUtSQQKz%2BHy%2BKkYhLvx2iZ7zTfUKVfHbQgtKG0sEaqdZtzq0j6lIGzVikYN8PD3gmzGril6BKCr11LCXYFpUBZEtptbTn9xd2e%2BvTGsBvJudTvelXBwPlXStdEI%2FOCK0OHBEPmN3Rkopx2R6R3mggfjCjUmIvOylorYIdvKqDM2cL2I1XJYU5m2gNx5peqhsd8NDJ0HZl7eARQrbpz%2Bq0ugnPoJrjQ8%2BOmLi3WnUNHHwnYuuHTt7%2FbTBoflMz07pQj4OqHeUWzSk04KKoabNwJvWdY49Odhj01HZKzqjlSZL3zogty42oNX3CBPtd6JdJpCWzxdTp9yMcg9C%2BDQ8FQv5yHP1SkR2LKSECk0cjIEMMuKzdMGOqUB261po3rruR9qMEvWYklnA84l29n85BIAmhkiUqeXk%2Bx%2BtigOUOPz8wEMxN3IjU5qf61Z8snitoRHp%2F1ep2sFL7hNim%2B3IhtEYBEYa5KkJsLfyE8f80D9b5IdTKQcnYbuda27izrND5XFZMeEVjOSzhlXxmnWSMBnqE%2BeNkT8oQis5wcIrsoQlvpdOdNVBrIDEGPEHoMcV3xjiClcxHlBMN8O0pyJ&X-Amz-Signature=f7ee94d4877817712abea354f9648b225d22d3b16341f7e22e8ee0636ed18fb3&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

이를 위해 선택된 지점의 branchId 값을 Recoil atom에 저장하고, 그 ID를 기준으로 락커 그룹 리스트를 필터링하는 구조를 구성했다.

```typescript
export const branchIdAtom = atom<number>({
  key: 'branchIdAtom',
  default: 1, // 초기값은 첫 번째 지점
});
```

사용자는 select 요소에서 지점을 선택할 수 있고, 선택된 값은 branchIdState에 저장된다.
이 상태는 다른 컴포넌트에서도 사용할 수 있도록 전역으로 관리했다.

### **문제 2. 락커 그룹 클릭 시 해당 그룹의 락커룸 목록 보여주기**

지점 선택 후 락커 그룹이 보여졌다면, 그 중 하나를 선택했을 때 해당 그룹에 포함된 락커룸(lockers) 리스트를 그리드 형태로 표시해야 한다. 이를 위해 선택된 락커 그룹의 ID도 Recoil atom으로 관리했다.

```typescript
export const lockerGroupIdAtom = atom<number>({
  key: 'lockerGroupIdAtom',
  default: 12, // 초기값: 1호점의 첫 번째 그룹
});
```

그리고 lockerGroup.id와 lockerGroupIdAtom이 일치하는 경우에만 그리드를 렌더링하는 방식으로 구성했다.

### **문제 3. 락커룸 타이틀: 이름과 범위 표시**

타이틀에는 “락커 그룹 이름 (1 ~ 50)” 형태처럼 번호 범위를 표시해야 했다.

처음엔 락커 id로 처리하려 했지만, 락커 id는 전 지점에서 고유하고 연속적이지 않은 반면, number는 각 그룹 내에서 1부터 시작하는 번호이기 때문에 이를 기준으로 처리했다.

```typescript
const first = lockerGroup.lockers[0].number;
const last = lockerGroup.lockers[lockerGroup.lockers.length - 1].number;
return `${lockerGroup.name} (${first} ~ ${last})`;
```

단, **lockers 배열이 비어있는 경우**가 있어 예외 처리가 필요했고, 이는 다음 포스트에서 다룰 예정이다.

## **필터링 로직을 useFilterLockerGroup 훅으로 분리**

컴포넌트 내에서 상태와 필터링, title 계산까지 모두 처리하고 있었더니 너무 복잡해졌다. 그래서 상태 조회, 선택 핸들러, 필터링된 리스트, 그룹 타이틀 등을 반환하는 훅을 따로 만들었다.

지점 ID, 락커 그룹 ID, 그리고 관련된 필터링 값들을 하나의 커스텀 훅으로 분리함으로써 컴포넌트의 복잡도를 낮췄다.

```typescript
export const useFilterLockerGroup = () => {
  const [branchIdState, setBranchIdState] = useRecoilState(branchIdAtom);
  const [lockerGroupIdState, setLockerGroupIdState] = useRecoilState(lockerGroupIdAtom);

  const handleSelectedBranchId = useCallback((e: React.FormEvent<HTMLSelectElement>) => {
    setBranchIdState(+e.currentTarget.value);
  }, [branchIdState]);

  const { data: lockerGroups } = useFormattedLockerGroups();

  const lockerGroupsOfBranch = lockerGroups?.filter(
    (lockerGroup) => lockerGroup.branchId === branchIdState,
  ) || [];

  const selectedLockerGroup = lockerGroupsOfBranch.filter(
    (lockerGroup) => lockerGroup.id === lockerGroupIdState,
  );

  const lockerGroupTitle = selectedLockerGroup.map((lockerGroup) => {
    const first = lockerGroup.lockers[0].number;
    const last = lockerGroup.lockers[lockerGroup.lockers.length - 1].number;
    return `${lockerGroup.name} (${first} ~ ${last})`;
  });

  return {
    handleSelectedBranchId,
    lockerGroupsOfBranch,
    lockerGroupIdState,
    setLockerGroupIdState,
    selectedLockerGroup,
    lockerGroupTitle,
  };
};
```

## 컴포넌트 구조 

### **LockerGroupsContainer**

지점 선택과 락커 그룹 리스트를 표시하는 컴포넌트

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

### LockerGroupGridSection

선택된 락커 그룹의 락커룸들을 보여주는 컴포넌트

```typescript
const LockerGroupGridSection = () => {
  const { selectedLockerGroup, lockerGroupTitle } = useFilterLockerGroup();

  return (
    <Styled.LockerManagementSection>
      {selectedLockerGroup.map((lockerGroup) => (
        <Styled.Wrapper key={lockerGroup.id}>
          <Styled.LockerName>{lockerGroupTitle}</Styled.LockerName>
          <LockerGrid
            name={lockerGroup.name}
            column={lockerGroup.column}
            lockers={lockerGroup.lockers}
          />
        </Styled.Wrapper>
      ))}
      <LockerAssignForm />
    </Styled.LockerManagementSection>
  );
};
```

## **정리하며**

이번 기능은 사용자 중심의 UI를 구현하기 위한 전형적인 사례였다. 지점 선택 → 그룹 선택 → 그룹 하위의 락커룸 확인이라는 일련의 흐름을 Recoil 상태와 커스텀 훅으로 명확하게 분리하면서 **UI 상태, 도메인 데이터, 인터랙션 흐름**을 각각 독립적으로 다룰 수 있게 되었다.

특히 다음과 같은 설계적 고민이 실현되었다:

- 상태 값을 전역(atom)으로 분리하여 모든 컴포넌트에서 접근 가능하게 구성
- 선택된 값 기준으로 데이터를 필터링하여 보여주는 구조
- 락커 번호 범위 계산 시 number와 id의 차이 인식 및 예외처리 필요성 파악
- 커스텀 훅으로 필터링 로직 캡슐화 → UI 컴포넌트는 UI 역할에만 집중
