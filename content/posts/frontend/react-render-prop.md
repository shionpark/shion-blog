---
title: "전역 상태와 render prop으로 해결한 모달 리팩토링 과정"
description: "도메인마다 제각각이던 모달 구조를 정리한 리팩토링 기록"
date: "2025-04-21"
tags: ["React", "Recoil"]
published: true
---

## 모달을 도입하게 된 계기

서비스를 만들다보면, 사용자가 특정 작업을 하도록 돕는 여러 UI 방식에 대해 고민하게 된다.
그중에서도 **페이지 이동 없이 필요한 작업만 빠르게 처리하고 싶다**는 요구는 정말 자주 등장한다.

**Gymlight Manager** 프로젝트 초기, **지점 관리** 기능을 구현할 때였다.
지점 목록을 보고 있는 중에 새로운 지점을 등록해야 하는 상황에서 **페이지 이동 **방식과 **모달 **방식 중 어떤 방식이 더 적절할지 고민이 되었다.

새로운 페이지로 이동할 경우, 사용자가 보고 있던 검색 결과나 필터 상태가 모두 초기화되기 때문에 작업 흐름이 끊기고 사용성도 불편하다고 판단했다.

따라서 기존 화면을 유지한 채 폼만 따로 띄울 수 있도록 하는 **모달**을 선택했다.
그리고 이 구조를 모든 도메인에서 공통적으로 사용하는 UI 구조로 통일할 것을 제안했다.

회원, 지점, 상품, 공지사항 등 각 도메인의 페이지는 기본적으로 조회 테이블을 보여주고, 버튼 클릭 시 등록 폼을 모달 내부에 보여주는 패턴을 따르도록 했다.

## 모달 도입 과정

### 1. 모달 내부 상태값 선언

```basic
import { useState } from "react"
import Modal from "@/components/Modal"

const BranchPage = () => {
  const [isOpen, setIsOpen] = useState(false)
  
  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)
 
  return (
    <>
      <button onClick={openModal}>지점 등록</button>
      {isOpen && (
        <Modal closeModal={closeModal} />
      )}
    </>
  )
}
```

모달을 열고 닫기 위해 컴포넌트 내부에서 `isOpen` 상태를 사용한다.
이 구조는 여러 페이지에서 모달을 사용할 경우, 각 컴포넌트마다 상태를 선언해줘야하는 번거로움이 있다.

사용을 단순화하고 모달 로직을 재사용 가능한 형태로 추상화하기 위해
전역 상태 관리 라이브러리 Recoil을 사용해 모달의 열림/닫힘 상태를 전역으로 관리하고,
커스텀 훅 `useModal()`을 만들어 open/close 함수를 제공해주었다.

```typescript
export const modalAtom = atom({
  key: 'modalAtom',
  default: {
    isOpen: false,
  },
});

export const useModal = () => {
  const [modalState, setModalState] = useRecoilState(modalAtom);

  const openModal = () => {
    setState({ isOpen: true });
  };

  const closeModal = () => {
    setState({ isOpen: false });
  };

  return { ...modalState, openModal, onClose };
};
```

이로써 중복되는 `useState` 선언 없이, 여러 컴포넌트에서 일관된 방식으로 모달을 제어할 수 있게 되었다.

```typescript
import useModal from '@/components/modal/useModal.ts'

const BranchPage = () => {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <div>
      <button onClick={openModal}>열기</button>
      {isOpen && (
        <div>
          <div>모달입니다.</div>
          <button onClick={closeModal}>닫기</button>
        </div>
      )}
    </div>
  );
};
```

### 2. 모달 상태 구조화 - 모달의 종류 및 데이터 상태값 추가

하지만 실제로 기능이 확장되면서 단순히 열림/닫힘 상태만으로는 부족한 상황이 발생했다.
예를 들어, 어떤 모달은 등록을 위한 폼이고, 어떤 모달은 경고 메시지만 보여주는 알림창이었다.
또 어떤 모달은 등록 대상의 데이터를 props로 넘겨줘야 했고, 어떤 모달은 그냥 메시지만 보여주면 됐다.

이처럼 **각기 다른 역할과 데이터를 가진 모달을 하나의 상태로 통합 관리하려면**
**모달의 종류**(`type`)와 **전달할 데이터**(`props`)를 함께 구조화할 필요가 있었다.

그래서 다음과 같이 모달의 타입을 정의하고 상태 구조를 확장했다.

```typescript
export type modalType = 'Submit' | 'Info' | 'Error' | 'Alert';

export interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  props?: any;
}

export const modalAtom = atom<ModalState>({
  key: 'modalAtom',
  default: {
    isOpen: false,
    type: null,
	  props: undefined,
  },
});
```

그리고 커스텀 훅 useModal에서 모달을 열 때 다음과 같이 명확하게 어떤 종류의 모달인지, 그리고 무엇을 보여줄지 한 번에 지정할 수 있도록 개선했다.

```typescript
export const useModal = () => {
  const [modalState, setModalState] = useRecoilState(modalAtom);

  const openModal = (type: ModalType, props?: any) => {
    setModalState({ isOpen: true, type, props });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, props: undefined });
  };

  return { ...modalState, openModal, closeModal };
};
```

```typescript
const BranchPage = () => {
  const { isOpen, props, openModal, closeModal } = useModal();

  return (
    <div>
      <button onClick={() => openModal('Submit', { userId: 1 })}>폼 모달</button>
      <button onClick={() => openModal('Alert', { message: '정말 삭제하시겠습니까?' })}>
        알림 모달
      </button>
      {isOpen && props?.type === 'Submit' && (
        <div>
          <div>{props.userId}</div>
          <button onClick={closeModal}>닫기</button>
        </div>
      )}
      {isOpen && props?.type === 'Alert' && (
        <div>
          <div>{props.message}</div>
          <button onClick={closeModal}>닫기</button>
        </div>
      )}
    </div>
  );
};
```

### 3. 모달 컴포넌트 책임 분리 - 도메인 로직 분리와 render prop 적용

모달을 더 유연하게 제어할 수 있게 되었지만 그만큼 **모달이 처리해야 하는 역할이 점점 많아지기 시작**했다.
특히 내부에 폼을 렌더링하는 모달은 각 도메인마다 필요한 폼 컴포넌트를 불러와야 했고, 그 컴포넌트에 전달하는 props도 모두 다르게 구성되어야 했다.

그래서 생각해낸 방법이, 모달 내부에서 `type`이나 `props.domain` 값을 기준으로 조건 분기를 하는 것이었으나,

```basic
// 폼 컴포넌트 타입 정의
interface IFormComponentType {
  [key: string]: React.ComponentType<any>;
}

// 도메인 키 값과 폼 컴포넌트를 매핑
const formComponents: IFormComponentType = {
  branch: BranchForm,
  team: TeamForm,
};

const SubmitModal = () => {
// ...
  // 도메인에 따라 렌더링할 폼 컴포넌트 설정
  const FormComponent = props?.domain ? formComponents[props.domain] : null;
// ...
  return (
    <Styled.Overlay isOpen={isOpen && type === ('Submit' as modalType)} onMouseDown={handleClose}>
      <Styled.Section size={size} onMouseDown={stopPropagation}>
        <IconButton size="small" variant="icon-only" icon={<XMarkIcon />} onClick={handleClose} />
        {FormComponent && <FormComponent />}
      </Styled.Section>
    </Styled.Overlay>
  );
};
```

이 방식은 곧 **다음과 같은 문제를 만들었다.**

- 모달이 도메인 로직에 강하게 의존하게 됨
- 조건 분기(if, switch)가 계속 추가되며 컴포넌트가 비대해짐
- 도메인을 추가할수록 모달 코드가 변경되어야 함 (확장성 ↓)
모달의 책임을 분리해야 했다. 모달은 **화면(레이아웃)**만 담당하고,
**실제 어떤 컴포넌트를 보여줄지, 어떤 데이터를 넘길지는 외부에서 제어**하도록 수정했다.

이때 적용한 패턴이 바로 **render prop**이다.
children을 단순한 JSX가 아니라 **함수로 받아**, 필요한 props를 외부에서 전달받은 data로 구성하기 위해 이 패턴을 적용했다. 이로써 내부 로직(모달의 열림/닫힘 상태)은 고정하되 출력(렌더링 요소)을 제어할 수 있게 되었다.

```typescript
interface IModalProps<T> {
  title: string;
  children: (props: { data: T }) => ReactNode;
  onClose: () => void;
  size?: Styled.ModalSizeTypes;
  type?: ModalType;
}

const Modal = <T,>({
  title,
  children,
  onClose,
  size = 'md',
  type = 'default',
}: IModalProps<T>) => {
  const { isOpen, data } = useRecoilValue(modalAtom);

  return (
    <Styled.Overlay isOpen={isOpen} onMouseDown={onClose}>
      <Styled.Section size={size} onMouseDown={stopPropagation}>
        <Styled.Title>
          {title}
        </Styled.Title>
        <Styled.Content type={type}>
          {children({ data })}
        </Styled.Content>
        <CloseButton onClick={onClose} />
      </Styled.Section>
    </Styled.Overlay>
  );
};

export default Modal;
```

사용하는 쪽에서는 각 도메인에 맞는 렌더링 로직을 넘겨줄 수 있다.

> 💡 **Render Props 패턴** [🔗 공식문서](https://ko.legacy.reactjs.org/docs/render-props.html) 

### 4. 모달 로직 캡슐화 - 도메인 로직을 모달 훅으로 캡슐화

`(도메인명)Page` 컴포넌트에 있는 모달 로직을 도메인마다 별도의 커스텀 훅을 만들어,
**그 도메인 안에서 캡슐화**하고 모달의 타입, 사이즈, props 등을 관리하도록 했다.

예를 들어, 지점 등록/수정/삭제를 처리하는 모달 로직은 다음과 같다.

```typescript
export const useBranchModals = () => {
  const { openModal, closeModal, data } = useModal<IModalDataProps>();

  const openBranchFormModal = (props?: IBranchFormProps) => {
    openModal({ type: 'branch-info', size: 'lg', branchFormProps: props });
  };

  const openBranchStatusFormModal = (props: IBranchStatusFormProps) => {
    openModal({ type: 'branch-status', size: 'md', branchStatusFormProps: props });
  };

  const openBranchDeleteFormModal = (props?: IBranchDeleteFormProps) => {
    openModal({ type: 'branch-delete', size: 'md', branchDeleteFormProps: props });
  };

  const modalTitleText =
    data?.type === 'branch-delete'
      ? '지점 삭제'
      : data?.type === 'branch-status'
        ? '지점 상태 수정'
        : data?.branchFormProps?.isEdit
          ? '지점 정보 수정'
          : '지점 등록';

  return {
    openModal,
    closeModal,
    data,

    openBranchFormModal,
    openBranchStatusFormModal,
    openBranchDeleteFormModal,

    modalTitleText,
  };
};
```

```typescript
const BranchPage = () => {
  const {
    openBranchFormModal,
    openBranchStatusFormModal,
    closeModal,
    modalTitleText,
    data: modalData,
  } = useBranchModals();

  return (
    <Modal title={modalTitleText} onClose={closeModal}>
      {() => (
        <>
          {modalData?.type === 'branch-info' && <BranchForm {...modalData?.branchFormProps} />}
          {modalData?.type === 'branch-status' && (
            <BranchDeleteForm {...modalData?.branchStatusFormProps!} />
          )}
          {modalData?.type === 'branch-delete' && (
            <BranchDeleteForm {...modalData?.branchDeleteFormProps!} />
          )}
        </>
      )}
    </Modal>
  );
};

```

이 구조를 통해 **모달은 열림/닫힘 상태와 UI 레이아웃만 관리하고**, 도메인별 폼 로직은 완전히 분리할 수 있게 되었다. 덕분에 각 도메인에서 필요한 폼 컴포넌트를 자유롭게 지정할 수 있었고, 모달 내부에서 어떤 도메인 로직도 알 필요가 없게 되었다. 또한, props 구조가 명확해지면서 **타입 추론이 쉬워졌고**, 개발 도중 실수나 오타를 컴파일 단계에서 빠르게 잡아낼 수 있었다.

무엇보다 이 구조 덕분에 하나의 Modal 컴포넌트를 여러 도메인에서 반복적으로 재사용할 수 있어 유지보수도 훨씬 수월해졌다.

## 느낀 점

이번 모달 구조 개선 작업을 통해 단순히 “작동하는 코드”에서 벗어나 **유지보수하기 좋은 구조란 무엇인가**에 대해 더 깊이 고민하게 되었다.

처음엔 단순히 폼을 띄우기 위해 만든 모달이었지만, 도메인 수가 늘어나고 요구사항이 다양해질수록 **역할이 명확하지 않은 컴포넌트는 금방 무거워진다**는 걸 느꼈다.

이 과정을 통해 내가 가장 크게 느낀 건, UI와 로직은 **적절한 위치에서 서로 협력하면서도 독립되어야 한다**는 점이다.

컴포넌트가 담당할 책임을 분리하고, 복잡도를 낮추기 위해 render prop, 전역 상태, 도메인별 훅 등 다양한 구조적 선택을 고민했다.

또한 타입 시스템을 적극적으로 활용하면서, **타입이 단순한 오류 방지 수단을 넘어 좋은 설계 도구가 될 수 있다**는 것도 실감했다.

> 전체 구조

![](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/f57a481d-28a1-4dff-9ff1-ff934d623890/modal-image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466QXNODKC5%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152912Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF8aCXVzLXdlc3QtMiJHMEUCIAXuWgYbooItctg%2F%2FJRnlha2vzkXKsEAxISl420uNku8AiEAtCZgOy60X5izIoA3Yvd0n4QQGSrnSfBGq0fOi2P4cvQq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDIn3StvHWqvH5dfzCyrcA04zIXBYyKrrJqBpGuEsjz7aLB13GLxK%2FMMm%2Bm3aieVsgPHoIdlht4QLqEBKOhOSymObDVGhUa2EBMrDLZdnAX3tNyZ7erjL5WvkRGUQv2x5blgZ0DMWpgESDjMVONWMSg8Xv2uU0%2FbQpHx9mlIeGJjlqqmQwGYb4wJwVQktkDA7HVgWZhKlvmDUqI0eT7wg9zzR%2BjdEQu3gbhrxL8lDSrua6MfIu1cW5IllmUCQzDkFOzI1KnQlQ%2FBWfqM1252q60ToTcv24VEwXnmEHdY6K0C7BJcHlzRkcHYNXDMbkinmzLRJX8jtGEP7fgWVPGLpwzBiYXRz9gKzDkK%2BsC31xdTY7cj92ls%2FoDaDAviM0VbmClk%2FNn%2FmaJmR7%2Bi23HWxop8ol5sUJUiYNlmEQsFbRP5qw0m79eImpTYN4%2B24V0CXGH9adWVjAlX07oZilcYz0sMqtPilG0OYclEdo34K6wIWXXbbUES6dkBynEXAM8M2zxWiz0J0I1mY4mJnMlxnL6iPFwmQvbnmlpd7djdPH7VaJy5ENhHyS00gzZBZwq3k%2BCUyTT9WP5uKwfGvXCN9EtQLq0yBY34NO4uchHRzHW0PAGw6ab3hoLGPzoqVZgSjR207RlRWtp4EDmfsMJaOzdMGOqUBRb%2BGoqm0b7KxXELreWt%2Fpp0UnE4nuHLQsxAhrloWoo6M%2FtMua3P3UPCYWUeXI2iBL8W3LqJjgxy82vbiK%2FaxgBbX%2FwTW98MeUl5k8A3L8xz%2FYXnW0NfkUOZsu8HcFjVdOM4NNaHvSS9sYQHRDBlnNJf%2BkakTm7Jv61KiTttWdrvcbbQwr43%2F6lkSa%2FW9wdNJQzlyd1zhsoywKQsax6UA0SxVAktG&X-Amz-Signature=fa59b91b7e155107d956a8be10ce6cef48a8a608d3e3dfd698c3d31b00a8aeed&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

<details>
<summary>mermaid 코드</summary>

```markdown
flowchart TD

  %% Recoil Layer
  subgraph Recoil
    A[modalState]
  end

  %% Hooks Layer
  subgraph Hooks
    B[useModal Hook]
    C[useBranchModals Hook]
  end

  %% Components Layer
  subgraph Components
    D[BranchPage Component]
    E[BranchTable Component]
    F[Modal Component]
  end

  %% Render Layer
  subgraph Modal_Render
    G[BranchForm Component]
    H[BranchStatusForm Component]
  end

  %% 연결
  B --> A
  C --> B
  D --> C
  D -->|props 전달| E
  D --> F
  F -->|data.type === branch-info| G
  F -->|data.type === branch-status| H
```



</details>
