---
title: "Next.js"
description: ""
date: "2025-07-05"
tags: []
published: true
---

# Linking and Navigating
링크와 탐색

## navigation이 어떻게 동작하는가

1. `Server Rendering` 서버 렌더링
1. `Prefetching` (미리 가져옴)
1. `Streaming`
1. `Client-side transition` (클라이언트 전환)
### 1. 서버 렌더링

Next.js에서 레이아웃과 페이지는 기본적으로 **리액트 서버 컴포넌트(RSC)**이다.
초기/이후 탐색시 [**RSC Payload**](/22752a5a60c78093b4aedb12ec4ddaeb#22752a5a60c780f9a3bbfb96f34af3f6)는 클라이언트에 보내기 전 서버에서 만들어진다.

- 빌드 시점 또는 재검증 시에 정적 렌더링(또는 사전 렌더링) 발생, 결과는 캐시된다.
- 동적 렌더링은 클라이언트 요청에 대한 응답으로 요청 시점에 발생
클라이언트가 새 경로를 표시하기 전에 서버의 응답을 기다려야 하는 게 단점이지만, 
Next.js는 사용자가 방문할 가능성이 높은 경로를 미리 가져오고(`Prefetching`) 클라이언트 측 전환(`Client-side trainsigion`)을 수행하여 이러한 지연을 해결한다.

### 2. Prefetching

사용자가 해당 경로로 이동하기 전에 백그라운드에서 해당 경로를 로드하는 과정.

사용자가 링크를 클릭할 때 다음 경로를 렌더링하는 데 필요한 데이터가 클라이언트 측에서 이미 준비되어 있으므로 애플리케이션에서 경로 간 이동이 즉각적으로 이루어지는 것처럼 느껴진다.

`<Link />` 컴포넌트와 연결된 경로가 사용자 viewport에 들어오거나 마우스로 가리키면 자동으로 해당 경로를 미리 가져온다. (`<a />` 는 no fetching)

정적 경로는 전체 페이지를 미리 불러오고(prefetch), 동적 경로는 스킵하거나 일부 경로만 부분적으로 불러오는데, 페이지 이동(Navigation) 전 서버 응답을 기다리는 것은 사용자가 애플리케이션이 응답하지 않는다고 느낄 수 있다. 이를 해결하기 위해 Streaming 사용.

### 3. Streaming

# Server and Client Components
서버와 클라이언트 컴포넌트의 동작 원리

## 서버에서

React API 사용해서 렌더링을 조정한다. 렌더링 작업은 개별 경로 세그먼트(레이아웃 및 페이지)별로 청크로 분할된다.

- 서버 컴포넌트는 RSC Payload라는 특수 데이터 형식으로 렌더링된다. (Server Component → RSC Payload)
- 클라이언트 컴포넌트와 RSC Payload는 HTML을 미리 렌더링 하는 데 사용된다.
> **RSC Payload**란?
> 
> 렌더링된 리액트 서버 컴포넌트(RSC) 트리의 압축된 바이너리 표현. 
> 클라이언트 측 React에서 브라우저의 DOM을 업데이트하는 데 사용된다. 
> 
> 다음 요소를 포함하고 있다.
> - 서버 컴포넌트의 렌더링 결과
> - 클라이언트 컴포넌트가 렌더링되어야 하는 위치의 placeholder와 JS 파일에 대한 참조
> - 서버 컴포넌트에서 클라이언트 컴포넌트로 전달되는 props

## 클라이언트에서 (첫 로드시)

1. **HTML**은 사용자 경로의 non-interactive한 프리뷰를 즉시 보여주기 위해 사용된다.
1. **RSC Payload**는 클라이언트와 서버 컴포넌트 트리를 조정하기 위해 사용된다.
1. **JS**는 클라이언트 컴포넌트를 **hydrate**하고 애플리케이션을 동적으로 만들기 위해 사용된다.
## 이후 Navigation에서

RSC Payload는 즉각적인 탐색(Navigation)을 위해 미리 캐시(prefetch)되고 캐시된다.

클라이언트 컴포넌트는 서버에서 렌더링 된 HTML 없이 클라이언트에서 완전히 렌더링된다.

## 예시

### 1. 클라이언트 컴포넌트 사용

파일 상단에 `‘use client’` 를 추가해서 클라이언트 컴포넌트 만들 수 있다. 
서버 컴포넌트와 클라이언트 모듈 그래프(트리)의 경계.

`‘use client’` 를 추가하면 모든 import문과 자식 요소들이 클라이언트 번들의 일부로 여겨진다. 
(즉, 클라이언트를 대상으로 하는 모든 컴포넌트에 추가할 필요 없음)

# Guides - Scripts

## 스크립트 로드와 최적화 방법

### Layout Scripts

서드파티(third-party, 타사) 스크립트 로드하려면 next/script를 import한 후 레이아웃 컴포넌트에 스크립트를 추가한다.

### Application Scripts

이 스크립트는 애플리케이션의 모든 경로에 액세스할 때 로드되어 실행됩니다. Next.js는 사용자가 여러 페이지를 탐색하더라도 스크립트가 한 번만 로드되도록 보장합니다.

### Strategy

`strategy` 프로퍼티로 로딩 동작을 미세 조정할 수 있다.

- `beforeInteractive` - Next.js 코드 및 페이지 hydration 발생 이전에 스크립트를 로드함.
- `afterInteractive` - (기본 설정) 사전에 스크립트 로드. 일부 페이지의 hydration이 발생한 이후.
- `lazyOnload` - 브라우저 작동하지 않을 때 나중에 스크립트 로드.
- `worker` - (실험적) web worker에 스크립트 로드를 포함
