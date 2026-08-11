"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { PostMeta } from "@/types/post";

type PostListFilterableProps = {
  posts: PostMeta[];
};

/* 디렉토리 카테고리를 탭으로 매핑 */
type CategoryTab = {
  key: string;
  label: string;
  /** 이 탭에 포함되는 디렉토리 카테고리들. 비어있으면 전체 */
  categories: string[];
};

const CATEGORY_TABS: CategoryTab[] = [
  { key: "all", label: "전체", categories: [] },
  { key: "design", label: "Design", categories: ["design"] },
  { key: "frontend", label: "Frontend", categories: ["frontend"] },
  { key: "backend", label: "Backend", categories: ["backend", "analytics"] },
  { key: "career", label: "Career", categories: ["career", "general"] },
];

export function PostListFilterable({ posts }: PostListFilterableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "all";
  const [searchQuery, setSearchQuery] = useState("");

  /* 탭별 글 수 계산 */
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of CATEGORY_TABS) {
      if (tab.categories.length === 0) {
        counts[tab.key] = posts.length;
      } else {
        counts[tab.key] = posts.filter((post) =>
          tab.categories.includes(post.category)
        ).length;
      }
    }
    return counts;
  }, [posts]);

  /* 탭으로 필터링 */
  const tabFilteredPosts = useMemo(() => {
    const currentTab = CATEGORY_TABS.find((tab) => tab.key === activeTab);
    if (!currentTab || currentTab.categories.length === 0) return posts;
    return posts.filter((post) => currentTab.categories.includes(post.category));
  }, [posts, activeTab]);

  /* 검색 필터 */
  const filteredPosts = useMemo(() => {
    if (!searchQuery) return tabFilteredPosts;
    const query = searchQuery.toLowerCase();
    return tabFilteredPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [tabFilteredPosts, searchQuery]);

  /* 연도별 그룹 */
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

  function handleTabClick(tabKey: string) {
    const params = new URLSearchParams();
    if (tabKey !== "all") params.set("tab", tabKey);
    const queryString = params.toString();
    router.push(queryString ? `/posts?${queryString}` : "/posts", {
      scroll: false,
    });
  }

  return (
    <>
      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-1 mb-6">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-50">{tabCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="검색..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full px-3.5 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors text-sm"
        />
      </div>

      {/* 글 목록 */}
      {years.length > 0 ? (
        years.map((year) => (
          <section key={year} className="mb-8">
            <h2 className="text-xs font-medium text-muted-foreground/60 mb-3">
              {year}
            </h2>
            <div className="flex flex-col">
              {postsByYear[year].map((post) => (
                <article key={post.slug}>
                  <Link
                    href={`/posts/${post.slug}`}
                    className="group flex items-baseline justify-between gap-4 py-1.5"
                  >
                    <h3 className="text-[15px] group-hover:opacity-50 transition-opacity">
                      {post.title}
                    </h3>
                    <time
                      dateTime={post.date}
                      className="text-xs text-muted-foreground shrink-0"
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
        <p className="text-sm text-muted-foreground py-8">
          {activeTab === "design"
            ? "디자인 케이스 스터디를 준비 중입니다."
            : searchQuery
              ? "검색 결과가 없습니다."
              : "아직 작성된 글이 없습니다."}
        </p>
      )}

      {/* 결과 수 */}
      {searchQuery && filteredPosts.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {filteredPosts.length}개의 글
        </p>
      )}
    </>
  );
}
