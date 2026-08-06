import type { Metadata } from "next";
import { CareerTimeline } from "@/components/career-timeline";
import { PersonJsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "About",
  description: "박서영(Shion)에 대해 소개합니다.",
};

type SkillGroup = {
  label: string;
  skills: string[];
};

const SKILL_GROUPS: SkillGroup[] = [
  {
    label: "Frontend",
    skills: ["React", "Next.js (App Router)", "Tailwind CSS", "TypeScript"],
  },
  {
    label: "Backend",
    skills: ["NestJS", "Prisma ORM", "PostgreSQL", "Redis"],
  },
  {
    label: "AI / 자동화",
    skills: ["Anthropic Claude API", "NestJS Scheduler"],
  },
  {
    label: "분석",
    skills: ["GA4", "Mixpanel", "Meta Ads API"],
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <PersonJsonLd />
      <h1 className="text-3xl font-bold tracking-tight mb-8">About</h1>

      {/* 소개 */}
      <section className="mb-12">
        <div className="prose">
          <p>안녕하세요, 박서영입니다.</p>
          <p>
            데이터 분석가로서 흩어진 정보를 구조화하고, 프론트엔드 개발자로서
            사용자 경험으로 구현해 왔습니다. 현재는 프론트엔드와 백엔드를
            아우르는 풀스택 개발자로서, 데이터가 수집되고 가공되어 사용자에게
            전달되기까지의 흐름 전체를 설계하고 구현하는 데 집중하고 있습니다.
          </p>
          <p>
            AI를 활용한 콘텐츠 자동 생성, 운영 자동화 등 반복 업무를 시스템으로
            전환하는 작업에 관심이 많습니다.
          </p>
        </div>
      </section>

      {/* 경력 타임라인 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold tracking-tight mb-6">경력</h2>
        <CareerTimeline />
      </section>

      {/* 기술 스택 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold tracking-tight mb-6">기술 스택</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SKILL_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {group.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-sm px-3 py-1 rounded-lg bg-muted text-foreground"
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
        <h2 className="text-xl font-bold tracking-tight mb-6">연락처</h2>
        <div className="flex flex-col gap-3">
          <a
            href="https://github.com/shionpark"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="group-hover:underline">github.com/shionpark</span>
          </a>
          <a
            href="mailto:seoy1108@gmail.com"
            className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <span className="group-hover:underline">seoy1108@gmail.com</span>
          </a>
        </div>
      </section>
    </div>
  );
}
