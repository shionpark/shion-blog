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
    role: "풀스택 엔지니어",
    period: "2026.03 ~ 현재",
    description:
      "보험 설계사 매칭 플랫폼과 AI 교육 플랫폼의 설계·구현. 매칭 스코어 시스템, 7단계 온보딩, AI 콘텐츠 자동화, 캠페인 분석 엔진.",
    isCurrent: true,
  },
  {
    company: "비더라이트 컴퍼니",
    role: "프론트엔드 엔지니어",
    period: "2023.12 ~ 2025.04",
    description:
      "다지점 헬스장 관리 대시보드 설계·개발. 복잡한 권한 구조를 직관적 UI로 풀고, 러닝 크루 탐색 필터 인터랙션 설계.",
    isCurrent: false,
  },
  {
    company: "미리디",
    role: "데이터 분석가",
    period: "2022.05 ~ 2022.08",
    description: "사용자 행동 데이터 분석과 인사이트 도출. 분석 파이프라인 구축.",
    isCurrent: false,
  },
  {
    company: "벡스인텔리전스",
    role: "기획 및 분석",
    period: "2020.12 ~ 2022.04",
    description: "서비스 기획과 데이터 기반 제품 개선.",
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
