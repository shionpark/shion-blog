---
title: "JavaScript 모듈 시스템과 패키지 매니저"
description: "자바스크립트 모듈 시스템 역사와 패키지 매니저 이론 정리"
date: "2025-05-02"
tags: ["JavaScript", "CommonJS", "Closure", "Scope"]
published: true
---

# JavaScript 모듈 등장 배경

초기 자바스크립트(JavaScript, 이하 JS)는 간단한 스크립트 작성 용도로 사용되었다. 대부분의 코드가 하나의 파일에 포함되어 있었다. 하지만 웹이 고도화되고 JS가 대규모 애플리케이션을 구축하게 되면서, **모듈 단위로 코드를 나누고 관리할 수 있는 시스템, 즉 모듈 시스템**이 필요해졌다.

JS의 각 파일은 독립적인 실행 단위다. 서로 다른 파일 간 데이터를 주고받기 위해 과거에는 전역 객체(`window` 또는 `global`)에 값을 저장하여 공유하는 방식이 일반적이었다. 하지만 이러한 방식은 스코프 충돌과 의존성 관리의 어려움이라는 문제를 안고 있었다.

이 문제를 해결하기 위해 ES Module이 도입되었고, Node.js 등 브라우저 외 환경에서는 CommonJS가 사용되기 시작했다.

![전역 스코프](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/1a1e3728-be56-4108-b1e3-485ca2750819/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466Z6WFSF75%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152906Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF8aCXVzLXdlc3QtMiJGMEQCIAT4KpiGWWsGJjwqFGL29exzPtQpHoTCSFI2%2BGcqPDUfAiBDXf9xvzbHFD8rFfahxr0OdwLFqUYFsog9Ix9BTaClXyr%2FAwgnEAAaDDYzNzQyMzE4MzgwNSIMoYLGV3eIeLvic7oFKtwDsqtEiGKvUF7JvQgPcmx9tkG5QWisgYcGM43x6Hzmd0qzMvVARBBMokr76Q6CCDHUx97aqq%2BHFnuGyNhQow4drCco%2FQcH1%2F%2FC0UGZeik%2FIj%2BLj3dPgtGwGi5f80G9hbQPlDCz4aDSixno9BHYGBI7UwAaHIeZ5pW7lPMq%2Bk37lBDSSyiytBE4oKKMg6ECDrwW2bH%2B6dz14jQPgurMXua9PMZtQG0vtdZ9eLswNbc%2BR1qsSWcEi272ck0SldUtdu9kaSs%2FDdl7y%2BTz4GPlY8B2EnPkanHHWT2vv0sZAsN8N0DL%2F%2F%2FIu1c7K%2FOvFvPVQNA%2FR59SL%2FZrryHuQAQ6U%2BIuKCoSjeKy14T50TCBpApjrNF0dAACkHK5LNrQH5iVtDPICJ1TWinPz9Zrvx%2FTTkQjm88%2B8eXiIrG2x8gU6odHLeR716uUu3dQDyd2JiR6out9woH92S6YPdYRyFbGxVwU040aJ2076yETGOQyhf%2FLm0Ez%2B1jDeIR9w00%2BXFFP%2FvhxP8Yxp7yQVDjQ2nSg6yqN0s44KI%2Bcxc%2Bbj7RP00%2FhgreCsp5sc4qF1fqjip%2Fm7NIC7DtULC9ulhb6rGZxpgj3aYPXqV%2FP1ofc1%2BxQykLAfXH%2BhQ4vi7vY2xe62sgwlI7N0wY6pgEoz6%2BGV6wnM3M9ZQDSp%2FXgLkgdixRO5vuVIdZyilwNVfLEF%2Bwn5p8%2Bqsi8%2FEbFRMn6Doo4K3fYO%2Fw6rcWCe2nvKlVEKL%2BeuKG5CAPnCSBF7AzXky04OqQxegtfM4%2FSB4y4z%2Fc%2BCqOoXqQrU1bhaf8w8SKl05RNCwBOfQT908QOFnWwa%2F%2Bift4S3jiaBVXBhXSDNFCugReLFeDtRhnbhrbix%2FnuYa9d&X-Amz-Signature=daf19abc1575e995280517dd560cad66a1ccccabd18db061bd96bf87fd18f65e&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

![모듈 스코프](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/09d7da27-816e-47cb-97df-9f047102c7ce/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466QM5UMULI%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152906Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJGMEQCIELmnlGVCTxs6JCLEbOgjAM%2F502ESiB2Bv9HRz3UpuO%2FAiBEF55L97dlNHYyluY5glHi6uHklP3XSjvoVXWnwMJ%2Bbyr%2FAwgnEAAaDDYzNzQyMzE4MzgwNSIM%2F6XJcApGGKbeBWoiKtwDWCI0gkwG%2FfC9StY8qNSM1Y5U3PXJOXmqUuxruQeocCaTqBtyEVznAGSUSjb%2BIRRAdOGEn1NrLi8egD%2FTh7uXtkYsKc5UOM6bVVlELnd4janMtt8DqP%2Fs9QncuJ8MJIgNQEJrm%2B4n9lkg5GEzB%2BXThhFh3aBgB6NCsBrfzkwlLVJ9VhnXMaQDxdrfF8D%2Fr7SFbIwAAy2KB1yBFLEGoBbpBywtcKtE3abifXTP4mSj4nySDJ8lfpsNhh19BNV5zxNwucNJKgk%2B91fVEPm48DpR6VrhkQ9o9zgcynm3YFap%2B%2B3RMdFVS%2Btv3MO4E7PNRe6kLnJZh4jY54%2BFgvlFqlj1hxN16tvN%2Fawvi%2FRQJUk9zn87GGsCRybWB50%2FttDLpmmmB0yTubUvNooYdPaSwfqoRr2O40NTDPGRnU7cKaKCqT1As%2FOXwKZtKsIgmJNYE1scZq6WGTbgCKnp%2Bw3dQBCTZLzViQyXryq2uHcXQZNGcRUlwVBsMkMIUNK28o%2FEY37mALJInEvzvPmyO0Njm4aGoOj0n0mToArdyWoq9QZMM%2B4FLnYVdtaZPzybgR0cwysMpoLtebdm6MEOse5eLV3PNztI08gRHBBklJ8qKaitgtXXrubMCKwclni0oAYwuIrN0wY6pgEHzxLT5whHmm62%2BckKcgb3RmnRZzvYSMAES6xZ8QsT3UONhQrM2dJ2gEZa3FSyYnwqUgatPRZsPJf7jCA15Guihtqy8MxNZY0D4XlmjmlxE0aN3oRDami6ZEYWQ8GE6VFj7mvsVzRwpfYtCRF0NBMy3RxBdNP%2F3tmSdQgFyzYcn16trwmfLZMxckiPYLKA5e3TuDw%2Bf9T46zA7UfmnQOQYUfCEk9cV&X-Amz-Signature=f629ab39df2be311be92053e0d802767ce4dfd48447a2b88bf98b4a6603a3437&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

# **CommonJS vs. ES Module**.

|  | CommonJS | ES Module |
| --- | --- | --- |
| 문법 | `module.exports`/`require` | `export`/`import` |
| 모듈 로딩 방식 | 동기적: require가 호출되는 순간 모듈 로드 | 정적 분석(비동기): 실행 이전에 의존성 트리 파악 |
| 사용 환경 | 서버 환경(Node.js)에 적합 | 브라우저 및 번들러 중심 환경에 적합 |
| 특징 | 간단하고 직관적 | 트리쉐이킹 등 최적화에 유리 |

모듈 시스템을 다음과 같이 비교해볼 수 있다. 

**CommonJS**는 동기적으로 모듈을 로드한다. 즉, `require()` 함수가 호출되는 시점에 모든 모듈을 읽어오는 것이다. 반면, **ES Module**은 런타임 이전에 모든 모듈을 분석한다. 이를 정적 분석이라고 하고, 코드 실행 시점 이전에 필요한 모듈을 알고 최적화 할 수 있기 때문에 로딩과 초기화가 빠르며, 사용되지 않는 코드를 제거하여 번들 크기를 조절하는 트리셰이킹 같은 최적화에 용이하다.

**CommonJS**는 Node.js의 서버 환경에 적합하고(버전 12.x 이상부터 .mjs 확장자로 ES Module 문법도 지원), **ES Module**은 빠른 속도의 장점이 있기 때문에 브라우저 및 번들러 중심의 프론트엔드 개발에 주로 사용된다.

# 패키지 매니저와 모듈 링크 전략

JavaScript 모듈은 로컬 환경 뿐만 아니라 외부에서도 가져올 수 있으며, 이때 **패키지 매니저**가 모듈의 설치와 버전 충돌 문제를 해결하는 핵심 역할을 한다.

## 패키지 매니저 동작 3단계

1. **Resolution**: 라이브러리 버전 고정
1. **Fetch**: 결정된 버전의 파일 다운로드
1. **Link**: 라이브러리를 소스 코드에서 사용가능한 환경 제공
`[패키지매니저] install` 명령어를 입력하면 *package.json*에 명시된 의존성 정보를 바탕으로 명시된 버전의 모듈을 설치한다. 특히 3번 과정, 라이브러리를 소스 코드에서 사용 가능하도록 환경을 구성할 때, 패키지 매니저(npm, pnpm, yarn)마다 뚜렷한 차이를 보인다.

## Linker 방식에 따른 차이

### **1. npm Linker**

*package.json*에서 명시하는 모든 의존성을 *node_modules* 디렉토리 밑에다가 하나씩 써내려가면서 라이브러리를 소스 코드에서 사용가능한 환경을 구성한다.

예를 들어, 소스 코드에서 `React`, `example-module`을 사용하면 *node_modules* 하위에 `React`, `example-module` 패키지를 추가하고, 이때 `example-module` 패키지에도 *node_modules* 폴더가 있다면 `@radix-ui/react-dialog`을 또 그 밑에 깔아준다.

```markdown
my-service/
└─ node_modules/
|  ├─ react/
|  |  
|  └─ @lib/example-module/
|     └─ node_modules/
|         └─ @radix-ui/react-dialog
|
└─ src
    └─ index.ts
```

npm 환경에서 특정 패키지를 찾을 때, 계속 상위 디렉토리의 *node_modules* 폴더를 탐색해야 한다. 패키지를 바로 찾지 못할수록 `readdir`, `stat`과 같은 느린 I/O 호출이 반복된다. 디렉토리 파일 *node_modules*는 매우 큰 공간을 차지한다. 수백 개의 패키지가 서로를 의존하는 복잡한 의존성 트리에서 *node_modules* 디렉토리 구조는 깊어진다. 

![**Why node_modules are the Heaviest Objects in the Universe?**([https://rakiabensassi.substack.com/p/why-node_modules-are-the-heaviest](https://rakiabensassi.substack.com/p/why-node_modules-are-the-heaviest))](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/c2a65dcd-f00c-4443-a9c5-30800426f90b/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466X2D5NYK4%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152905Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF8aCXVzLXdlc3QtMiJGMEQCIBkddNfMkaJSysnuOGS8mGh6TScXQaNE7s3GwwjLTTc8AiAP0qz1pnQ%2F7R8I%2BVLtFJd0YefDIFk2B2H2H2MvfNxuayr%2FAwgoEAAaDDYzNzQyMzE4MzgwNSIMwu4xJ7iZdqJczHrbKtwDgJmsfMEhDzP4S887Ppfr7H9gKEu8F63Ev2aC%2B6FHKXU%2B37u%2FRPCRmjJNJIyTQZjZgpOAtoquIrJiMVLvvb%2BQaULF6pETPI%2Btf9EfxhlEt73oRTvSPPS7QT65aUVlo9G2RNaXxYuFjPjhhoJdujTxRGLRUvjnhTqOsv2Br3Q2ugV3vRcSIxQTYVhVixada6Nu%2F4Re9ldiqrW23lW92BCb2yEgsrq7J%2FaaIAEVu2SewDazpcJod%2FViOsZz7af786RTojuBq603rqi34AEjGsQQV21mqO1TjTpOy15BWWwXe9g3KCnWsfjBtXgoy0e9Qfup54qeRCPKbGINqhCexxqvQQ6Sw%2BBCx3jH98pqCzaJYThegLKUFHDUgHRtvWnavNKoVosFc1L290L5NoWQlY2ushC9KvOw17zTZeoF830ebIP2a3wbwjm1AHYMqYcnCFJxDBtJzb3x8a2tfxqmBSPU0OwxxniNQeNnXtRBaW0r8hHgnbA8dcIRjML1XfDWwxbs1EisMek%2Fq1kWPLctpJX39cXebyJY42tLKn55Bn8RVKa%2BK0aRhMLmk8TaIaoR%2FatUZHxgAd6HfvYBIx7bI4oPIlKEuc6QNqgbMlUWXIqbJ9vgvvtdEn9yqPG3V%2Bgwn5XN0wY6pgF2w%2FUtVcPL5I7LKrxDg4qbROj%2Fm61YfPVqKud8YrhJtz5vT5iXt8KtzK4zhnFQZLkKOwodhW7h4%2FpxiFuYn9cQRotJcExbjFqLxqgSmzfun1SQk5aQJE4nslFTVGEJUuO%2FICE0Y%2BS55ycRKq%2B3MPG%2FVj4zDrg%2BK%2FC7xhBgBRwFa%2Fz40Js6au4jBkCE%2FR%2BvZ5cWRtjE0rwdtiXWSBPiqVdIkJ6bHq3j&X-Amz-Signature=a055712f6c36f53989753274cac150437255d15a94a280ca3b107fa4072570a7&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

이 같은 단점을 보완하는 최적화를 위한 방법으로 **끌어올리기(호이스팅, Hoisting)**가 등장했으나 오히려 의존성 관리가 혼란스러워졌다.

**호이스팅**은 중복해서 설치되는 패키지(**A(1.0)**, **B(1.0)**)의 낭비되는 디스크 공간을 아끼기 위해 의존성 트리를 오른쪽과 같이 바꾼다. 그 결과 원래는 `require()` 할 수 없었던 **B(1.0)** 라이브러리를 불러올 수 있게 된다(유령 의존성).

![**[nohoist in Workspaces]**([https://classic.yarnpkg.com/blog/2018/02/15/nohoist/](https://classic.yarnpkg.com/blog/2018/02/15/nohoist/))](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/6ea3a9eb-f823-4c5b-b663-a4b697237c3c/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466X2D5NYK4%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152905Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF8aCXVzLXdlc3QtMiJGMEQCIBkddNfMkaJSysnuOGS8mGh6TScXQaNE7s3GwwjLTTc8AiAP0qz1pnQ%2F7R8I%2BVLtFJd0YefDIFk2B2H2H2MvfNxuayr%2FAwgoEAAaDDYzNzQyMzE4MzgwNSIMwu4xJ7iZdqJczHrbKtwDgJmsfMEhDzP4S887Ppfr7H9gKEu8F63Ev2aC%2B6FHKXU%2B37u%2FRPCRmjJNJIyTQZjZgpOAtoquIrJiMVLvvb%2BQaULF6pETPI%2Btf9EfxhlEt73oRTvSPPS7QT65aUVlo9G2RNaXxYuFjPjhhoJdujTxRGLRUvjnhTqOsv2Br3Q2ugV3vRcSIxQTYVhVixada6Nu%2F4Re9ldiqrW23lW92BCb2yEgsrq7J%2FaaIAEVu2SewDazpcJod%2FViOsZz7af786RTojuBq603rqi34AEjGsQQV21mqO1TjTpOy15BWWwXe9g3KCnWsfjBtXgoy0e9Qfup54qeRCPKbGINqhCexxqvQQ6Sw%2BBCx3jH98pqCzaJYThegLKUFHDUgHRtvWnavNKoVosFc1L290L5NoWQlY2ushC9KvOw17zTZeoF830ebIP2a3wbwjm1AHYMqYcnCFJxDBtJzb3x8a2tfxqmBSPU0OwxxniNQeNnXtRBaW0r8hHgnbA8dcIRjML1XfDWwxbs1EisMek%2Fq1kWPLctpJX39cXebyJY42tLKn55Bn8RVKa%2BK0aRhMLmk8TaIaoR%2FatUZHxgAd6HfvYBIx7bI4oPIlKEuc6QNqgbMlUWXIqbJ9vgvvtdEn9yqPG3V%2Bgwn5XN0wY6pgF2w%2FUtVcPL5I7LKrxDg4qbROj%2Fm61YfPVqKud8YrhJtz5vT5iXt8KtzK4zhnFQZLkKOwodhW7h4%2FpxiFuYn9cQRotJcExbjFqLxqgSmzfun1SQk5aQJE4nslFTVGEJUuO%2FICE0Y%2BS55ycRKq%2B3MPG%2FVj4zDrg%2BK%2FC7xhBgBRwFa%2Fz40Js6au4jBkCE%2FR%2BvZ5cWRtjE0rwdtiXWSBPiqVdIkJ6bHq3j&X-Amz-Signature=8cbe4832c8ec70660cdddcb57c9a7a546e32036b3f54e54b17f4251e963ad1c9&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

### **2. pnpm Linker**

**P**erfomance가 향상된 **npm** 패키지 매니저를 pnpm이라고 한다. 

Hard Link를 사용해 alias를 거는 방식으로 더 빠르고 쉽게 의존성 목록을 불러오고, 의존성이 디스크에 하나만 설치되므로 npm에 비해 디렉토리 용량도 훨씬 작다.

그러나 여전히 *node_modules* 파일이 유지되면서 디렉토리를 돌면서 하나씩 alias를 걸어야 하기 때문에 `require`, `import` 시 파일 읽기가 많이 발생한다.

### **3. PnP Linker**

PnP(Plug’n’Play) 환경은 *node_modules* 없이 *.pnp.cjs* 파일 하나로 의존성을 관리한다. yarn install  명령을 입력하면 .pnp.cjs가 생성되고, Map 객체로 의존성이 전부 메모리 로딩된다.

*.pnp.cjs* 파일에는 자바스크립트 Map 객체로 의존성 목록이 작성되어 있다. Node.js 프로세스는 이 PnP Map을 메모리에 전부 로드하고, `import`와 `require`문에서 이 Map을 참조한다. 즉, 메모리에 파일이 로드되고 나면 그냥 Map 연산만 하기 때문에 *node_modules* 디렉토리를 순회하는 것보다 훨씬 속도가 빠르다. yarn.lock 기반으로 *.pnp.cjs* 파일만 만들어서 쓰면 되므로, 파일 하나만 쓰면 되니 설치 속도도 빠르다.

# Yarn Workspace + PnP 기반 모노레포

## 모노레포 도입 배경

모노레포(Mono-repos**)**는 여러개의 프로젝트를 단일 레포지토리에서 관리하는 소스 제어 패턴이다. 일반적으로 하나의 프로젝트를 하나의 레포지토리로 관리하는 멀티 레포(Mutil-repos)를 사용하지만 두 개의 프로젝트가 같은 의존성을 고려할 때 모노레포를 사용해 의존성 관리를 더 수월하게 할 수 있다.

우리는 디자인 시스템과 서비스 애플리케이션을 한 프로젝트에서 통합 관리하고자 **Yarn Workspace 기반 모노레포** 구조를 선택했다.

```bash
gymlight-frontend/
├── .yarnrc.yml            # nodeLinker: pnp
├── package.json           # Yarn Berry(PnP) 설정 (workspaces)
└── packages/
    ├── gymlight-manager/         # 실제 서비스 로직
    └── gymlight-design-system/   # UI 컴포넌트 라이브러리
```

모노레포를 도입하여 역할별 관심사를 분리하고 독립적인 개발/테스트 환경을 만들고 디자인 시스템은 Storybook으로 문서화했다. 

서로 다른 역할을 가진 두 패키지를 독립적으로 관리하니 변경 범위가 명확해지고 빠른 피드백 루프를 유지할 수 있어 유지보수가 수월했다. 

## Yarn Workspaces

```javascript
{
  "name": "gymlight",
  "packageManager": "yarn@4.4.0",
  "workspaces": {
    "packages": [
      "packages/*"
    ]
  },
  // ...
}
```

Yarn Workspaces를 사용하면 루트 경로의 package.json이 하위 폴더의 package.json에 정의된 종속성을 `yarn install`로 한번에 설치할 수 있도록 해준다. 설치하는 과정에서 하위 폴더의 package.json의 종속성 중복을 제거한 후 루트 경로의 node_modules로 호이스팅하여 설치한다.

package.json에서  workspaces를 지정해주면 아래와 같이 로컬 모듈을 패키지처럼 사용 가능할 수 있다.

```javascript
import { SquareButton } from 'gymlight-design-system'; 
```

> 참고 자료

- [nohoist in Workspaces](https://classic.yarnpkg.com/blog/2018/02/15/nohoist/)
- [패키지 매니저의 과거, 토스의 선택, 그리고 미래](https://toss.tech/article/lightning-talks-package-manager)
- [node_modules로부터 우리를 구원해 줄 Yarn Berry](https://toss.tech/article/node-modules-and-yarn-berry)
- [yarn workspace 모노레포 설정하기](https://medium.com/@designdevelop/yarn-workspaces-%EB%AA%A8%EB%85%B8%EB%A0%88%ED%8F%AC-%EB%8F%84%EC%9E%85%EA%B8%B0-c0310ca41c0e)
- [https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Modules](https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Modules)
