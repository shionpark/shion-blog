import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { PostFrontmatter, PostMeta } from "@/types/post";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

type PostFile = {
  slug: string;
  category: string;
  filePath: string;
};

function getPostFiles(): PostFile[] {
  const entries = fs.readdirSync(POSTS_DIR, { withFileTypes: true });
  const postFiles: PostFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const category = entry.name;
      const categoryDir = path.join(POSTS_DIR, category);
      const files = fs.readdirSync(categoryDir).filter((file) => file.endsWith(".md"));

      for (const file of files) {
        postFiles.push({
          slug: file.replace(/\.md$/, ""),
          category,
          filePath: path.join(categoryDir, file),
        });
      }
    }
  }

  return postFiles;
}

export function getAllPosts(): PostMeta[] {
  const postFiles = getPostFiles();

  const posts = postFiles
    .map(({ slug, category, filePath }) => {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);
      const frontmatter = data as PostFrontmatter;

      if (!frontmatter.published) return null;

      return {
        ...frontmatter,
        slug,
        category,
        readingTime: readingTime(content).text,
      };
    })
    .filter((post): post is PostMeta => post !== null);

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string) {
  const postFile = getPostFiles().find((file) => file.slug === slug);

  if (!postFile) {
    throw new Error(`포스트를 찾을 수 없습니다: ${slug}`);
  }

  const fileContent = fs.readFileSync(postFile.filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const frontmatter = data as PostFrontmatter;

  return {
    meta: {
      ...frontmatter,
      slug,
      category: postFile.category,
      readingTime: readingTime(content).text,
    },
    content,
  };
}

export function getPostSlugs(): string[] {
  return getPostFiles().map((file) => file.slug);
}
