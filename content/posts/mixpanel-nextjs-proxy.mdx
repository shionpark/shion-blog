---
title: "Next.js에서 Mixpanel 프록시 통합하기 — 광고 차단기 우회부터 택소노미 설계까지"
description: "Next.js Route Handler로 Mixpanel 프록시를 구축하고, 내부 IP 필터링과 이벤트 택소노미를 설계한 과정을 공유합니다."
date: "2026-06-04"
tags: ["Next.js", "Mixpanel", "Analytics", "프록시"]
published: true
---

## 왜 프록시가 필요한가

Mixpanel을 클라이언트에서 직접 호출하면 두 가지 문제가 있습니다:

1. **광고 차단기가 요청을 차단** — uBlock Origin, Brave 등이 `api.mixpanel.com` 도메인을 기본 차단합니다. 사용자의 20~40%가 광고 차단기를 사용한다는 통계도 있습니다.
2. **데이터 유실** — 차단된 요청은 에러 없이 사라집니다. 분석 데이터의 신뢰도가 떨어집니다.

해결 방법은 자사 도메인을 경유하는 프록시를 두는 것입니다. `api.mixpanel.com` 대신 `intalkpartners.com/mp/track`으로 요청하면 광고 차단기가 자사 도메인으로 인식해서 통과시킵니다.

## Next.js Route Handler로 프록시 구축

Next.js App Router의 Route Handler를 사용하면 별도 서버 없이 프록시를 만들 수 있습니다.

```typescript
// src/app/mp/[...path]/route.ts

const MIXPANEL_API = 'https://api.mixpanel.com';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join('/');

  // 내부 IP 체크
  if (isInternalIp(request) && isTrackingPath(targetPath)) {
    return new Response(null, { status: 204 });
  }

  const body = await request.text();
  const response = await fetch(`${MIXPANEL_API}/${targetPath}`, {
    method: 'POST',
    headers: { 'Content-Type': request.headers.get('Content-Type') ?? '' },
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') ?? '' },
  });
}
```

`/mp/*` 경로로 들어오는 모든 요청을 Mixpanel API로 포워딩합니다. Catch-all 라우트(`[...path]`)를 사용해서 `/mp/track`, `/mp/engage`, `/mp/decide` 등 모든 엔드포인트를 하나의 핸들러로 처리합니다.

## 내부 IP 필터링

분석 데이터에서 가장 신경 쓴 부분은 **내부 트래픽 오염 방지**입니다. 개발자와 운영팀이 매일 서비스를 사용하기 때문에, 이 트래픽이 실제 사용자 데이터에 섞이면 지표가 왜곡됩니다.

```typescript
const INTERNAL_IPS = process.env.MIXPANEL_INTERNAL_IPS?.split(',') ?? [];

function isInternalIp(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-for');
  const clientIp = forwarded?.split(',')[0]?.trim();
  return clientIp ? INTERNAL_IPS.includes(clientIp) : false;
}
```

중요한 점은 **SDK 초기화 요청은 차단하지 않는 것**입니다. Mixpanel SDK가 `/mp/decide`로 설정을 가져오는 요청까지 차단하면 SDK 자체가 동작하지 않습니다. 이벤트 전송 경로(`/mp/track`, `/mp/engage`)만 선별적으로 차단합니다.

```typescript
const TRACKING_PATHS = ['track', 'engage', 'import'];

function isTrackingPath(path: string): boolean {
  return TRACKING_PATHS.some((trackingPath) => path.startsWith(trackingPath));
}
```

## 이벤트 택소노미 설계

분석 시스템에서 이벤트 이름과 속성을 체계 없이 추가하면, 6개월 후에는 어떤 이벤트가 뭘 의미하는지 아무도 모르게 됩니다. 그래서 택소노미(이벤트 분류 체계)를 먼저 설계했습니다.

### 네이밍 컨벤션

```typescript
// mixpanel-taxonomy.ts

// p_ prefix로 프로덕트 이벤트임을 표시
export const EVENTS = {
  PAGE_VIEW: 'p_page_view',
  CTA_CLICK: 'p_cta_click',
  SIGNUP_COMPLETED: 'p_signup_completed',
  LESSON_STARTED: 'p_lesson_started',
  LESSON_COMPLETED: 'p_lesson_completed',
  EXAM_PASSED: 'p_exam_passed',
  CARE_SUBMITTED: 'p_care_submitted',
} as const;
```

`p_` prefix는 Mixpanel이 자동 수집하는 이벤트와 우리가 직접 정의한 이벤트를 구분하기 위해 도입했습니다.

### CTA 추적 중앙화

여러 화면에 흩어진 CTA 버튼의 클릭을 일관되게 추적하기 위해 `trackCTA` 헬퍼를 만들었습니다.

```typescript
export const BUTTON_IDS = {
  HERO_SIGNUP: 'hero_signup',
  LANDING_BOTTOM_CTA: 'landing_bottom_cta',
  DASHBOARD_INSURANCE: 'dashboard_insurance',
  // ...
} as const;

export function trackCTA(buttonId: string) {
  mixpanel.track(EVENTS.CTA_CLICK, { button_id: buttonId });
}
```

`button_id`는 한번 정하면 변경하지 않는 것을 원칙으로 했습니다. 버튼 텍스트나 위치가 바뀌어도 ID는 유지해야 시계열 데이터의 연속성이 보장됩니다.

### UTM 파라미터 연동

유입 경로 분석을 위해 UTM 파라미터를 super property로 등록했습니다.

```typescript
// MixpanelProvider 내부
useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search);
  const utmSource = searchParams.get('utm_source');
  const utmMedium = searchParams.get('utm_medium');
  const utmCampaign = searchParams.get('utm_campaign');

  if (utmSource) {
    mixpanel.register({
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    });
  }
}, []);
```

`register`로 등록하면 이후 모든 이벤트에 UTM 파라미터가 자동으로 포함됩니다. Mixpanel 퍼널 분석에서 "어떤 광고 캠페인에서 유입된 사용자가 가입까지 이어지는가"를 바로 확인할 수 있습니다.

## ADMIN 사용자 제외

내부 IP 필터링 외에, 로그인한 ADMIN 사용자의 이벤트도 제외 처리했습니다. IP가 아닌 사용자 역할 기반이라 재택 근무 등의 상황에서도 동작합니다.

## 결과

- 광고 차단기 환경에서도 이벤트 수집률 유지
- 내부 트래픽 제거로 실제 사용자 지표 신뢰도 확보
- 택소노미 기반으로 팀 전체가 동일한 기준으로 이벤트를 추가
- UTM 연동으로 채널별 전환 퍼널 분석 가능
