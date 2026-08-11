---
title: "서버와의 통신 흐름 정리: HTTP 요청부터 React Query 적용까지"
description: "React Query를 도입하여 HTTP 요청과 상태 관리를 통합한 구조로 개선한 과정"
date: "2024-05-28"
tags: ["\baxios", "React Query", "HTTP", "useQuery", "useMutation", "API"]
published: true
---

이 글은 클라이언트에서 서버로 데이터를 주고받는 흐름을 정리한 글이다. 기초적인 HTTP 메서드 개념부터 시작해 fetch, Axios를 사용한 데이터 요청 방식의 차이를 살펴보고, React Query를 적용해 상태 관리까지 통합한 방식으로 리팩토링하는 과정까지 정리했다.

## **HTTP Method 이해하기**

클라이언트가 서버에 요청을 보낼 때는 HTTP 메서드를 사용한다. 각 메서드는 요청의 목적을 명확히 표현하기 위한 방식이며, REST API에서는 다음과 같은 메서드들이 주로 사용된다:

- GET: 서버에 자원을 요청 (조회)
- POST: 서버에 새로운 자원을 생성 (등록)
- PUT: 자원의 전체 수정
- PATCH: 자원의 부분 수정
- DELETE: 자원의 삭제
요청이 어떤 데이터를 다루는지, 그리고 어떤 작업을 수행하려는지에 따라 적절한 메서드를 선택하는 것이 중요하다.

## **fetch API: 가장 기본적인 방식**

자바스크립트에서 기본적으로 제공하는 [`fetch`](https://developer.mozilla.org/ko/docs/Web/API/Fetch_API)는 브라우저 환경에서 네트워크 요청을 보낼 수 있는 가장 단순한 방식이다. 페이지 전체를 새로고침하지 않고 데이터를 요청할 수 있으며, Promise 기반으로 작동해 비동기 처리를 지원한다.

```javascript
fetch('/api/example', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((error) => console.error(error));
```

다만, `fetch`는 그 단순함만큼이나 개발자가 직접 처리해야 하는 요소들이 많다. 요청에 필요한 헤더나 공통 설정을 직접 작성해야 하고, 응답으로 받은 데이터를 JSON으로 변환하는 과정도 매번 명시해야 한다. 에러 처리도 일관성 있게 작성하지 않으면 예외 상황에서 예측 불가능한 흐름이 발생할 수 있다. 결국, 실무처럼 다양한 요청을 반복적으로 작성해야 하는 상황에서는 한계가 드러난다.

## **Axios를 사용한 요청 구조화**

이러한 한계를 보완하기 위해 도입한 도구가 Axios다. Axios는 fetch보다 더 강력한 기능을 제공하며, 실무에서 널리 사용된다.

가장 큰 장점은 반복되는 설정을 하나의 인스턴스로 정의할 수 있다는 점이다. 예를 들어, 모든 요청에 적용할 baseURL, 인증 여부(withCredentials), 공통 헤더 등을 한 번에 지정할 수 있어 코드 중복을 줄이고 관리 효율성을 높일 수 있다.

```javascript
const client = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  withCredentials: true,
});
```

또한 Axios는 요청과 응답을 가로채는 인터셉터 기능을 제공한다. 이를 통해 모든 요청에 자동으로 토큰을 삽입하거나, 응답 에러가 특정 상태 코드(예: 401 Unauthorized)일 때 토큰을 재발급받는 로직을 중앙에서 일관되게 처리할 수 있다.

```javascript
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 갱신 후 재요청 로직 등 처리
    }
    return Promise.reject(error);
  }
);
```

응답 데이터도 자동으로 JSON으로 파싱되며, 오류 객체도 일관된 구조로 반환되기 때문에 에러 처리가 명확하고 간편하다. 이러한 점에서 Axios는 네트워크 요청을 구조적으로 다루고 싶은 프로젝트에 적합하다.

Axios는 fetch보다 한 단계 추상화된 라이브러리로, 복잡한 요청을 처리하는 데 적합하다. 공통 설정, 인터셉터, 에러 핸들링 등을 지원하여 코드의 재사용성과 구조화에 유리하다.

### 직접 상태 관리를 하는 방식의 한계

Axios를 사용하면서 `useState`, `useEffect`를 조합해 직접 데이터를 요청하고 상태를 관리하는 방식은 초기에는 직관적이고 익숙한 방법처럼 보인다. 그러나 점점 API 요청이 많아지고 상태 관리가 복잡해질수록 여러 문제에 직면하게 된다.

예를 들어, 단순히 데이터를 불러오는 컴포넌트 하나를 작성하더라도 다음과 같은 상태들을 직접 관리해야 한다:

- isLoading: 요청 중인지 확인
- data: 응답 받은 실제 데이터
- error: 요청 실패 시의 예외 정보
이 모든 상태를 `useState`로 선언하고, `useEffect` 내부에서 비동기 요청을 보내고, try/catch 블록으로 예외 처리를 해주어야 한다. 또한 재요청, 캐싱, 리트라이 등 추가적인 요구사항이 생길 경우 별도의 로직을 중첩해서 구현해야 하므로 코드의 복잡도가 빠르게 증가한다.

## React Query 도입: 데이터 요청과 상태 관리를 통합적으로

React Query는 서버 상태를 클라이언트에서 효율적으로 관리할 수 있도록 도와주는 라이브러리다. 요청, 응답뿐만 아니라 데이터의 로딩 상태, 캐싱, 오류 처리, 재요청 로직까지 통합적으로 관리할 수 있다는 점에서 많은 프론트엔드 개발자들에게 선택되고 있다.

대표적인 기능은 다음과 같다:

- useQuery: 데이터 조회용 훅으로 로딩, 에러, 데이터 상태를 자동으로 관리
- useMutation: POST, PUT, DELETE 요청 등 데이터를 변경할 때 사용하는 훅
- 자동 캐싱 및 refetch 지원
- 특정 키를 기준으로 데이터를 무효화(invalidate)하거나 새로 고침(refetch) 가능
이러한 기능들은 직접 구현할 때 반복되던 로직을 대폭 줄여주고, 코드의 구조를 훨씬 단순하게 만들어준다.

### **실제 적용 사례: 락커 그룹 등록 기능**

실제 프로젝트에서는 락커 그룹 정보를 등록하는 기능에 React Query를 적용해보았다. 이 과정은 다음과 같은 단계를 따른다:

1. **POST 요청 함수 정의**
  서버로 데이터를 전송하기 위한 Axios 함수 작성

1. **useMutation 훅 생성**
  React Query에서 제공하는 useMutation으로 API 호출과 상태를 관리

1. **컴포넌트 내 적용**
  버튼 클릭 혹은 폼 제출 시 mutate 함수를 실행해 실제 요청을 보냄

```typescript
// 1. API 요청 함수
export const registerLockerGroup = async (group: IRegisterLockerGroupRequest) =>
  client.post('/api/lockers/register', group);

// 2. useMutation 훅
export const useCreateLockerGroupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(registerLockerGroup, {
    onSuccess: () => {
      queryClient.refetchQueries([QUERY.LOCKERS.GROUP]);
      alert('락커 그룹 등록이 완료되었습니다!');
    },
    onError: () => {
      alert('등록 중 오류가 발생했습니다.');
    },
  });
};

// 3. 컴포넌트 내부에서 사용
const { mutate: createLockerGroup } = useCreateLockerGroupMutation();
```

이처럼 요청 로직과 상태 관리가 분리되어 있지 않으면 컴포넌트가 매우 복잡해질 수 있는데, useMutation을 사용함으로써 로직이 간결해지고 유지보수가 쉬워졌다.

## **정리하며**

서버와의 통신 흐름을 직접 다뤄보며 느낀 점은, 단순히 데이터를 요청하는 것만으로는 실무에서 충분하지 않다는 것이다.

데이터의 상태를 어떻게 관리할 것인지, 요청 실패나 재시도 같은 예외 상황에 어떻게 대응할 것인지가 프로젝트의 완성도와 직결된다.

React Query를 도입한 이후에는 다음과 같은 변화가 있었다:

- 데이터 요청 코드의 중복이 사라지고 재사용성이 높아졌다
- 로딩/에러/성공 상태를 직접 관리하지 않아도 되므로 컴포넌트가 가벼워졌다
- 요청 성공 후 자동으로 데이터를 다시 불러오는 구조 덕분에 UI 상태와 서버 상태의 일관성이 높아졌다

> **관련 글:** [서버 통신 관리 도구 React Query에 대해 갖고 있던 오해](/posts/frontend/react-query-misunderstanding) — React Query의 캐싱 동작과 Redux 비교
