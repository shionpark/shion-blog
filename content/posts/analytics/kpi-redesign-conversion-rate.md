---
title: "팀 KR을 데이터로 바꾸다 — 절대 건수에서 전환율 기반으로"
description: "주당 가입 100명이라는 비현실적 KR을 퍼널 데이터로 분해하고, 전환율 기반 KR로 재설계한 과정."
date: "2026-08-24"
tags: ["데이터 분석", "인톡 파트너스", "KPI"]
published: true
---

## 배경

인톡 파트너스 팀의 분기 OKR에 이런 KR이 있었다:

> KR: 주당 가입 100명 달성

처음엔 당연한 목표처럼 보였다. 하지만 실제 데이터를 들여다보니 문제가 보였다.

GA4에서 랜딩페이지 UV(고유 방문자)를 뽑아봤다. 주당 평균 약 500명이었다. 주당 가입 100명을 달성하려면 랜딩 → 가입 전환율이 20%여야 한다. SaaS 랜딩페이지의 평균 전환율이 3~5%인 점을 감안하면, 20%는 현실적으로 불가능한 수치였다.

이 목표가 비현실적이라는 건 감으로도 알 수 있었다. 하지만 팀에서 "그럼 얼마가 맞는데?"라는 질문에 데이터로 답하지 못하면 목표를 바꿀 근거가 없었다.

## 문제를 데이터로 분해하기

퍼널 데이터를 수집하기 시작했다. 기존에는 GA4로 페이지뷰와 가입 수만 보고 있었는데, 중간 단계를 측정하고 있지 않았다.

Mixpanel에 퍼널 이벤트를 심어서 단계별 전환율을 측정했다:

```typescript
// partners-fe: analytics/events.ts
const FUNNEL_EVENTS = {
  // 1단계: 랜딩 도달
  LANDING_VIEW: 'landing_page_view',
  // 2단계: 가입 시작 (가입 폼 진입)
  SIGNUP_START: 'signup_form_open',
  // 3단계: 가입 완료
  SIGNUP_COMPLETE: 'signup_complete',
  // 4단계: 학습 시작 (첫 강의 수강)
  LEARNING_START: 'first_lesson_start',
  // 5단계: 케어 연동 (GA 매칭 신청)
  CARE_CONNECT: 'care_connect_request',
} as const;

type FunnelEventName = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];
```

2주간 데이터를 수집한 결과:

| 퍼널 단계 | 주간 평균 | 전환율 |
|-----------|----------|--------|
| 랜딩 UV | 520명 | — |
| 가입 시작 | 85명 | 16.3% |
| 가입 완료 | 42명 | 49.4% |
| 학습 시작 | 28명 | 66.7% |
| 케어 연동 | 11명 | 39.3% |

랜딩 → 가입 완료 전환율은 8.1%였다. 업계 평균보다 높은 편이지만, 주당 100명에는 한참 못 미친다. 랜딩 UV 자체를 1,200명 이상으로 끌어올리지 않는 한 불가능한 목표였다.

## 채널별 유입 분석

문제를 더 파고들기 위해 채널별 유입 비중도 분석했다:

```typescript
// partners-be: analytics/channel-report.service.ts
async getChannelBreakdown(startDate: Date, endDate: Date) {
  const utmData = await this.prisma.userUtm.groupBy({
    by: ['utmSource'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const total = utmData.reduce((sum, row) => sum + row._count.id, 0);

  return utmData.map((row) => ({
    source: row.utmSource ?? 'direct',
    count: row._count.id,
    ratio: ((row._count.id / total) * 100).toFixed(1),
  }));
}
```

결과:

| 채널 | 유입 비중 | 가입 전환율 |
|------|----------|------------|
| Meta 광고 | 45% | 6.2% |
| 네이버 검색 | 25% | 12.8% |
| 직접 유입 | 15% | 18.3% |
| 추천 | 10% | 22.1% |
| 기타 | 5% | 4.5% |

Meta 광고가 유입의 절반 가까이를 차지하지만, 전환율은 가장 낮았다. 추천 유입이 전환율이 가장 높았지만 볼륨이 작았다. 채널별로 전환율 차이가 크다는 건, 전체 가입 수보다 채널별 전환율을 개선하는 게 더 효과적이라는 의미다.

## KR 재설계

이 데이터를 가지고 팀 미팅에서 KR 재설계를 제안했다. 핵심 논리는 이랬다:

1. 절대 건수(주당 100명)는 유입량에 종속된다. 유입량은 광고 예산에 종속된다. 개발팀이 통제할 수 없는 변수다.
2. 전환율은 제품 개선으로 올릴 수 있다. 개발팀이 직접 영향을 줄 수 있는 지표다.
3. 퍼널 단계별로 KR을 쪼개면, 어디를 개선해야 하는지 명확해진다.

재설계한 KR:

```text
[기존]
KR: 주당 가입 100명

[변경]
KR1: 랜딩 → 가입 전환율 12% (현재 8.1%)
KR2: 가입 → 학습시작 전환율 75% (현재 66.7%)
KR3: 학습시작 → 케어연동 전환율 50% (현재 39.3%)
```

각 KR에 현재 수치와 목표 수치가 있으니, 개선 폭도 명확하다. KR1은 랜딩페이지 UX 개선으로, KR2는 온보딩 흐름 개선으로, KR3는 케어 연동 가치 전달 강화로 풀 수 있었다.

## Mixpanel 퍼널 리포트 설정

KR을 바꾸면 측정 체계도 바꿔야 한다. Mixpanel에 퍼널 리포트를 설정해서 팀 전체가 실시간으로 전환율을 볼 수 있게 했다.

이벤트 택소노미 설계가 핵심이었다. 이벤트 이름이 일관되지 않으면 분석이 깨진다:

```typescript
// partners-fe: analytics/taxonomy.ts

// 이벤트 네이밍 규칙:
// {object}_{action} 형식, snake_case
// object: 사용자가 상호작용하는 대상
// action: 사용자가 수행한 행동

const EVENT_TAXONOMY = {
  // 인증 퍼널
  signup_form_open: {
    description: '가입 폼 진입',
    properties: ['referrer', 'utm_source'],
  },
  signup_form_submit: {
    description: '가입 폼 제출',
    properties: ['method'],  // 'email' | 'kakao' | 'google'
  },
  signup_complete: {
    description: '가입 완료 (이메일 인증 포함)',
    properties: ['method', 'time_to_complete_seconds'],
  },

  // 학습 퍼널
  lesson_view: {
    description: '강의 상세 진입',
    properties: ['lesson_id', 'lesson_title', 'category'],
  },
  lesson_start: {
    description: '강의 수강 시작 (영상 재생)',
    properties: ['lesson_id', 'is_first_lesson'],
  },
  lesson_complete: {
    description: '강의 수강 완료',
    properties: ['lesson_id', 'duration_seconds'],
  },

  // 전환 퍼널
  care_connect_view: {
    description: '케어 연동 페이지 진입',
    properties: ['entry_point'],  // 'sidebar' | 'lesson_end' | 'dashboard'
  },
  care_connect_request: {
    description: '케어 연동 신청',
    properties: ['region', 'work_type'],
  },
} as const;
```

이벤트에 붙이는 속성(properties)도 규칙을 정했다. 모든 이벤트에 공통으로 `user_id`, `session_id`, `timestamp`는 Mixpanel SDK가 자동 수집하고, 비즈니스 속성만 수동으로 추가한다.

```typescript
// partners-fe: analytics/track.ts
import mixpanel from 'mixpanel-browser';

type TrackableEvent = keyof typeof EVENT_TAXONOMY;

function trackEvent<T extends TrackableEvent>(
  eventName: T,
  properties: Record<string, string | number | boolean>
) {
  // 개발 환경에서는 콘솔 출력만
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${eventName}`, properties);
    return;
  }

  mixpanel.track(eventName, {
    ...properties,
    platform: 'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION,
  });
}
```

## 퍼널 분석 쿼리

주간 리포트를 자동으로 뽑기 위해, Mixpanel JQL(쿼리 언어) 대신 서버 사이드에서 자체 퍼널 분석을 구축했다. Mixpanel 데이터를 신뢰하되, 서버 DB의 실제 데이터와 교차 검증하기 위해서다:

```typescript
// partners-be: analytics/funnel-report.service.ts
async getWeeklyFunnelReport(weekStart: Date) {
  const weekEnd = addDays(weekStart, 7);

  // 1단계: 가입 완료 수
  const signupCount = await this.prisma.user.count({
    where: {
      createdAt: { gte: weekStart, lt: weekEnd },
      emailVerified: true,
    },
  });

  // 2단계: 학습 시작 수 (첫 강의 수강)
  const learningStartCount = await this.prisma.lessonProgress.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: weekStart, lt: weekEnd },
      user: {
        createdAt: { gte: weekStart, lt: weekEnd },
      },
    },
    _min: { createdAt: true },
  });

  // 3단계: 케어 연동 수
  const careConnectCount = await this.prisma.careApplication.count({
    where: {
      createdAt: { gte: weekStart, lt: weekEnd },
      user: {
        createdAt: { gte: weekStart, lt: weekEnd },
      },
    },
  });

  return {
    period: { start: weekStart, end: weekEnd },
    funnel: [
      { step: 'signup', count: signupCount },
      { step: 'learning_start', count: learningStartCount.length },
      { step: 'care_connect', count: careConnectCount },
    ],
    conversionRates: {
      signupToLearning: calculateRate(learningStartCount.length, signupCount),
      learningToCare: calculateRate(careConnectCount, learningStartCount.length),
    },
  };
}

function calculateRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '0.0';
  return ((numerator / denominator) * 100).toFixed(1);
}
```

이 리포트를 매주 월요일 슬랙 채널에 자동 발송하도록 스케줄링했다. 팀원 4명이 같은 데이터를 보고 논의하는 구조를 만들었다.

## 결과

KR을 전환율 기반으로 바꾼 후 달라진 것:

1. **팀의 초점이 바뀌었다.** "이번 주 가입 몇 명이야?"가 아니라 "랜딩→가입 전환율이 왜 떨어졌지?"로 대화가 바뀌었다. 문제의 원인을 퍼널 단계에서 찾을 수 있게 됐다.

2. **개선 우선순위가 명확해졌다.** 가입→학습시작(66.7%)보다 학습시작→케어연동(39.3%)이 더 낮으니, 케어 연동 가치 전달을 먼저 개선해야 한다는 결론이 자연스럽게 나왔다.

3. **광고 예산 논의가 달라졌다.** "가입이 부족하니 광고비를 늘리자"가 아니라, "Meta 광고의 전환율(6.2%)을 먼저 개선하고, 추천 채널(22.1%)을 키우자"는 방향으로 바뀌었다.

한 분기 후 전환율 변화:

- 랜딩 → 가입: 8.1% → 14.2% (비회원 커넥트 폼 도입 효과 포함)
- 가입 → 학습시작: 66.7% → 73.8%
- 학습시작 → 케어연동: 39.3% → 52.1%

## 마치며

절대 건수 KR이 문제인 이유는, 달성 여부가 팀의 노력이 아니라 외부 변수(유입량)에 의해 결정되기 때문이다. 전환율 기반 KR은 팀이 통제할 수 있는 영역에 집중하게 만든다.

이 경험에서 배운 건, 목표를 바꾸려면 데이터가 있어야 한다는 것이다. "이 목표가 비현실적입니다"라고 말하는 것과 "현재 전환율 8.1%에서 주당 100명을 달성하려면 UV가 1,235명 필요합니다. 현재 UV는 520명입니다"라고 말하는 건 설득력이 다르다.

개발자가 KPI 논의에 참여하는 게 어색할 수 있지만, 데이터를 수집하고 분석하는 건 결국 엔지니어의 영역이다. 특히 4인 스타트업에서는 "이건 내 일이 아니다"라고 선을 긋기 어렵다. 데이터를 근거로 팀의 방향을 바꾼 경험은, 코드를 작성하는 것 이상으로 임팩트가 컸다.
