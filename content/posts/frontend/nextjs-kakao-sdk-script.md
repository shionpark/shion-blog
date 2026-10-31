---
title: "왜 Next.js에서 Kakao Map Script가 로드되지 않을까?"
description: "개인 프로젝트 semi-map에서 Kakao 지도 SDK가 로드되기 전에 window.kakao에 접근해 생긴 런타임 에러를, next/script의 로드 이벤트와 전역 상태로 해결한 과정"
date: "2025-07-11"
tags: ["Next.js", "KakaoMap", "Redux", "Zustand"]
published: true
---

# Next.js에 Kakao 지도 세팅하기

개인 프로젝트 [semi-map](https://github.com/shionpark/semi-map)에 카카오 지도를 붙이면서 정리한 글이다. 처음 정한 명세는 위치 권한을 허용하면 현재 위치를 고유 아이콘으로 표시하고, 주변 음식점 목록과 마커를 보여 주며, 버튼으로 현재 위치에 돌아오는 것이었다. 이 글은 그 첫 단계인 지도 SDK 로드와 초기화를 다룬다.

[Next.js 공식 문서](https://nextjs.org/docs/app/guides/scripts)에 의하면, Next.js에서 **외부 스크립트**(third-party script)를 로드하려면 next/script를 가져와서 레이아웃 구성 요소에 스크립트를 직접 포함해야 한다.

## 외부 스크립트란?

웹 사이트나 웹 애플리케이션에 추가 기능이나 서비스를 제공하기 위해 외부 소스에서 로드되는 JavaScript 파일을 지칭한다.

나의 경우, 카카오에서 지원하는 지도 기능을 사용하기 위해 Kakao JavaScript API 키를 발급받아 프로젝트에 SDK를 불러와야했다. (SDK는 Software Development Kit의 약자로, 특정 플랫폼과 운영 체제에서 애플리케이션을 개발하기 위한 도구 모음이다.)

## next/script 기본 동작과 전략

사용자가 폴더 경로 또는 중첩된 경로에 접근할 때 외부 스크립트가 불러와진다. 
Next.js는 동일한 레이아웃에서 여러 경로를 탐색하더라도 스크립트가 단 한 번만 로드되도록 보장한다.

스크립트의 중요도와 사용자 상호작용 필요에 따라 다양한 로딩 전략을 적용할 수 있다. 

- `beforeInteractive`: Next.js 코드 및 페이지가 hydrate 되기 전에 스크립트 로드
- `afterInteractive`: (**기본값**) 페이지의 일부가 hydrate 된 후에 조금 더 빨리 스크립트 로드
- `lazyOnload`: 브라우저가 작동하지 않을 때(유휴 시간) 스크립트 나중에 로드
- `worker`: (실험적) 웹 워커 내에서 스크립트 로드

hydration 이전 Next.js 자체 코드보다 먼저 실행돼야 하는 전역 스크립트는 `beforeInteractive` 전략을 선택하면 된다. 레이아웃(`app/layout.tsx`) 또는 문서(`pages/_document.js`) 전용 위치 제약이 있어 일반 컴포넌트에서 사용 불가하다.

나는 모든 클라이언트 컴포넌트 내부에서 사용 가능한 `afterInteractive` 전략을 선택했다. 루트 경로의 레이아웃이라면 `beforeInteractive`를 선택해도 되지만 지도 SDK는 특정 경로에서만 쓰이고, 브라우저 전용 값들에 접근하기 위함이었다.

```typescript
export default function Map() {
	// ...
  return (
    <>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_KEY}&libraries=services&autoload=false`}
        strategy="afterInteractive"
      />
    </>
  );
}
```

# 지도 초기화

모듈 시스템(import)으로 가져오는 라이브러리와 달리, `<script>` 태그로 불러오는 외부 스크립트는 브라우저가 kakao라는 객체를 window(전역 객체)에 붙여둔다. 

[Kakao 공식 문서](https://apis.map.kakao.com/web/sample/basicMap/)에 의하면 아래와 같은 지도 초기화 로직이 필요하다.

```typescript
const mapRef = useRef<HTMLDivElement | null>(null);

window.kakao.maps.load(() => {
  const options = {
    center: new window.kakao.maps.LatLng(33.450701, 126.570667),
    level: 3,
  };

  const map = new window.kakao.maps.Map(mapRef.current, options);
});
```

## useEffect 안에서 지도 초기화를 하는 이유

서버에서 실행될 때는 window, document, localStorage 같은 브라우저 전역 객체가 없다. 렌더링 중에 잘못 참조하면 서버 렌더링 단계에서 `ReferenceError: window is not defined`가 나므로 안전 가드가 필요하다. DOM을 참조하는 ref 또한 리액트 컴포넌트가 처음으로 DOM에 삽입되는 시점인 마운트(mount) 이후에 접근해야 한다.

따라서 useEffect를 사용하여 비동기로 로드된 Kakao SDK와 동기화하고, 마운트 시점 이후에 지도를 초기화하였다. 자세히 정리하면 다음과 같다.

1. **window는 Browser-only API**
- 모듈 시스템(import)으로 가져오는 라이브러리와 달리, 스크립트 태그로 불러오면 브라우저가 kakao라는 객체를 window(전역 객체)에 붙여둔다. 
- Next.js는 서버 사이드에서 먼저 렌더링하고, 이후에 클라이언트에서 hydration 한다.
useEffect는 (의존성 배열이 빈 배열인 경우) 브라우저에서 컴포넌트가 마운트된 후에 실행되기 때문에, 마운트 직후 window.kakao에 접근하기에 알맞은 곳이다.
  - Node(SSR)에는 window가 없기 때문에 클라이언트에서만 window.kakao를 찾도록 가드가 필요하다.
2. **ref는 컴포넌트가 마운트된 후에만 접근 가능**하다.
- useRef로 만든 DOM 참조값은 렌더링 직후에 실제 DOM과 연결된다.
즉, JSX `<div ref={mapRef} />`가 실제로 브라우저에 만들어진 후 `.current`가 채워진다.
- 1번과 마찬가지로 마운트 직후 `mapRef.current`를 쓰기에 알맞은 곳이 useEffect다.
3. **외부 스크립트 로딩(SDK 다운로드)은 비동기**이다.
- `window.kakao.maps.load()`는 콜백 기반으로 리소스를 로딩하는데, 이를 컴포넌트 실행 단계에서 바로 쓰면 SDK가 아직 준비되지 않아서 에러가 발생할 수 있다. 
- (위의 코드에는 존재하지 않지만) SDK 로드 상태를 확인하고, 그 안에서 지도를 생성해야 안정적이다.
### **‘use client’가 만능이 아니다**

`‘use client’`가 붙은 클라이언트 컴포넌트는 브라우저 전용으로 실행되므로 ‘useEffect 없이도 `‘use client’`만으로 window 전역 객체 및 참조값에 접근할 수 있지 않을까?’ 생각이 들었다.

그러나 `‘use client’`가 붙은 컴포넌트는 클라이언트 번들에 포함돼 인터랙티브해질 수 있다는 거지, 서버에서 절대 실행되지 않는다는 뜻은 아니다.

[Hydration 과정](https://nextjs.org/docs/app/getting-started/server-and-client-components#how-do-server-and-client-components-work-in-nextjs)에 대해 다시 한 번 짚고 넘어가자. 

**1. 서버 pre-render(SSR)**
Next.js는 클라이언트 컴포넌트도 HTML을 만들어 응답한다. 여기서 window, document 같은 브라우저 API는 없다.

**2. 브라우저 Hydration**
동일한 트리를 다시 계산하고 이벤트 리스너를 붙인다.
이 단계 이후에야 진짜 브라우저 런타임(API) 접근이 안전하다.

즉, 렌더 함수에서 브라우저 전용 코드를 직접 호출하면 서버 단계에서 오류가 나거나, 서버/클라이언트 출력이 달라져 ‘Hydration failed’ 경고가 뜬다.

브라우저 API 사용 외에도 DOM 측정/조작, 시간/랜덤 값 생성, 외부 SDK/스크립트 로드 시에도 useEffect와 같은 지연 로직이 필수적이다.

## 스크립트 로드 상태 관리가 필요한 이유

현재 내 코드의 문제는 카카오 SDK가 아직 다운로드 및 실행되지 않은 상태에서 window.kakao 객체에 접근한다는 것이다. 그 결과 이런 에러가 발생했다.

> `Error: Cannot read properties of undefined (reading 'maps')`

이를 해결하기 위해 window.kakao 객체가 존재하지 않을 경우, ①과 같이 useEffect 문을 탈출하는 조건을 추가할 수 있지만 이는 초기 로딩 시 지도가 아예 뜨지 않는 문제가 남는다. 

```typescript
useEffect(() => {
  if (!window.kakao?.maps) return;
  // ...
}, []);
```

그래서 Next.js의 [onLoad](https://nextjs.org/docs/app/api-reference/components/script#onload), [onError](https://nextjs.org/docs/app/api-reference/components/script#onerror) 속성을 사용해 스크립트 로드 여부에 따라 useEffect 내부를 실행시킬지 판단하도록 했다.

```typescript
export default function Map() {
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    if (!sdkLoaded || !window.kakao?.maps) return;
    //...
  }, [sdkLoaded]);

  return (
    <>
      {/* autoload=false로 자동 실행 방지 → onLoad에서 sdkLoaded=true */}
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_KEY}&autoload=false`}
        onLoad={() => setSdkLoaded(true)}
        onError={() => setSdkLoaded(false)}
      />
    </>
  );
}
```

### 로컬 상태 vs 전역 상태

외부 스크립트를 불러오고 이 스크립트가 제대로 로드됐는지를 확인해서 지도를 초기화했다. 스크립트 로드 여부를 다른 컴포넌트에서도 그 상태를 참고할 수 있다면 네트워크 절약 및 어디에서나 UI를 표시할 수 있을 것이다. 

로컬 상태로 관리하면 지도 컴포넌트가 언마운트됐다가 다시 마운트될 때 문제가 생긴다. 리렌더로는 상태가 초기화되지 않고, next/script도 같은 스크립트를 한 번만 불러온다. 그런데 스크립트가 이미 로드돼 있으면 `onLoad`가 다시 불리지 않아서, 새로 마운트된 컴포넌트의 `sdkLoaded`는 `false`인 채로 남는다. 모달이나 다른 컴포넌트에서도 SDK가 로드됐는지 알 수 없다.

그래서 로드 상태를 전역에 두기로 했다. 한 번 로드되면 그 상태를 모든 컴포넌트가 같이 보고, 로드 실패나 로딩 상태도 어디서든 보여 줄 수 있다.

> 지금 다시 만든다면 `onReady`로 충분하다. Next.js의 [`onReady`](https://nextjs.org/docs/app/api-reference/components/script#onready)는 스크립트 로드가 끝났을 때와 이후 컴포넌트가 마운트될 때마다 실행된다. 지도 초기화를 `onReady`에 두면 다시 마운트돼도 지도가 그려진다. 당시에는 이 옵션을 몰라 전역 상태로 풀었다.

# Redux를 사용한 전역 스토어 생성

## store 객체와 makeStore 함수

```typescript
export const store = configureStore({
  reducer: {
    kakaoMap: kakaoMapReducer,
  },
});
```

처음에는 [configureStore](https://redux.js.org/tutorials/quick-start#create-a-redux-store) 함수로 모듈 전역 store를 만들고 layout.tsx에서 [Provider에 store를 전달](https://redux.js.org/tutorials/quick-start#provide-the-redux-store-to-react)하였다. 그런데 Redux의 [Next.js 가이드](https://redux.js.org/usage/nextjs)는 App Router에서 store를 모듈 전역에 두지 말라고 한다. 서버는 한 프로세스에서 여러 요청을 처리하므로, 모듈 전역 store는 요청 사이에 상태가 섞일 수 있기 때문이다.

```typescript
export const makeStore = () => {
  return configureStore({
    reducer: {
      kakaoMap: kakaoMapReducer,
    },
  });
};

// StoreProvider.tsx
export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

그래서 store를 만드는 `makeStore` 함수를 두고, `StoreProvider`에서 `useRef`로 한 번만 만들게 했다. 사실 `sdkLoaded`는 브라우저에서만 바뀌는 값이라 이 앱에서 요청 사이에 섞일 상태는 없었다. 가이드가 권하는 구조를 그대로 따른 것이다.
### 최종 코드

```typescript
"use client";

export default function MapLayout({ children }: { children: React.ReactNode }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const dispatch = useAppDispatch();
  const sdkLoaded = useAppSelector(selectSdkLoaded);

  useEffect(() => {
    if (!sdkLoaded || !window.kakao?.maps || !mapRef.current) return;

    window.kakao.maps.load(() => {
      const options = {
        center: new window.kakao.maps.LatLng(33.450701, 126.570667),
        level: 3,
      };

      const map = new window.kakao.maps.Map(mapRef.current, options);
    });
  }, [sdkLoaded]);

  return (
    <>
      <div ref={mapRef} className={styles.map} />
      {children}
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_KEY}&libraries=services&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => dispatch(sdkLoadSuccess())}
        onError={() => dispatch(sdkLoadFail())}
      />
    </>
  );
}
```

# 이후: Zustand로 옮기다

전역 상태가 `sdkLoaded` 하나뿐인데 Redux는 slice, store, Provider, 타입이 붙은 훅까지 갖춰야 했다. 이틀 뒤 Redux를 걷어내고 Zustand store로 옮겼고([PR #4](https://github.com/shionpark/semi-map/pull/4)), 스토어 테스트도 함께 작성했다.

```typescript
export const useKakaoSdkStore = create<MapSdkState>((set) => ({
  isLoaded: false,
  sdkLoadSuccess: () => set(() => ({ isLoaded: true })),
  sdkLoadFail: () => set(() => ({ isLoaded: false })),
}));
```

Provider 없이 컴포넌트에서 `useKakaoSdkStore`를 바로 쓰고, `Script`의 `onLoad`·`onError`에서 `sdkLoadSuccess`·`sdkLoadFail`을 부르는 구조는 그대로다.
