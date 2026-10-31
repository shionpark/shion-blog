---
title: "GitHub Actions와 Git Hooks로 배포·협업 규칙 세우기"
description: "RunFit 프로젝트에서 Vercel 자동 배포를 끄고 GitHub Actions로 CI·Preview·Production 배포를 직접 구성한 과정과, 로컬 husky 훅과 CI의 검증 역할을 나눈 방식을 정리한다."
date: "2025-12-16"
tags: ["CI/CD", "GitHub Actions", "Vercel", "Git Hooks", "husky"]
published: true
---

RunFit 프로젝트에 **CI(지속적 통합) / CD(지속적 배포)** 를 도입하면서 정한 규칙과 설정을 정리한 글이다.
팀 GitHub Discussion에 공유했던 내용을 바탕으로, 실제 워크플로우 파일을 함께 붙였다.

---

## 1. 왜 CI/CD 구성이 필요했는가?

기존에는 다음과 같은 문제가 있었다.

- Vercel Git 연동으로 인해 **PR 단위 Preview 배포가 통제되지 않음**
- lint/test 실패 여부와 관계없이 **자동으로 Preview/Production이 배포됨**
- 로컬 환경과 서버 환경의 Node/pnpm 버전이 달라 오류가 발생할 수 있음
- 테스트가 pre-push 훅에서만 실행되어 **PR 단위에서 테스트가 누락될 위험**이 있음

그래서 **배포 안정성 확보 + 리뷰 생산성 향상 + 환경 일관성 확보**를 목표로 CI/CD를 직접 구성했다.

---

## 2. 전체 구조 요약

검증과 배포를 세 개의 워크플로우로 나누고, Vercel의 Git 자동 배포는 껐다.

| 파일 | 트리거 | 역할 |
| --- | --- | --- |
| `ci.yml` | `main` 대상 PR | lint · test · build 검증 |
| `preview.yml` | `main` 대상 PR | Preview 배포 후 PR에 링크 코멘트 |
| `production.yml` | `main` push (PR merge) | Production 배포 |
| `vercel.json` | - | Git push 기반 자동 배포 비활성화 |

로컬에서는 husky 훅으로 커밋·푸시 전에 한 번 더 검증한다(6장).

---

## 3. CI 설정 (ci.yml)

`main`을 대상으로 PR이 열리면 lint, 전체 테스트, 빌드를 순서대로 실행한다.

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - name: pnpm 10 설치
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Node.js 설치
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

- pnpm은 `pnpm/action-setup`으로 먼저 설치해야 `setup-node`의 `cache: pnpm`이 동작한다.
- `--frozen-lockfile`로 lock 파일과 `package.json`이 어긋나면 설치 단계에서 바로 실패하게 했다.

> pre-push 훅에서는 **변경된 파일 기준으로만** 테스트를 실행하기 때문에,
> CI에서는 전체 테스트를 명시적으로 실행하도록 설정했다.

---

## 4. Preview 배포 설정 (preview.yml)

Vercel의 자동 배포 대신 Vercel CLI로 직접 빌드하고 배포한다.

```yaml
name: Preview 배포

on:
  pull_request:
    branches: [main]

permissions:
  pull-requests: write
  contents: read

jobs:
  preview:
    runs-on: ubuntu-latest

    steps:
      # checkout, pnpm, Node.js 설치 및 의존성 설치는 ci.yml과 동일

      - name: Vercel 환경 변수 불러오기
        run: pnpm vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Vercel 빌드
        run: pnpm vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Preview 배포
        id: deploy-vercel
        run: |
          DEPLOY_URL=$(pnpm vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }} | tail -1)
          echo "preview_url=$DEPLOY_URL" >> $GITHUB_OUTPUT

      - name: PR에 Preview 링크 자동 코멘트
        uses: thollander/actions-comment-pull-request@v3
        with:
          comment-tag: preview-link
          message: |
            🧷 **배포 미리보기:** ${{ steps.deploy-vercel.outputs.preview_url }}
```

**동작 흐름**

1. `vercel pull`로 Preview 환경 변수와 프로젝트 설정을 내려받는다.
2. `vercel build`로 GitHub Actions 러너에서 빌드한다.
3. `vercel deploy --prebuilt`로 빌드 결과물만 업로드한다.
4. 마지막 줄에 출력되는 배포 URL을 `$GITHUB_OUTPUT`에 담아 다음 step으로 넘긴다.
5. PR에 배포 링크를 코멘트로 남긴다.

`comment-tag`를 지정하면 커밋을 추가로 push해도 코멘트가 새로 쌓이지 않고, **같은 코멘트가 최신 링크로 갱신**된다.

**PR 코멘트 예시**

![PR 코멘트 예시](https://github.com/user-attachments/assets/7d83b638-e0a0-482d-b5aa-8254dd3d47f2)

**권한과 시크릿**

- GitHub Actions의 기본 `GITHUB_TOKEN`으로 PR에 코멘트를 달려면 `pull-requests: write` 권한을 명시해야 한다.
- Vercel 계정 설정에서 발급한 토큰을 저장소 시크릿 `VERCEL_TOKEN`으로 등록해 CLI 인증에 사용한다.

---

## 5. Production 배포 설정 (production.yml)

`main`에 push될 때, 즉 PR이 merge될 때만 실행된다.

```yaml
name: Production 배포

on:
  push:
    branches: [main]

jobs:
  Deploy-Production:
    runs-on: ubuntu-latest
    steps:
      # checkout, pnpm, Node.js 설치 및 의존성 설치는 ci.yml과 동일

      - run: pnpm test

      - name: Vercel CLI 설치
        run: pnpm add -g vercel

      - run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

Production 배포는 **리뷰와 CI를 통과해 `main`에 병합된 코드만** 기준으로 실행된다.
배포 직전에 테스트를 한 번 더 실행해, 테스트가 실패하면 배포 단계까지 가지 않도록 했다.

---

## 6. 로컬 검증: husky Git Hooks

CI가 PR 단위의 최종 검증이라면, husky 훅은 **커밋·푸시 전에 빠르게 걸러내는 단계**다.
커밋·푸시 전에 무엇을 검사할지 정하면서 팀에 husky 도입을 제안했고, 훅 설정은 진우 님이 맡았다.
CI 워크플로우는 이 훅이 걸러 주지 못하는 부분을 맡도록 짰다.

| 훅 | 실행 내용 | 목적 |
| --- | --- | --- |
| `commit-msg` | `commitlint` | `type: subject` 커밋 컨벤션 강제 |
| `pre-commit` | `lint-staged` | staged 파일만 lint |
| `pre-push` | `tsc --noEmit` + 변경 파일 기준 테스트 | 타입 에러·깨진 테스트를 원격에 올리지 않기 |

```bash
# .husky/pre-push
pnpm exec tsc --noEmit || exit 1

git fetch origin main || exit 1
pnpm test --changedSince=origin/main || exit 1
```

`--changedSince=origin/main`은 `main`과 비교해 변경된 파일과 관련된 테스트만 실행하는 Jest 옵션이다.
push 속도는 빨라지지만 전체 테스트를 보장하지는 않기 때문에, 3장처럼 CI에서 전체 테스트를 다시 실행한다.

---

## 7. 왜 Vercel Git 자동 배포를 껐는가?

Vercel은 Git 저장소와 연동하면 기본적으로 다음과 같이 동작한다.

- PR 생성 → Preview 자동 배포
- `main` push → Production 자동 배포

하지만 이 방식에는 다음과 같은 문제가 있었다.

- lint/test가 실패해도 배포가 진행됨
- CI가 실패해도 Preview/Production이 생성됨
- 팀이 의도한 배포 통제 흐름을 만들기 어려움

그래서 `vercel.json`에 다음 설정을 추가해 **Git 기반 자동 배포를 비활성화**하고, 배포는 GitHub Actions에서만 일어나도록 했다.

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

---

## 정리

최종적으로 코드가 배포되기까지의 흐름은 다음과 같다.

1. **커밋** — commitlint로 메시지 형식, lint-staged로 변경 파일 lint
2. **푸시** — 타입 체크와 변경 파일 기준 테스트
3. **PR** — CI(lint · 전체 테스트 · build)와 Preview 배포, PR 코멘트로 리뷰 링크 공유
4. **merge** — 테스트 후 Production 배포

검사를 단계별로 나누면서 로컬에서는 빠르게, PR에서는 빠짐없이 검증하는 구조가 되었다.
