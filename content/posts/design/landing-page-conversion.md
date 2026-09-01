---
title: "전환율 중심 랜딩페이지 설계 — 데이터로 CTA를 실험하다"
description: "정보 나열 중심이던 랜딩페이지를 전환 중심으로 리디자인하고, 수입 시뮬레이터와 이탈 방지 팝업으로 전환율을 개선한 과정."
date: "2026-08-24"
tags: ["UX 설계", "인톡 파트너스", "전환 최적화", "랜딩페이지"]
published: true
---

## 배경

인톡 파트너스의 랜딩페이지는 정보 나열 중심이었다. "보험설계사 육성 플랫폼입니다", "6주 커리큘럼", "GA 매칭 지원" 같은 텍스트가 순서대로 나열되어 있었고, CTA(Call to Action)는 페이지 최하단에 "가입하기" 버튼 하나뿐이었다.

GA4 스크롤 깊이 데이터를 보니, 사용자의 70%가 첫 번째 섹션(Hero)만 보고 이탈했다. 페이지 하단 CTA까지 도달하는 사용자는 12%에 불과했다. CTA가 보이지도 않는데 전환이 될 리 없었다.

리디자인의 목표는 세 가지였다:

1. 첫 화면(Hero)에서 핵심 가치를 전달하고 CTA를 배치한다
2. 스크롤 과정에서 전환 동기를 강화하는 인터랙티브 요소를 넣는다
3. 이탈 시점에 마지막 전환 기회를 제공한다

## HeroSection 리디자인

기존 Hero는 "보험설계사의 새로운 시작, 인톡 파트너스"라는 슬로건과 일러스트레이션이 전부였다. 무슨 서비스인지 알겠지만, 왜 지금 가입해야 하는지는 알 수 없었다.

리디자인한 Hero의 구조:

```typescript
// partners-fe: components/landing/HeroSection.tsx
function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* 왼쪽: 가치 제안 */}
        <div className="flex flex-col justify-center gap-6">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
            6주 만에 보험설계사로
            <br />
            <span className="text-primary">첫 수입을 만들어보세요</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            전업·부업 모두 가능. GA 매칭부터 실전 교육까지
            <br />
            인톡 파트너스가 함께합니다.
          </p>
          <div className="flex gap-3">
            <PrimaryCTA />
            <SecondaryCTA />
          </div>
          <SocialProofBadge />
        </div>

        {/* 오른쪽: 수입 시뮬레이터 프리뷰 */}
        <div className="hidden lg:flex items-center justify-center">
          <IncomeSimulatorPreview />
        </div>
      </div>
    </section>
  );
}
```

핵심 변경 세 가지:

- **헤드라인**: "보험설계사의 새로운 시작" → "6주 만에 보험설계사로 첫 수입을 만들어보세요". 기간과 결과를 구체적으로 명시했다.
- **CTA 이원화**: Primary CTA("무료로 시작하기")와 Secondary CTA("커리큘럼 미리보기")를 나눴다. 가입 의지가 강한 사용자와 아직 탐색 중인 사용자를 모두 잡기 위해서다.
- **Social Proof 배지**: "현재 342명이 학습 중" 같은 실시간 수치를 Hero에 배치했다. 신뢰를 첫 화면에서 확보한다.

```typescript
// partners-fe: components/landing/PrimaryCTA.tsx
function PrimaryCTA() {
  const handleClick = () => {
    trackEvent('landing_cta_click', {
      cta_type: 'primary',
      cta_text: '무료로 시작하기',
      position: 'hero',
    });
  };

  return (
    <Link href="/signup" onClick={handleClick}>
      <Button size="lg" className="text-lg px-8 py-6">
        무료로 시작하기
      </Button>
    </Link>
  );
}
```

모든 CTA에 Mixpanel 이벤트를 심어서, 어떤 위치의 어떤 CTA가 클릭되는지 추적했다.

## 수입 시뮬레이터

랜딩페이지에서 가장 임팩트가 컸던 요소다. 사용자가 예상 근무 시간과 형태를 입력하면, 예상 월 수입을 계산해서 보여준다.

```typescript
// partners-fe: components/landing/IncomeSimulator.tsx
type SimulatorInput = {
  workType: 'FULL_TIME' | 'PART_TIME';
  hoursPerWeek: number;
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED';
};

function calculateEstimatedIncome(input: SimulatorInput): {
  minIncome: number;
  maxIncome: number;
  averageIncome: number;
} {
  // 업계 평균 데이터 기반 계산
  const baseRates: Record<string, number> = {
    BEGINNER: 150_000,       // 초보: 주당 15만원 기준
    INTERMEDIATE: 280_000,   // 중급: 주당 28만원 기준
    EXPERIENCED: 450_000,    // 경험자: 주당 45만원 기준
  };

  const baseRate = baseRates[input.experienceLevel];
  const weeklyRate = baseRate * (input.hoursPerWeek / 40);
  const monthlyBase = weeklyRate * 4;

  // 전업/부업 보정
  const workTypeMultiplier = input.workType === 'FULL_TIME' ? 1.0 : 0.6;
  const adjusted = monthlyBase * workTypeMultiplier;

  return {
    minIncome: Math.round(adjusted * 0.7),
    maxIncome: Math.round(adjusted * 1.4),
    averageIncome: Math.round(adjusted),
  };
}
```

시뮬레이터를 사용한 사용자의 가입 전환율은 시뮬레이터를 사용하지 않은 사용자 대비 2.4배 높았다. "내가 벌 수 있는 금액"을 직접 계산해본 경험이 전환 동기를 만든 것이다.

단, 수입 예측이 과장되면 안 된다. 실제 달성 가능한 범위를 보수적으로 잡되, 최소~최대 범위로 보여줘서 기대치를 관리했다. 하단에 "실제 수입은 개인 역량과 활동량에 따라 달라질 수 있습니다"라는 면책 문구도 추가했다.

## Social Proof 섹션

Hero 아래에 세 가지 Social Proof 요소를 배치했다:

1. **파트너 GA 로고**: 협업 중인 GA(보험대리점) 로고를 가로 슬라이드로 배치
2. **실제 수강생 후기**: 이름(가명), 전업/부업 여부, 학습 후 변화를 카드 형태로 3개 노출
3. **6주 학습 로드맵**: 주차별 커리큘럼을 타임라인 UI로 시각화

```typescript
// partners-fe: components/landing/TestimonialCard.tsx
type Testimonial = {
  name: string;
  workType: string;
  quote: string;
  result: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: '김○○',
    workType: '부업 (직장인)',
    quote: '퇴근 후 2시간씩 학습했는데, 6주 후 첫 계약을 체결했습니다.',
    result: '월 부수입 120만원 달성',
  },
  {
    name: '이○○',
    workType: '전업 전환',
    quote: 'GA 매칭이 가장 큰 도움이었어요. 혼자였으면 어디서부터 시작할지 몰랐을 거예요.',
    result: '전업 3개월차, 월 평균 280만원',
  },
  {
    name: '박○○',
    workType: '부업 (프리랜서)',
    quote: '커리큘럼이 실전 위주라 바로 활용할 수 있었어요.',
    result: '월 부수입 80만원 달성',
  },
];
```

후기는 실제 수강생 인터뷰를 기반으로 재구성했다. 과장 없이 현실적인 수치를 사용하되, 다양한 배경(전업/부업/프리랜서)의 사례를 포함해서 "나와 비슷한 사람도 가능하구나"라는 인식을 만들었다.

## 비회원 커넥트 신청 폼

랜딩페이지 중간에 비회원 커넥트 신청 폼을 배치했다. 가입 없이 이름, 전화번호, 관심 지역만 입력하면 GA 매칭 신청이 가능하다. 이 구조의 상세 설계는 별도 글([비회원 전환 퍼널 설계](/posts/design/guest-conversion-funnel))에서 다룬다.

핵심은 "가입하기" 대신 "30초 만에 신청하기"라는 CTA 문구를 사용한 것이다. 사용자에게 기대하는 행동의 비용을 명시적으로 낮춰 보여줬다.

```typescript
// partners-fe: components/landing/InlineConnectForm.tsx
function InlineConnectForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold">신청이 완료되었습니다</h3>
        <p className="text-muted-foreground mt-2">
          회원가입하시면 학습 콘텐츠와 상세 매칭 결과를 확인할 수 있습니다.
        </p>
        <Link href="/signup">
          <Button className="mt-4">회원가입하고 더 알아보기</Button>
        </Link>
      </div>
    );
  }

  return (
    <section className="bg-muted/50 py-16">
      <div className="max-w-md mx-auto px-6">
        <h2 className="text-2xl font-bold text-center mb-2">
          GA 매칭, 지금 바로 신청하세요
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          가입 없이 30초 만에 신청할 수 있습니다
        </p>
        <GuestConnectForm onSuccess={() => setIsSubmitted(true)} />
      </div>
    </section>
  );
}
```

신청 완료 후 "회원가입하고 더 알아보기" CTA로 자연스럽게 가입 유도를 했다. 비회원 신청 → 가입이라는 2단계 전환 구조다.

## 공개 체험 페이지

가입 전에 서비스 가치를 체감할 수 있는 프리뷰 페이지를 만들었다. 첫 번째 강의의 요약 영상(3분)과 커리큘럼 목차를 공개하고, 나머지는 "가입 후 이용 가능"으로 잠금 처리했다. 1주차 콘텐츠만 열어두고 2~6주차는 잠금 아이콘과 함께 목차만 보여주는 구조다.

프리뷰 페이지 방문 후 가입 전환율은 31%였다. 랜딩페이지 직접 전환(8.1%)의 약 4배다. "이 서비스가 나에게 맞을까?"라는 불확실성을 해소하는 것이 전환의 핵심이었다.

## 이탈 방지 팝업

스크롤 깊이 기반으로 이탈 방지 팝업을 트리거했다. 사용자가 페이지의 50% 이상을 스크롤했지만 어떤 CTA도 클릭하지 않은 채 이탈하려 할 때(마우스가 뷰포트 상단을 벗어나는 시점) 비회원 신청 팝업을 노출한다.

팝업 노출 조건을 까다롭게 설정한 이유는 사용자 경험 때문이다:

- 이미 비회원 신청을 한 사용자에게는 보여주지 않는다 (`localStorage` 체크)
- 같은 세션에서 한 번 닫았으면 다시 보여주지 않는다 (`sessionStorage` 체크)
- 페이지의 50% 이상 스크롤하지 않았으면 관심이 없는 사용자이므로 보여주지 않는다

이 팝업을 통한 비회원 신청은 전체 비회원 신청의 약 18%를 차지했다.

## 데이터 기반 개선 사이클

랜딩페이지는 한 번 만들고 끝이 아니다. GA4와 Mixpanel로 지속적으로 데이터를 수집하고 개선했다.

GA4에 스크롤 깊이 이벤트를 커스텀으로 설정했다. 기본 제공되는 25/50/75/90% 외에 각 섹션 진입 시점을 `IntersectionObserver`로 별도 추적해서, 어떤 섹션에서 이탈이 발생하는지 파악했다. Mixpanel에서는 CTA별 클릭 데이터를 수집해서 위치별 전환 기여도를 분석했다:

| CTA 위치 | 클릭 비중 | 가입 전환율 |
|----------|----------|------------|
| Hero Primary | 38% | 24.2% |
| Hero Secondary | 12% | 8.7% |
| 시뮬레이터 하단 | 22% | 31.5% |
| 비회원 신청 폼 | 18% | — (별도 퍼널) |
| 프리뷰 페이지 CTA | 7% | 31.0% |
| 페이지 하단 | 3% | 19.8% |

시뮬레이터 하단 CTA의 전환율이 가장 높았다. 수입을 직접 계산해본 직후의 전환 의지가 강한 것이다. 이 데이터를 바탕으로 시뮬레이터의 위치를 페이지 상단으로 올렸고, 시뮬레이터 결과 화면에 CTA를 더 강조하는 방향으로 반복 개선했다.

## 결과

리디자인 전후 비교 (4주 기준):

- 랜딩 → 가입 전환율: 8.1% → 14.2%
- 평균 체류 시간: 1분 12초 → 2분 48초
- 스크롤 깊이 50% 이상 비율: 30% → 52%
- 비회원 신청 포함 전체 전환율: 8.1% → 28.3%

체류 시간이 늘어난 건 수입 시뮬레이터 덕분이다. 시뮬레이터에서 평균 45초를 소비했는데, 이 시간 동안 사용자는 "보험설계사 수입"에 대해 능동적으로 탐색한 것이다. 수동적 정보 소비가 아니라 능동적 참여가 전환 동기를 만들었다.

## 마치며

랜딩페이지 전환율 개선에서 배운 원칙 세 가지:

첫째, CTA는 보여야 클릭된다. 페이지 하단에만 CTA를 두면 대부분의 사용자는 보지도 못한다. 스크롤 깊이 데이터가 이를 증명했다. Hero에 CTA를 넣고 스크롤 과정에서 반복 노출하는 것이 기본이다.

둘째, 인터랙티브 요소가 정적 텍스트보다 전환에 효과적이다. 수입 시뮬레이터는 "설계사로 이만큼 벌 수 있습니다"라는 텍스트보다 "당신은 주당 N시간 일하면 월 N만원을 벌 수 있습니다"라는 개인화된 경험을 제공한다. 능동적 참여가 전환 동기를 만든다.

셋째, 전환율 최적화는 한 번의 리디자인이 아니라 반복 실험이다. CTA 위치별 데이터를 보고, 가장 전환율이 높은 위치를 강화하는 사이클을 돌렸다. 데이터 없이는 "어떤 CTA가 효과적인지" 감으로 판단할 수밖에 없다.
