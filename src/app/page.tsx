import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* 소개 */}
      <section className="mb-16">
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          안녕하세요, 박서영입니다
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          데이터와 AI를 활용해 제품과 운영을 자동화하는 풀스택 개발자입니다.
          반복되는 수작업을 시스템으로 전환하고, 데이터가 수집되어 사용자에게
          전달되기까지의 흐름 전체를 설계합니다.
        </p>
      </section>

      {/* 최근 포스트 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight">최근 글</h2>
          <Link
            href="/posts"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            전체 보기 &rarr;
          </Link>
        </div>
        {recentPosts.length > 0 ? (
          <div className="flex flex-col gap-6">
            {recentPosts.map((post) => (
              <article key={post.slug}>
                <Link href={`/posts/${post.slug}`} className="group block">
                  <h3 className="font-semibold group-hover:text-accent transition-colors mb-1">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <span>&middot;</span>
                    <span>{post.readingTime}</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            아직 작성된 글이 없습니다.
          </p>
        )}
      </section>
    </div>
  );
}
