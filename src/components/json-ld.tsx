import type { PostMeta } from "@/types/post";

const SITE_URL = "https://shion-blog.vercel.app";

export function WebsiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Seoyoung Park",
    url: SITE_URL,
    description: "제품의 경험을 설계하고 직접 만드는 디자인 엔지니어",
    author: {
      "@type": "Person",
      name: "박서영",
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function ArticleJsonLd({ post }: { post: PostMeta }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: "박서영",
      url: SITE_URL,
    },
    url: `${SITE_URL}/posts/${post.slug}`,
    keywords: post.tags,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function PersonJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "박서영",
    alternateName: "Seoyoung Park",
    url: SITE_URL,
    jobTitle: "디자인 엔지니어",
    sameAs: ["https://github.com/shionpark"],
    knowsAbout: [
      "React",
      "Next.js",
      "NestJS",
      "TypeScript",
      "PostgreSQL",
      "AI Automation",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
