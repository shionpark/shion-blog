import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, getProjectSlugs } from "@/lib/projects";
import { renderMDX } from "@/lib/mdx";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { meta } = getProjectBySlug(slug);
    return {
      title: meta.title,
      description: meta.description,
      openGraph: {
        title: meta.title,
        description: meta.description,
        type: "article",
      },
    };
  } catch {
    return {};
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;

  let project;
  try {
    project = getProjectBySlug(slug);
  } catch {
    notFound();
  }

  const content = await renderMDX(project.content);

  return (
    <article className="max-w-2xl mx-auto px-6 py-16">
      {/* 네비게이션 */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <span>←</span>
        <span>Projects</span>
      </Link>

      {/* 헤더 */}
      <header className="mb-10">
        <h1 className="text-xl font-bold tracking-tight mb-2">
          {project.meta.title}
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
          {project.meta.description}
        </p>

        {/* 메타 정보 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground/70 mb-4">
          <span>{project.meta.role}</span>
          <span className="hidden sm:inline">·</span>
          <span>{project.meta.period}</span>
        </div>

        {/* 기술 스택 */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.meta.stack.map((tech) => (
            <span
              key={tech}
              className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* 링크 */}
        {(project.meta.url || project.meta.github) && (
          <div className="flex gap-4 text-sm">
            {project.meta.url && (
              <a
                href={project.meta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:opacity-50 transition-opacity"
              >
                Live →
              </a>
            )}
            {project.meta.github && (
              <a
                href={project.meta.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:opacity-50 transition-opacity"
              >
                GitHub →
              </a>
            )}
          </div>
        )}
      </header>

      {/* 구분선 */}
      <hr className="border-border mb-10" />

      {/* 본문 */}
      <div className="prose">{content}</div>
    </article>
  );
}
