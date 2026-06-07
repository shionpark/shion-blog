import { compileMDX } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import type { ReactNode } from "react";

export async function renderMDX(source: string): Promise<ReactNode> {
  const { content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: {
                dark: "github-dark",
                light: "github-light",
              },
              keepBackground: false,
            },
          ],
        ],
      },
    },
  });

  return content;
}
