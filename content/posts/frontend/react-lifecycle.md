---
title: "React 조건부 렌더링과 상태 초기화: 컴포넌트의 생명주기를 이해하다"
description: "조건부 렌더링을 활용해 모달 재오픈 시 초기화 문제 해결"
date: "2024-12-17"
tags: ["React", "useForm", "Recoil", "useModal"]
published: true
---

### 모달을 여는 과정

사용자는 상품관리 페이지의 상품등록 버튼 또는 테이블 내부 드롭다운 버튼을 클릭해 상품을 등록 또는 수정할 수 있다.

모달이 열리면 상품 등록/수정을 위한 정보를 입력할 수 있는 폼이 렌더링된다.

![](https://blog.kakaocdn.net/dn/nHqLk/btsLjKSNnZY/kddwaICavyWRLskSS9hvTk/img.png)

등록 및 수정에 필요한 정보는 다르지만 사용자에게 동일한 폼을 보여주고 서버에 요청하는 값을 다르게 포맷팅 해주었다.

수정 폼의 경우 수정을 원하는 데이터를 클릭해 모달을 열기 때문에 클릭한 테이블의 row 정보로 폼 내부 요소의 기본값을 설정해주었다.

### 모달을 닫고 다시 열 때 발생하는 문제

앞서 동일한 폼을 수정과 등록 기능에 사용한다고 했기 때문에, 하나의 모달이 닫히고 새로운 모달이 열리면 이전 모달에 입력된 값들은 초기화되어야 한다. 그런데 모달을 닫고 다시 열면 이전에 입력한 값들이 모달에 남아있었다.

단순히 state와 ref를 초기화하는 함수를 생성해 모달을 닫을 때마다 실행함으로써 이를 해결할 수 있지만 리액트 컴포넌트 생명주기에 의하면 내 코드에 문제가 있는 것이 분명했다.

컴포넌트 상태 값들은 컴포넌트가 화면에서 사라질 때(unmount) 컴포넌트 내부 값들이 초기화되어야 하기 때문이다.

### 리액트 컴포넌트 생명주기(Life Cycle)

![](https://blog.kakaocdn.net/dn/bqzAtl/btsLbLYtVul/tODngx4g6a8HXN7QLcfrL1/img.png)

리액트의 생명주기(컴포넌트의 생성부터 사용, 소멸까지의 과정)에 의하면 **컴포넌트가 언마운트 될 때 해당 컴포넌트와 관련된 모든 상태, 렌더링된 요소, 이벤트 핸들러 등이 메모리에서 제거**된다. 이는 **메모리 누수를 방지하고 성능을 최적화하기 위해서**이다.

> 모든 React 컴포넌트는 동일한 생명주기를 거칩니다.

예를 들어 컴포넌트가 존재하지 않는데 이벤트 리스너가 해당 컴포넌트를 참조하고 있는 상황이라면, 이런 상황이 지속되었을 때 메모리 누수가 발생할 수 있고 시스템 성능에 부정적인 영향을 미칠 수 있다.

### 폼 데이터의 처리 방식

현재 프로젝트에서는 편의성을 위해 폼 데이터를 처리할 때 useForm 커스텀 훅을 만들어서 사용하고 있다. 해당 훅은 DOM 요소를 직접 참조하는 ref 객체를 통해 값을 관리한다. state와 달리 값을 입력할 때마다 컴포넌트가 리렌더링 되지 않으므로 성능 개선을 기대해볼 수 있으므로 프로젝트에서는 useForm 훅을 사용을 권장하고 있다.

반면 ref를 사용하지 않는 값들도 있다. 실시간으로 사용자가 입력한 값을 추적해서 다른 UI를 보여줘야 하는 경우가 그렇다.

예를 들어, 상품의 분류 select 태그에서 선택한 option 값에 따라 다른 선택란을 보여주는 경우가 있다. ('패키지' 카테고리를 선택할 경우, '패키지' 내부 옵션을 선택해주어야 한다.) 동적인 화면을 구현하는 데 있어 state만큼 편리한 방법이 없다!

### 1. 컴포넌트 구조 분석

부모 컴포넌트인 ProductPage는 Modal 컴포넌트와 ProductForm 컴포넌트를 자식 컴포넌트로 갖는데, 아래 코드를 보면 폼 컴포넌트에 data 객체 내부 값들을 prop으로 전달하고 있는 구조이다.

```typescript
const ProductPage = () => {
  const { openProductFormModal, closeModal, data, modalTitleText } = useProductModal();
  const productTableProps = useProductTable();
  const {
    branchProps: { branchNameList, handleBranchSelect },
  } = productTableProps;

  return (
    <>
      <ManagementSection
        buttons={
          <>
            <SelectBranches
              branchNames={branchNameList || []}
              onBranchChange={handleBranchSelect}
            />
            <EnrollButton
              label="상품 등록"
              Icon={ShoppingBagIcon}
              size="small"
              onClick={() => openProductFormModal()}
            />
          </>
        }
      >
        <ProductTable {...productTableProps} openProductEditModal={openProductFormModal} />
      </ManagementSection>

      <Modal title={modalTitleText} onClose={closeModal}>
        {() => <ProductForm {...productTableProps} {...data} />}
      </Modal>
    </>
  );
};
```

### 2. useModal 훅 내부 구조 분석

useModal 훅은 모달의 상태를 전역으로 관리하는 Recoil 상태를 기반으로 동작한다.

모달을 열 때 실행하는 함수 openModal(data?: T)는 data를 인자로 받고, Recoil 상태를 업데이트하는데, data가 전달되지 않으면 기본적으로 undefined가 설정된다.

```typescript
import { useRecoilState } from 'recoil';
import { IModalState, modalState as modalAtom } from '@/states';

export const useModal = <T = unknown>() => {
  const [modalState, setModalState] = useRecoilState<IModalState<T>>(modalAtom);

  const openModal = (data?: T) => {
    setModalState({ isOpen: true, data });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, data: undefined }));
  };

  return { ...modalState, openModal, closeModal };
};
```

useProductModal 함수는 useModal 함수를 재사용한다

```typescript
export const useProductModal = () => {
  const { openModal, closeModal, data } = useModal<IModalDataProps>();

  const openProductFormModal = (props?: IProductFormProps) => {
    openModal({
      type: 'product-create',
      size: 'md',
      productFormProps: props,
    });
  };

// ...
```

### 3. 폼 컴포넌트의 렌더링 로직 추가

수정 전 코드를 보면, data가 undefined이든, 값이 있든 상관없이 ProductForm이 항상 렌더링된다.

React는 ProductForm을 항상 렌더링하므로 컴포넌트가 마운트된 상태로 유지된다.

이 상태에서 openModal 함수가 실행되면 Recoil 상태의 data가 업데이트되지만 ProductForm 자체가 새로 렌더링되지는 않는다.

```typescript
const ProductPage = () => {
// ...return (
    <>
// ...
      <Modal title={modalTitleText} onClose={closeModal}>
        {() =>
          data?.type === 'product-create' && (
            <ProductForm {...productTableProps} {...data?.productFormProps} />
          )
        }
      </Modal>
    </>
  );
};

export default ProductPage;
```

반면, 수정 후 코드는 렌더링 조건이 추가되었다. 여기서 핵심은 data?.type === "product-create" 조건이 true일 때만 ProductForm이 렌더링된다는 점이다.

- openModal 함수 호출 전, data는 undefined이다. 조건의 결과가 **false**이므로 ProductForm은 렌더링되지 않는다.
- openModal 함수가 호출될 때 data가 설정되고 조건의 결과가 **true**로 평가되어 ProductForm이 렌더링된다.
- **React**는 ProductForm **컴포넌트를 새로 마운트**한다. 새롭게 마운트되므로 ProductForm의 내부 상태나 props는 초기화된다.
초기화의 이유는 바로 컴포넌트의 마운트 및 언마운트 때문이었다. React는 조건이 false인 경우 컴포넌트를 언마운트 시키고, 조건이 true인 경우 컴포넌트를 다시 마운트하며, 새로운 상태와 props로 초기화한다.

### 마치며

이번 문제를 해결하면서 React의 생명주기와 조건부 렌더링이 실제로 어떻게 동작하는지에 대해 깊이 이해할 수 있었다. “컴포넌트가 조건부로 렌더링될 때, React는 언마운트 후 다시 마운트한다"는 원리를 알게 되었고, 이를 통해 내부 상태 초기화가 자연스럽게 이루어지는 것도 확인할 수 있었다.

처음에는 단순히 **state 초기화**나 **ref 값 리셋**을 통해 문제를 해결하려 했지만, 코드를 더 단순하게 만들어보자는 시도를 통해 불필요한 로직을 추가하지 않고도 문제를 해결할 수 있었다. 조건부 렌더링을 통해 **컴포넌트 마운트 여부**를 명확히 제어하면서 자연스러운 상태 초기화를 이끌어낸 것이다.

또한 프로젝트에서 사용하는 useForm과 같은 커스텀 훅이나 전역 상태 관리(Recoil)가 모달 로직과 어떻게 상호작용하는지도 다시 한번 검토할 기회가 되었다. **전역 상태**와 **로컬 상태**를 동시에 관리해야 하는 상황에서 발생할 수 있는 복잡함을 잘 이해했고, 이를 단순화하는 방법에 대한 경험도 쌓을 수 있었다.

문제를 해결하는 과정은 결국 **React의 원리**를 이해하는 과정과 다르지 않다. 이번 경험을 통해 **컴포넌트의 생명주기**와 **조건부 렌더링**의 본질을 다시 확인할 수 있었다. 앞으로도 코드를 작성할 때 복잡한 로직을 추가하기보다는 **리액트의 작동 원리**를 기반으로 해결책을 찾아가려 한다.

글을 마무리하면서, **코드를 더하지 않고 빼면서 문제를 해결하는 것**이 얼마나 중요한지 다시 한번 느낄 수 있었다.
