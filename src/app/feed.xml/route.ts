import { getAllPosts } from "@/lib/posts";

const SITE_URL = "https://shion-blog.vercel.app";
const SITE_TITLE = "Shion Park";
const SITE_DESCRIPTION =
  "데이터와 AI를 활용해 제품과 운영을 자동화하는 풀스택 개발자";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc2822(dateString: string): string {
  return new Date(dateString).toUTCString();
}

export function GET(): Response {
  const posts = getAllPosts();

  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/posts/${post.slug}</link>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${toRfc2822(post.date)}</pubDate>
      <guid isPermaLink="true">${SITE_URL}/posts/${post.slug}</guid>
      <category>${escapeXml(post.category)}</category>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    <lastBuildDate>${toRfc2822(posts[0]?.date ?? new Date().toISOString())}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
