---
title: "AI 자동화의 적정선 — 품질 점수 8점이 만든 발행 기준"
description: "키워드 트렌드 기반 AI 블로그 자동 생성 파이프라인에서 자동화 범위와 사람 개입 지점을 정한 과정."
date: "2026-08-13"
tags: ["UX 설계", "인톡 파트너스", "AI"]
published: true
---

## 배경

인톡 파트너스는 보험 설계사 모집 플랫폼이다. SEO 블로그가 유입 채널 중 하나인데, 콘텐츠 생산이 병목이었다. 트렌드 키워드를 조사하고 경쟁사 콘텐츠를 분석하고 글을 작성하는 과정이 반복적이면서도 시간이 많이 들었다.

AI 서비스를 활용해서 이 과정을 자동화하기로 했다. 설계 단계에서 고민한 건 "어디까지 자동화할 것인가"였다.

## 파이프라인 구조

최종적으로 만든 파이프라인은 이렇다:

```typescript
// blog-auto-generator.service.ts
async runAutoGeneration(contentType?: ContentType): Promise<BlogGenerationResult> {
  // 1. AI 주제 추천에서 최우선 주제 조회
  const topicDirective = await this.getTopPriorityTopic(presetKeys);

  // 2. 주제 기반으로 글 생성 (트렌드 데이터 + AI 서비스)
  const generated = await this.generateBlogPost(topicDirective, targetType);

  // 3. 품질 검수 기반 발행 결정
  const autoPublish = this.shouldAutoPublish(
    generated.qualityCheck,
    generated.post.seoScore,
  );

  // 4. 저장 (품질 통과 시 자동 발행, 미달 시 임시저장)
  const result = await this.savePost(generated.post, targetType, autoPublish);
}
```

단계별로 보면:

1. **키워드 트렌드 수집** (자동) — 네이버 키워드 API로 보험 관련 트렌드 데이터를 3개월치 수집한다. 설계사 타겟(보험설계사, 부업, N잡)과 소비자 타겟(보험 정리, 실비, 보장 확인)으로 카테고리가 나뉜다.
2. **경쟁사 분석 + 글 생성** (자동) — 수집된 트렌드와 경쟁사 키워드(메리츠 파트너스, 삼성 N잡 크루, 뱅크샐러드 등)를 외부 AI 서비스에 전달한다. 기존 글의 톤앤매너 샘플과 전체 제목 목록도 함께 보내서 중복을 방지한다.
3. **품질 검수 → 발행 결정** (자동/사람) — AI 서비스가 반환한 품질 점수에 따라 분기한다.
4. **발행 또는 임시저장** — 점수에 따라 자동 처리.

## 발행 기준: 품질 점수 8점

처음에는 완전 자동 발행과 완전 수동 검토, 두 극단 사이에서 고민했다.

**완전 자동**은 리스크가 컸다. 보험 도메인은 숫자 하나, 용어 하나가 틀리면 법적 문제가 될 수 있다. AI가 생성한 콘텐츠를 사람이 검증하지 않고 발행하기엔 정확도 요구가 너무 높았다.

**완전 수동 검토**는 자동화의 의미가 퇴색된다. 매번 사람이 확인하고 발행 버튼을 눌러야 하면, 결국 글 작성 시간만 줄어든 것이지 워크플로우 자체는 자동화되지 않는다.

결국 **품질 점수 기반 분기**를 선택했다:

```typescript
private static readonly AUTO_PUBLISH_THRESHOLD = 8;

shouldAutoPublish(qualityCheck?: QualityCheck, seoScore?: number): boolean {
  // 품질 검수 결과가 없으면 임시저장
  if (!qualityCheck?.overallScore) {
    this.logger.log('품질 검수 결과 없음 → 임시저장');
    return false;
  }
  const score = qualityCheck.overallScore;
  const pass = score >= BlogAutoGeneratorService.AUTO_PUBLISH_THRESHOLD;
  this.logger.log(`품질 점수: ${score}/10 → ${pass ? '자동 발행' : '임시저장'}`);
  return pass;
}
```

8점 이상이면 자동 발행, 미만이면 임시저장으로 빠져서 담당자가 검토한다. 품질 검수 결과 자체가 없으면 무조건 임시저장이다. "검토만 하면 되는 상태"가 아니라, "검토가 필요한 것만 검토하는 상태"를 만들었다.

## 프롬프트 분리

프롬프트를 NestJS 코드에 하드코딩하지 않고 외부 AI 서비스(`PARTNERS_AI_URL`)에서 관리하도록 분리했다. NestJS 쪽에서는 트렌드 데이터, 경쟁사 정보, 기존 글 샘플, 마크다운 가이드라인을 모아서 AI 서비스에 전달하고, AI 서비스가 프롬프트 조합과 생성을 담당한다.

```typescript
const requestData = {
  categories: trendData.categories,
  competitors,
  contentType,
  existingPosts: existingPostSamples,
  existingTitles: allTitles,
  markdownGuidelines: {
    required: [
      '질문형 H2 헤딩 최소 2개 포함 (AEO - Featured Snippet 최적화)',
      '표(테이블) 최소 1개 이상 포함',
      '하단에 "## 자주 묻는 질문" FAQ 섹션 필수 포함',
      '통계/수치에 출처 명시',
    ],
    formatting: { targetLength: '2500-3500자 (FAQ 포함)' },
  },
};
```

이렇게 하면 마크다운 가이드라인이나 SEO 최적화 규칙은 NestJS 코드에서 관리하고 실제 프롬프트 튜닝은 AI 서비스 쪽에서 독립적으로 할 수 있다. 콘텐츠 팀이 톤이나 포맷을 조정할 때 백엔드 배포 없이 AI 서비스만 수정하면 된다.

## 콘텐츠 타입 로테이션

홀수일에는 설계사 타겟, 짝수일에는 소비자 타겟 콘텐츠를 생성한다:

```typescript
private getTodayContentType(): ContentType {
  const today = new Date();
  const dayOfMonth = today.getDate();
  return dayOfMonth % 2 === 0 ? 'consumer' : 'agent';
}
```

단순한 로직이지만 설계사 콘텐츠와 소비자 콘텐츠의 균형을 자동으로 맞춰준다. 설계사 쪽은 "보험설계사 부업", "GA 추천" 같은 키워드를, 소비자 쪽은 "보험 정리", "실비보험 해지" 같은 키워드를 타겟한다. 경쟁사 분석도 타입별로 달라서(설계사: 메리츠 파트너스, 삼성 N잡 / 소비자: 뱅크샐러드, 보험다모아), 같은 파이프라인 안에서 성격이 다른 두 종류의 콘텐츠를 돌릴 수 있다.

## 자동화하지 않은 것

카드뉴스 자동 생성 크론은 만들어두고 비활성화했다. DALL-E 크레딧 비용 대비 효과가 낮아서다. 블로그 텍스트 생성은 비용 대비 효율이 나오지만 이미지 생성은 아직 비용 구조가 맞지 않았다.

## 트레이드오프

8점이라는 임계값은 경험적으로 정했다. 너무 낮추면 품질이 떨어지는 글이 자동 발행되고 너무 높이면 대부분의 글이 임시저장으로 빠져서 수동 검토 부담이 늘어난다. 운영하면서 조정할 수 있도록 `AUTO_PUBLISH_THRESHOLD` 상수로 분리해뒀다.

자동화의 적정선은 "기술적으로 가능한가"가 아니라 "틀렸을 때 비용이 얼마나 큰가"로 결정된다. 블로그 글 하나가 잘못 발행돼도 수정하면 되지만 보험 관련 잘못된 정보가 검색에 노출되면 법적 리스크가 된다. 그래서 품질 점수가 높을 때만 자동 발행하고 확신이 없으면 사람에게 넘기는 구조를 택했다.
