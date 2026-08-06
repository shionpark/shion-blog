---
title: "FormData를 이용한 파일 업로드 기능 구현기"
description: "FormData 기반 파일 처리, 다국어 파일명 대응, 다중 파일 업로드 및 Strict Mode 대응 등 실제 서비스 품질을 높이기 위한 개선 작업"
date: "2025-04-28"
tags: ["React", "\baxios"]
published: true
---

## 파일 데이터 처리 방식

프로젝트를 진행하면서 처음으로 **FormData**를 이용해 서버에 데이터를 전송하는 기능을 직접 구현하게 되었다.

그동안 주로 JSON 형태로 데이터만 보내던 경험은 있었지만,
**파일과 텍스트를 함께 보내야 하는** 상황은 이번이 처음이었다.

당연하게 생각했던 데이터 전송이, **파일**이 끼어들면서 생각보다 많은 고민과 선택을 필요로 했다.

> ✏️ **FormData
**form 필드와 그 값을 나타내는 일련의 key/value 쌍을 쉽게 생성할 수 있는 방법을 제공하는 인터페이스. `FormData()` 생성자 함수로 새로운 객체를 생성할 수 있다.

**🔗 **[https://developer.mozilla.org/ko/docs/Web/API/FormData](https://developer.mozilla.org/ko/docs/Web/API/FormData)

공지사항 기능을 개발하면서 요구사항은 명확했다.

- 게시글 제목, 본문 같은 텍스트 데이터와
- 첨부파일(이미지, 문서 등)을 함께 서버에 전송해야 했다.
하지만 **파일**은 단순한 텍스트가 아니라 **바이너리(Binary) 데이터**이므로 기존처럼 application/json 방식으로는 전송할 수 없었다.

multipart/form-data 형식으로 서버에 요청을 보내야 했고, 이때 필요한 객체가 바로 **FormData**였다.

> ✏️ **multipart/form-data****
**클라이언트와 서버 간에 전송되는 HTTP 요청 또는 응답에서 **여러 종류의 데이터를 동시에 전송**하기 위해 사용되는 방식

**🔗 **[https://developer.mozilla.org/ko/docs/Web/HTTP/Guides/MIME_types#multipartform-data](https://developer.mozilla.org/ko/docs/Web/HTTP/Guides/MIME_types#multipartform-data)

### 데이터 객체를 FormData로 만드는 유틸리티 함수

처음에는 화면에서 입력받은 데이터들을 하나씩 FormData에 직접 append하는 코드를 작성했다.

```typescript
const formData = new FormData();
formData.append('title', title);
if (branchId !== undefined) formData.append('branchId', branchId.toString());
if (attachments) formData.append('attachments', attachments);
```

이 방식은 코드가 금방 복잡해졌고, 재사용성도 떨어졌다. 그래서 주어진 데이터 객체를 순회하면서 자동으로 FormData를 만들어주는 유틸리티 함수, `createFormData`를 작성했다.

```typescript
export function createFormData<T extends Record<string, any>>(data: T): FormData {
  const form = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File || value instanceof Blob) {
        form.append(key, value);
      } else {
        form.append(key, String(value));
      }
    }
  });

  return form;
}
```

이로써 undefined나 null 값은 무시하고, 파일과 텍스트를 구분해서 FormData에 추가 가능해졌다.

### 첨부파일 예외 처리

공지사항 등록을 담당 함수 createNotice에서, 기존 데이터(`rest`)를 유틸 함수(createFormData)를 통해 변환하고 첨부파일(`attachments`)만 따로 추가하도록 했다.

이때, 파일은 **Blob** 형태로 서버에 보내야 하기 때문에 File 객체를 그대로 append 했다.

```typescript
export const createNotice = async ({ attachments, ...rest }: ICreateNoticeRequest) => {
  const formData = createFormData(rest);

  attachments?.forEach((a) => {
    formData.append('attachments', a.file);
  });

  return client.post<void>(NOTICES.CREATE, formData, fileHeaders);
};
```

> ✏️ **Blob
- **파일류의 불변하는 미가공 데이터를 나타내는 객체
- [`File`](https://developer.mozilla.org/ko/docs/Web/API/File)은 `Blob`에 기반한 인터페이스이다. 사용자 시스템의 파일을 지원하기 위해 `Blob` 인터페이스를 상속해 기능을 확장한 것

**🔗 **[https://developer.mozilla.org/ko/docs/Web/API/Blob](https://developer.mozilla.org/ko/docs/Web/API/Blob)

## React Strict Mode로 인한 파일 중복 등록 이슈

React 개발 환경에서 Strict Mode가 활성화되어 있었는데, 이로 인해 **파일을 선택했을 때 handleFileChange가 두 번 호출되는 문제**가 발생했다.

[React 공식 문서](https://ko.react.dev/reference/react/StrictMode)에 따르면, ‘*Strict Mode는 개발 중 ****잠재적인 버그를 조기에 발견하기 위해**** 일부 동작을 “일부러” 두 번 호출하거나, 두 번 렌더링하거나, 두 번 정리(cleanup)하게 만든다.’*고 한다. (실제 프로덕션 모드는X)

파일을 선택하는 onChange 이벤트는 ref나 effect와는 무관하게, input[type=“file”]의 상태 자체가 변화하면서 발생한다. 이때 input 파일 선택 처리 로직(handleFileChange)이 **실제 한 번만 발생해야 할 파일 업로드 이벤트를 두 번 처리**하는 문제가 생긴 것이었다.

### 같은 파일 선택은 “무시”하도록 설정

파일의 중복 업로드 문제를 해결하기 위해 (1)**같은 파일 선택 이벤트를 식별하고, **(2)**중복 이벤트는 무시**하는 로직을 추가했다.

(1) 동일한 파일 선택 이벤트 비교를 위한 **고유 식별자(파일명 + 크기 + 수정시간)**(`fileKeys`)를 만들었다.

(2) 마지막으로 처리한 파일 목록(`lastHandledFilesRef.current`)과 비교하여, **같은 파일 선택 이벤트는 무시**(조건이 참일 경우 return)해주었다.

```typescript
const lastHandledFilesRef = useRef<string[]>([]);

const handleFileChange = () => {
    const fileKeys = selectedFiles.map((f) => f.name + f.size + f.lastModified);

    if (
      fileKeys.length === lastHandledFilesRef.current.length &&
      fileKeys.every((key, i) => key === lastHandledFilesRef.current[i])
    ) {
      return; // 무시
    }
    lastHandledFilesRef.current = fileKeys;
		
		// ...
```

## 한글 파일명 깨짐 이슈

성공적으로 공지 생성 및 파일 첨부가 완료되었지만 한글 파일 이름이** 올바르게 보여지지 않고 **있었다.

### 파일명 인코딩 - encodeURIComponent(file.name)

파일을 FormData에 추가할 때 `encodeURIComponent`를 이용해 파일명을 인코딩하는 방법을 적용했다.

이렇게 하면 서버가 파일명을 받을 때 인코딩된 문자열을 다시 디코딩하여 한글 파일명도 정상적으로 표시할 수 있게 된다. 이로써 다국어 지원 기능이 추가된 것.

```typescript
export const createNotice = async ({ attachments, ...rest }: ICreateNoticeRequest) => {
  const formData = createFormData(rest);

  attachments?.forEach(({ file }) => {
    const blob = new Blob([file], { type: file.type });
    formData.append('attachments', blob, encodeURIComponent(file.name));
  });

  return client.post<void>(NOTICES.CREATE, formData, fileHeaders);
};
```

### 유틸리티 함수(createFormData)에 이 로직을 넣어야하나?

매번 파일을 만들 때마다 encodeURIComponent 함수를 실행하는 것보다, 파일 데이터를 만드는 유틸 함수에 이 로직을 추가하는게 낫지 않을까 고민했다.

그러나 **“어떤 값이 파일이냐”**, **“파일명을 어떻게 인코딩해야 하냐”** 같은 도메인 지식(비즈니스 로직)까지 포함하게 되면, `createFormData` 유틸 함수가 너무 많은 책임을 가지게 된다고 판단했다. 

이는 SRP, 단일 책임 원칙 위반하는 것일 뿐만 아니라, 이로 인해 사용자가 예측할 수 없는 동작을 할 위험이 생긴다. (예를 들어, ‘FormData에 뭘 넣으면 자동으로 인코딩되다니?’ 이런 불투명성 생길 수 있다)

따라서, 파일 다국어 대응 로직은 `createNotice` 함수 내부에 추가해주었다.

## 마치며

FormData를 다루는 것은 처음이었지만, 직접 부딪히면서 구조를 고민하고 유틸리티 함수를 설계해본 과정은 정말 좋은 학습 경험이었다. 단순히 폼 데이터를 append해서 서버로 보내는 데 그치지 않고, 텍스트와 파일을 정확히 구분하여 처리하는 방식과 유틸리티 함수의 책임을 명확히 분리하는 구조 설계를 고민해보는 계기가 되었다.

> 요약

1. **텍스트와 파일을 구분해서 처리해야 한다**
  File, Blob 객체는 FormData에 별도로 다뤄야 하고, 텍스트는 string 변환이 필요하다.

1. **FormData 유틸은 “순수 변환”만 책임져야 한다**
  파일명 인코딩 같은 비즈니스 로직은 별도로 처리하고, 유틸은 변환에만 집중해야 코드가 깔끔해진다.

1. **서버와 사전 협의가 중요하다**
  서버가 multipart/form-data를 처리할 수 있는지, 어떤 필드명을 사용할지 확정된 후 클라이언트 로직을 짜야 한다.

1. **업로드 경험을 고려한 UX 설계가 필요하다**
  업로드 중에는 스피너를 보여주거나, 잘못된 파일 업로드를 막는 등 추가적인 UX 개선도 필요하다.

### **추가 보완 아이디어**

다른 우선순위 작업을 마치는대로 서버 개발자와 논의해서 보완하면 좋을 것 같다.

1. **공지사항 수정 기능에서 기존 첨부파일 유지/삭제**: 
공지 update 함수의 요청 타입에 첨부파일이 있어야함.
1. **첨부파일 다운로드**: 
업로드 후 서버가 파일 저장 URL을 반환해야함.
1. **업로드 중 로딩 상태 표시**: 
isUploading 같은 state 생성 및 기존 스피너 컴포넌트 활용해 빠르게 구현할 수 있음.
