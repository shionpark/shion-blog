export type PostFrontmatter = {
  title: string;
  description: string;
  date: string;
  tags: string[];
  published: boolean;
};

export type PostMeta = PostFrontmatter & {
  slug: string;
  readingTime: string;
};
