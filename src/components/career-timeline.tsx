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
    role: "풀스택 개발자",
    period: "2026.03 ~ 현재",
    description:
      "보험 전문가를 위한 AI 교육 플랫폼 개발. 외부 API 연동, AI 콘텐츠 자동 생성, UTM 캠페인 분석 엔진 설계·구현.",
    isCurrent: true,
  },
  {
    company: "비더라이트 컴퍼니",
    role: "프론트엔드 엔지니어",
    period: "2023.12 ~ 2025.04",
    description:
      "다지점 헬스장 운영 관리 시스템 개발. 조회 시점 분리와 권한 로직 통합으로 렌더링 비용과 유지보수 범위 축소.",
    isCurrent: false,
  },
  {
    company: "미리디",
    role: "데이터 분석가",
    period: "2022.05 ~ 2022.08",
    description: "데이터 분석 기반 의사결정 지원 및 분석 파이프라인 구축.",
    isCurrent: false,
  },
  {
    company: "빅스인텔리전스",
    role: "기획 및 분석",
    period: "2020.12 ~ 2022.04",
    description: "서비스 기획 및 데이터 분석을 통한 제품 개선 업무 수행.",
    isCurrent: false,
  },
];

export function CareerTimeline() {
  return (
    <div className="relative">
      {/* 타임라인 세로선 */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

      <div className="flex flex-col gap-8">
        {CAREER.map((entry) => (
          <div key={entry.company} className="relative pl-8">
            {/* 타임라인 점 */}
            <div
              className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                entry.isCurrent
                  ? "border-accent bg-accent/20"
                  : "border-border bg-background"
              }`}
            />

            <div>
              <div className="flex items-baseline gap-3 mb-1">
                <h3 className="font-semibold">{entry.company}</h3>
                <span className="text-xs text-muted-foreground">
                  {entry.period}
                </span>
              </div>
              <p className="text-sm text-accent mb-1.5">{entry.role}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {entry.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
