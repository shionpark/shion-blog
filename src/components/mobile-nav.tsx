"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/posts", label: "Posts" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
] as const;

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // 라우트 변경 시 메뉴 닫기
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // 메뉴 열릴 때 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          // X 아이콘
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          // 햄버거 아이콘
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        )}
      </button>

      {/* 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 top-[57px] z-40 bg-background/95 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        >
          <nav
            className="flex flex-col gap-1 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-3 rounded-lg text-base transition-colors ${
                  pathname.startsWith(href)
                    ? "text-foreground bg-muted font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
