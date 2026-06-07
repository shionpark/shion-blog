import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Posts",
  description: "개발 경험과 기술적 의사결정을 기록합니다.",
};

export default function PostsPage() {
  const posts = getAllPosts();

  const postsByYear = posts.reduce<Record<string, typeof posts>>(
    (groups, post) => {
      const year = new Date(post.date).getFullYear().toString();
      if (!groups[year]) groups[year] = [];
      groups[year].push(post);
      return groups;
    },
    {}
  );

  const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Posts</h1>

      {years.length > 0 ? (
        years.map((year) => (
          <section key={year} className="mb-10">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              {year}
            </h2>
            <div className="flex flex-col gap-4">
              {postsByYear[year].map((post) => (
                <article key={post.slug}>
                  <Link href={`/posts/${post.slug}`} className="group flex items-baseline justify-between gap-4">
                    <h3 className="font-medium group-hover:text-accent transition-colors">
                      {post.title}
                    </h3>
                    <time
                      dateTime={post.date}
                      className="text-sm text-muted-foreground shrink-0"
                    >
                      {new Date(post.date).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="text-muted-foreground">아직 작성된 글이 없습니다.</p>
      )}
    </div>
  );
}
