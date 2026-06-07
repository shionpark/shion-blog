import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "참여한 프로젝트를 소개합니다.",
};

type Project = {
  title: string;
  role: string;
  period: string;
  description: string;
  stack: string[];
  url?: string;
  github?: string;
};

const PROJECTS: Project[] = [
  {
    title: "인톡 파트너스 2.0",
    role: "풀스택 개발자",
    period: "2026.03 ~ 현재",
    description:
      "보험 전문가를 위한 AI 교육 플랫폼. 외부 API 연동 보험 조회, AI 콘텐츠 자동 생성, UTM 캠페인 분석 엔진, Daily Briefing 자동화 등을 설계·구현했습니다.",
    stack: ["Next.js", "React", "NestJS", "PostgreSQL", "Redis", "Claude API"],
    url: "https://www.intalkpartners.com",
  },
  {
    title: "Gymlight Manager",
    role: "프론트엔드 엔지니어",
    period: "2023.12 ~ 2025.04",
    description:
      "다지점 헬스장 운영 관리 시스템. 회원·직원·상품·출석·매출 데이터를 통합하고, 조회 시점 분리와 권한 로직 통합으로 렌더링 비용과 유지보수 범위를 줄였습니다.",
    stack: ["React", "TypeScript", "TanStack Query"],
    url: "https://gymlight-demo.vercel.app",
    github: "https://github.com/shionpark/gymlight-demo",
  },
  {
    title: "Run Fit",
    role: "프론트엔드 엔지니어",
    period: "2025.12 ~ 2026.01",
    description:
      "지역 기반 러닝 크루·세션 탐색 플랫폼. URL 기반 필터 상태 SSOT와 섹션 단위 Suspense Boundary를 도입해 로딩 병목을 제거했습니다.",
    stack: ["Next.js", "React", "TypeScript"],
    url: "https://run-fit-eight.vercel.app/sessions",
    github: "https://github.com/runfit26/run-fit",
  },
];

export default function ProjectsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Projects</h1>

      <div className="flex flex-col gap-10">
        {PROJECTS.map((project) => (
          <article
            key={project.title}
            className="border border-border rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-lg font-bold">{project.title}</h2>
              <span className="text-xs text-muted-foreground shrink-0 ml-4">
                {project.period}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {project.role}
            </p>
            <p className="text-sm leading-relaxed mt-3 mb-4">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
            <div className="flex gap-4 text-sm">
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:opacity-80 transition-opacity"
                >
                  Live &rarr;
                </a>
              )}
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:opacity-80 transition-opacity"
                >
                  GitHub &rarr;
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
