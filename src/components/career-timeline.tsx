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
    role: "프론트엔드 개발자 · Team Lead",
    period: "2026.03 ~ 2026.09",
    description:
      "보험설계사 육성 SaaS 플랫폼의 화면과 API를 전임 개발자 퇴사 후 맡음. 광고 전환 이벤트 정리, 비회원 신청·Meta 리드 수집 파이프라인, 매칭 진행 상태 재설계, 보험 조회 서비스 연동.",
    isCurrent: false,
  },
  {
    company: "비더라이트 컴퍼니",
    role: "프론트엔드 개발자",
    period: "2023.12 ~ 2025.04",
    description:
      "다지점 헬스장 관리 시스템의 프론트엔드 개발(프리랜서). 락커 로직 정리, 조회 시점 분리, 지점 접근 분리, 태블릿 체크인 구현, 요구사항 정의서 작성.",
    isCurrent: false,
  },
  {
    company: "미리디",
    role: "데이터 분석가",
    period: "2022.05 ~ 2022.08",
    description:
      "미리캔버스 광고 성과 분석.",
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
