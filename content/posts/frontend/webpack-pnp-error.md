---
title: "JavaScript 모듈 시스템부터 Yarn PnP 트러블슈팅까지"
description: "CommonJS와 ES Module의 차이, 패키지 매니저별 링크 전략, Yarn PnP 기반 모노레포 구성, 그리고 Webpack 설정 오류와 모듈 경로 문제를 해결한 과정을 정리한다."
date: "2025-05-05"
tags: ["JavaScript", "TypeScript", "Webpack", "PnP", "CommonJS", "ES Module", "Monorepo"]
published: true
---

## 왜 이 주제인가

모듈 시스템과 패키지 매니저는 단순한 설정 요소가 아니다. 코드의 유지보수성과 빌드 성능, 협업 효율까지 좌우하는 핵심 인프라다.

이 글에서는 모듈 시스템의 등장 배경부터 패키지 매니저별 링크 전략, Yarn PnP 기반 모노레포 구성, 그리고 Webpack 설정 오류와 모듈 경로 문제를 해결한 과정까지 정리했다.

## JavaScript 모듈 등장 배경

초기 자바스크립트는 간단한 스크립트 작성 용도로 쓰였다. 대부분의 코드가 하나의 파일에 포함되어 있었고 파일 간 데이터를 주고받으려면 전역 객체(`window` 또는 `global`)에 값을 저장해서 공유하는 수밖에 없었다.

웹이 고도화되면서 이 방식은 **스코프 충돌**과 **의존성 관리**라는 문제를 만들었다. 이를 해결하려고 CommonJS와 ES Module이 등장했다.

## CommonJS vs ES Module

| 구분 | CommonJS | ES Module |
| --- | --- | --- |
| 문법 | `require` / `module.exports` | `import` / `export` |
| 로딩 방식 | 런타임 동기 로딩 | 정적 분석 후 비동기 로딩 |
| 사용 환경 | Node.js 서버 사이드 중심 | 브라우저 / 번들러 기반 프론트엔드 |
| 특징 | 직관적이고 빠르게 동작 | 트리쉐이킹 등 최적화에 유리 |

CommonJS는 `require()`가 호출되는 시점에 모듈을 동기적으로 로딩한다. 반면 ES Module은 런타임 이전에 의존성 그래프를 구성하는 **정적 분석 기반의 비동기 로딩**이라 트리쉐이킹 같은 최적화가 가능하다.

CommonJS는 Node.js 서버 환경에(버전 12.x 이상부터 `.mjs` 확장자로 ES Module도 지원), ES Module은 브라우저 및 번들러 중심의 프론트엔드 개발에 주로 사용된다.

## 패키지 매니저와 모듈 링크 전략

외부 모듈을 설치하고 관리하는 건 **패키지 매니저**의 역할이다. `install` 명령을 실행하면 3단계를 거친다.

1. **Resolution** — 필요한 패키지 버전 결정
2. **Fetch** — 해당 버전 다운로드
3. **Link** — 소스 코드가 모듈을 사용할 수 있도록 환경 구성

특히 3번 Link 단계에서 패키지 매니저(npm, pnpm, yarn)마다 뚜렷한 차이가 있다.

### npm — node_modules 계층 구조

`package.json`에 명시된 모든 의존성을 `node_modules` 디렉토리 밑에 하나씩 설치한다.

```text
my-service/
└─ node_modules/
   ├─ react/
   └─ @lib/example-module/
      └─ node_modules/
          └─ @radix-ui/react-dialog
```

의존성이 의존성을 가지면 구조가 깊어진다. 패키지를 찾을 때 상위 디렉토리의 `node_modules`를 반복 탐색해야 하고 `readdir`·`stat` 같은 느린 I/O 호출이 누적된다.

이 문제를 줄이려고 **호이스팅(Hoisting)** 이 도입됐다. 중복 설치되는 패키지를 상위로 끌어올려 디스크 공간을 아끼는 방식인데, 원래 `require()` 할 수 없었던 패키지까지 불러오는 **유령 의존성(Phantom Dependency)** 문제를 만들었다.

### pnpm — Hard Link

실제 패키지는 전역 저장소에 한 번만 설치하고 프로젝트 내부에서는 하드링크로 연결해서 공간을 절약한다. 다만 `node_modules` 디렉토리는 여전히 유지되며 깊은 경로 탐색 문제는 남아 있다.

### Yarn PnP (Plug'n'Play)

`node_modules` 없이 `.pnp.cjs` 파일 하나로 의존성을 관리한다. `yarn install`을 실행하면 `.pnp.cjs`가 생성되고 자바스크립트 Map 객체로 의존성 목록이 메모리에 로딩된다.

`import`와 `require`가 이 Map을 참조하기 때문에 디렉토리를 순회할 필요가 없다. 속도와 디스크 공간 면에서 가장 효율적이다.

## Yarn Workspace + PnP 기반 모노레포 구성

`gymlight-manager`와 `gymlight-design-system`은 역할은 다르지만 동일한 기술 스택을 공유한다. 의존성 관리와 개발 효율을 위해 모노레포 구조를 선택했다.

```bash
gymlight-frontend/
├── .yarnrc.yml            # nodeLinker: pnp
├── package.json           # workspaces 선언
└── packages/
    ├── gymlight-manager/         # 서비스 로직
    └── gymlight-design-system/   # 공통 UI 컴포넌트
```

### Yarn Workspace 설정

```json
{
  "name": "gymlight",
  "packageManager": "yarn@4.4.0",
  "workspaces": {
    "packages": ["packages/*"]
  }
}
```

`yarn install` 한 번으로 모든 워크스페이스의 의존성을 설치하고 내부 모듈 간 import도 외부 패키지처럼 쓴다.

```javascript
import { SquareButton } from 'gymlight-design-system';
```

역할별 관심사를 분리하면서 독립적인 개발/테스트 환경을 유지했고 디자인 시스템은 Storybook으로 문서화했다. 변경 범위가 명확해지니 피드백 루프가 빨라 유지보수가 수월했다.

## Webpack 설정 오류 해결

Yarn Berry의 PnP 환경에서 Webpack 설정 파일을 ESM + TypeScript 형태로 유지하려면 추가 세팅이 필요하다.

### Node.js 전역 변수 직접 정의

ES Module은 `__dirname`, `__filename` 같은 Node.js 전용 전역 변수를 포함하지 않는다. 직접 구현해야 한다.

```typescript
// webpack.config.ts (ESM + TS)
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

Webpack 설정 파일을 `.js`로 바꾸고 `module.exports`를 쓰면 간단하지만 프로젝트 전반이 TypeScript + ESM으로 구성되어 있어 일관성을 위해 이 방식을 유지했다.

## 모듈 경로 에러와 캐시 초기화

Emotion, Radix 등 모듈이 `yarn install` 이후에도 인식되지 않는 문제가 발생했다. VSCode, TypeScript, Yarn이 PnP 환경을 제대로 연동하지 못한 데서 비롯된 문제였다.

설치 여부를 확인해 보니 패키지 자체는 설치됐지만 `.pnp.cjs`와 `.yarn/cache`에 파일이 정상적으로 풀리지 않아 TypeScript가 `@emotion/react/jsx-runtime`을 찾지 못하는 상태였다.

### 해결 순서

1. **캐시 및 설치 정보 삭제**

```bash
rm -rf node_modules .pnp.* .yarn/cache .yarn/install-state.gz yarn.lock
```

1. **Yarn 버전 설정 및 PnP 활성화**

```bash
yarn set version berry
yarn config set nodeLinker pnp
```

1. **VSCode 연동 재설정**

```bash
yarn dlx @yarnpkg/sdks vscode
```

`.vscode/settings.json`에 다음 설정 추가:

```json
{
  "typescript.tsdk": ".yarn/sdks/typescript/lib"
}
```

1. **재설치**

```bash
yarn install
```

VSCode에서 TypeScript 서버를 재시작하면 모듈 경로 에러가 해결된다.

## 정리

단순한 `__dirname` 문제 해결에서 시작됐지만 결국 모듈 시스템 전반을 재정비하는 계기가 됐다.

- Webpack 설정을 TypeScript + ESM으로 유지하면서 Node.js 전역 변수를 다루는 방법
- Yarn PnP 환경에서의 모듈 경로 인식 방식
- VSCode, TypeScript, 패키지 매니저가 하나의 시스템처럼 연동되어야 올바르게 작동한다는 사실

설치는 됐는데 모듈을 못 읽는 이유는 단순하지 않았다. 결국 중요한 건 개별 기술이 아니라, 이들이 하나의 시스템으로 작동하는지였다.

> **참고 자료**
> - [nohoist in Workspaces](https://classic.yarnpkg.com/blog/2018/02/15/nohoist/)
> - [패키지 매니저의 과거, 토스의 선택, 그리고 미래](https://toss.tech/article/lightning-talks-package-manager)
> - [node_modules로부터 우리를 구원해 줄 Yarn Berry](https://toss.tech/article/node-modules-and-yarn-berry)
> - [yarn workspace 모노레포 설정하기](https://medium.com/@designdevelop/yarn-workspaces-%EB%AA%A8%EB%85%B8%EB%A0%88%ED%8F%AC-%EB%8F%84%EC%9E%85%EA%B8%B0-c0310ca41c0e)
> - [MDN — JavaScript Modules](https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Modules)
