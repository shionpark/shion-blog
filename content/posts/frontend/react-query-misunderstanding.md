---
title: "서버 통신 관리 도구 React Query에 대해 갖고 있던 오해"
description: "캐싱 기능을 통해 불필요한 API 요청을 줄이고 데이터 동기화를 자동화하여 개발 효율성을 높여주는 React Query"
date: "2024-12-13"
tags: ["React", "React Query"]
published: true
---

## React Query 이전의 방식, Redux

**React Query**는 리액트 애플리케이션에서 **서버 상태**를 불러오고, **캐싱**하며, 지속적으로 **동기화**와 **업데이트**를 도와주는 라이브러리다. 즉, **서버와의 통신**을 더욱 편리하게 만들어주는 도구다.

React Query의 장점을 이해하기 위해, 이전에는 같은 작업을 어떻게 처리했는지 살펴보자.

### Redux

React Query가 등장하기 전, 개발자들은 주로 **Redux**를 사용했다.

Redux는 **Global State Management Library**로, 전역 상태를 관리하는 라이브러리다.

**전역 상태**는 리액트 컴포넌트의 생명주기와 독립적으로 비동기 데이터를 관리하므로, 캐싱과 같은 최적화 작업을 수월하게 할 수 있다는 장점이 있다.

### Redux가 React Query를 대체할 수 없는 이유?

Redux의 가장 큰 단점은 **지나치게 많은 보일러플레이트 코드**가 필요하다는 점이다.

하나의 API 요청을 처리하려면 여러 Action과 Reducer가 필요하며, API 수가 늘어날수록 코드량과 복잡도가 급격히 증가한다.

또한, API 통신에서는 통신 자체뿐만 아니라 받아온 **데이터를 관리**하는 것도 중요하다.

하지만 Redux는 React Query와 달리 API 통신이나 비동기 상태 관리를 위한 라이브러리가 아니다.

따라서 비동기 데이터 관리 로직을 **개발자가 직접** 설계하고 구현해야 한다.

이는 개발자마다 서로 다른 **데이터 관리 방식**을 사용하게 만든다. 특히 팀원이 많고 협업 관계가 복잡할수록 이 문제는 더욱 심각해질 수 있다.

## React Query 동작 방식

비동기 데이터와 API 상태 관리를 위한 표준화된 방식이 필요해지면서 **React Query**가 등장했다.

**React Query**는 queryClient를 내부적으로 사용해 다양한 상태를 저장하고 부가 기능을 제공한다.

```typescript
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  )
}

function Example() {
  const { isPending, error, data } = useQuery({
    queryKey: ['repoData'],
    queryFn: () =>
      fetch('https://api.github.com/repos/TanStack/query').then((res) =>
        res.json(),
      ),
  })

  if (isPending) return 'Loading...'

  if (error) return 'An error has occurred: ' + error.message

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.description}</p>
      <strong>👀 {data.subscribers_count}</strong>{' '}
      <strong>✨ {data.stargazers_count}</strong>{' '}
      <strong>🍴 {data.forks_count}</strong>
    </div>
  )
}
```

TanStack Query 공식 문서 예제 코드

### React Query에 대한 오해

현재 개발 중인 프로젝트에는 여러 사용자 권한이 있으며, 관리자 권한에서만 지점을 선택해 지점별 데이터를 조회할 수 있다.

관리자가 로그인하면 모든 페이지에서 지점을 선택할 수 있도록 지점 목록을 불러와야 한다.

처음에는 지점 목록을 상수로 관리하여 Select 태그를 구현했다가, 나중에 지점 목록 조회 API가 추가되면서 서버 응답 데이터로 Select 태그의 option을 생성하도록 변경했다.

그러다 문득 *페이지를 이동할 때마다 지점 목록을 새로 요청하면 서버에 부담이 되지 않을까* 하는 걱정이 들었다.

### React Query의 캐싱

다행히 이는 불필요한 걱정이었다. React Query는 데이터를 로드할 때 내부적으로 **캐시**를 사용하기 때문에, 컴포넌트가 다시 렌더링되어도 새로운 요청을 보내지 않고 **캐싱된 데이터**를 반환한다!

따라서 지점 목록에 변경이 없다면 새로운 요청을 하지 않으므로 성능에 영향을 주지 않는다.

게다가 선택 핸들러와 데이터 검색 로직은 useCallback으로 메모이제이션되어 불필요한 재생성을 방지하고 있다.

findBranchInfo는 지점 목록이 큰 경우 성능에 영향을 줄 수 있지만, 일반적으로 지점 목록은 작은 데이터셋이므로 문제가 되지 않는다.

전체 코드는 다음과 같다.

더보기

```typescript
import { ChangeEvent, useCallback, useEffect, useState } from 'react';

import type { IBranchNameResponse } from '@/types';

import { useBranchNameList } from '../fetchHooks';

export interface UseBranchSelectReturns {
  branchState: IBranchNameResponse;
  branchNameList: IBranchNameResponse[] | undefined;
  handleBranchSelect: (event: ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * 전체 지점 목록과 선택된 지점의 데이터를 불러오기 위한 커스텀 훅
 *
 *
 */export const useBranchSelect = (): UseBranchSelectReturns => {
  const { data: branchNameList } = useBranchNameList();

  const [branchState, setBranchState] = useState<IBranchNameResponse>({
    branchId: 0,
    name: '',
    code: '',
  });

  const findBranchInfo = useCallback(
    (branchName: string) => {
      return branchNameList?.find(({ name }) => name === branchName) || null;
    },
    [branchNameList],
  );

  const handleBranchSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const {
        target: { value },
      } = e;
      const selectedBranch = findBranchInfo(value);
      if (selectedBranch) {
        setBranchState(selectedBranch);
      }
    },
    [branchNameList],
  );

  useEffect(() => {
    if (branchNameList && branchNameList.length > 0) {
      setBranchState(branchNameList[0]);
    }
  }, [branchNameList]);

  return {
    branchState,
    branchNameList,
    handleBranchSelect,
  };
};
```

### 정리

**React Query**는 비동기 데이터 관리에서 뛰어난 이점을 제공한다. 특히 **캐싱, 데이터 동기화**, 그리고 **로드 상태 관리**를 표준화된 방식으로 처리해 코드의 가독성과 유지보수성을 크게 높인다.

반면 **Redux**나 다른 상태 관리 도구들은 비동기 상태 관리 로직을 직접 작성해야 하므로 개발자의 부담이 크고, 프로젝트 규모가 커질수록 관리가 어려워진다. **React Query**는 이러한 문제를 해결하고 서버 상태를 효율적으로 관리할 수 있는 방법을 제공한다.

위 코드의 **useBranchSelect** 커스텀 훅은 **React Query**의 장점을 활용해 데이터를 요청하고 캐싱하며, 사용자가 데이터를 직관적으로 선택하고 관리할 수 있게 해준다. **React Query**의 **캐싱** 메커니즘 덕분에 불필요한 API 호출을 줄이고 자연스러운 성능 최적화를 달성할 수 있다.

결론적으로, **React Query**는 서버 상태를 다루는 리액트 애플리케이션에서 매우 강력하고 유용한 도구임이 분명하다.

단순한 데이터 로딩을 넘어서 **유효성 검증, 자동 리페치, 캐싱**, 그리고 **옵션 기반의 유연한 상태 관리**를 제공함으로써 개발자가 핵심 로직에 집중할 수 있게 해준다.

앞으로도 **React Query**를 적극 활용해 더욱 효율적이고 가독성 높은 코드를 작성하도록 노력해야겠다.

## 핵심 요약

- Redux는 비동기 상태 관리를 위한 표준화된 방식을 제공하지 않아 개발자가 직접 구현해야 함
- React Query는 서버 상태 관리를 위한 전문화된 도구로, 캐싱과 데이터 동기화를 자동으로 처리
- 캐싱 메커니즘으로 인해 불필요한 API 요청을 방지하고 성능을 최적화
- 유효성 검증, 자동 리페치, 옵션 기반 상태 관리 등 다양한 기능을 제공해 개발 효율성을 높임
