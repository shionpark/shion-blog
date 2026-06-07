---
title: "3단계 UTM 매칭 알고리즘으로 광고 성과를 추적한 경험"
description: "감에 의존하던 마케팅 의사결정을 데이터 기반으로 전환하기 위해 UTM 캠페인 분석 엔진을 설계하고 구축한 과정을 공유합니다."
date: "2026-06-07"
tags: ["NestJS", "UTM", "Meta Ads", "분석"]
published: true
---

## 문제 상황

인톡 파트너스에서 광고 캠페인을 운영하고 있었지만, 실제 전환 성과를 추적할 수 있는 분석 체계가 없었습니다. 어떤 채널에서 유입된 사용자가 가입까지 이어지는지, 광고비 대비 ROI가 어떤지를 알 수 없었습니다.

마케팅 의사결정이 감에 의존하고 있었고, 이를 데이터 기반으로 전환할 필요가 있었습니다.

## 설계: 3단계 UTM 매칭 알고리즘

UTM 파라미터와 실제 전환 데이터를 연결하는 것이 핵심 과제였습니다. 단순한 정확 매칭만으로는 다양한 유입 경로를 커버할 수 없어서, 3단계 매칭 알고리즘을 설계했습니다.

1. **정확 매칭**: `utm_source`, `utm_medium`, `utm_campaign`이 모두 일치하는 경우
2. **부분 매칭**: source와 medium만 일치하는 경우 (campaign이 다를 때)
3. **퍼지 매칭**: source만 일치하거나, referrer 기반 추정

```typescript
function matchUtmToCampaign(utmData: UtmData, campaigns: Campaign[]) {
  // 1단계: 정확 매칭
  const exactMatch = campaigns.find(
    (campaign) =>
      campaign.source === utmData.source &&
      campaign.medium === utmData.medium &&
      campaign.name === utmData.campaign
  );
  if (exactMatch) return { match: exactMatch, confidence: "exact" };

  // 2단계: 부분 매칭
  const partialMatch = campaigns.find(
    (campaign) =>
      campaign.source === utmData.source &&
      campaign.medium === utmData.medium
  );
  if (partialMatch) return { match: partialMatch, confidence: "partial" };

  // 3단계: 퍼지 매칭
  const fuzzyMatch = campaigns.find(
    (campaign) => campaign.source === utmData.source
  );
  if (fuzzyMatch) return { match: fuzzyMatch, confidence: "fuzzy" };

  return { match: null, confidence: "none" };
}
```

## Meta Ads API 연동

Meta Ads API에서 광고 캠페인 데이터를 가져와 실제 전환 데이터와 연결했습니다. 광고비, 노출수, 클릭수와 실제 가입 전환을 하나의 ROI 분석 엔드포인트로 통합했습니다.

## Daily Briefing 자동화

매일 10:00에 전일 KPI, 채널별 유입, 광고 성과를 Slack으로 자동 발송하는 Daily Briefing을 구현했습니다. NestJS Scheduler를 활용해 데이터를 집계하고, 포맷팅된 메시지를 Slack Webhook으로 전송합니다.

## 결과

- 광고 캠페인별 실제 전환율과 ROI를 정량적으로 비교할 수 있게 됨
- 마케팅팀이 매일 데이터를 확인하고 캠페인을 조정하는 루틴이 생김
- GA4, Mixpanel 트래킹 통합과 내부 IP 차단으로 데이터 품질 확보
