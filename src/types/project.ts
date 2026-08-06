export type ProjectFrontmatter = {
  title: string;
  description: string;
  role: string;
  period: string;
  stack: string[];
  url?: string;
  github?: string;
  thumbnail?: string;
  published: boolean;
  order: number;
};

export type ProjectMeta = ProjectFrontmatter & {
  slug: string;
};
