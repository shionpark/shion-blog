import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";
import { renderMDX } from "@/lib/mdx";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { meta } = getPostBySlug(slug);
    return {
      title: meta.title,
      description: meta.description,
    };
  } catch {
    return {};
  }
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;

  let post;
  try {
    post = getPostBySlug(slug);
  } catch {
    notFound();
  }

  const content = await renderMDX(post.content);

  return (
    <article className="max-w-2xl mx-auto px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {post.meta.title}
        </h1>
        <p className="text-muted-foreground mb-4">{post.meta.description}</p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <time dateTime={post.meta.date}>
            {new Date(post.meta.date).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>&middot;</span>
          <span>{post.meta.readingTime}</span>
        </div>
        {post.meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.meta.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>
      <div className="prose">{content}</div>
    </article>
  );
}
