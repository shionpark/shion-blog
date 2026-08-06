"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { PostMeta } from "@/types/post";

type PostListFilterableProps = {
  posts: PostMeta[];
  allTags: string[];
};

export function PostListFilterable({ posts, allTags }: PostListFilterableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // 태그 필터
      if (activeTag && !post.tags.includes(activeTag)) return false;

      // 검색 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          post.title.toLowerCase().includes(query) ||
          post.description.toLowerCase().includes(query) ||
          post.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [posts, activeTag, searchQuery]);

  const postsByYear = useMemo(() => {
    const groups: Record<string, PostMeta[]> = {};

    for (const post of filteredPosts) {
      const year = new Date(post.date).getFullYear().toString();
      if (!groups[year]) groups[year] = [];
      groups[year].push(post);
    }

    return groups;
  }, [filteredPosts]);

  const years = Object.keys(postsByYear).sort(
    (yearA, yearB) => Number(yearB) - Number(yearA)
  );

  function handleTagClick(tag: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (activeTag === tag) {
      params.delete("tag");
    } else {
      params.set("tag", tag);
    }

    const queryString = params.toString();
    router.push(queryString ? `/posts?${queryString}` : "/posts", {
      scroll: false,
    });
  }

  return (
    <>
      {/* 검색 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="글 검색..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors text-sm"
        />
      </div>

      {/* 태그 필터 */}
      <div className="flex flex-wrap gap-2 mb-8">
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
              activeTag === tag
                ? "bg-accent text-white border-accent"
                : "bg-muted text-muted-foreground border-border hover:border-accent/50"
            }`}
          >
            {tag}
          </button>
        ))}
        {activeTag && (
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("tag");
              router.push("/posts", { scroll: false });
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            초기화 ✕
          </button>
        )}
      </div>

      {/* 글 목록 */}
      {years.length > 0 ? (
        years.map((year) => (
          <section key={year} className="mb-10">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              {year}
            </h2>
            <div className="flex flex-col gap-4">
              {postsByYear[year].map((post) => (
                <article key={post.slug}>
                  <Link
                    href={`/posts/${post.slug}`}
                    className="group flex items-baseline justify-between gap-4"
                  >
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
        <p className="text-muted-foreground">
          {searchQuery || activeTag
            ? "검색 결과가 없습니다."
            : "아직 작성된 글이 없습니다."}
        </p>
      )}

      {/* 결과 수 표시 */}
      {(searchQuery || activeTag) && filteredPosts.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          {filteredPosts.length}개의 글
        </p>
      )}
    </>
  );
}
