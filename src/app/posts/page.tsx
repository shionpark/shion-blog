import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { PostListFilterable } from "@/components/post-list-filterable";

export const metadata: Metadata = {
  title: "Posts",
  description: "개발 경험과 기술적 의사결정을 기록합니다.",
};

export default function PostsPage() {
  const posts = getAllPosts();
  const allTags = getAllTags();

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Posts</h1>

      <Suspense>
        <PostListFilterable posts={posts} allTags={allTags} />
      </Suspense>
    </div>
  );
}
