---
title: "Git Cherry Pick으로 커밋 내역 복사하기"
description: "잘못된 브랜치에서 작업하고 있는 걸 알았다면…"
date: "2024-12-12"
tags: ["Git"]
published: true
---

## 잘못된 브랜치에서 작업하고 있단 걸 알았을 때

현재 브랜치 이름이 `develop`이고 
올바른 브랜치 이름이 `feature` 라면,

1. develop 브랜치에서 커밋 안 한 내역부터 보관하기
  `git add .
git stash`

1. develop 브랜치에서 커밋 내역 복사 (갯수 확인해놓기)
  첫번째 커밋 해시 번호 copy SHA `A`

  85e5c916a3d7f13c61d0efa87ac3f214d14461aa

  마지막 커밋 해시 번호 copy SHA `B`
0617025d69159b4fe99a86c66746c2603f9866de

1. 올바른 브랜치로 이동
  `git checkout feature`

1. 올바른 브랜치에서 복사한 커밋 내역 불러오기
  `git cherry-pick A^..B`

  a9f92f0b21981a0ddff9b07eda96b4478e94bb2c^..7e9784cc50265ea9dee2e20f4a12827a152c2822

1. 보관해둔 작업 내역 살리기
  `git stash pop`

1. develop 브랜치에서 총 n개의 커밋을 복사만 해온거지 지운 건 아니다. 
올바른 브랜치에서 커밋까지 한 이후에 다시 develop 브랜치로 이동, 상위 n개의 커밋을 지워준다.
  `git checkout develop
git reset --hard HEAD~5`
