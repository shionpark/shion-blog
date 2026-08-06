---
title: "MSW로 API 모킹 환경 구축하기"
description: "Mock Service Worker를 도입해 백엔드 없이 프론트엔드 개발 속도를 높이고, 엣지 케이스를 안정적으로 테스트한 경험을 공유합니다."
date: "2025-08-31"
tags: ["MSW", "테스트", "API", "React"]
published: true
---

## 왜 MSW인가

프론트엔드 개발을 하다 보면 백엔드 API가 아직 준비되지 않은 상황을 자주 만난다. 그때마다 선택지는 몇 가지가 있다.

| 방식 | 장점 | 단점 |
|---|---|---|
| 하드코딩된 mock 데이터 | 빠름 | 실제 요청 흐름과 다름 |
| json-server | REST 지원 | 커스텀 로직 한계 |
| **MSW** | 실제 네트워크 레벨 인터셉트 | 초기 설정 필요 |

MSW(Mock Service Worker)는 Service Worker를 활용해 **네트워크 레벨에서** 요청을 가로챈다. `fetch`나 `axios`를 수정할 필요 없이, 실제 API를 호출하는 것과 동일한 코드로 개발할 수 있다.

## 설치 및 설정

```bash
npm install msw --save-dev
npx msw init public/ --save
```

### 핸들러 정의

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from "msw";

type Member = {
  id: number;
  name: string;
  status: "active" | "inactive";
};

const members: Member[] = [
  { id: 1, name: "김철수", status: "active" },
  { id: 2, name: "이영희", status: "active" },
  { id: 3, name: "박민수", status: "inactive" },
];

export const handlers = [
  // GET /api/members
  http.get("/api/members", () => {
    return HttpResponse.json(members);
  }),

  // GET /api/members/:id
  http.get("/api/members/:id", ({ params }) => {
    const member = members.find((member) => member.id === Number(params.id));

    if (!member) {
      return HttpResponse.json(
        { message: "회원을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return HttpResponse.json(member);
  }),

  // POST /api/members
  http.post("/api/members", async ({ request }) => {
    const body = await request.json();
    const newMember = { id: members.length + 1, ...body };
    members.push(newMember);

    return HttpResponse.json(newMember, { status: 201 });
  }),
];
```

### 브라우저 환경 설정

```typescript
// src/mocks/browser.ts
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
```

### 개발 환경에서만 활성화

```typescript
// src/main.tsx
async function enableMocking() {
  if (process.env.NODE_ENV !== "development") return;

  const { worker } = await import("./mocks/browser");
  return worker.start({
    onUnhandledRequest: "bypass", // 모킹 안 된 요청은 그대로 통과
  });
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
```

## 실전 활용: 엣지 케이스 테스트

MSW의 진짜 가치는 **정상 케이스보다 비정상 케이스를 쉽게 재현**할 수 있다는 점이다.

### 네트워크 지연 시뮬레이션

```typescript
import { delay } from "msw";

http.get("/api/members", async () => {
  await delay(3000); // 3초 지연
  return HttpResponse.json(members);
});
```

로딩 스피너, 스켈레톤 UI가 제대로 동작하는지 확인할 수 있다.

### 에러 응답

```typescript
http.get("/api/members", () => {
  return HttpResponse.json(
    { message: "서버 내부 오류가 발생했습니다" },
    { status: 500 }
  );
});
```

에러 바운더리, 에러 메시지 UI를 검증할 때 유용하다.

### 빈 데이터

```typescript
http.get("/api/members", () => {
  return HttpResponse.json([]);
});
```

"데이터가 없습니다" 같은 empty state UI를 확인할 수 있다.

## 테스트 코드에서 활용

MSW는 브라우저뿐 아니라 Node.js 환경(Vitest, Jest)에서도 동작한다.

```typescript
// src/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```typescript
// vitest.setup.ts
import { server } from "./src/mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

테스트별로 핸들러를 오버라이드할 수도 있다:

```typescript
test("에러 발생 시 에러 메시지를 표시한다", async () => {
  // 이 테스트에서만 에러 응답
  server.use(
    http.get("/api/members", () => {
      return HttpResponse.json({ message: "에러" }, { status: 500 });
    })
  );

  render(<MemberList />);

  expect(await screen.findByText("에러가 발생했습니다")).toBeInTheDocument();
});
```

## 정리

- MSW는 네트워크 레벨에서 요청을 인터셉트하므로, 실제 코드를 수정하지 않고 모킹 가능
- 백엔드 API가 미완성인 상태에서도 프론트엔드 개발을 병렬로 진행할 수 있다
- 에러, 지연, 빈 데이터 등 엣지 케이스를 쉽게 재현할 수 있다
- 브라우저(개발)와 Node.js(테스트) 양쪽에서 같은 핸들러를 재사용할 수 있다
