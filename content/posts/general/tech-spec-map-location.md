---
title: "기술 명세서: 지도에 사용자 및 음식점 위치 표시"
description: ""
date: "2025-05-22"
tags: []
published: true
---

# 유저 시나리오

- 사용자 유형: 일반 사용자 (위치 권한 허용)
- 행동 시나리오
  - 앱에 접속하면 위치 접근 권한 요청받는다
  - 위치 권한 허용시, 사용자 현재 위치 반경 2km 이내 장소 목록과 마커 생성
  - 사용자 현재 위치는 다른 장소와 구분되는 고유 아이콘으로 표시된다
  - 지도 아래 아이콘 클릭시 현재 위치로 되돌아갈 수 있다
  - 사용자는 지도를 탐색할 수 있다: 지도 이동, 마커 클릭, 확대/축소
  - 마커 클릭시 해당 장소의 이름, 평점, 리뷰 등이 포함된 오버레이가 나타난다
  - 사용자는 장소를 검색할 수 있다: 검색시 해당 장소로 장소 이동, 마커 클릭
  - 마커 클릭시 해당 장소의 상세 정보를 조회할 수 있다: 이름, 평점, 리뷰
  

- 사용자 유형: 일반 사용자 (위치 권한 미허용 or 현재 위치를 읽어오지 못함)
- 행동 시나리오
  - 앱에 접속하면 위치 접근 권한 요청받는다
  - 위치 권한 미허용시, 기본 좌표(서울 시청) 반경 2km 이내 장소 목록과 마커 생성
  - 사용자는 지도를 탐색할 수 있다: 지도 이동, 마커 클릭, 확대/축소
  - 마커 클릭시 해당 장소의 이름, 평점, 리뷰 등이 포함된 오버레이가 나타난다
  - 사용자는 장소를 검색할 수 있다: 검색시 해당 장소로 장소 이동, 마커 클릭
  - 마커 클릭시 해당 장소의 상세 정보를 조회할 수 있다: 이름, 평점, 리뷰
  

## 테크 스펙

| **항목** | **선택안** | **비교군** | **선택 이유** |
| --- | --- | --- | --- |
| **상태관리** | Zustand | Recoil, Redux | 위치 정보, 마커 데이터 등 클라이언트 상태를 모듈화하기 용이 |
| **지도 API** | Kakao Map JS SDK | Google Maps, Naver Map | 국내 주소/장소 정확도 우수, 마커/오버레이 커스터마이징 유리 |
| **스타일** | Tailwind CSS | styled-components, Emotion | 유틸리티 기반 클래스로 반응형 레이아웃 구성 간편 |
| **프레임워크** | Next.js (App Router) | CRA, Vite | 서버 컴포넌트 지원, Vercel 배포 최적화 |
| **패키지 구조** | pnpm monorepo | 단일 repo | 앱과 UI 시스템 분리, 확장성과 유지보수 용이 |

## 구현

- **위치 수신**: `navigator.geolocation.getCurrentPosition()`
  - 실패 시 fallback 좌표 사용 (예: 서울시청)
- **상태관리**: `useMapStore()` (Zustand)
  - `userLocation`, `mapCenter`, `restaurantList` 저장 및 setter 제공
- **지도 생성**: `kakao.maps.Map(container, { center: ..., level: ... })`
- **마커 생성**:
  - 사용자 위치 마커: 파란색 커스텀 마커
  - 식당 마커: 일반 마커 + `click` 이벤트 리스너 추가
- **오버레이 표시**:
  - `kakao.maps.CustomOverlay` 활용
  - React DOM 노드를 오버레이에 삽입하여 정보 출력
## 인터페이스

### Zustand Store 예시

```typescript
// store/mapStore.ts

export const useMapStore = create<MapStore>((set) => ({
  userLocation: null,
  mapCenter: { lat: 0, lng: 0 },
  restaurantList: [],
  setUserLocation: (pos) => set({ userLocation: pos }),
  setMapCenter: (pos) => set({ mapCenter: pos }),
  setRestaurantList: (list) => set({ restaurantList: list }),
}));
```

### API 요청

```plain text
GET /api/restaurants?lat=37.56&lng=126.97&distance=500
```

### 응답 예시

```json
[
  {
    "id": "r123",
    "name": "마포곱창",
    "lat": 37.5621,
    "lng": 126.9753,
    "tags": ["곱창", "한식"],
    "rating": 4.5
  }
]
```

### 오버레이 UI 예시 (Tailwind 기반)

```typescript
<div className="bg-white p-2 rounded-lg shadow text-xs">
  <p className="font-bold">{restaurant.name}</p>
  <p className="text-gray-500">{restaurant.tags.join(', ')}</p>
  <p className="text-yellow-500">⭐ {restaurant.rating}</p>
</div>
```

## 개발 계획

| 일정 | 작업 항목 |
| --- | --- |
| Day 1 | Kakao 지도 SDK 연동, 위치 권한 요청 처리 |
| Day 2 | 지도 중심 좌표 상태 관리(Zustand), 기본 지도 렌더링 |
| Day 3 | 식당 리스트 API 연동 및 마커 렌더링 |
| Day 4 | 사용자 마커 및 식당 마커 클릭 시 오버레이 표시 |
| Day 5 | 로딩/에러 처리, 반응형 스타일링, 리팩터링 |

## 테스트 시나리오 (E2E)

| 시나리오 | 기대 결과 |
| --- | --- |
| 위치 권한 허용 | 현재 위치 기준으로 지도 중심이 설정되고 사용자 마커가 보임 |
| 위치 권한 거부 | fallback 좌표를 기준으로 지도가 표시됨 |
| 음식점 API 응답 | 지도에 마커들이 나타나고, 클릭 시 정보 오버레이가 정상 출력됨 |
| 음식점 없음 | “해당 지역에 음식점이 없습니다” 메시지 표시 |
| 위치 API 미지원 | fallback 적용 + 안내 메시지 출력 |
