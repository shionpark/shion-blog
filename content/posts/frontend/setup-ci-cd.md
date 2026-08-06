---
title: "CI/CD 환경 구축"
description: ""
date: "2025-07-30"
tags: []
published: true
---

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
