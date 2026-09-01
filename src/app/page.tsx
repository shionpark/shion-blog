import Image from "next/image";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { getAllProjects } from "@/lib/projects";

const SOCIAL_LINKS = [
  {
    href: "https://github.com/shionpark",
    label: "GitHub",
    icon: (
      <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    href: "https://www.linkedin.com/in/seoyoung-park-053a00224/",
    label: "LinkedIn",
    icon: (
      <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    href: "mailto:seoy1108@gmail.com",
    label: "Email",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
] as const;

/* 홈페이지에 보여줄 프로젝트별 한 줄 설명 (프로덕트 엔지니어 관점) */
const PROJECT_SHORT_DESC: Record<string, string> = {
  "intalk-care": "매칭 스코어 UX · 7단계 온보딩 설계",
  "intalk-partners": "퍼널 지표 설계 · AI 콘텐츠 자동화",
  "gymlight-manager": "다지점 관리 대시보드",
  "run-fit": "러닝 크루 탐색 · 필터 인터랙션",
};

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 5);
  const projects = getAllProjects();

  return (
    <div className="max-w-130 mx-auto px-6 py-16">
      {/* 프로필 */}
      <section className="mb-12">
        <Image
          src="/images/profile.jpeg"
          alt="Seoyoung Park"
          width={56}
          height={56}
          className="w-14 h-14 rounded-full object-cover mb-4"
          priority
        />
        <h1 className="text-base font-bold mb-2">Seoyoung Park</h1>
        <p className="text-[15px] leading-[1.65] mb-5">
          사용자 경험 설계부터 구현·개선까지, 제품이 더 나아지는 과정을 만드는 프로덕트 엔지니어입니다.
          복잡한 도메인을 쉬운 인터페이스로, 반복되는 작업을 자동화로 바꿉니다.
        </p>
        <div className="flex gap-3.5">
          {SOCIAL_LINKS.map(({ href, label, icon }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("mailto") ? undefined : "_blank"}
              rel={href.startsWith("mailto") ? undefined : "noopener noreferrer"}
              aria-label={label}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {icon}
            </a>
          ))}
        </div>
      </section>

      {/* Writing */}
      <section className="mb-10">
        <div className="mb-3">
          <Link
            href="/posts"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:opacity-60 transition-opacity"
          >
            Writing
            <span className="text-xs">›</span>
          </Link>
        </div>
        <div className="flex flex-col">
          {recentPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/posts/${post.slug}`}
              className="block py-2 text-[15px] hover:opacity-50 transition-opacity"
            >
              {post.title}
            </Link>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section className="mb-10">
        <div className="mb-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:opacity-60 transition-opacity"
          >
            Projects
            <span className="text-xs">›</span>
          </Link>
        </div>
        <div className="flex flex-col">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="block py-2 hover:opacity-50 transition-opacity"
            >
              <span className="text-[15px] font-semibold">{project.title}</span>
              <span className="text-xs text-muted-foreground ml-1">↗</span>
              <span className="text-[15px] text-muted-foreground ml-1.5">
                {PROJECT_SHORT_DESC[project.slug] ?? project.description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
