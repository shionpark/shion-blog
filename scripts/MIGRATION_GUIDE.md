# Notion → shion-blog 콘텐츠 마이그레이션 가이드

## 1단계: Notion에서 내보내기

1. [Notion 블로그 데이터베이스](https://app.notion.com/p/shionpark/24bc093a258f4148b49f510212a72d68)를 엽니다
2. 우측 상단 **`···`** 메뉴 클릭 → **내보내기(Export)** 선택
3. 다음 옵션으로 설정:
   - **내보내기 형식**: `Markdown & CSV`
   - **하위 페이지 포함**: `예`
   - **콘텐츠 포함**: `전체`
4. ZIP 파일을 다운로드합니다

## 2단계: 내보낸 파일 배치

1. ZIP 파일의 압축을 풉니다
2. 압축 해제한 폴더를 `scripts/notion-export/` 경로에 배치합니다

```bash
# 예시 디렉토리 구조
scripts/
  notion-export/
    글 제목 abc123.md
    글 제목 abc123/
      image1.png
      image2.png
    다른 글 def456.md
    ...
```

## 3단계: 마이그레이션 스크립트 실행

```bash
# tsx가 없다면 먼저 설치
npm install -g tsx

# 마이그레이션 실행 (카테고리 지정)
npm run migrate -- --category general

# 특정 카테고리로 마이그레이션
npm run migrate -- --category frontend
npm run migrate -- --category backend
npm run migrate -- --category analytics
npm run migrate -- --category career

# 드라이런 (실제 파일 생성 없이 확인만)
npm run migrate -- --dry-run
```

## 4단계: 확인

```bash
# 새로 생성된 포스트 확인
ls content/posts/*/

# 개발 서버로 확인
npm run dev
```

## 주의사항

- **slug**: 파일명에서 Notion ID 접미사를 제거하고 kebab-case로 변환합니다
- **이미지**: `public/images/posts/{slug}/` 경로로 복사됩니다
- **frontmatter**: `published: false`로 생성되므로, 확인 후 `true`로 변경해주세요
- **날짜**: Notion의 Date 속성이 있으면 사용하고, 없으면 파일 수정일을 사용합니다
- **태그**: CSV 파일이 있으면 자동 추출됩니다. 없으면 수동 입력이 필요합니다
