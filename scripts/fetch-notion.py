"""
Notion DB → Markdown 변환 스크립트
.env.local의 NOTION_TOKEN으로 블로그 DB의 모든 글을 가져와 content/posts/에 저장합니다.

Usage:
  python3 scripts/fetch-notion.py
  python3 scripts/fetch-notion.py --dry-run
  python3 scripts/fetch-notion.py --status Public   # Public 글만
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# --- 설정 ---

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env.local"
POSTS_DIR = ROOT / "content" / "posts"
OUTPUT_LOG = []

# .env.local 파싱
env = {}
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and "=" in line and not line.startswith("#"):
            key, val = line.split("=", 1)
            env[key.strip()] = val.strip()

NOTION_TOKEN = env.get("NOTION_TOKEN", "")
DB_ID = "24bc093a-258f-4148-b49f-510212a72d68"

if not NOTION_TOKEN:
    print("❌ .env.local에 NOTION_TOKEN이 없습니다.")
    sys.exit(1)

DRY_RUN = "--dry-run" in sys.argv
STATUS_FILTER = None
for idx, arg in enumerate(sys.argv):
    if arg == "--status" and idx + 1 < len(sys.argv):
        STATUS_FILTER = sys.argv[idx + 1]


# --- Notion API 헬퍼 ---

def notion_request(endpoint, method="GET", body=None):
    url = f"https://api.notion.com/v1/{endpoint}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {NOTION_TOKEN}")
    req.add_header("Notion-Version", "2022-06-28")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as err:
        body_text = err.read().decode()
        print(f"  ⚠️  API 오류 ({err.code}): {body_text[:200]}")
        return None


def fetch_all_pages():
    """DB의 모든 페이지를 페이지네이션으로 가져오기"""
    pages = []
    has_more = True
    start_cursor = None

    while has_more:
        body = {"page_size": 100}
        if start_cursor:
            body["start_cursor"] = start_cursor

        result = notion_request(f"databases/{DB_ID}/query", method="POST", body=body)
        if not result:
            break

        pages.extend(result.get("results", []))
        has_more = result.get("has_more", False)
        start_cursor = result.get("next_cursor")

    return pages


def fetch_blocks(page_id):
    """페이지의 모든 블록을 재귀적으로 가져오기"""
    blocks = []
    has_more = True
    start_cursor = None

    while has_more:
        endpoint = f"blocks/{page_id}/children?page_size=100"
        if start_cursor:
            endpoint += f"&start_cursor={start_cursor}"

        result = notion_request(endpoint)
        if not result:
            break

        for block in result.get("results", []):
            blocks.append(block)
            # 하위 블록이 있으면 재귀
            if block.get("has_children"):
                children = fetch_blocks(block["id"])
                block["_children"] = children

        has_more = result.get("has_more", False)
        start_cursor = result.get("next_cursor")

    return blocks


# --- 속성 추출 ---

def get_title(props):
    for key, val in props.items():
        if val.get("type") == "title":
            return "".join(t.get("plain_text", "") for t in val.get("title", []))
    return ""


def get_rich_text(props, name):
    val = props.get(name, {})
    if val.get("type") == "rich_text":
        return "".join(t.get("plain_text", "") for t in val.get("rich_text", []))
    return ""


def get_select(props, name):
    val = props.get(name, {})
    if val.get("type") == "select" and val.get("select"):
        return val["select"].get("name", "")
    return ""


def get_multi_select(props, name):
    val = props.get(name, {})
    if val.get("type") == "multi_select":
        return [t.get("name", "") for t in val.get("multi_select", [])]
    return []


def get_date(props, name):
    val = props.get(name, {})
    if val.get("type") == "date" and val.get("date"):
        return val["date"].get("start", "")
    return ""


# --- 블록 → 마크다운 변환 ---

def rich_text_to_md(rich_texts):
    """Notion rich_text 배열을 마크다운 문자열로 변환"""
    parts = []
    for rt in rich_texts:
        text = rt.get("plain_text", "")
        annotations = rt.get("annotations", {})
        href = rt.get("href")

        if annotations.get("code"):
            text = f"`{text}`"
        if annotations.get("bold"):
            text = f"**{text}**"
        if annotations.get("italic"):
            text = f"*{text}*"
        if annotations.get("strikethrough"):
            text = f"~~{text}~~"
        if href:
            text = f"[{text}]({href})"

        parts.append(text)
    return "".join(parts)


def blocks_to_markdown(blocks, indent=0):
    """블록 리스트를 마크다운 문자열로 변환"""
    lines = []
    prefix = "  " * indent

    for block in blocks:
        block_type = block.get("type", "")
        data = block.get(block_type, {})
        rich_texts = data.get("rich_text", [])
        text = rich_text_to_md(rich_texts)

        if block_type == "paragraph":
            lines.append(f"{prefix}{text}")
            lines.append("")

        elif block_type.startswith("heading_"):
            level = int(block_type[-1])
            hashes = "#" * level
            lines.append(f"{prefix}{hashes} {text}")
            lines.append("")

        elif block_type == "bulleted_list_item":
            lines.append(f"{prefix}- {text}")
            if block.get("_children"):
                lines.append(blocks_to_markdown(block["_children"], indent + 1))

        elif block_type == "numbered_list_item":
            lines.append(f"{prefix}1. {text}")
            if block.get("_children"):
                lines.append(blocks_to_markdown(block["_children"], indent + 1))

        elif block_type == "to_do":
            checked = "x" if data.get("checked") else " "
            lines.append(f"{prefix}- [{checked}] {text}")

        elif block_type == "toggle":
            lines.append(f"{prefix}<details>")
            lines.append(f"{prefix}<summary>{text}</summary>")
            lines.append("")
            if block.get("_children"):
                lines.append(blocks_to_markdown(block["_children"], indent))
            lines.append(f"{prefix}</details>")
            lines.append("")

        elif block_type == "code":
            lang = data.get("language", "")
            code_text = "".join(t.get("plain_text", "") for t in rich_texts)
            lines.append(f"{prefix}```{lang}")
            lines.append(code_text)
            lines.append(f"{prefix}```")
            lines.append("")

        elif block_type == "quote":
            for line in text.split("\n"):
                lines.append(f"{prefix}> {line}")
            lines.append("")

        elif block_type == "callout":
            icon = ""
            icon_data = data.get("icon")
            if icon_data and icon_data.get("type") == "emoji":
                icon = icon_data.get("emoji", "") + " "
            lines.append(f"{prefix}> {icon}{text}")
            lines.append("")

        elif block_type == "divider":
            lines.append(f"{prefix}---")
            lines.append("")

        elif block_type == "image":
            img_data = data
            img_type = img_data.get("type", "")
            img_url = ""
            if img_type == "file":
                img_url = img_data.get("file", {}).get("url", "")
            elif img_type == "external":
                img_url = img_data.get("external", {}).get("url", "")
            caption = ""
            if img_data.get("caption"):
                caption = rich_text_to_md(img_data["caption"])
            lines.append(f"{prefix}![{caption}]({img_url})")
            lines.append("")

        elif block_type == "bookmark":
            url = data.get("url", "")
            caption = rich_text_to_md(data.get("caption", []))
            lines.append(f"{prefix}[{caption or url}]({url})")
            lines.append("")

        elif block_type == "embed":
            url = data.get("url", "")
            lines.append(f"{prefix}[{url}]({url})")
            lines.append("")

        elif block_type == "table":
            if block.get("_children"):
                for row_idx, row in enumerate(block["_children"]):
                    cells = row.get("table_row", {}).get("cells", [])
                    cell_texts = [rich_text_to_md(cell) for cell in cells]
                    lines.append(f"{prefix}| {' | '.join(cell_texts)} |")
                    if row_idx == 0:
                        lines.append(f"{prefix}| {' | '.join(['---'] * len(cell_texts))} |")
                lines.append("")

        elif block_type == "child_page":
            page_title = data.get("title", "")
            lines.append(f"{prefix}📄 **{page_title}**")
            lines.append("")

        elif block_type == "column_list":
            if block.get("_children"):
                for col in block["_children"]:
                    if col.get("_children"):
                        lines.append(blocks_to_markdown(col["_children"], indent))

        # 알 수 없는 블록은 조용히 무시

    return "\n".join(lines)


# --- 슬러그 생성 ---

def to_slug(text):
    import re
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s가-힣-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug


# --- 메인 ---

def main():
    print(f"\n📦 Notion DB → shion-blog 마크다운 변환")
    print(f"   모드: {'드라이런' if DRY_RUN else '실행'}")
    if STATUS_FILTER:
        print(f"   상태 필터: {STATUS_FILTER}")
    print()

    # 1. 모든 페이지 가져오기
    print("📡 페이지 목록 가져오는 중...")
    pages = fetch_all_pages()
    print(f"   {len(pages)}개 페이지 발견\n")

    # 2. 기존 shion-blog 글 slug 확인 (중복 방지)
    existing_slugs = set()
    if POSTS_DIR.exists():
        for category_dir in POSTS_DIR.iterdir():
            if category_dir.is_dir():
                for md_file in category_dir.glob("*.md"):
                    existing_slugs.add(md_file.stem)

    created = 0
    skipped = 0
    errors = 0

    for page in pages:
        props = page.get("properties", {})
        page_id = page["id"]

        title = get_title(props)
        if not title.strip():
            skipped += 1
            continue

        status = get_select(props, "status")
        page_type = get_select(props, "type")
        category = get_select(props, "category").lower() or "general"
        tags = get_multi_select(props, "tags")
        date = get_date(props, "date")
        summary = get_rich_text(props, "summary")
        slug_raw = get_rich_text(props, "slug")

        # 상태 필터
        if STATUS_FILTER and status != STATUS_FILTER:
            skipped += 1
            continue

        # Page/Paper 등 블로그 글이 아닌 항목은 건너뛰기
        if page_type and page_type not in ("Post", ""):
            skipped += 1
            continue

        slug = slug_raw if slug_raw else to_slug(title)
        if not slug:
            skipped += 1
            continue

        # 이미 존재하는 글은 건너뛰기
        if slug in existing_slugs:
            print(f"  ⏭️  이미 존재: {title} ({slug})")
            skipped += 1
            continue

        # 본문 가져오기
        print(f"  📝 {title}...", end="", flush=True)
        time.sleep(0.35)  # rate limit

        blocks = fetch_blocks(page_id)
        if blocks is None:
            print(" ❌ 블록 가져오기 실패")
            errors += 1
            continue

        content = blocks_to_markdown(blocks)
        content = content.strip()

        if not content:
            print(" (빈 본문, 건너뜀)")
            skipped += 1
            continue

        # 날짜 기본값
        if not date:
            created_time = page.get("created_time", "")
            date = created_time[:10] if created_time else "2025-01-01"

        # 카테고리 정리 (Notion 이모지 카테고리 → shion-blog 영어 카테고리)
        category_map = {
            "": "general",
            "💻 dev": "frontend",
            "📗 docs": "frontend",
            "🌐 web": "frontend",
            "🎨 ui/ux": "frontend",
            "👩🏻‍💻 project": "career",
            "📝 review": "career",
            "📄 article": "general",
            "general": "general",
        }
        category = category_map.get(category, "general")

        # frontmatter 생성
        tags_yaml = json.dumps(tags, ensure_ascii=False) if tags else "[]"
        escaped_title = title.replace('"', '\\"')
        escaped_summary = summary.replace('"', '\\"') if summary else ""

        frontmatter = f'''---
title: "{escaped_title}"
description: "{escaped_summary}"
date: "{date}"
tags: {tags_yaml}
published: false
---'''

        output = f"{frontmatter}\n\n{content}\n"

        if not DRY_RUN:
            category_dir = POSTS_DIR / category
            category_dir.mkdir(parents=True, exist_ok=True)
            output_path = category_dir / f"{slug}.md"
            output_path.write_text(output, encoding="utf-8")

        existing_slugs.add(slug)
        created += 1
        print(f" ✅ → {category}/{slug}.md")

    # 결과 요약
    print(f"\n{'─' * 50}")
    print(f"📊 결과 요약")
    print(f"   생성: {created}개")
    print(f"   건너뜀: {skipped}개")
    print(f"   오류: {errors}개")

    if DRY_RUN:
        print(f"\n💡 드라이런 모드입니다. 실제 파일은 생성되지 않았습니다.")
        print(f"   실행하려면: python3 scripts/fetch-notion.py")
    else:
        print(f"\n⚠️  생성된 파일의 published는 false입니다.")
        print(f"   확인 후 공개할 글만 true로 변경해주세요.")


if __name__ == "__main__":
    main()
