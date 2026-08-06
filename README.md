# shion-blog

Obsidian + Markdown 기반 개인 포트폴리오 블로그.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Content**: MDX (`next-mdx-remote/rsc` + `gray-matter`)
- **Syntax Highlighting**: Shiki (dual theme) + `rehype-pretty-code`
- **Markdown**: `remark-gfm` (GFM 테이블, 취소선 등)
- **Theme**: `next-themes` (라이트/다크 모드)
- **Deploy**: Vercel

## Features

- Markdown/MDX 기반 블로그 글 작성
- 태그 필터링 (빈도순 정렬 + 더보기 토글)
- 글 검색
- 라이트/다크 모드
- 프로젝트 포트폴리오
- RSS Feed (`/feed.xml`)
- Sitemap + SEO 메타태그

## Project Structure

```
shion-blog/
├── content/
│   ├── posts/          # 블로그 글 (카테고리별 폴더)
│   └── projects/       # 프로젝트 소개
├── src/
│   ├── app/            # Next.js App Router 페이지
│   ├── components/     # UI 컴포넌트
│   ├── lib/            # MDX 렌더링, 콘텐츠 유틸
│   └── types/          # 타입 정의
└── public/             # 정적 파일
```

## Getting Started

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## Writing Posts

`content/posts/` 하위에 `.md` 파일을 추가합니다.

```markdown
---
title: "글 제목"
description: "한 줄 설명"
date: "2026-01-01"
tags: ["React", "TypeScript"]
published: true
---

본문 내용...
```

## License

MIT
