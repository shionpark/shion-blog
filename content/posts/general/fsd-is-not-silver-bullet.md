---
title: "FSD는 만병 통치약이 아니다"
description: ""
date: "2025-12-22"
tags: []
published: true
---

> 📌 참고 링크

> 팀 컨벤션을 정하면서 나는 FSD 구조를 제안했다.
> 내가 제안대로 FSD를 채택하진 않았지만,
> 나의 설득 근거가 무엇이었는지 정리해본다.

---

운이 좋게도 이전에 내가 작업했던 방식이 다수 선택되었다.

- 이슈명 `[FEATURE] 세션 필터 기능 구현`
- PR명 `feature(#00): 세션 필터 및 정렬 기능 구현`
- 브랜치명 `feature/session-filter-sort`


내가 나서서 이슈 템플릿, PR 템플릿을 만들고 제안했기 때문인 것 같다.

(나는 이런 규칙을 논의하고 정하는 걸 좋아하는 것 같다.

효율적으로 일할 수 있는 환경을 만드는 데 기여할 때 뿌듯함을 느낀다.)

> 관련 링크
> - 스토리북 배포
> - husky 테스트 논의
> - github actions
> - 코드 컨벤션: eslint 규칙 강제 (export default function)



FSD를 본격적으로 사용한 적은 없지만 이전부터 많이 들어왔고, 
비슷하게 도메인 별로 분리한 파일을 사용하기에 
사실 이번에 제대로 문서를 읽기 전까지 나는 나의 폴더 구조가 FSD인 줄 알았다.

예를 들면 이런 구조,

```bash
src
ㄴ Domain A
  ㄴ components/
  ㄴ hooks/
  ㄴ libs/
  ㄴ ...
ㄴ Domain B
  ㄴ components/
  ㄴ hooks/
  ㄴ libs/
  ㄴ ...
```

비슷한 코드가 가까이에 있는 게 좋다고 생각했다.

예를 들면, 로그인 폼에서 userSchema를 불러와서 사용하는데 
현재 폴더 기준으로 탐색하는 것이 아니라 `../libs/userSchema`
외부로 나가는 게 어색하다고 생각했다. `../../../libs/auth/userSchema`

path alias를 통해 개선할 수 있는 여지도 있다.



내가 사용하는 패턴이 FSD는 아니었다.
