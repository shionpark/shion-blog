---
title: "git rebase로 원격 커밋 내역 제거하기"
description: ""
date: "2025-08-20"
tags: []
published: true
---

> 🔗 참고 링크

## 작업을 하다가 커밋을 되돌리고 싶을 때

선택지는 다음과 같다!

- git reset
- [git revert](https://git-scm.com/docs/git-revert)
- [git rebase](https://git-scm.com/docs/git-rebase) ← 나의 선택 **`git rebase -i <commit-hash>`**
### **revert와 rebase 차이**

> 📌 

둘의 차이를 요약하자면,

**git revert**는 이전 커밋을 수정하기 위한 새로운 커밋을 생성한다. → 협업에 유리하다.
**git rebase**는 아예 기록을 남기지 않고 수정할 수 있다. → 혼자 작업할 때 사용 가능하다.

나는 깔끔하고 선형적인 히스토리를 남기고 싶어 **git rebase**로 커밋 내역을 수정했다!

### 선택한 이유

> 먼저 상황을 정리하자면..

초반에 작업할 때, (이렇게 작업하면 안 되는데) 하나의 브랜치(develop)에서 모든 작업을 했다.

다음과 같은 커밋 이력이 있었고, 커밋 내역을 쪼개야 했다.

커밋은 원격 환경에 push 되어 있었다.

```bash
fff // 가장 최근
︱
eee
︱
ddd
︱
ccc
︱
bbb
︱
aaa // 가장 오래된
```

나는 전체 커밋 이력을 백업한 후, 커밋을 브랜치 별로 쪼갰다.

이 과정에서 사용하지 않는 코드에 대한 불필요한 커밋이 존재하게 되었다.



그게 ccc, eee 커밋을 제거하고 싶었다.

 현재 브랜치에서 제거하고 싶은 커밋을 없애는(rebase) 방법을 선택했다.



> 이렇게 해결을 시도했으나..

잘못됨을 인지하고 현재 브랜치를 백업하고, *(backup/develop)*
UI 관련 커밋 분리하고, *(feature/2-modal-ui*)
기능 관련 커밋 분리했다. *(feature/3-modal)*

이 과정에서 사용하지 않는 코드에 대한 불필요한 커밋이 존재하게 되었다.
