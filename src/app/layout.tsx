import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { WebsiteJsonLd } from "@/components/json-ld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shion-blog.vercel.app"),
  title: {
    default: "Seoyoung Park",
    template: "%s | Seoyoung Park",
  },
  description:
    "데이터와 AI를 활용해 제품과 운영을 자동화하는 풀스택 개발자",
  openGraph: {
    title: "Seoyoung Park",
    description:
      "데이터와 AI를 활용해 제품과 운영을 자동화하는 풀스택 개발자",
    url: "https://shion-blog.vercel.app",
    siteName: "Seoyoung Park",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Seoyoung Park",
    description:
      "데이터와 AI를 활용해 제품과 운영을 자동화하는 풀스택 개발자",
  },
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col antialiased">
        <WebsiteJsonLd />
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
