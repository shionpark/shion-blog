---
title: "Next.js에 Mixpanel 프록시를 붙이고 이벤트 이름 규칙을 정했다"
description: "광고 차단기에 막히는 Mixpanel 요청을 자사 도메인 프록시로 우회하고, 사무실 IP 필터와 button_id 중앙 정의, UTM 등록까지 정리한 기록."
date: "2026-06-04"
tags: ["Next.js", "Mixpanel", "Analytics", "프록시"]
published: true
featured: true
---

## 왜 프록시를 붙였나

Mixpanel을 브라우저에서 직접 부르면 uBlock Origin 같은 광고 차단기가 `mixpanel.com` 도메인 요청을 막는다. 막힌 요청은 에러 없이 사라져서 이벤트가 얼마나 빠지는지도 알 수 없다. 그래서 `/mp/*` 경로로 요청을 받아 서버가 Mixpanel로 전달하는 프록시를 만들었다. 브라우저가 보기에는 자사 도메인으로 가는 요청이다.

## Route Handler

Next.js App Router의 catch-all Route Handler(`src/app/mp/[...path]/route.ts`) 하나로 `/mp/track`, `/mp/engage`, `/mp/decide` 등을 다 받는다. 경로에 따라 업스트림이 다르다. SDK 스크립트는 CDN(`cdn.mxpnl.com`), 이벤트는 `api-js.mixpanel.com`, 설정은 `decide.mixpanel.com`이다.

프록시를 거치면 Mixpanel이 사용자 IP를 서버의 IP로 보기 때문에, `x-forwarded-for`의 첫 값을 `ip` 파라미터로 넘겨서 위치 정보를 유지한다.

## 사무실 IP는 이벤트만 막는다

내부 트래픽이 실제 사용자 지표에 섞이지 않게, 사무실 IP에서 온 요청은 프록시에서 버린다. IP는 환경변수(`MIXPANEL_INTERNAL_IPS`)로 뺐다.

```typescript
// 내부 IP의 추적 요청 차단 (SDK 초기화는 허용)
if (clientIp && INTERNAL_IPS.has(clientIp) && TRACKING_PATHS.has(path)) {
  return NextResponse.json({ status: 1 });
}
```

`/mp/decide`까지 막으면 SDK가 설정을 못 받아 아예 동작하지 않아서, `track`과 `engage`만 막는다. 차단할 때 Mixpanel의 정상 응답 형식(`{"status": 1}`)을 돌려주기 때문에 SDK는 성공한 줄 안다. 이 선택이 나중에 보장분석 PV가 Mixpanel에서 0으로 나오는 원인이 됐다. 그 이야기는 [3중 트래킹 불일치](/posts/triple-tracking-data-consistency) 글에 있다.

## 이벤트 이름 규칙

이벤트 이름은 `p_` 접두사로 시작한다. 이벤트 이름을 TypeScript 유니온 타입으로 두어 오타를 컴파일 단계에서 잡는다. 페이지뷰는 `p_pv_landing`, `p_pv_login`처럼 `p_pv_{페이지}`이고, `MixpanelProvider`의 경로 매핑 표에서 경로를 이름으로 바꾼다.

```typescript
export type MixpanelEvent =
  | 'p_clicked_cta'
  | 'p_signup_completed'
  | 'p_calculator_started'
  | 'p_pv_landing'
  | 'p_pv_login'
  // ...
```

## button_id를 한 파일에 모았다

CTA 클릭은 `p_clicked_cta` 이벤트에 `button_id`를 붙여 구분한다. 1월에 팀원이 GTM용 `trackCTAClick`을 만들어 두었고, 나는 4월에 Mixpanel 쪽 `trackCTA()` 헬퍼를 만들면서 `button_id`를 `mixpanel-taxonomy.ts` 한 곳에 모으고 규칙을 정했다.

```typescript
// 컨벤션: cta_{page}_{purpose}
// 한 번 등록된 button_id는 절대 변경 금지 — 과거 데이터 단절 방지
export const BUTTON_IDS = {
  LANDING_CALCULATOR: 'cta_landing_calculator',
  HEADER_START: 'cta_header_start',
  DASHBOARD_CARE_APPLY: 'cta_dashboard_care_apply',
  // ...
} as const;
```

버튼 문구나 위치가 바뀌거나 A/B 테스트로 카피가 달라져도 ID는 그대로 두어야 시계열이 끊기지 않는다. 새 CTA를 넣을 때는 이 파일에 먼저 등록하고, 컴포넌트에서는 `trackCTA()`만 부른다.

## UTM은 super property로

`MixpanelProvider`가 처음 마운트될 때 URL에서 `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`을 읽어 `mixpanel.register`로 등록한다. 이후 이벤트에 UTM이 자동으로 붙어서, 퍼널에서 캠페인별로 가입 전환을 나눠 볼 수 있다.

로그인한 사용자 중 ADMIN은 `identify`하지 않는다. 이벤트 전송 자체를 막는 건 아니다.

## 남은 것

- 사무실 IP 필터는 이벤트 확인을 사무실에서 하면 아무것도 안 보이게 만든다. 이걸 놓쳐서 7월에 Mixpanel 0건의 원인을 찾는 데 시간을 썼다.
- ADMIN은 `identify`만 하지 않을 뿐 이벤트는 그대로 보낸다. 관리자가 사무실 밖에서 접속하면 그 이벤트는 익명 사용자로 지표에 섞인다.

## 배운 점

분석 도구를 붙이는 일은 SDK를 설치하는 것보다, 데이터가 언제 빠지고 언제 섞이는지를 정하는 일에 가까웠다. 광고 차단기에 막힌 요청, 사무실에서 보낸 요청, 관리자의 요청은 모두 에러 없이 지나간다. 특히 사무실 IP 요청에 성공 응답을 돌려준 선택은 SDK를 멈추지 않게 해 줬지만, 나중에 0건이 나왔을 때 원인을 찾기 어렵게 만들었다. 데이터를 걸러 낸다면 어디서 무엇을 걸렀는지 확인할 방법도 함께 남겨야 했다.
