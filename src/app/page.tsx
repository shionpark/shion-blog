import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { getAllProjects } from "@/lib/projects";

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 3);
  const featuredProjects = getAllProjects().slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* 히어로 섹션 */}
      <section className="mb-20">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          안녕하세요, 박서영입니다
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          데이터와 AI를 활용해 제품과 운영을 자동화하는 풀스택 개발자입니다.
          반복되는 수작업을 시스템으로 전환하고, 데이터가 수집되어 사용자에게
          전달되기까지의 흐름 전체를 설계합니다.
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            프로젝트 보기 &rarr;
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/shionpark"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a
              href="mailto:seoy1108@gmail.com"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Email"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* 주요 프로젝트 */}
      {featuredProjects.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">주요 프로젝트</h2>
            <Link
              href="/projects"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              전체 보기 &rarr;
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {featuredProjects.map((project) => (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="group block border border-border rounded-lg p-5 hover:border-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold group-hover:text-accent transition-colors">
                    {project.title}
                  </h3>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">
                    {project.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.stack.slice(0, 4).map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.stack.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{project.stack.length - 4}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 최근 포스트 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight">최근 글</h2>
          <Link
            href="/posts"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            전체 보기 &rarr;
          </Link>
        </div>
        {recentPosts.length > 0 ? (
          <div className="flex flex-col gap-6">
            {recentPosts.map((post) => (
              <article key={post.slug}>
                <Link href={`/posts/${post.slug}`} className="group block">
                  <h3 className="font-semibold group-hover:text-accent transition-colors mb-1">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <span>&middot;</span>
                    <span>{post.readingTime}</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            아직 작성된 글이 없습니다.
          </p>
        )}
      </section>
    </div>
  );
}
