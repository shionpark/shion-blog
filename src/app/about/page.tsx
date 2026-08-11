import type { Metadata } from "next";
import { CareerTimeline } from "@/components/career-timeline";
import { PersonJsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "About",
  description: "Seoyoung Park — 제품의 경험을 설계하고 직접 만드는 디자인 엔지니어.",
};

type SkillGroup = {
  label: string;
  skills: string[];
};

const SKILL_GROUPS: SkillGroup[] = [
  {
    label: "Design & UX",
    skills: ["사용자 여정 설계", "프로토타이핑", "인터랙션 디자인", "정보 구조(IA)"],
  },
  {
    label: "Frontend",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
  },
  {
    label: "Backend",
    skills: ["NestJS", "Prisma", "PostgreSQL", "Redis"],
  },
  {
    label: "자동화 & 도구",
    skills: ["Claude API", "GA4 · Mixpanel", "Meta Ads API"],
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-130 mx-auto px-6 py-16">
      <PersonJsonLd />

      {/* 소개 */}
      <section className="mb-14">
        <h1 className="text-base font-bold mb-4">Seoyoung Park</h1>
        <div className="flex flex-col gap-3 text-[15px] leading-[1.7] text-muted-foreground">
          <p>
            제품의 경험을 설계하고 직접 만드는 디자인 엔지니어입니다.
          </p>
          <p>
            복잡한 도메인을 쉬운 인터페이스로 바꾸는 데 관심이 많습니다.
            보험 설계사 매칭 플랫폼에서 매칭 스코어 시각화와 온보딩 흐름을 설계했고,
            다지점 헬스장 관리 시스템에서 권한 구조를 직관적인 대시보드로 풀었습니다.
          </p>
          <p>
            반복되는 작업은 시스템으로 전환합니다. AI를 활용한 콘텐츠 자동화,
            캠페인 분석 파이프라인처럼 사람이 판단에 집중할 수 있도록
            나머지를 자동화하는 방식을 선호합니다.
          </p>
        </div>
      </section>

      {/* 경력 */}
      <section className="mb-14">
        <h2 className="text-sm font-medium text-muted-foreground mb-5">경력</h2>
        <CareerTimeline />
      </section>

      {/* 기술 스택 */}
      <section className="mb-14">
        <h2 className="text-sm font-medium text-muted-foreground mb-5">기술</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SKILL_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-[13px] font-medium mb-2.5">
                {group.label}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {group.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[13px] px-2.5 py-1 rounded-md bg-muted text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 연락처 */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-5">연락</h2>
        <div className="flex flex-col gap-2.5">
          <a
            href="https://github.com/shionpark"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            github.com/shionpark
          </a>
          <a
            href="https://www.linkedin.com/in/seoyoung-park-053a00224/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </a>
          <a
            href="mailto:seoy1108@gmail.com"
            className="inline-flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            seoy1108@gmail.com
          </a>
        </div>
      </section>
    </div>
  );
}
