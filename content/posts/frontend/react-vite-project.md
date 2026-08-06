---
title: "Create React App 대신 Vite를 선택한 이유와 환경 구성 기록"
description: "CRA 대신 Vite로 프로젝트 초기화 및 개발 환경 구성"
date: "2024-01-19"
tags: ["ESLint", "Prettier", "tsconfig", "Vite", "React", "TypeScript"]
published: true
---

React 프로젝트를 시작할 때 흔히 사용하는 도구는 Create React App(CRA)이지만, 이번에는 Vite를 도입해 초기 개발 환경을 구성했다. 프로젝트 셋업 과정과 선택 이유, 환경 설정 방법을 정리해두면 다음 프로젝트나 팀 프로젝트 시에도 참고하기 좋을 것 같아 기록으로 남긴다.

# **Vite를 선택한 이유**

CRA는 webpack, babel, eslint 등을 내장하고 있어 빠르게 프로젝트를 시작할 수 있다. 그러나 다음과 같은 단점이 있다.

- 코드 변경 시 전체 번들링을 다시 수행하므로 **개발 서버 반영 속도가 느림**
- 설정 커스터마이징이 어렵고, **숨겨진 설정을 수정하려면 eject나 craco 등의 도구가 필요**
반면 Vite는 esbuild 기반의 번들러로, 다음과 같은 장점이 있다.

- **빠른 HMR(Hot Module Replacement)** 및 개발 서버 구동 속도
- 브라우저가 지원하는 ES Modules를 그대로 활용하여 **불필요한 번들링 최소화**
- 설정이 명확하게 드러나 있어 **유연한 커스터마이징 가능**
## Vite 프로젝트 생성

```plain text
npm init vite
cd [폴더명]
code .
```

해당 명령어를 실행하면 CLI를 통해 프로젝트 이름, 프레임워크(React 등), TypeScript 여부를 설정할 수 있다. 설정이 완료되면 해당 폴더로 이동하여 개발을 시작한다.

## 개발 환경 설정

### 1. ESLint

프로젝트 품질 유지를 위해 ESLint 설정을 적용했다. 아래는 기본적인 규칙 구성 예시다.

```javascript
{
  "rules": {
        "quotes": ["error", "double", "single"], // 쌍따옴표 읽기 "double"
        "no-duplicate-imports": "error",
        "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
        "no-unused-vars": "error",
        "no-multiple-empty-lines": "error",
        "react/react-in-jsx-scope": "off" // React를 선언했는데 사용하지 않았다는 오류 해결
  },
}
```

> React 17 이상부터는 JSX에서 import React 없이도 동작하므로 react/react-in-jsx-scope 규칙은 비활성화함.

### 2. Prettier

코드 스타일을 통일하기 위해 Prettier를 함께 설정했다.

```bash
yarn add -D prettier eslint-config-prettier eslint-plugin-prettier eslint-plugin-react-hooks
touch .prettierrc
```

.prettierrc 설정은 다음과 같다:

```javascript
  {
    "printWidth": 100,
    "tabWidth": 2,
    "singleQuote": true,
    "trailingComma": "es5",
    "useTabs": false,
    "arrowParens": "always",
    "bracketSpacing": true,
    "bracketSameLine": false
  }
```

### 3. 타입스크립트 경로 설정 (tsconfig paths)

타입스크립트에서 @/components와 같은 경로 alias를 사용하려면 `baseUrl`, `paths`를 설정하고, Vite에서도 이를 인식할 수 있도록 별도 플러그인을 추가해야 한다.

```bash
yarn add -D vite-tsconfig-paths
```

tsconfig.json에는 다음과 같이 작성:

```javascript
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

그리고 Vite 설정 파일에 플러그인을 추가한다:

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
});
```

## 실행 및 Git 설정

설정을 마친 후 의존성을 설치하고 서버를 실행해본다.

```bash
yarn install
yarn dev
```

![](https://blog.kakaocdn.net/dn/cFqSnN/btsC84whX2F/LXvv6DQkxjyRnIM1kLnMVk/img.png)

정상적으로 구동되는 것이 확인되면 Git으로 초기 커밋을 남기고 원격 저장소에 연결한다.

```bash
git init
git add .
git commit -m "init: Vite 프로젝트 셋업"
git branch -M main
git remote add origin [GitHub URL]
git push -u origin main
```

> ✏️ **Git CLI 정리**

# **🔗 참고 링크**

- [차세대 번들러 비교 분석 (webpack, rollup, esbuild, vite)](https://bepyan.github.io/blog/2023/bundlers)
- [CRACO란? CRA 설정 커스터마이징 툴 소개](https://abangpa1ace.tistory.com/entry/Craco-CracoCreate-React-App-Configuration-Override-%EB%9E%80)
- [Vite에서 React 프로젝트 설정하기](https://bo5mi.tistory.com/196)
- [Vite + TypeScript 환경에서 경로 alias 설정하기](https://velog.io/@otterji/Vite-typescript-%ED%99%98%EA%B2%BD%EC%97%90%EC%84%9C-path-%EC%84%A4%EC%A0%95%ED%95%98%EA%B8%B0)
# 정리

CRA보다 빠른 개발 환경을 구축하고 싶었고, 설정 유연성과 실행 속도를 고려해 Vite를 선택했다. 초기 셋업에 필요한 구성과 주의점을 기록함으로써 반복적인 설정을 줄이고, 향후 협업 시에도 기준점을 마련할 수 있도록 했다.
