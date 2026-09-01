type CareerEntry = {
  company: string;
  role: string;
  period: string;
  description: string;
  isCurrent: boolean;
};

const CAREER: CareerEntry[] = [
  {
    company: "인톡",
    role: "프로덕트 엔지니어",
    period: "2026.03 ~ 현재",
    description:
      "보험설계사 육성 SaaS 플랫폼의 프론트엔드·백엔드·AI 자동화·분석 인프라를 단독 운영. 퍼널 지표 설계, LLM 기반 콘텐츠 자동화, 보험 조회 마이크로서비스 구축.",
    isCurrent: true,
  },
  {
    company: "비더라이트 컴퍼니",
    role: "프론트엔드 엔지니어",
    period: "2023.12 ~ 2025.04",
    description:
      "다지점 헬스장 관리 시스템의 프론트엔드 개발. 분산된 비즈니스 로직 통합, 조회 시점 분리를 통한 렌더링 최적화, 역할 기반 접근 제어 구조 설계.",
    isCurrent: false,
  },
  {
    company: "미리디",
    role: "데이터 분석가",
    period: "2022.05 ~ 2022.08",
    description:
      "미리캔버스의 광고 성과 분석을 위한 핵심 지표 정의. 네이버·구글·다음 광고 유입과 주문 데이터를 조합해 매출 기여도 분석.",
    isCurrent: false,
  },
  {
    company: "벡스인텔리전스",
    role: "기획 및 분석",
    period: "2020.12 ~ 2022.04",
    description:
      "AI 기반 기업 미래성장지수 모델 설계. NIA 빅데이터 센터 구축 사업 기획.",
    isCurrent: false,
  },
];

export function CareerTimeline() {
  return (
    <div className="flex flex-col gap-6">
      {CAREER.map((entry) => (
        <div key={entry.company} className="flex gap-4">
          {/* 좌측: 기간 */}
          <div className="w-28 shrink-0 pt-0.5">
            <span className="text-xs text-muted-foreground">{entry.period}</span>
          </div>

          {/* 우측: 내용 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <h3 className="text-[15px] font-semibold">{entry.company}</h3>
              {entry.isCurrent && (
                <span className="text-[11px] text-accent font-medium">현재</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1">{entry.role}</p>
            <p className="text-sm text-muted-foreground/70 leading-relaxed">
              {entry.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
