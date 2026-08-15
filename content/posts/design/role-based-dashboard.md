---
title: "8개 역할, 하나의 대시보드 — Dictionary 기반 메뉴 권한 설계"
description: "Gymlight에서 역할별로 메뉴와 데이터 범위가 달라지는 대시보드를 Dictionary 구조와 RoleProtectedRoute로 설계한 과정을 정리한다."
date: "2026-08-13"
tags: ["UX 설계", "Gymlight", "RBAC"]
published: true
---

## 배경

Gymlight는 다지점 헬스장 관리 시스템이다. 8개 역할이 있고 역할마다 볼 수 있는 메뉴와 데이터 범위가 달랐다:

```typescript
// types/enum.types.ts
export type UserRoleType =
  | '관리자'
  | '매니저'
  | '팀장 트레이너'
  | '트레이너'
  | '팀장 FC'     // Fitness Consultant
  | 'FC'
  | '인포'
  | '전지점 인포';
```

문제는 이 권한 구조를 어떻게 UI에 반영할 것인가였다. 역할별로 대시보드를 8개 만드는 건 유지보수가 불가능하고 하나의 대시보드에서 역할에 따라 메뉴를 숨기자니 조건 분기가 곳곳에 흩어질 것이 뻔했다.

## 접근 제어 매트릭스

역할별 페이지 접근 권한을 상수 객체로 선언했다:

```typescript
// constants/authroles.ts
export const PAGE_ACCESS_ROLES: Record<string, UserRoleType[]> = {
  ALL_STAFF_ROLES: ['관리자', '매니저', '팀장 트레이너', '트레이너',
                    '팀장 FC', 'FC', '인포', '전지점 인포'],
  STAFF:      ['관리자', '매니저'],
  TEAM:       ['관리자', '매니저', '팀장 트레이너', '팀장 FC'],
  STATICS:    ['관리자', '매니저'],
  ACCOUNTING: ['관리자', '매니저'],
  BRANCH:     ['관리자'],           // 관리자 전용
  MY_WORK:    ['관리자', '매니저', '팀장 트레이너', '트레이너'],
};
```

메뉴를 추가하거나 역할의 접근 범위를 바꿀 때 이 파일 하나만 수정하면 된다. 컴포넌트 코드에 `if (role === '관리자')` 같은 조건문이 퍼지지 않는다.

## Dictionary 기반 메뉴 구조

사이드바 메뉴를 역할 그룹별로 Dictionary 타입(`Record<string, T>`)으로 분리했다:

- **COMMON_MENU**: 대시보드, 공지사항, 회원관리, 상품관리, 락커관리, 출석관리 — 전 역할 공통
- **ADMIN_MENU**: 직원관리, 팀관리, 통계관리, 회계관리, **지점관리** — 관리자 전용
- **MANAGER_MENU**: 직원관리, 팀관리, 통계관리, 회계관리 — 매니저 (지점관리 없음)
- **LEADER_TRAINER_MENU**: 나의 업무 — 팀장 트레이너
- **TRAINER_MENU**: 나의 업무 — 트레이너

각 메뉴 항목은 `{ icon: HeroIconComponent, label: string }` 형태고 키가 라우트 슬러그에 매핑된다. 사이드바 컴포넌트의 `renderUserMenu()` 함수가 현재 사용자의 역할에 따라 어떤 Dictionary를 렌더링할지 결정한다:

```typescript
// Sidebar.tsx — renderUserMenu()
const roleMenu =
  currentUser.role === '관리자' ? ADMIN_MENU :
  currentUser.role === '매니저' ? MANAGER_MENU :
  currentUser.role === '팀장 트레이너' ? LEADER_TRAINER_MENU :
  currentUser.role === '트레이너' ? TRAINER_MENU :
  null;  // FC, 인포 역할은 공통 메뉴만
```

FC와 인포 역할은 전용 메뉴가 없다. COMMON_MENU만 보이는 것이 이 역할의 올바른 권한 범위다.

## Recoil 역할 상태 관리

현재 사용자 정보를 Recoil atom으로 전역 관리한다:

```typescript
// currentUserState atom
const currentUserState = atom<IUserResponse | null>({
  key: 'currentUserState',
  default: null,
});

// activeBranchState atom (recoil-persist)
const activeBranchState = atom<IBranchResponse | null>({
  key: 'activeBranchState',
  default: null,
  effects: [persistAtom],
});
```

로그인 시 `useMe()` 훅이 사용자 데이터를 가져오면 `currentUserState`에 동기화한다. 역할이 바뀌면 사이드바가 자동으로 갱신된다. `activeBranchState`는 관리자가 여러 지점을 전환할 때 쓰는데, `recoil-persist`로 영속화해서 새로고침 후에도 선택된 지점이 유지된다.

## 라우트 보호: RoleProtectedRoute

메뉴를 숨기는 것만으로는 부족하다. URL을 직접 입력하면 권한 없는 페이지에 접근할 수 있다. 라우터에서 역할 기반 가드를 걸었다:

```typescript
// RoleProtectedRoute.tsx
const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const { data: currentUser } = useMe();

  if (!currentUser) return <Navigate to="/login" />;

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" />;
    // + 권한 없음 알림
  }

  return children;
};

// AppRouter.tsx에서 사용
<RoleProtectedRoute allowedRoles={PAGE_ACCESS_ROLES.BRANCH}>
  <BranchManagementPage />
</RoleProtectedRoute>
```

메뉴 숨김과 라우트 가드, 두 겹으로 접근을 제어한다. 메뉴 숨김은 UX를 담당하고(권한 없는 메뉴가 보이지 않아서 사용자가 혼란을 겪지 않음), 라우트 가드는 URL 직접 접근을 차단한다.

## 같은 메뉴, 다른 데이터 범위

메뉴 접근 권한만으로는 부족했다. 같은 "회원관리" 메뉴에 들어가더라도 역할에 따라 보이는 데이터 범위가 달라야 했다:

- **관리자**: 활성 지점 선택기로 지점을 전환하며 전체 데이터를 볼 수 있다
- **매니저**: 관리자와 동일하게 조회 가능하지만 지점관리 메뉴 없음
- **트레이너**: 회원관리에서는 전체 회원이 보이지만 "나의 업무"에서는 자기 담당 회원만 보인다

트레이너가 회원관리에서 전체 회원을 보는 건 최소 권한 원칙(PoLP)에 어긋나 보이지만 운영상 필요한 예외였다. 트레이너가 신규 회원을 배정받을 때 해당 회원의 기본 정보를 확인할 수 있어야 하기 때문이다. 대신 "나의 업무"에서는 자기 담당만 보이게 해서 다른 트레이너의 업무에는 접근하지 못한다.

## 트레이드오프

Dictionary 기반 선언적 구조는 권한 변경 시 한 곳만 수정하면 되지만 역할-메뉴 매핑이 정적이라는 한계가 있다. 런타임에 동적으로 메뉴를 추가하거나, 개별 사용자 단위로 커스텀 권한을 부여하는 것은 이 구조로는 어렵다. 헬스장 관리 시스템에서 역할 종류가 자주 바뀌지 않기 때문에 정적 구조로 충분했다.

PoLP 예외를 코드에 남기지 않으면 까먹는다. "왜 트레이너가 회원관리에서 전체를 볼 수 있는지"를 주석이나 문서로 남겨두지 않으면, 나중에 다른 개발자가 버그로 오인하고 수정할 수 있다. 원칙의 예외를 둘 때는 그 이유를 함께 기록하는 것이 방어적 설계다.
