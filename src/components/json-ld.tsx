import type { PostMeta } from "@/types/post";

const SITE_URL = "https://shion-blog.vercel.app";

export function WebsiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Shion Park",
    url: SITE_URL,
    description: "데이터와 AI를 활용해 제품과 운영을 자동화하는 풀스택 개발자",
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
    alternateName: "Shion Park",
    url: SITE_URL,
    jobTitle: "풀스택 개발자",
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
