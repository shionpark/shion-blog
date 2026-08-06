---
title: "JavaScript 모듈 시스템과 패키지 매니저, 그리고 Yarn PnP 환경 구성기"
description: "모듈 시스템 이해부터 Yarn PnP 기반 모노레포 환경 구성 및 모듈 경로 문제 해결까지 정리"
date: "2025-05-05"
tags: ["TypeScript", "React", "Webpack", "JavaScript", "PnP", "CommonJS", "ES Module", "Monorepo"]
published: true
---

현대 프론트엔드 개발에서 모듈 시스템과 패키지 매니저는 더 이상 단순한 설정 요소가 아니다. 코드의 유지보수성과 빌드 성능, 그리고 협업 효율까지 좌우하는 핵심 인프라가 된다.

이 글에서는 내가 실제로 겪은 모듈 시스템 이슈와 Yarn PnP 기반의 모노레포 환경 설정, 그리고 Webpack 오류를 해결해나간 과정을 정리했다. 단순히 개념 정리를 넘어서, 여러 도구들이 어떻게 맞물려야 제대로 작동하는지를 살펴봤다.

# JavaScript 모듈 등장 배경

초기 자바스크립트(JavaScript, 이하 JS)는 간단한 스크립트 작성 용도로 사용되었다. 대부분의 코드가 하나의 파일에 포함되어 있었지만, 웹이 고도화되고 JS로 대규모 애플리케이션을 구축하게 되면서 **모듈 단위의 코드 관리가 필수적**이 되었다.

처음에는 전역 객체(`window` 또는 `global`)를 통해 파일 간 데이터를 주고받았지만, 이는 **스코프 충돌**, **의존성 관리 문제**를 야기했다. 이를 해결하기 위해 CommonJS와 ES Module이 도입되었다.

## **CommonJS vs ES Module**

| 구분 | CommonJS | ES Module |
| --- | --- | --- |
| 문법 | `require` / `module.exports` | `import` / `export` |
| 로딩 방식 | 런타임 동기 로딩 | 정적 분석 후 비동기 로딩 |
| 사용 환경 | Node.js 서버 사이드 중심 | 브라우저 / 번들러 기반 프론트엔드 |
| 특징 | 직관적이고 빠르게 동작 | 최적화(트리쉐이킹) 및 병렬 로딩에 유리 |

CommonJS는 `require()`가 호출되는 시점에 모듈을 동기적으로 로딩한다. 반면 ES Module은 **정적 분석 기반의 비동기 로딩**으로, 런타임 이전에 의존성 그래프를 구성하고 트리쉐이킹과 같은 최적화 작업이 가능하다.

> CommonJS는 Node.js에, ES Module은 프론트엔드 개발에 더 적합하다.

## 패키지 매니저와 모듈 링크 전략

모듈 시스템을 사용할 때, 패키지를 어디서 어떻게 가져오고 설치할지를 관리하는 역할은 **패키지 매니저**가 맡는다. 여기에는 npm, pnpm, yarn 등이 있고, **링크 방식에 따라 의존성 트리 구성 방식**이 달라진다.

### 설치 과정 (공통)

1. **Resolution**: 필요한 패키지 버전 결정
1. **Fetch**: 해당 버전 다운로드
1. **Link**: 소스 코드가 모듈을 사용할 수 있도록 환경 구성
### 1️⃣ npm 방식 (NodeModules Linker)

- 모든 의존성은 `node_modules` 디렉토리에 계층적으로 설치
- 중첩 구조와 디스크 공간 낭비 문제 발생
- `require()` 시마다 깊은 경로 탐색으로 성능 저하 가능
> npm은 호이스팅으로 중복 설치를 줄이지만, 유령 의존성과 경로 충돌 문제를 유발하기도 한다.

### 2️⃣ pnpm 방식 (Hard Link)

- 실제 패키지는 전역 저장소에 한 번만 설치
- 프로젝트 내부에서는 하드링크로 연결하여 공간 절약
- `node_modules` 디렉토리는 유지되며 여전히 깊은 경로 탐색 필요
### 3️⃣ Yarn PnP (Plug'n'Play)

- `node_modules` 없이 `.pnp.cjs` 파일만으로 의존성 관리
- 모듈 정보는 메모리의 Map 객체로 로딩되어 빠르게 참조 가능
- 속도와 디스크 공간 면에서 가장 효율적
> .pnp.cjs 하나로 모든 의존성 정보를 관리하므로, 설치 속도와 모듈 해석 속도가 빨라진다.

# **Yarn Workspace + PnP 기반 모노레포 구성**

### 왜 모노레포인가?

`gymlight-manager`와 `gymlight-design-system`은 서로 다른 역할을 수행하지만 동일한 기술 스택을 공유한다. 이 경우 **의존성과 개발 효율을 높이기 위해 모노레포 구조**를 사용하는 것이 효과적이었다.

```bash
gymlight-frontend/
├── .yarnrc.yml            # nodeLinker: pnp
├── package.json           # workspaces 선언
└── packages/
    ├── gymlight-manager/         # 서비스 로직
    └── gymlight-design-system/   # 공통 UI 컴포넌트
```

### Yarn Workspace 설정

```javascript
{
  "name": "gymlight",
  "packageManager": "yarn@4.4.0",
  "workspaces": {
    "packages": ["packages/*"]
  }
}
```

`yarn install` 한 번으로 모든 워크스페이스의 의존성을 설치할 수 있으며, 내부 모듈 간 import도 마치 외부 패키지처럼 사용할 수 있다.

```javascript
import { SquareButton } from 'gymlight-design-system';
```

## **Webpack 설정 오류와 모듈 인식 이슈 해결기**

Yarn Berry의 PnP 환경에서 `.pnp.cjs` 기반으로 모듈을 관리하면서 **Webpack 설정 파일을 ESM + TypeScript 형태로 유지할 수 있도록** 세팅을 조정했다.

### Node.js 전역 변수 직접 정의

```typescript
// webpack.config.ts (ESM + TS)
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

ES Module은 Node.js 전용 전역 변수를 포함하지 않는다. 따라서 ES Module을 사용하는 Webpack 내부에서 전역 변수(`__dirname`, `__filename`, `process`, …)를 사용하려면 직접 구현해줘야 한다.

### CJS 방식으로 우회할 수도 있지만...

Webpack 설정 파일을 `.js`로 바꾸고 `module.exports`를 쓰면 간단하지만, 프로젝트 전반이 TypeScript + ESM으로 구성되어 있어 일관성을 위해 기존 방식으로 유지했다.

## 모듈 경로 에러와 캐시 초기화

Emotion, Radix 등 모듈들이 `yarn install` 이후에도 인식되지 않는 문제가 발생했다. 이는 VSCode, TypeScript, Yarn이 PnP 환경을 제대로 연동하지 못한 데서 비롯되었다.

### 해결 순서

소스 코드 전반적으로 발생하는 모듈을 찾지 못하는 에러를 해결하기 위해 먼저 해당 모듈이 설치되어 있는지 확인해보았다.

```bash
ls .yarn/cache/@emotion-react-npm-*/node_modules/@emotion/react/jsx-runtime.js
```

실행 결과, 설치되었지만 실제 경로에 `jsx-runtime.js`가 존재하지 않았고, Emotion 패키지가 설치는 된 것처럼 보이지만 `.pnp.cjs`와 `.yarn/cache`에 정상적으로 파일이 풀리지 않아서 TypeScript가 `@emotion/react/jsx-runtime`을 찾지 못하는 상태임을 파악할 수 있었다.

따라서 아래와 같은 해결 과정을 진행했다:

1. **캐시 및 설치 정보 삭제**
```bash
rm -rf node_modules .pnp.* .yarn/cache .yarn/install-state.gz yarn.lock
```

1. **Yarn 버전 설정 및 PnP 활성화**
```bash
yarn set version berry
yarn config set nodeLinker pnp
```

**3. VSCode 연동 재설정**

```bash
yarn dlx @yarnpkg/sdks vscode // Yarn SDK 재적용
```

`.vscode/settings.json`에 다음 설정 추가:

```json
{
  "typescript.tsdk": ".yarn/sdks/typescript/lib"
}
```

1. **재설치 및 타입스크립트 재시작**
```bash
yarn install
```

## 마무리하며

이번 경험은 단순한 `__dirname` 문제 해결에서 시작됐지만, 결국 **모듈 시스템 전반을 재정비하는 계기**가 됐다.

- Webpack 설정을 TypeScript + ESM으로 유지하면서 Node.js 전역 변수를 다루는 방법
- Yarn PnP 환경에서의 모듈 경로 인식 방식
- VSCode, TypeScript, 패키지 매니저가 하나의 시스템처럼 연동되어야만 올바르게 작동한다는 사실
설치는 됐지만 왜 모듈을 못 읽는지에 대한 해답은 단순하지 않았다.

> 결국 중요한 건 개별 기술이 아니라, **이들이 하나의 시스템으로 작동하는지**였다!
