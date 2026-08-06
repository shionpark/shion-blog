---
title: "리드미에 어떤 내용이 들어가야 할까?"
description: ""
date: "2025-07-14"
tags: []
published: true
---

1. Vitest 도입
  - 상태 변화나 사이드 이펙트 있는 함수


1. Github Actions [workflow](https://github.com/shionpark/semi-map/blob/develop/.github/workflows/test.yml) 추가 -> 테스트 자동화
  1. [npm](https://www.heropy.dev/p/6hdJi6#h3_%EC%9B%8C%ED%81%AC%ED%94%8C%EB%A1%9C%EC%9A%B0_%EC%B6%94%EA%B0%80) -> pnpm
  1. pnpm ci (X) -> pnpm install (O) ([공식 문서](https://pnpm.io/continuous-integration#github-actions) 참고)
1. [리드미 작성](https://github.com/shionpark/semi-map/blob/develop/README.md) 후 추가 기능 개발
  1. 폴더 구조 -> 스토리북 -> 빌드와 배포?
    1. 빌드 - 내부적으로 번들러 Vite로 성능 최적화 -> 정적 파일(`storybook-static/`) 생성
    1. 배포 - 디자인 시스템 문서화 목적으로 Vercel에 정적 파일을 실제로 웹에 올림
  1. 주요 기능 정리. 이슈 생성
    1. Git hook
# 사전 작업의 필요성

프로젝

- **✅ README** 작성
  - 리드미에 어떤 내용이 들어가야 할까?
    1. 소개 (스크린샷)
    1. 기술 스택 (표)
    1. 주요 기능 (리스트)
    1. 데모 (배포 주소)
    1. 폴더 구조 (```bash```)
    1. 실행 방법 (```bash```)
    1. 주요 설정(env), 사용한 API, 협업 및 컨벤션, 개발자, 라이선스 등
- **✅  **브랜치 전략 사용
  - **Git Flow
**다음과 같은 브랜치 만들어 사용해라!
    - **`main`**(**`master`**): 항상 배포 가능한 제품 상태를 유지하는 핵심 브랜치
    - **`dev`**(**`develop`**): 다음 릴리스를 위해 개발 사항을 통합하는 브랜치
    - **`release/*`**: 출시 버전을 관리하는 브랜치
    - **`feature/*`**: 기능 개발을 위한 브랜치
    - **`bugfix/*`**: 버그 수정을 위한 브랜치
    - **`hotfix/*`**: 긴급 버그 수정을 위한 브랜치
  - **Github Flow** 
Github이 제안하는 브랜치 모델 도입해서 간단하고 빠르게 개발해라!
    - 단일 핵심 브랜치: main 또는 develop
    - 기타 개발은 별도 브랜치 사용
    - PR 통해 코드 검토 후 병합해라. (개발 브랜치→핵심 브랜치)
    - 다양한 Github 기능 활용해 협업해라. (Ex. Github Actions)
    - 지속적 배포(Continuous Deployment)로 빠르게 제품 피드백해라.
- **🔺 **커밋 컨벤션
  - **Git hook**
    - 커밋 메시지 검사, Lint 설정, 포맷 자동 적용을 목적으로 개발자 로컬에서 실행함.
Husky 사용함.
# 테스트 기반 개발

- **✅ Vitest** 
테스트 코드 작성
  - 사례:
지도 렌더링 여부를 확인하는 함수. 초기 false, 지도 렌더링 이후 true로 변경
- **✅ Github Actions** 
push→test→build→deploy 단계의 자동화 도구
  - 원격 저장소(깃허브 서버)에서
깃허브 이벤트(PR, push, merge, issue 생성 등) 발생시
`.github/workflows/*.yml` 파일로 
CI/CD, 테스트, 배포 자동화 가능함.
- **🔺 Storybook** 
UI 문서화 및 테스트
  - UI 문서화 및 테스트 도구
  - 빌드 및 배포 목적: 디자인 시스템 문서화, 팀원 간 공유
  - Vercel에 배포 시 별도 작업 해주어야 함. 자동화 하려면 Github Actions 사용
