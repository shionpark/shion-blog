---
title: "GitHub Actions와 테스트 기반 개발 환경 구축기"
description: "GitHub Actions로 pnpm 기반 테스트 자동화 워크플로우를 구축하며 겪은 에러와 해결 과정을 정리합니다."
date: "2025-07-13"
tags: ["CI/CD"]
published: true
---

# 브랜치 전략

**Git Flow**에서 제안하는 네이밍 규칙에 따라 브랜치를 생성하고, 

- `main`(`master`): 항상 배포 가능한 제품 상태를 유지하는 핵심 브랜치
- `dev`(`develop`): 다음 릴리스를 위해 개발 사항을 통합하는 브랜치
- `release/*`: 출시 버전을 관리하는 브랜치
- `feature/*`: 기능 개발을 위한 브랜치
- `bugfix/*`: 버그 수정을 위한 브랜치
- `hotfix/*`: 긴급 버그 수정을 위한 브랜치
**Github Flow**에서 제안하는 전략에 따라 작업을 진행했습니다.

- 단일 핵심 브랜치: main 또는 develop  ✅
- 기타 개발은 별도 브랜치 사용  ✅
- PR 통해 코드 검토 후 병합 (개발 브랜치→핵심 브랜치)  ✅
- 다양한 Github 기능 활용한 협업 (Ex. Github Actions)  ✅
- 지속적 배포(Continuous Deployment)로 빠르게 제품 피드백 🔺
# **테스트 기반 개발 환경 구축**

개발 파이프라인을 봤을 때 모든 과정을 수기로 했을 경우 번거로움이 발생하므로, 반복되는 작업의 자동화가 필요하다고 판단, **Github Actions**를 도입했습니다.

- **Github Actions**란?
  - 원격 저장소(Github 서버)에서
  - Github 이벤트(PR, push, merge, issue 생성 등) 발생시
  - `.github/workflows/*.yml` 파일로 
  - CI/CD, 테스트, 배포 자동화를 위한 도구
- 개발 파이프라인
  1. **Push:** Github에 코드 푸시 (또는 PR 생성)
  1. **Test:** 변경된 코드가 기존 기능을 망치지 않았는지 테스트 실행
  1. **Build:** 코드를 정적 파일로 번들링하여 배포 가능한 형태로 만듦 (Next.js, Vite, Storybook 등 사용)
  1. **Deploy:** 정적 파일을 서버(Vercel, Netflify 등)나 클라우드 환경에 배포
- 개선 점
  - 도입 이전: push 후 로컬에서 테스트 → 빌드 → 배포 서비스에 접속해서 직접 파일 올림
  - 도입 후: Github 이벤트(PR, push, merge, issue 생성 등) 발생시 자동 테스트, 빌드, 배포
  - 기대 효과: 자동화 뿐만 아니라 클라우드 환경에서 동일한 조건으로 테스트를 진행하므로
로컬 환경마다 테스트 결과가 다를 수 있는 경우를 예방할 수 있습니다.
## Github Actions 도입 과정

Github Actions 기반의 테스트 워크플로우를 구성하면서 다음과 같은 문제 상황을 마주하고 해결을 시도했습니다.

- 테스트 실패한 워크플로우
  ```bash
# GitHub Action 이름 지정!
name: 테스트 실행!

# 이벤트 지정!
on:
  push:
    branches: [ "main", "develop" ]
  pull_request:
    branches: [ "main", "develop" ]

# 작업 지정!
jobs:
  test: # 작업 이름!
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x] # 테스트할 Node.js 버전 목록!

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js (matrix.node-version)
      uses: actions/setup-node@v4
      with:
        node-version: (matrix.node-version)
        cache: 'pnpm'
    
    - name: Install pnpm
      run: npm install -g pnpm
    
    - run: pnpm ci # Clean Install 명령으로 의존성 설치!
    - run: pnpm test # 테스트 실행!
  ```

### 1. pnpm ci 에러

pnpm ci 명령어를 통해 의존성을 설치하였으나, 해당 명령어는 Node 20 버전에서 지원하지 않아 다음과 같은 에러가 발생하였습니다.

`Error: Unable to locate executable file: pnpm. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable.`

### 2. 패키지 매니저 간 lockfile 충돌

기존에 참고하던 [레퍼런스](https://www.heropy.dev/p/6hdJi6#h2_%ED%85%8C%EC%8A%A4%ED%8A%B8_%EA%B8%B0%EB%B0%98_%EA%B0%9C%EB%B0%9C_%EC%82%AC%EB%A1%80)가 npm 패키지 매니저를 사용하고 있으므로 npm으로 변경을 시도했습니다. 그 결과 다음과 같은 에러가 발생했습니다.

`npm error npm ci can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with npm install before continuing.`

npm ci는 워크플로우에서 `package-lock.json` 기준으로 설치하지만, 프로젝트 환경에서는 `pnpm-lock.yaml`을 사용하기 때문에 충돌이 발생했던 것이었습니다.

### 3. corepack이 설치한 pnpm 버전이 pnpm ci를 지원하지 않음 

corepack을 사용해 별도로 패키지 매니저를 설치하지 않고 Node.js에 기본 내장된 패키지 매니저를 사용하려고 했으나, corepack이 실제로 설치한 pnpm 버전이 pnpm ci 명령어를 아직 지원하지 않아 다음과 같은 에러가 발생했습니다.

`ERR_PNPM_CI_NOT_IMPLEMENTED
The ci command is not implemented yet`

pnpm ci는 pnpm 8.6.0 이상에서 지원되는 명령어라고 합니다.

### 4. 로컬 환경 재설정 및 lock 파일과 package.json 동기화

로컬 환경에서 node_modules 초기화 후 재설치하고, lock 파일 버전과 package.json을 동기화했으나, 여전히 pnpm ci 에서 에러가 발생했습니다.

```bash
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

마찬가지로 현재 사용 중인 pnpm 버전에서 pnpm ci 명령어가 아직 구현되지 않았다고 판단했습니다.

### 5. pnpm ci → pnpm install 수정 ✅

[공식 문서](https://pnpm.io/continuous-integration#github-actions)를 참고해 pnpm install로 수정하여 에러를 해결했습니다.

공식 문서에서도 pnpm ci를 사용하지 않고 pnpm install을 사용하는데, 참고한 레퍼런스에서 ci 명령어를 사용하기 때문에 이를 바꿀 생각을 못했던 것 같습니다. 해결할 수 있는 방법은 단순했습니다.

- 테스트 통과한 워크플로우
  ```bash
name: 테스트 실행!

on:
  push:
    branches: [ "main", "develop" ]
  pull_request:
    branches: [ "main", "develop" ]

jobs:
  test:
    runs-on: ubuntu-22.04

    strategy:
      matrix:
        node-version: [20]

    # 레포지토리 체크아웃
    steps:
    - uses: actions/checkout@v4

    # pnpm 설치
    - name: Install pnpm
      uses: pnpm/action-setup@v4
      with:
        version: 10

    # Node 버전 세팅 및 pnpm 캐시 활용
    - name: Use Node.js (matrix.node-version)
      uses: actions/setup-node@v4
      with:
        node-version: (matrix.node-version)
        cache: 'pnpm'

    # 의존성 설치
    - name: Install dependencies
      run: pnpm install

    # 테스트 실행
    - name: Run tests
      run: pnpm test
  ```
