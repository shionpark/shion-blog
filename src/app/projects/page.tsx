import Link from "next/link";
import type { Metadata } from "next";
import { getAllProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "참여한 프로젝트를 소개합니다.",
};

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Projects</h1>

      {projects.length > 0 ? (
        <div className="flex flex-col gap-10">
          {projects.map((project) => (
            <article
              key={project.slug}
              className="border border-border rounded-lg p-6 hover:border-accent/30 transition-colors"
            >
              <Link href={`/projects/${project.slug}`} className="block group">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-bold group-hover:text-accent transition-colors">
                    {project.title}
                  </h2>
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
              </Link>

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
      ) : (
        <p className="text-muted-foreground">
          아직 등록된 프로젝트가 없습니다.
        </p>
      )}
    </div>
  );
}
