import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";
import { PostListFilterable } from "@/components/post-list-filterable";

export const metadata: Metadata = {
  title: "Writing",
  description: "설계 경험과 기술적 의사결정을 기록합니다.",
};

export default function PostsPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-130 mx-auto px-6 py-16">
      <h1 className="text-base font-bold mb-8">Writing</h1>

      <Suspense>
        <PostListFilterable posts={posts} />
      </Suspense>
    </div>
  );
}
