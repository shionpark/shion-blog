---
title: "GA4 · Mixpanel · 자체 DB — 3중 트래킹 불일치를 해소한 과정"
description: "보장분석 기능을 배포하고 세 곳의 페이지뷰를 열어 보니 19, 7, 0이었다. Mixpanel 0건은 내가 넣은 IP 차단 필터 때문이었다."
date: "2026-07-13"
tags: ["Analytics", "Mixpanel", "GA4", "버그", "데이터분석"]
published: true
---

## 숫자가 다 달랐다

보장분석 기능(`/insurance/coverage`)을 배포하고 페이지뷰가 찍히는지 보려고 세 곳을 열었다.

| 소스 | PV |
|---|---|
| 자체 관리자 대시보드 | 19 |
| GA4 | 7 (3일 누적) |
| Mixpanel | **0** |

GA4와 자체 대시보드는 수집 방식이 달라서 차이가 날 수 있다. Mixpanel 0은 차이가 아니라 고장이었다. 세 곳이 다 다르면 어디가 맞는지부터 알 수 없어서, 수집 경로를 하나씩 따라가 봤다.

```
[사용자 브라우저]
  ├─ gtag.js ─────────────────────→ GA4 (Google 서버 직접)
  ├─ Mixpanel SDK → /mp/[...path] → Mixpanel (자체 프록시 경유)
  └─ fetch('/api/page-tracking') ─→ 자체 DB (BE API 경유)
```

## 원인 1: Mixpanel 0건은 내가 넣은 필터였다

Mixpanel 프록시(`/mp/[...path]/route.ts`)에는 사무실 IP의 추적 요청을 버리는 코드가 있다. 06-04에 내가 넣었다.

```typescript
const INTERNAL_IPS = new Set((process.env.MIXPANEL_INTERNAL_IPS ?? '').split(',').filter(Boolean));
const TRACKING_PATHS = new Set(['track', 'track/', 'engage', 'engage/']);

// 내부 IP의 추적 요청 차단 (SDK 초기화는 허용)
if (clientIp && INTERNAL_IPS.has(clientIp) && TRACKING_PATHS.has(path)) {
  return NextResponse.json({ status: 1 });
}
```

차단된 요청에도 `{"status": 1}`을 돌려준다. SDK는 전송에 성공했다고 보고, 콘솔에도 에러가 없다. 배포 뒤 확인을 전부 사무실에서 했으니 Mixpanel이 0인 게 당연했다. 외부 네트워크에서 들어온 이벤트는 정상으로 들어가고 있었다.

여기에 하나가 더 있었다. 보장분석 플로우는 `/insurance`, `/insurance/preview`, `/insurance/coverage` 세 페이지인데 `/insurance/coverage`만 이벤트를 등록해 두었다. 앞 두 페이지의 Mixpanel 이벤트 매핑이 빠져 있었다.

## 원인 2: 같은 기간인데 기준이 달랐다

자체 대시보드의 19도 믿을 수 없었다. page-tracking 서비스의 날짜 필터는 `getDateFilter()`에서 `now - N일`로 UTC 기준 24시간 단위 창을 계산했다. 같은 관리자 화면의 admin-analytics 모듈은 KST 자정 기준으로 기간을 잡는다. 같은 "1일"을 조회해도 두 모듈의 시작 시점이 달라서, 날짜 경계 근처 수치가 어긋났다.

인라인으로 같은 계산을 한 곳이 `getOverview()`, `getClickStats()`, `getScrollStats()`에 더 있었다. 모두 4곳이다.

수치가 0이 아니라 19라서 이상하다는 느낌이 들지 않는다. 교차 검증을 하지 않으면 발견하기 어려운 종류의 오차였다.

## 고친 것

**FE (PR #58).** 쓰지 않는 코드 4개를 지우고 `/insurance`, `/insurance/preview`의 Mixpanel 이벤트 매핑 2개를 추가했다.

이 과정에서 삽질을 하나 했다. App Router의 클라이언트 라우팅에서 GA4 페이지뷰가 빠질 수 있다고 생각해 GTMProvider에 SPA 페이지뷰 코드를 직접 넣었다. GA4 콘솔에서 보니 Enhanced Measurement가 History API 변경을 이미 감지하고 있었다. 내가 넣은 코드와 겹쳐 PV가 2배로 잡혀서 바로 되돌렸다.

**BE (BE-BUG-019, PR #59).** 4곳의 날짜 계산을 `getKstStartDate(period)` 하나로 모았다. UTC 현재 시각에 +9시간을 해서 KST 자정을 구하고, 다시 -9시간으로 UTC로 되돌린다. `1d`는 오늘 00:00부터, `7d`는 오늘을 포함한 7일(6일 전 자정)부터, `30d`는 29일 전 자정부터다.

## 교차 검증

배포 뒤 세 곳을 따로 확인했다.

- **Mixpanel**: 수정 전 0건이던 보장분석 이벤트가 외부 네트워크에서 접속했을 때 2건 기록됐다.
- **GA4**: Data API로 `/insurance/coverage` 페이지뷰를 조회했다. 처리 지연이 있어서 실시간 리포트와 일반 리포트를 둘 다 봤다.
- **자체 DB**: `page_tracking` 테이블을 직접 조회해 KST 기준 수치가 바뀌었는지 봤다.

## 그래도 GA4가 BE보다 높다

버그를 고친 뒤에도 GA4가 자체 DB보다 계속 높았다. 이건 구조 차이였다.

1. **IP 필터.** BE 트래킹은 `TRACKING_EXCLUDED_IPS`에 등록된 IP를 거른다. GA4에는 이 필터가 없다.
2. **하이드레이션 전 이탈.** BE 트래킹은 JS 번들이 로드되어야 호출된다. gtag는 인라인 스크립트라 먼저 실행된다.
3. **API 실패.** BE 트래킹은 `fetch` 한 번이고 재시도가 없다. 실패하면 그냥 빠진다.

GA4는 전체 방문 규모를 보는 데, BE는 JS까지 로드된 실제 세션을 보는 데 쓰기로 나눴다. 두 값을 맞추려고 하지 않았다.

## 바뀐 습관

- 세 수치를 같게 만들려는 게 아니라, 차이가 나면 그 이유를 설명할 수 있는지를 본다. Mixpanel 0은 설명이 안 돼서 버그였고, GA4 > BE는 설명이 돼서 놔뒀다.
- 이벤트가 안 들어오면 먼저 브라우저 Network 탭에서 프록시 응답을 본다. 이번에도 거기서 차단 응답을 직접 확인했고, 그다음 Mixpanel 대시보드에서 외부 사용자 이벤트가 정상으로 들어오는 것을 확인했다.
- 날짜 계산은 한 곳에 모았다. 4곳이 같은 방식으로 틀려 있었다.
- 트래킹 코드는 넣기 전에 지금 어떤 이벤트가 나가는지 네트워크 탭으로 먼저 보는 게 안전하다. GA4 SPA 중복 발화가 그 사례다.
