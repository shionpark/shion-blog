---
title: "모달 코드 딥다이브 — 선언적 모달 시스템 설계까지"
description: "프로젝트에서 모달 관련 코드가 반복되는 문제를 인식하고, 명령형에서 선언적 모달 시스템으로 발전시킨 과정을 정리합니다."
date: "2025-08-25"
tags: ["React", "모달", "설계패턴", "리팩토링"]
published: true
---

## 모달은 왜 복잡해지는가

모달 하나는 간단하다. 문제는 프로젝트에 모달이 10개, 20개로 늘어날 때 시작된다.

```jsx
// 모달이 늘어날수록 상태도 늘어난다
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [isEditOpen, setIsEditOpen] = useState(false);
const [isDeleteOpen, setIsDeleteOpen] = useState(false);
const [isDetailOpen, setIsDetailOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
```

이 패턴의 문제점:
- **상태 폭발**: 모달 수 × 2 (열기/닫기 + 데이터)
- **산재된 로직**: 열기/닫기 로직이 여러 컴포넌트에 흩어짐
- **초기화 누락**: 모달을 닫을 때 내부 폼 상태를 초기화하지 않는 버그

## 1단계: 커스텀 훅으로 추출

가장 기본적인 개선은 반복되는 열기/닫기 로직을 훅으로 추출하는 것이다.

```typescript
function useModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
```

```jsx
function MemberPage() {
  const createModal = useModal();
  const editModal = useModal();

  return (
    <>
      <button onClick={createModal.open}>추가</button>
      <button onClick={editModal.open}>수정</button>

      {createModal.isOpen && <CreateModal onClose={createModal.close} />}
      {editModal.isOpen && <EditModal onClose={editModal.close} />}
    </>
  );
}
```

개선된 점: 상태 관리 로직이 훅 안에 캡슐화되었다.
남은 문제: 여전히 모달 수만큼 훅을 선언해야 한다.

## 2단계: 데이터를 포함하는 제네릭 모달 훅

수정 모달처럼 데이터를 함께 넘겨야 하는 경우가 많다.

```typescript
function useModalWithData<T>() {
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((payload: T) => setData(payload), []);
  const close = useCallback(() => setData(null), []);
  const isOpen = data !== null;

  return { isOpen, data, open, close };
}
```

```jsx
function MemberPage() {
  const editModal = useModalWithData<Member>();

  return (
    <>
      <MemberList onEdit={(member) => editModal.open(member)} />

      {editModal.isOpen && editModal.data && (
        <EditModal member={editModal.data} onClose={editModal.close} />
      )}
    </>
  );
}
```

`data`가 `null`이면 닫힘, 값이 있으면 열림. 상태 하나로 두 가지를 표현한다.

## 3단계: 전역 모달 매니저

모달을 사용하는 컴포넌트와 모달 렌더링 위치를 분리하고 싶다면 전역 상태를 활용한다.

```typescript
// stores/modal.ts
type ModalState = {
  type: string;
  props: Record<string, unknown>;
} | null;

const modalAtom = atom<ModalState>(null);

export function useModalManager() {
  const [modal, setModal] = useAtom(modalAtom);

  const open = useCallback(
    (type: string, props: Record<string, unknown> = {}) => {
      setModal({ type, props });
    },
    [setModal]
  );

  const close = useCallback(() => setModal(null), [setModal]);

  return { modal, open, close };
}
```

```jsx
// components/ModalRoot.tsx — 레이아웃에 한 번만 배치
const MODAL_MAP: Record<string, React.ComponentType<any>> = {
  create: CreateModal,
  edit: EditModal,
  delete: DeleteModal,
};

function ModalRoot() {
  const { modal, close } = useModalManager();

  if (!modal) return null;

  const Component = MODAL_MAP[modal.type];
  if (!Component) return null;

  return <Component {...modal.props} onClose={close} />;
}
```

```jsx
// 어디서든 모달을 열 수 있다
function MemberActions({ member }: { member: Member }) {
  const { open } = useModalManager();

  return (
    <div>
      <button onClick={() => open("edit", { member })}>수정</button>
      <button onClick={() => open("delete", { memberId: member.id })}>삭제</button>
    </div>
  );
}
```

## 초기화 문제 해결

모달을 닫았다가 다시 열면 이전 입력값이 남아있는 버그가 흔하다. 이유는 React가 같은 위치의 컴포넌트를 동일한 인스턴스로 간주하기 때문이다.

해결 방법: **조건부 렌더링**으로 컴포넌트를 완전히 언마운트한다.

```jsx
// ✅ isOpen이 false일 때 컴포넌트가 완전히 제거됨
{isOpen && <EditModal />}

// ❌ display: none은 DOM에 남아있어 상태가 유지됨
<div style={{ display: isOpen ? "block" : "none" }}>
  <EditModal />
</div>
```

또는 `key`를 활용해 강제로 새 인스턴스를 생성할 수 있다:

```jsx
<EditModal key={selectedMember?.id} member={selectedMember} />
```

`key`가 바뀌면 React는 기존 컴포넌트를 버리고 새로 마운트한다.

## 어떤 단계를 선택할 것인가

| 상황 | 추천 |
|---|---|
| 모달 1~3개 | 1단계 (커스텀 훅) |
| 데이터 전달 필요 | 2단계 (제네릭 훅) |
| 모달 5개 이상 + 깊은 컴포넌트 트리 | 3단계 (전역 매니저) |

프로젝트 초기에는 1단계로 시작하고, 모달이 늘어나면서 단계를 올리는 것이 자연스러운 흐름이다. 처음부터 3단계를 도입하면 과도한 추상화가 된다.
