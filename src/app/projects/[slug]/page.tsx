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
      <header className="mb-10">
        <Link
          href="/projects"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
        >
          &larr; Projects
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {project.meta.title}
        </h1>
        <p className="text-muted-foreground mb-4">{project.meta.description}</p>

        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          <span>{project.meta.role}</span>
          <span>&middot;</span>
          <span>{project.meta.period}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.meta.stack.map((tech) => (
            <span
              key={tech}
              className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="flex gap-4 text-sm">
          {project.meta.url && (
            <a
              href={project.meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:opacity-80 transition-opacity"
            >
              Live &rarr;
            </a>
          )}
          {project.meta.github && (
            <a
              href={project.meta.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:opacity-80 transition-opacity"
            >
              GitHub &rarr;
            </a>
          )}
        </div>
      </header>

      <div className="prose">{content}</div>
    </article>
  );
}
