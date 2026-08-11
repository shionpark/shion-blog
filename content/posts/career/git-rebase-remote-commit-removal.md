---
title: "팀 프로젝트에서 Git 커밋 되돌리기 — cherry-pick과 rebase 실전 기록"
description: "develop 하나에서 모든 작업을 하다가 브랜치를 쪼개야 했다. cherry-pick으로 커밋을 옮기고, rebase -i로 불필요한 커밋을 제거한 과정을 정리한다."
date: "2025-08-20"
tags: ["Git", "cherry-pick", "rebase"]
published: true
---

## 상황

팀 프로젝트 초반에 하나의 브랜치(develop)에서 모든 작업을 했다. UI 작업, 기능 구현, 설정 변경이 뒤섞인 커밋이 쌓였고 이걸 역할별 브랜치로 쪼개야 했다.

```bash
fff  # 가장 최근
 ︱
eee
 ︱
ddd
 ︱
ccc
 ︱
bbb
 ︱
aaa  # 가장 오래된
```

커밋은 이미 원격에 push된 상태였다. 두 가지 작업이 필요했다.

1. 필요한 커밋을 올바른 브랜치로 **옮기기** (cherry-pick)
2. 원래 브랜치에 남은 불필요한 커밋을 **제거하기** (rebase)

## cherry-pick으로 커밋 옮기기

잘못된 브랜치(develop)에 있는 커밋을 올바른 브랜치(feature)로 복사한다.

1. 커밋하지 않은 변경사항 보관

```bash
git add .
git stash
```

1. 옮길 커밋 범위 확인 — 첫 번째 커밋 해시 `A`, 마지막 커밋 해시 `B`

1. 올바른 브랜치로 이동 후 cherry-pick

```bash
git checkout feature
git cherry-pick A^..B
```

`A^..B`는 A 커밋부터 B 커밋까지를 의미한다. `A^`로 시작점을 포함시킨다.

1. 보관해둔 변경사항 복원

```bash
git stash pop
```

1. 원래 브랜치로 돌아가서 복사한 커밋 정리

```bash
git checkout develop
git reset --hard HEAD~5  # 상위 5개 커밋 제거
```

cherry-pick은 커밋을 **복사**하는 것이지 이동이 아니다. 원래 브랜치의 커밋은 별도로 정리해야 한다.

## 불필요한 커밋 제거 — 선택지 비교

브랜치를 쪼갠 뒤 develop에 불필요한 커밋(ccc, eee)이 남았다. 제거 방법은 세 가지다.

| 방법 | 동작 | 히스토리 |
| --- | --- | --- |
| `git reset` | HEAD를 과거로 이동 | 커밋 자체가 사라짐 |
| `git revert` | 되돌리는 새 커밋 생성 | 원본 + 되돌림 커밋 모두 남음 |
| `git rebase -i` | 특정 커밋만 선택적 제거 | 깔끔한 선형 히스토리 |

`reset`은 연속된 최근 커밋만 제거할 수 있다. 중간에 있는 특정 커밋(ccc, eee)만 골라서 제거하려면 `rebase -i`가 필요하다.

`revert`는 되돌림 커밋이 남아 히스토리가 지저분해진다. 혼자 작업하는 브랜치였기 때문에 깔끔한 히스토리를 위해 `rebase -i`를 선택했다.

## rebase -i로 특정 커밋 제거

제거할 커밋보다 한 단계 이전 커밋의 해시를 지정한다.

```bash
git rebase -i <제거할 커밋 이전의 해시>
```

에디터가 열리면 커밋 목록이 표시된다.

```bash
pick aaa 첫 번째 작업
pick bbb 두 번째 작업
pick ccc 불필요한 작업    # ← drop으로 변경
pick ddd 네 번째 작업
pick eee 불필요한 작업    # ← drop으로 변경
pick fff 여섯 번째 작업
```

제거할 커밋의 `pick`을 `drop`으로 바꾸고 저장한다.

```bash
pick aaa 첫 번째 작업
pick bbb 두 번째 작업
drop ccc 불필요한 작업
pick ddd 네 번째 작업
drop eee 불필요한 작업
pick fff 여섯 번째 작업
```

저장 후 rebase가 실행되고 해당 커밋이 히스토리에서 제거된다. 원격에 이미 push한 상태라면 force push가 필요하다.

```bash
git push --force-with-lease
```

`--force-with-lease`는 다른 사람이 그 사이에 push한 커밋이 있으면 거부해주므로 `--force`보다 안전하다.

## 주의사항

- **협업 브랜치에서는 rebase 대신 revert를 쓴다.** rebase는 히스토리를 다시 쓰기 때문에 다른 사람의 작업과 충돌할 수 있다.
- **force push 전에 반드시 백업한다.** 실수하면 커밋이 복구 불가능할 수 있다.
- **cherry-pick 후 원래 브랜치 정리를 잊지 않는다.** 복사만 하고 원본을 남겨두면 중복 커밋이 생긴다.