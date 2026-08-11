import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";

const NAV_ITEMS = [
  { href: "/posts", label: "Posts" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
] as const;

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity"
        >
          Seoyoung
        </Link>

        {/* 데스크탑 내비게이션 */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>

        {/* 모바일 내비게이션 */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
