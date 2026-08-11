---
title: "모달 아키텍처 여정 — useState에서 선언적 시스템까지"
description: "모달이 1개일 때는 간단하지만, 20개로 늘어나면 상태 폭발과 초기화 버그가 찾아온다. 커스텀 훅부터 전역 매니저, render prop, 도메인별 캡슐화까지 모달 구조를 단계적으로 개선한 과정을 정리한다."
date: "2025-08-25"
tags: ["React", "모달", "설계패턴", "리팩토링"]
published: true
---

## 모달은 왜 복잡해지는가

모달 하나는 간단하다. 문제는 프로젝트에 모달이 10개, 20개로 늘어날 때 시작된다.

```jsx
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [isEditOpen, setIsEditOpen] = useState(false);
const [isDeleteOpen, setIsDeleteOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
```

이 패턴의 문제점:

- **상태 폭발** — 모달 수 × 2 (열기/닫기 + 데이터)
- **산재된 로직** — 열기/닫기 로직이 여러 컴포넌트에 흩어짐
- **초기화 누락** — 모달을 닫을 때 내부 폼 상태를 초기화하지 않는 버그

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

상태 관리 로직이 훅 안에 캡슐화됐다. 하지만 여전히 모달 수만큼 훅을 선언해야 한다.

## 2단계: 데이터를 포함하는 제네릭 훅

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

`data`가 `null`이면 닫힘, 값이 있으면 열림. 상태 하나로 두 가지를 표현한다.

## 3단계: 전역 모달 매니저

모달을 사용하는 컴포넌트와 렌더링 위치를 분리하고 싶다면 전역 상태를 활용한다.

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

어디서든 `open("edit", { member })`로 모달을 열 수 있다. 모달이 5개 이상이고 컴포넌트 트리가 깊을 때 효과적이다.

## 4단계: render prop으로 책임 분리

전역 매니저가 도입되면 모달 내부에서 도메인 로직을 분기하고 싶은 유혹이 생긴다.

```typescript
// ❌ 모달이 도메인에 강하게 의존
const formComponents = {
  branch: BranchForm,
  team: TeamForm,
};
const FormComponent = props?.domain ? formComponents[props.domain] : null;
```

이 방식은 도메인을 추가할 때마다 모달 코드가 변경되어야 한다. 모달의 책임을 분리해야 한다. 모달은 **레이아웃만** 담당하고 어떤 컴포넌트를 보여줄지는 **외부에서 제어**하도록 children을 함수로 받는 render prop 패턴을 적용했다.

```typescript
interface ModalProps<T> {
  title: string;
  children: (props: { data: T }) => ReactNode;
  onClose: () => void;
}

const Modal = <T,>({ title, children, onClose }: ModalProps<T>) => {
  const { isOpen, data } = useRecoilValue(modalAtom);

  return (
    <Overlay isOpen={isOpen} onMouseDown={onClose}>
      <Section>
        <Title>{title}</Title>
        <Content>{children({ data })}</Content>
        <CloseButton onClick={onClose} />
      </Section>
    </Overlay>
  );
};
```

사용하는 쪽에서 각 도메인에 맞는 렌더링 로직을 넘긴다. 모달 내부에서는 어떤 도메인 로직도 알 필요가 없다.

## 5단계: 도메인별 훅으로 캡슐화

모달을 여는 로직이 페이지 컴포넌트에 직접 노출되면 코드가 길어진다. 도메인마다 별도의 커스텀 훅을 만들어 캡슐화했다.

```typescript
export const useBranchModals = () => {
  const { openModal, closeModal, data } = useModal<ModalDataProps>();

  const openBranchFormModal = (props?: BranchFormProps) => {
    openModal({ type: 'branch-info', size: 'lg', branchFormProps: props });
  };

  const openBranchDeleteFormModal = (props?: BranchDeleteFormProps) => {
    openModal({ type: 'branch-delete', size: 'md', branchDeleteFormProps: props });
  };

  const modalTitleText =
    data?.type === 'branch-delete'
      ? '지점 삭제'
      : data?.branchFormProps?.isEdit
        ? '지점 정보 수정'
        : '지점 등록';

  return { openBranchFormModal, openBranchDeleteFormModal, closeModal, data, modalTitleText };
};
```

```typescript
const BranchPage = () => {
  const { openBranchFormModal, closeModal, modalTitleText, data } = useBranchModals();

  return (
    <>
      <button onClick={() => openBranchFormModal()}>지점 등록</button>
      <Modal title={modalTitleText} onClose={closeModal}>
        {() => data?.type === 'branch-info' && <BranchForm {...data?.branchFormProps} />}
      </Modal>
    </>
  );
};
```

모달은 열림/닫힘 상태와 UI 레이아웃만 관리하고 도메인별 폼 로직은 훅 안에 캡슐화된다. props 구조가 명확해지면서 타입 추론도 쉬워졌다.

## 초기화 문제 해결

모달을 닫았다가 다시 열면 이전 입력값이 남아있는 버그는 흔하다. 실제로 프로젝트에서 이 문제를 겪었다. 상품 수정 모달을 닫고 등록 모달을 열었는데 수정 데이터가 그대로 남아있었다.

원인은 React가 같은 위치의 컴포넌트를 동일한 인스턴스로 간주하기 때문이다. 컴포넌트가 언마운트되지 않으면 내부 상태가 초기화되지 않는다.

### 조건부 렌더링으로 언마운트 강제

```jsx
// ✅ isOpen이 false일 때 컴포넌트가 완전히 제거됨
{isOpen && <EditModal />}

// ❌ display: none은 DOM에 남아있어 상태가 유지됨
<div style={{ display: isOpen ? "block" : "none" }}>
  <EditModal />
</div>
```

조건부 렌더링(`{isOpen && <Modal />}`)을 사용하면 조건이 `false`일 때 컴포넌트가 언마운트되고, 다시 `true`가 되면 새로 마운트되면서 내부 상태가 초기화된다.

### key로 강제 리마운트

같은 모달을 다른 데이터로 열 때는 `key`를 활용한다.

```jsx
<EditModal key={selectedMember?.id} member={selectedMember} />
```

`key`가 바뀌면 React는 기존 컴포넌트를 버리고 새로 마운트한다.

## 어떤 단계를 선택할 것인가

| 상황 | 추천 |
| --- | --- |
| 모달 1~3개 | 1단계 (커스텀 훅) |
| 데이터 전달 필요 | 2단계 (제네릭 훅) |
| 모달 5개 이상 + 깊은 컴포넌트 트리 | 3단계 (전역 매니저) |
| 도메인별 폼이 다름 | 4단계 (render prop) |
| 도메인 수가 많고 모달 로직이 복잡 | 5단계 (도메인별 훅) |

프로젝트 초기에는 1단계로 시작하고 모달이 늘어나면서 단계를 올리는 게 자연스럽다. 처음부터 5단계를 도입하면 과도한 추상화가 된다.

## 정리

모달 구조를 개선하며 가장 크게 느꼈다 — UI와 로직은 적절한 위치에서 협력하면서도 독립되어야 한다.

- **모달은 레이아웃만** — 어떤 도메인 로직도 모달 안에 두지 않는다
- **데이터 흐름을 명확히** — render prop으로 외부에서 내부를 제어한다
- **초기화는 React에 맡긴다** — 조건부 렌더링과 key를 활용해 언마운트/리마운트로 해결한다
- **타입은 설계 도구** — props 구조를 타입으로 명확히 하면 실수를 컴파일 단계에서 잡는다