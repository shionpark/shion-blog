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
    <div className="max-w-130 mx-auto px-6 py-16">
      <h1 className="text-base font-bold mb-8">Projects</h1>

      {projects.length > 0 ? (
        <div className="flex flex-col gap-8">
          {projects.map((project) => (
            <article key={project.slug}>
              <Link
                href={`/projects/${project.slug}`}
                className="group block"
              >
                <div className="flex items-baseline justify-between gap-4 mb-1">
                  <h2 className="text-[15px] font-semibold group-hover:opacity-50 transition-opacity">
                    {project.title}
                  </h2>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {project.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground/70 mb-1">
                  {project.role}
                </p>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  {project.description}
                </p>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          아직 등록된 프로젝트가 없습니다.
        </p>
      )}
    </div>
  );
}
