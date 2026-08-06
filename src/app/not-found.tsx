import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <h1 className="text-6xl font-bold tracking-tight mb-4">404</h1>
      <p className="text-lg text-muted-foreground mb-8">
        페이지를 찾을 수 없습니다.
      </p>
      <Link
        href="/"
        className="text-accent hover:opacity-80 transition-opacity"
      >
        홈으로 돌아가기 &rarr;
      </Link>
    </div>
  );
}
