/**
 * Notion 내보내기 → shion-blog 마크다운 변환 스크립트
 *
 * 사용법:
 *   npm run migrate -- --category frontend
 *   npm run migrate -- --category backend --dry-run
 */

import fs from "fs";
import path from "path";

// --- 설정 ---

const NOTION_EXPORT_DIR = path.join(__dirname, "notion-export");
const POSTS_DIR = path.join(__dirname, "..", "content", "posts");
const IMAGES_DIR = path.join(__dirname, "..", "public", "images", "posts");

// --- 타입 ---

type MigrationResult = {
  slug: string;
  title: string;
  category: string;
  imageCount: number;
  status: "created" | "skipped" | "dry-run";
};

type ParsedArgs = {
  category: string;
  dryRun: boolean;
};

// --- 유틸리티 ---

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let category = "general";
  let dryRun = false;

  for (let idx = 0; idx < args.length; idx++) {
    if (args[idx] === "--category" && args[idx + 1]) {
      category = args[idx + 1];
      idx++;
    }
    if (args[idx] === "--dry-run") {
      dryRun = true;
    }
  }

  return { category, dryRun };
}

/** Notion 파일명에서 ID 접미사(16진수 해시)를 제거 */
function stripNotionId(filename: string): string {
  // "글 제목 abc123def456.md" → "글 제목"
  return filename
    .replace(/\.md$/, "")
    .replace(/\s+[a-f0-9]{20,}$/i, "")
    .trim();
}

/** 한국어 포함 문자열을 kebab-case slug로 변환 */
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, "") // 알파벳, 숫자, 한글, 하이픈, 공백만 유지
    .replace(/\s+/g, "-") // 공백을 하이픈으로
    .replace(/-+/g, "-") // 연속 하이픈 제거
    .replace(/^-|-$/g, ""); // 양 끝 하이픈 제거
}

/** Notion 마크다운에서 이미지 경로를 절대 경로로 변환 */
function rewriteImagePaths(content: string, slug: string): string {
  // ![alt](image.png) → ![alt](/images/posts/{slug}/image.png)
  // ![alt](subfolder/image.png) → ![alt](/images/posts/{slug}/image.png)
  return content.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
    (_match, alt: string, imagePath: string) => {
      const filename = path.basename(imagePath);
      return `![${alt}](/images/posts/${slug}/${filename})`;
    }
  );
}

/** Notion 내보내기에서 기본 frontmatter 추출 시도 */
function extractFrontmatter(content: string): {
  title?: string;
  body: string;
} {
  // Notion 내보내기는 보통 첫 줄이 # 제목
  const lines = content.split("\n");
  let title: string | undefined;
  let bodyStart = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (line === "") continue;

    if (line.startsWith("# ")) {
      title = line.replace(/^#\s+/, "");
      bodyStart = idx + 1;
    }
    break;
  }

  return {
    title,
    body: lines.slice(bodyStart).join("\n").trim(),
  };
}

/** CSV 파일에서 메타데이터 읽기 (Notion 내보내기에 포함된 경우) */
function readCsvMetadata(
  csvPath: string
): Map<string, { date?: string; tags?: string[] }> {
  const metadata = new Map<string, { date?: string; tags?: string[] }>();

  if (!fs.existsSync(csvPath)) return metadata;

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length < 2) return metadata;

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const titleIdx = headers.findIndex((header) =>
    ["title", "이름", "name"].includes(header)
  );
  const dateIdx = headers.findIndex((header) =>
    ["date", "날짜", "created", "생성일"].includes(header)
  );
  const tagsIdx = headers.findIndex((header) =>
    ["tags", "태그", "tag", "카테고리"].includes(header)
  );

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const values = lines[lineIdx].split(",").map((val) => val.trim().replace(/^"|"$/g, ""));

    if (titleIdx >= 0 && values[titleIdx]) {
      const entry: { date?: string; tags?: string[] } = {};

      if (dateIdx >= 0 && values[dateIdx]) {
        entry.date = values[dateIdx];
      }

      if (tagsIdx >= 0 && values[tagsIdx]) {
        entry.tags = values[tagsIdx]
          .split(/[,;]/)
          .map((tag) => tag.trim())
          .filter(Boolean);
      }

      metadata.set(values[titleIdx], entry);
    }
  }

  return metadata;
}

// --- 메인 ---

function main() {
  const { category, dryRun } = parseArgs();
  const results: MigrationResult[] = [];

  console.log(`\n📦 Notion → shion-blog 마이그레이션`);
  console.log(`   카테고리: ${category}`);
  console.log(`   모드: ${dryRun ? "드라이런 (파일 미생성)" : "실행"}\n`);

  // 입력 디렉토리 확인
  if (!fs.existsSync(NOTION_EXPORT_DIR)) {
    console.error(
      `❌ Notion 내보내기 디렉토리를 찾을 수 없습니다: ${NOTION_EXPORT_DIR}`
    );
    console.error(
      `   scripts/MIGRATION_GUIDE.md를 참고해 Notion에서 내보내기를 먼저 해주세요.`
    );
    process.exit(1);
  }

  // CSV 메타데이터 읽기
  const csvFiles = fs
    .readdirSync(NOTION_EXPORT_DIR)
    .filter((file) => file.endsWith(".csv"));
  let csvMetadata = new Map<string, { date?: string; tags?: string[] }>();

  if (csvFiles.length > 0) {
    csvMetadata = readCsvMetadata(path.join(NOTION_EXPORT_DIR, csvFiles[0]));
    console.log(`📄 CSV 메타데이터 발견: ${csvFiles[0]} (${csvMetadata.size}건)\n`);
  }

  // Markdown 파일 목록
  const mdFiles = fs
    .readdirSync(NOTION_EXPORT_DIR)
    .filter((file) => file.endsWith(".md"));

  if (mdFiles.length === 0) {
    console.log("⚠️  변환할 마크다운 파일이 없습니다.");
    process.exit(0);
  }

  console.log(`📝 발견된 마크다운 파일: ${mdFiles.length}개\n`);

  // 출력 디렉토리 생성
  const categoryDir = path.join(POSTS_DIR, category);
  if (!dryRun) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }

  for (const mdFile of mdFiles) {
    const rawTitle = stripNotionId(mdFile);
    const slug = toSlug(rawTitle);
    const filePath = path.join(NOTION_EXPORT_DIR, mdFile);

    // 이미 존재하는 slug인지 확인
    const outputPath = path.join(categoryDir, `${slug}.md`);
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭️  건너뜀 (이미 존재): ${slug}`);
      results.push({ slug, title: rawTitle, category, imageCount: 0, status: "skipped" });
      continue;
    }

    // 콘텐츠 읽기 및 파싱
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const { title: extractedTitle, body } = extractFrontmatter(rawContent);
    const title = extractedTitle ?? rawTitle;

    // CSV에서 메타데이터 가져오기
    const meta = csvMetadata.get(title) ?? csvMetadata.get(rawTitle) ?? {};
    const date = meta.date ?? new Date().toISOString().split("T")[0];
    const tags = meta.tags ?? [];

    // 이미지 처리
    const imageDir = path.join(
      NOTION_EXPORT_DIR,
      mdFile.replace(/\.md$/, "")
    );
    let imageCount = 0;

    if (fs.existsSync(imageDir) && fs.statSync(imageDir).isDirectory()) {
      const imageFiles = fs
        .readdirSync(imageDir)
        .filter((file) =>
          /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file)
        );

      imageCount = imageFiles.length;

      if (!dryRun && imageCount > 0) {
        const targetImageDir = path.join(IMAGES_DIR, slug);
        fs.mkdirSync(targetImageDir, { recursive: true });

        for (const imageFile of imageFiles) {
          fs.copyFileSync(
            path.join(imageDir, imageFile),
            path.join(targetImageDir, imageFile)
          );
        }
      }
    }

    // 이미지 경로 변환
    const contentWithImages = rewriteImagePaths(body, slug);

    // frontmatter 생성
    const tagsYaml =
      tags.length > 0
        ? `[${tags.map((tag) => `"${tag}"`).join(", ")}]`
        : "[]";

    const output = `---
title: "${title.replace(/"/g, '\\"')}"
description: ""
date: "${date}"
tags: ${tagsYaml}
published: false
---

${contentWithImages}
`;

    if (!dryRun) {
      fs.writeFileSync(outputPath, output, "utf-8");
    }

    const status = dryRun ? "dry-run" : "created";
    console.log(
      `  ${status === "created" ? "✅" : "🔍"} ${title} → ${slug}.md (이미지 ${imageCount}개)`
    );
    results.push({ slug, title, category, imageCount, status });
  }

  // 결과 요약
  console.log(`\n${"─".repeat(50)}`);
  console.log(`📊 결과 요약`);
  console.log(
    `   생성: ${results.filter((result) => result.status === "created").length}개`
  );
  console.log(
    `   건너뜀: ${results.filter((result) => result.status === "skipped").length}개`
  );
  console.log(
    `   이미지: ${results.reduce((sum, result) => sum + result.imageCount, 0)}개`
  );

  if (dryRun) {
    console.log(`\n💡 --dry-run 모드입니다. 실제 파일은 생성되지 않았습니다.`);
    console.log(`   실행하려면: npm run migrate -- --category ${category}`);
  } else {
    console.log(
      `\n⚠️  생성된 파일의 published 값이 false입니다. 확인 후 true로 변경해주세요.`
    );
    console.log(`   description도 각 글에 맞게 작성해주세요.`);
  }
}

main();
