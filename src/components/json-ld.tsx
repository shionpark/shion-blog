import type { PostMeta } from "@/types/post";

const SITE_URL = "https://shion-blog.vercel.app";

export function WebsiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Seoyoung Park",
    url: SITE_URL,
    description: "사용자 경험 설계부터 구현·개선까지, 제품이 더 나아지는 과정을 만드는 프로덕트 엔지니어",
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
    jobTitle: "프로덕트 엔지니어",
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
