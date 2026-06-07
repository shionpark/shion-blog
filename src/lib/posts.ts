import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { PostFrontmatter, PostMeta } from "@/types/post";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(POSTS_DIR).filter((file) => file.endsWith(".mdx"));

  const posts = files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const filePath = path.join(POSTS_DIR, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);
      const frontmatter = data as PostFrontmatter;

      if (!frontmatter.published) return null;

      return {
        ...frontmatter,
        slug,
        readingTime: readingTime(content).text,
      };
    })
    .filter((post): post is PostMeta => post !== null);

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string) {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const frontmatter = data as PostFrontmatter;

  return {
    meta: {
      ...frontmatter,
      slug,
      readingTime: readingTime(content).text,
    },
    content,
  };
}

export function getPostSlugs(): string[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}
