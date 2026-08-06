import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { ProjectFrontmatter, ProjectMeta } from "@/types/project";

const PROJECTS_DIR = path.join(process.cwd(), "content/projects");

export function getAllProjects(): ProjectMeta[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  const files = fs.readdirSync(PROJECTS_DIR).filter((file) => file.endsWith(".md"));

  const projects = files
    .map((file) => {
      const filePath = path.join(PROJECTS_DIR, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContent);
      const frontmatter = data as ProjectFrontmatter;

      if (!frontmatter.published) return null;

      return {
        ...frontmatter,
        slug: file.replace(/\.md$/, ""),
      };
    })
    .filter((project): project is ProjectMeta => project !== null);

  return projects.sort((projectA, projectB) => projectA.order - projectB.order);
}

export function getProjectBySlug(slug: string) {
  const filePath = path.join(PROJECTS_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`프로젝트를 찾을 수 없습니다: ${slug}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const frontmatter = data as ProjectFrontmatter;

  return {
    meta: { ...frontmatter, slug },
    content,
  };
}

export function getProjectSlugs(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}
