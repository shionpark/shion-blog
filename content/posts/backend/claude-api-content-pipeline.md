---
title: "Claude API로 콘텐츠 자동 생성 파이프라인 구축하기"
description: "보험 교육 플랫폼에서 Claude API를 활용해 교육 콘텐츠, Daily Briefing, 캠페인 분석 리포트를 자동 생성하는 파이프라인을 설계하고 운영한 경험을 정리한다."
date: "2026-08-03"
tags: ["NestJS", "Claude API", "Anthropic", "AI", "콘텐츠 자동화"]
published: true
---

## 들어가며

인톡 파트너스 2.0은 보험 전문가를 위한 AI 교육 플랫폼이다. 보험 상품은 수시로 바뀌고, GA(법인보험대리점) 소속 설계사들에게 최신 정보를 빠르게 전달하는 게 핵심 과제였다. 사람이 매번 콘텐츠를 작성하는 건 스케일이 안 됐고, LLM 기반 자동 생성 파이프라인을 구축하기로 했다.

스택은 Next.js + NestJS + PostgreSQL + Redis. 여기에 Anthropic의 Claude API를 붙여서 세 가지 콘텐츠를 자동 생성하고 있다.

1. **보험 상품별 교육 콘텐츠** — 상품 데이터를 넣으면 설계사 교육용 요약이 나온다
2. **Daily Briefing** — 매일 아침 Slack으로 발송되는 업계 동향 요약
3. **UTM 캠페인 분석 리포트** — 광고 성과 데이터를 분석해 인사이트를 뽑아준다

이 글에서는 Claude API를 NestJS 서비스로 감싸고, 프롬프트를 설계하고, 비용을 관리하기까지의 과정을 정리한다.

---

## 왜 Claude인가

LLM 선택지는 많다. GPT-4o, Gemini, Claude — 각각 장단점이 있다. Claude를 선택한 이유는 크게 세 가지였다.

**첫째, 긴 컨텍스트 윈도우.** 보험 약관 텍스트는 길다. 하나의 상품 약관이 수천 토큰을 차지하는 건 흔한 일이다. Claude Sonnet 계열은 200K 토큰의 입력 윈도우를 지원하는데, 여러 상품을 한 번에 비교 분석할 때 이 여유가 결정적이었다.

**둘째, 구조화된 출력의 안정성.** JSON 모드로 출력을 요청했을 때, Claude는 스키마를 잘 지킨다. 프론트엔드에서 바로 소비할 수 있는 형태로 뽑아야 하는 우리 상황에서, 파싱 실패율이 낮다는 건 큰 장점이었다.

**셋째, 한국어 성능.** 보험 용어가 섞인 한국어 텍스트를 다루는 데 있어 Claude의 한국어 이해도가 상대적으로 높았다. "무배당", "갱신형", "납입면제" 같은 도메인 용어를 문맥에 맞게 사용하는 능력이 좋았다.

---

## NestJS 서비스 설계

### 모듈 구조

Claude API 호출을 하나의 NestJS 모듈로 격리했다. 비즈니스 로직이 특정 LLM에 강결합되지 않도록, 서비스 레이어를 분리하는 게 핵심이었다.

```
src/
├── claude/
│   ├── claude.module.ts
│   ├── claude.service.ts          # API 호출 래퍼
│   ├── claude.config.ts           # 설정값
│   └── prompts/
│       ├── insurance-content.ts   # 보험 교육 콘텐츠 프롬프트
│       ├── daily-briefing.ts      # Daily Briefing 프롬프트
│       └── campaign-report.ts     # 캠페인 분석 프롬프트
├── content/
│   ├── content.module.ts
│   └── content.service.ts         # 콘텐츠 생성 비즈니스 로직
└── briefing/
    ├── briefing.module.ts
    └── briefing.service.ts         # Daily Briefing 스케줄러
```

### Claude 서비스 구현

Anthropic SDK(`@anthropic-ai/sdk`)를 직접 사용했다. 핵심 서비스 코드는 이렇게 생겼다.

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ClaudeService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(ClaudeService.name);
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.getOrThrow<string>("ANTHROPIC_API_KEY"),
    });
    this.model = this.configService.get<string>(
      "CLAUDE_MODEL",
      "claude-sonnet-4-20250514"
    );
  }

  async generateContent(params: {
    systemPrompt: string;
    userMessage: string;
    maxTokens?: number;
  }): Promise<ClaudeResponse> {
    const startTime = Date.now();

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? 4096,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userMessage }],
    });

    const textBlock = response.content.find(
      (block) => block.type === "text"
    );

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `Claude 응답 완료: ${elapsed}ms, ` +
      `입력 ${response.usage.input_tokens} / 출력 ${response.usage.output_tokens} 토큰`
    );

    return {
      text: textBlock?.text ?? "",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: elapsed,
    };
  }
}
```

여기서 중요한 건 토큰 사용량과 지연 시간을 매번 로깅하는 것이다. 나중에 비용 모니터링의 기초 데이터가 된다.

### 직접 호출 vs LangChain

LangChain을 쓸지 고민했다. 결론부터 말하면 직접 호출을 선택했다.

| 기준 | 직접 호출 (Anthropic SDK) | LangChain |
|------|--------------------------|-----------|
| 의존성 크기 | `@anthropic-ai/sdk` 하나 | langchain + 관련 패키지 다수 |
| 추상화 수준 | 낮음 — API 응답을 그대로 다룸 | 높음 — Chain, Agent 등 추상화 |
| 디버깅 | 요청/응답이 투명하게 보임 | 중간 레이어가 많아 추적 어려움 |
| 프롬프트 제어 | 완전한 제어 | 템플릿 시스템 학습 비용 |
| 멀티 프로바이더 전환 | 코드 수정 필요 | 설정 변경으로 가능 |

LangChain이 유용한 경우는 분명 있다. RAG 파이프라인을 빠르게 프로토타이핑하거나, 여러 LLM을 동시에 비교 테스트할 때는 편하다. 하지만 우리 상황에서는 Claude 하나만 쓰고, 프롬프트를 정밀하게 제어해야 했다. 추상화 레이어가 하나 더 끼면 디버깅이 어려워지고, 프롬프트 미세 조정이 번거로워진다. 그래서 SDK 직접 호출을 택했다.

---

## 프롬프트 엔지니어링

### 도메인 컨텍스트 주입

보험 도메인은 전문 용어가 많다. Claude가 일반적인 답변이 아니라 보험 실무에 맞는 답변을 내려면, 시스템 프롬프트에 도메인 컨텍스트를 충분히 넣어줘야 한다.

```typescript
export const INSURANCE_CONTENT_SYSTEM_PROMPT = `
당신은 보험 교육 콘텐츠 전문가입니다.

## 역할
- GA(법인보험대리점) 소속 보험 설계사를 대상으로 교육 콘텐츠를 작성합니다
- 상품의 핵심 특징, 타사 대비 차별점, 판매 포인트를 명확히 전달합니다

## 도메인 용어 규칙
- "무배당": 배당금이 없는 상품 (보험료가 상대적으로 저렴)
- "갱신형": 일정 주기마다 보험료가 재산정되는 구조
- "비갱신형": 최초 가입 시 보험료가 만기까지 유지
- "납입면제": 특정 조건 충족 시 이후 보험료 납입 면제
- "CI보험": Critical Illness, 중대한 질병 진단 시 보험금 지급

## 출력 형식
반드시 아래 JSON 구조로 응답하세요:
{
  "title": "콘텐츠 제목",
  "summary": "3줄 이내 핵심 요약",
  "keyPoints": ["포인트1", "포인트2", ...],
  "comparison": "타사 대비 차별점",
  "salesTip": "판매 시 활용 포인트",
  "caution": "주의사항 또는 민원 예상 포인트"
}
`;
```

프롬프트를 TypeScript 파일로 관리하는 이유가 있다. 첫째, 타입 체크의 혜택을 받는다. 프롬프트 상수를 import할 때 오타를 잡아준다. 둘째, 버전 관리가 된다. git diff로 프롬프트 변경 이력을 추적할 수 있다. 셋째, 동적 프롬프트 생성이 쉽다. 템플릿 리터럴로 변수를 주입할 수 있다.

### 프롬프트 템플릿 함수

고정된 시스템 프롬프트와 달리, 유저 메시지는 매번 달라진다. 템플릿 함수로 분리했다.

```typescript
export function buildInsuranceContentPrompt(params: {
  productName: string;
  insurer: string;
  category: string;
  features: string[];
  rawClause: string;
}): string {
  const featureList = params.features
    .map((feature) => `- ${feature}`)
    .join("\n");

  return `
다음 보험 상품에 대한 교육 콘텐츠를 작성해주세요.

## 상품 정보
- 상품명: ${params.productName}
- 보험사: ${params.insurer}
- 분류: ${params.category}
- 주요 특징:
${featureList}

## 약관 원문 (발췌)
${params.rawClause}

위 정보를 바탕으로 설계사가 고객에게 설명할 수 있는 교육 콘텐츠를 JSON 형식으로 작성해주세요.
  `.trim();
}
```

### 토큰 절약을 위한 프롬프트 최적화

Claude API 비용은 토큰 수에 비례한다. 특히 입력 토큰을 줄이는 게 효과적인데, 몇 가지 전략을 적용했다.

1. **약관 원문 전처리** — 전체 약관을 넣지 않고, 관련 섹션만 추출해서 넣는다. 정규식으로 목차와 해당 항목만 잘라낸다.
2. **반복 구조 압축** — 여러 상품을 비교할 때, 공통 필드는 한 번만 설명하고 차이점만 나열한다.
3. **시스템 프롬프트 캐싱** — 동일한 시스템 프롬프트를 반복 호출할 때는 Anthropic의 prompt caching을 활용한다. 캐시 히트 시 입력 토큰 비용이 90% 절감된다.

```typescript
// 프롬프트 캐싱 적용 예시
async generateWithCache(params: {
  systemPrompt: string;
  userMessage: string;
}): Promise<ClaudeResponse> {
  const response = await this.client.messages.create({
    model: this.model,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: params.systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: params.userMessage }],
  });

  // 캐시 히트 여부 확인
  const cacheHit = response.usage.cache_read_input_tokens ?? 0;
  if (cacheHit > 0) {
    this.logger.log(`프롬프트 캐시 히트: ${cacheHit} 토큰 절약`);
  }

  return this.parseResponse(response);
}
```

---

## 구조화된 출력

### JSON 모드 활용

프론트엔드에서 바로 렌더링할 수 있는 구조화된 데이터가 필요했다. Claude에게 JSON 출력을 요청하는 방법은 두 가지가 있다.

**방법 1: 시스템 프롬프트에 JSON 스키마 명시** — 위의 프롬프트 예시처럼, 출력 형식을 직접 지정한다. 간단하고 대부분의 경우 잘 동작한다.

**방법 2: tool use를 JSON 생성기로 활용** — 함수 호출(tool use) 기능을 쓰되, 실제로 함수를 실행하지 않고 구조화된 파라미터만 추출하는 패턴이다. 스키마 준수율이 더 높다.

```typescript
async generateStructuredContent(
  productData: ProductData
): Promise<InsuranceContent> {
  const response = await this.client.messages.create({
    model: this.model,
    max_tokens: 4096,
    system: INSURANCE_CONTENT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildInsuranceContentPrompt(productData),
      },
    ],
    tools: [
      {
        name: "create_insurance_content",
        description: "보험 교육 콘텐츠를 구조화된 형태로 생성한다",
        input_schema: {
          type: "object" as const,
          properties: {
            title: { type: "string", description: "콘텐츠 제목" },
            summary: { type: "string", description: "3줄 이내 요약" },
            keyPoints: {
              type: "array",
              items: { type: "string" },
              description: "핵심 포인트 목록",
            },
            comparison: { type: "string", description: "타사 대비 차별점" },
            salesTip: { type: "string", description: "판매 활용 포인트" },
            caution: { type: "string", description: "주의사항" },
          },
          required: [
            "title", "summary", "keyPoints",
            "comparison", "salesTip", "caution",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "create_insurance_content" },
  });

  const toolBlock = response.content.find(
    (block) => block.type === "tool_use"
  );
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("구조화된 출력 생성 실패");
  }

  return toolBlock.input as InsuranceContent;
}
```

tool use 방식의 장점은 JSON 파싱 실패가 거의 없다는 것이다. Claude가 tool call 형태로 응답할 때는 내부적으로 스키마 검증을 거치기 때문에, 필드 누락이나 타입 불일치가 드물다.

---

## 캐싱 + 비용 관리

### Redis 캐싱

동일한 상품에 대해 매번 Claude를 호출할 필요는 없다. 생성된 콘텐츠를 Redis에 캐싱했다.

```typescript
@Injectable()
export class ContentService {
  private readonly CACHE_PREFIX = "content:insurance";
  private readonly CACHE_TTL_SECONDS = 60 * 60 * 24; // 24시간

  constructor(
    private readonly claudeService: ClaudeService,
    private readonly redis: RedisService,
  ) {}

  async getInsuranceContent(
    productId: string
  ): Promise<InsuranceContent> {
    const cacheKey = `${this.CACHE_PREFIX}:${productId}`;

    // 캐시 확인
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as InsuranceContent;
    }

    // 캐시 미스 → Claude 호출
    const productData = await this.fetchProductData(productId);
    const content =
      await this.claudeService.generateStructuredContent(productData);

    // 캐시 저장
    await this.redis.set(
      cacheKey,
      JSON.stringify(content),
      "EX",
      this.CACHE_TTL_SECONDS
    );

    return content;
  }
}
```

TTL은 24시간으로 설정했다. 보험 상품 정보가 하루 안에 바뀌는 경우는 거의 없고, 상품 정보가 업데이트되면 해당 캐시 키를 명시적으로 삭제하는 로직을 별도로 넣었다.

### 에러 핸들링: Rate Limit과 Fallback

Claude API는 rate limit이 있다. 분당 요청 수, 분당 토큰 수 제한에 걸릴 수 있다. 단순히 try/catch로 잡는 것보다, 재시도 전략을 체계적으로 가져가는 게 중요하다.

```typescript
async generateWithRetry(
  params: GenerateParams,
  maxRetries = 3
): Promise<ClaudeResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.generateContent(params);
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        this.logger.warn(
          `Rate limit 도달, ${backoffMs}ms 후 재시도 (${attempt}/${maxRetries})`
        );
        await this.sleep(backoffMs);
        continue;
      }

      if (error instanceof Anthropic.APIConnectionError) {
        this.logger.warn(
          `API 연결 실패, 재시도 (${attempt}/${maxRetries})`
        );
        await this.sleep(2000);
        continue;
      }

      // 그 외 에러는 즉시 throw
      throw error;
    }
  }

  throw new Error(`Claude API 호출 실패: ${maxRetries}회 재시도 초과`);
}

private sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

exponential backoff를 적용했다. 첫 번째 재시도는 2초, 두 번째는 4초, 세 번째는 8초 — 최대 30초까지. rate limit 에러는 재시도하면 대부분 해결되지만, 연결 에러가 반복되면 인프라 문제일 수 있으니 알림을 보내는 로직도 별도로 추가했다.

### 비용 모니터링

토큰 사용량을 DB에 적재해서 일별/기능별 비용을 추적한다.

```typescript
@Injectable()
export class TokenUsageTracker {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async record(usage: {
    feature: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
    latencyMs: number;
  }): Promise<void> {
    await this.prisma.tokenUsageLog.create({
      data: {
        feature: usage.feature,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        model: usage.model,
        latencyMs: usage.latencyMs,
        estimatedCostUsd: this.calculateCost(usage),
        createdAt: new Date(),
      },
    });
  }

  private calculateCost(usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
  }): number {
    // Claude Sonnet 4 기준 (2026-08 시점)
    const INPUT_COST_PER_MILLION = 3.0;
    const OUTPUT_COST_PER_MILLION = 15.0;

    const inputCost =
      (usage.inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
    const outputCost =
      (usage.outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

    return inputCost + outputCost;
  }
}
```

이 데이터를 기반으로 주간 비용 리포트를 뽑는다. 어느 기능이 토큰을 많이 쓰는지, 평균 응답 시간은 어떤지 — 이런 지표가 프롬프트 최적화의 출발점이 된다.

---

## Daily Briefing 자동화

Daily Briefing은 LaunchAgent 기반 cron으로 매일 아침 실행되어, 생성된 브리핑을 Slack으로 발송하는 구조다.

```typescript
@Injectable()
export class BriefingService {
  constructor(
    private readonly claudeService: ClaudeService,
    private readonly slackService: SlackService,
    private readonly dataSource: BriefingDataSource,
  ) {}

  async generateAndSendDailyBriefing(): Promise<void> {
    // 1. 원천 데이터 수집 (전일 실적, 업계 뉴스 등)
    const rawData = await this.dataSource.collectDailyData();

    // 2. Claude로 브리핑 생성
    const briefing = await this.claudeService.generateContent({
      systemPrompt: DAILY_BRIEFING_SYSTEM_PROMPT,
      userMessage: this.formatBriefingInput(rawData),
      maxTokens: 2048,
    });

    // 3. Slack 발송
    await this.slackService.sendBriefing({
      channel: "#daily-briefing",
      content: briefing.text,
    });
  }

  private formatBriefingInput(data: DailyData): string {
    return `
## 전일 실적 요약
- 신규 가입: ${data.newSignups}건
- 활성 사용자: ${data.activeUsers}명
- 교육 완료: ${data.completedCourses}건

## 주요 이벤트
${data.events.map((event) => `- ${event}`).join("\n")}

위 데이터를 바탕으로 오늘의 Daily Briefing을 작성해주세요.
    `.trim();
  }
}
```

핵심은 Claude에게 넘기는 데이터를 최소한으로 정리하는 것이다. 원천 데이터가 아무리 많아도, LLM이 소화할 수 있는 형태로 전처리한 뒤 전달한다. 그래야 토큰도 아끼고, 출력 품질도 올라간다.

---

## 교훈

6개월간 Claude API 파이프라인을 운영하면서 배운 것들을 정리한다.

### 1. 프롬프트는 코드다

프롬프트를 문자열 상수가 아니라 코드처럼 관리해야 한다. 버전 관리, 코드 리뷰, 테스트 — 일반 코드에 적용하는 모든 프랙티스가 프롬프트에도 필요하다. 프롬프트 하나 바꿨더니 다른 케이스에서 출력이 깨지는 경험을 한 뒤로, 프롬프트 변경 시 최소 5개의 샘플 입력으로 회귀 테스트를 돌리고 있다.

### 2. 추상화는 필요할 때

처음부터 LangChain 같은 프레임워크를 도입할 필요는 없다. 직접 호출로 시작해서, 복잡도가 올라가면 그때 추상화를 도입해도 늦지 않다. 오히려 초기에 추상화 레이어를 끼우면 LLM의 동작을 이해하기 어려워진다. 프롬프트 미세 조정, 토큰 최적화 — 이런 건 API 응답을 직접 들여다봐야 감이 온다.

### 3. 캐싱은 필수, TTL 설계는 신중하게

LLM 호출은 느리고 비싸다. 캐싱 없이 운영하면 비용이 선형으로 늘어난다. 다만 TTL을 너무 길게 잡으면 데이터가 바뀌었는데 오래된 콘텐츠가 서빙되고, 너무 짧으면 캐시 효과가 없다. 우리는 "원천 데이터 변경 시 캐시 무효화 + 기본 24시간 TTL" 조합으로 운영하고 있다.

### 4. 비용 모니터링은 Day 1부터

"나중에 하자"라고 미루면, 어느 날 갑자기 청구서를 보고 놀라게 된다. 토큰 사용량 로깅은 첫날부터 넣어둬야 한다. 기능별 비용 분석, 이상치 탐지 — 이런 건 데이터가 쌓여야 가능하다. 실제로 특정 프롬프트가 불필요하게 긴 약관 원문을 매번 전송하고 있던 걸 비용 분석을 통해 발견하고, 전처리 로직을 추가해 월 비용을 40% 줄인 적이 있다.

### 5. 에러는 조용히 실패하면 안 된다

LLM 응답이 예상과 다를 때 — JSON 파싱 실패, 필수 필드 누락, 빈 응답 — 이런 경우를 모두 핸들링해야 한다. 특히 자동화 파이프라인에서는 사람이 매번 확인하지 않으므로, 실패 시 Slack 알림을 보내고, fallback 콘텐츠를 서빙하는 구조가 필요하다.

---

## 마치며

Claude API로 콘텐츠 파이프라인을 구축하는 건 기술적으로 어렵지 않다. Anthropic SDK가 잘 만들어져 있어서, API 호출 자체는 단순하다. 진짜 어려운 건 프롬프트 설계와 운영이다. 도메인에 맞는 프롬프트를 만들고, 출력 품질을 안정적으로 유지하고, 비용을 관리하면서 스케일하는 것 — 이 부분이 실무에서 시간을 가장 많이 쓰는 영역이다.

LLM은 도구다. 잘 쓰면 사람 몇 명이 하던 일을 자동화할 수 있지만, 설계 없이 쓰면 비용만 나가고 품질은 들쑥날쑥해진다. 이 글이 Claude API를 프로덕션에 도입하려는 분들에게 참고가 되었으면 한다.
