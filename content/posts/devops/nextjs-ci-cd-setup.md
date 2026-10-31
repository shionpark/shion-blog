---
title: "Next.js 프로젝트 CI/CD 구축 — GitHub Actions 에러부터 초기 환경 설정까지"
description: "GitHub Actions 테스트 워크플로우에서 겪은 pnpm 에러 다섯 가지와, 프로젝트 초기 환경 설정·Vercel 배포 연동 과정을 정리한 기록."
date: "2025-07-30"
tags: ["CI/CD", "GitHub Actions", "Next.js", "Vercel", "pnpm"]
published: true
---

## 브랜치 전략

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
## **테스트 기반 개발 환경 구축**

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

---

## 초기 환경 설정과 배포 연동

<details>
<summary>가이드북</summary>

## **✅ 초기 개발 환경 관련 이슈 목록**

### **1.[CHORE] GitHub Actions CI 설정**

- PR, push 시 자동 테스트 실행
- Node 버전, pnpm 캐시, 테스트 스크립트 설정
### **2.[CHORE] 환경 변수 파일(.env) 구조 설정**

- .env.local, .env.production 등 구분
- NEXT_PUBLIC_ prefix 가이드 문서화
### **3.[CHORE] Vercel 배포 연동 및 기본 설정**

- 프로젝트 Vercel 연동
- 자동 배포 확인
- preview 브랜치 테스트
### **4.[CHORE] 경로 alias 설정**

- tsconfig.json에 @/components, @/styles 등 설정
- 상대경로 정리
### **5.[CHORE] 코드 포맷 도구 설정**

- Prettier, ESLint 플러그인 설치
- lint, format 스크립트 설정
- husky, lint-staged 연동 (선택)
### **6.[CHORE] 글로벌 스타일 초기화**

- globals.css 설정
- TailwindCSS 또는 CSS reset 적용 여부 설정
### **7.[CHORE] Git 커밋 컨벤션 도입**

- Conventional Commits 문서 공유
- commitlint, husky 설정
### **8.[CHORE] Storybook 초기 설정**

- 디자인 시스템 개발을 위한 스토리북 설치
- 기본 버튼 컴포넌트 테스트 작성
</details>

## **🔹 1: 프로젝트 초기 환경 설정**

- 이슈명: **[CHORE] Next.js 초기 환경 세팅**
- 설명
  - Next.js App Router 기반 프로젝트의 초기 개발 환경을 구성합니다.
- 작업 상세 내용
  - [ ] `npx create-next-app@latest`로 App Router 기반 프로젝트 생성
  - [ ] TypeScript 환경 설정 (기본 옵션 선택)
  - [ ] 디렉토리 구조 정리 (`src`, `app`, `styles` 등)
  - [ ] ESLint, Prettier 설정 및 `.eslintrc.json`, `.prettierrc` 추가
  - [ ] 글로벌 스타일 파일 (`globals.css`) 구성 및 적용
  - [ ] `.gitignore` 수정 (예: `.env`, `.next`, `node_modules` 등)
  - [ ] 기본 실행 테스트 (`pnpm dev` 실행 확인)
- 기타
  - `pnpm` 패키지 매니저 사용 예정
    - 이후 CI/CD, 환경 변수 설정, Vercel 연동 등은 별도 이슈로 관리
## **🔹 2: CI/CD 파이프라인 설정**

### 단위 테스트

- 이슈명: **[CHORE] GitHub Actions CI 설정**
- 설명
  - Vitest 기반 유닛 테스트 환경을 구축하고, GitHub Actions에서 PR 시 자동으로 테스트가 실행되도록 설정합니다.
- 작업 상세 내용
  - Vitest 기반 단위 테스트 test.yml GitHub Actions 워크플로우 생성
    - vitest, @vitest/ui, jsdom 설치
    - vitest.config.ts 생성 및 include/exclude 설정
    - tsconfig.json 경로 alias 설정
    - 커밋 트리거, PR 트리거 설정
    - main/dev 브랜치 PR 시 테스트 자동 실행 확인
- 기타
  - 워크플로우 실패 시 알림 또는 PR 머지 제한 여부는 이후 논의 예정
  - 추후 e2e 테스트 환경은 별도 이슈에서 다룰 예정
### E2E 테스트

- 이슈명: **[CHORE] E2E 테스트 **
- 설명
  - Vitest 기반 유닛 테스트 환경을 구축하고, GitHub Actions에서 PR 시 자동으로 테스트가 실행되도록 설정합니다.
- 작업 상세 내용
  - Vitest 기반 단위 테스트 test.yml GitHub Actions 워크플로우 생성
    - vitest, @vitest/ui, jsdom 설치
    - vitest.config.ts 생성 및 include/exclude 설정
    - tsconfig.json 경로 alias 설정
    - 커밋 트리거, PR 트리거 설정
    - main/dev 브랜치 PR 시 테스트 자동 실행 확인
- 기타
  - 워크플로우 실패 시 알림 또는 PR 머지 제한 여부는 이후 논의 예정
  - 추후 e2e 테스트 환경은 별도 이슈에서 다룰 예정
## **🔹 **코드 포맷 도구 Git Hook 설정



## **🔹 **3. Vercel 배포 연동 및 기본 설정

- 프로젝트 Vercel 연동
- 자동 배포 확인
- preview 브랜치 테스트
