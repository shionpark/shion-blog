---
title: "Obsidian + Astro로 팀 분석 리포트 자동 배포하기"
description: "4인 스타트업에서 주간 분석 리포트 작성·공유의 비효율을 자동화한 과정. Google Sheets API 수집, Astro 정적 사이트 배포, Notion 전환, R&D 공고 크롤러까지."
date: "2026-08-24"
tags: ["자동화", "인톡 파트너스", "Astro", "DX"]
published: true
---

## 배경

인톡 파트너스는 4인 팀이다. 개발자 1명, 대표, 마케터, 기획자. 사람이 적으니 모든 정보가 빠르게 공유되어야 하는데, 주간 분석 리포트 작성·공유 과정이 비효율적이었다.

매주 월요일 아침, 이런 루틴이 반복됐다.

1. Google Analytics에서 유입 데이터 확인
2. Google Sheets에 수동으로 정리
3. 전환율, 채널별 유입 비율 계산
4. Slack에 텍스트로 요약 공유
5. 대표가 추가 질문 → 다시 시트 열어서 확인

데이터 수집부터 공유까지 매주 2~3시간이 걸렸다. 자동화해야 했다.

## 1단계: Google Sheets API로 데이터 수집 자동화

첫 번째로 한 건 수동 데이터 입력을 없애는 것이었다. Google Sheets API를 통해 주간 성과 지표를 자동 수집하는 스크립트를 만들었다.

```python
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime, timedelta

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

def get_weekly_metrics(sheet_id: str, week_number: int) -> dict:
    """주간 성과 지표를 Google Sheets에서 수집한다."""
    credentials = Credentials.from_service_account_file(
        "credentials.json", scopes=SCOPES
    )
    client = gspread.authorize(credentials)
    sheet = client.open_by_key(sheet_id)

    # 주간 데이터 시트에서 해당 주차 행 조회
    worksheet = sheet.worksheet(f"W{week_number}")
    records = worksheet.get_all_records()

    metrics = {
        "signups": sum(row["가입수"] for row in records),
        "conversions": sum(row["전환수"] for row in records),
        "utm_channels": {},
    }

    # 채널별 유입 집계
    for row in records:
        channel = row["utm_source"]
        if channel not in metrics["utm_channels"]:
            metrics["utm_channels"][channel] = {"visits": 0, "signups": 0}
        metrics["utm_channels"][channel]["visits"] += row["방문수"]
        metrics["utm_channels"][channel]["signups"] += row["가입수"]

    return metrics
```

이 스크립트를 GitHub Actions 크론으로 매주 월요일 오전 8시에 실행했다. 수집된 데이터는 JSON으로 저장되고, 이 JSON이 리포트 생성의 입력값이 된다.

## 2단계: Obsidian에서 마크다운 리포트 작성

데이터를 수집했으면 리포트로 만들어야 한다. Obsidian 볼트에 주간 분석 리포트 템플릿을 만들고, W21~W34까지 일관된 형식으로 작성했다.

템플릿 구조는 이렇다.

```markdown
# W{{week_number}} 주간 분석 리포트

## 핵심 지표
- 가입: {{signups}}명 (전주 대비 {{signup_change}}%)
- 전환: {{conversions}}명 (전환율 {{conversion_rate}}%)

## 채널별 유입
| 채널 | 방문 | 가입 | 전환율 |
|------|------|------|--------|
{{#each channels}}
| {{source}} | {{visits}} | {{signups}} | {{rate}}% |
{{/each}}

## 인사이트
- {{insight_1}}
- {{insight_2}}

## 다음 주 액션 아이템
- [ ] {{action_1}}
- [ ] {{action_2}}
```

Python 스크립트가 수집된 JSON 데이터를 이 템플릿에 주입해서 마크다운 파일을 생성한다. 인사이트와 액션 아이템은 직접 작성하지만, 숫자 정리 작업이 사라진 것만으로도 리포트 작성 시간이 2시간에서 30분으로 줄었다.

## 3단계: Astro 기반 정적 사이트 구축

마크다운 리포트를 Slack에 텍스트로 공유하면 가독성이 떨어진다. 표가 깨지고, 차트를 넣을 수도 없다. Astro로 정적 사이트를 만들어서 리포트를 HTML로 렌더링하고, Vercel에 배포하기로 했다.

```typescript
// astro.config.ts
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://analytics.intalk.io",
  integrations: [],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          assetFileNames: "assets/[hash][extname]",
        },
      },
    },
  },
});
```

```typescript
// src/pages/reports/[week].astro
---
import { getCollection } from "astro:content";
import ReportLayout from "../../layouts/ReportLayout.astro";

export async function getStaticPaths() {
  const reports = await getCollection("reports");
  return reports.map((report) => ({
    params: { week: report.slug },
    props: { report },
  }));
}

const { report } = Astro.props;
const { Content } = await report.render();
---

<ReportLayout title={report.data.title} date={report.data.date}>
  <Content />
</ReportLayout>
```

Obsidian 볼트의 마크다운 파일을 Astro의 `content/reports/` 디렉토리에 복사하면, 빌드 시 HTML로 변환되어 배포된다. 팀원들은 URL 하나로 모든 주차 리포트에 접근할 수 있게 됐다.

## 4단계: Notion API 전환

Google Sheets로 운영한 지 3개월쯤 됐을 때, 데이터 소스를 Notion으로 이전했다. 이유는 두 가지였다.

**첫째, 구조화된 데이터 관리.** Google Sheets는 행/열 기반이라 데이터 구조를 강제할 수 없다. 누군가 열을 추가하거나 형식을 바꾸면 자동화 스크립트가 깨진다. Notion 데이터베이스는 프로퍼티 타입을 강제할 수 있어서 더 안정적이다.

**둘째, Slack 통합.** Notion API + Slack Incoming Webhook을 연결해서, 리포트가 생성되면 Slack에 자동으로 알림을 보내는 워크플로우를 구성했다. 세션 로그도 Slack에서 Notion으로 자동 동기화되도록 했다.

```python
import requests
from typing import Any

NOTION_API_URL = "https://api.notion.com/v1"

def query_weekly_database(
    database_id: str, week_number: int, notion_token: str,
) -> list[dict[str, Any]]:
    """Notion 데이터베이스에서 주간 데이터를 쿼리한다."""
    headers = {
        "Authorization": f"Bearer {notion_token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }
    response = requests.post(
        f"{NOTION_API_URL}/databases/{database_id}/query",
        headers=headers,
        json={
            "filter": {"property": "주차", "number": {"equals": week_number}},
            "sorts": [{"property": "날짜", "direction": "ascending"}],
        },
    )
    response.raise_for_status()
    return [
        {
            "date": page["properties"]["날짜"]["date"]["start"],
            "signups": page["properties"]["가입수"]["number"],
            "conversions": page["properties"]["전환수"]["number"],
            "utm_source": page["properties"]["채널"]["select"]["name"],
        }
        for page in response.json()["results"]
    ]

def send_slack_notification(webhook_url: str, report_url: str, week: int):
    """리포트 배포 완료 시 Slack에 알림을 보낸다."""
    requests.post(webhook_url, json={
        "text": f"W{week} 주간 분석 리포트가 배포되었습니다.",
        "blocks": [{
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*W{week}*\n<{report_url}|리포트 보기>"},
        }],
    })
```

## R&D 지원사업 공고 크롤러

리포트 자동화를 하면서 "반복적인 정보 수집"을 자동화하는 패턴이 잡혔다. 같은 패턴을 R&D 지원사업 공고 수집에도 적용했다.

스타트업에서 정부 R&D 지원사업 공고를 놓치면 큰 손해다. 하지만 여러 사이트를 매일 확인하는 건 현실적으로 불가능했다. Python 크롤러를 만들고 GitHub Actions 크론으로 매일 실행했다.

```yaml
# .github/workflows/rnd-crawler.yml
name: R&D 공고 크롤러

on:
  schedule:
    - cron: "0 0 * * 1-5"  # 평일 09:00 KST
  workflow_dispatch:

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: 의존성 설치
        run: pip install -r scripts/rnd-crawler/requirements.txt

      - name: 공고 수집
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: python scripts/rnd-crawler/main.py

      - name: 결과 커밋
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add scripts/rnd-crawler/data/
          git diff --cached --quiet || git commit -m "chore: R&D 공고 데이터 업데이트"
          git push
```

새로운 공고가 감지되면 Slack으로 요약 알림이 온다. 대표가 매일 아침 확인하던 루틴이 사라졌다.

## CI/CD: PR 품질 검증 워크플로우

자동화 스크립트가 늘어나면서, 코드 품질 관리도 자동화했다. PR이 올라오면 ESLint, Prettier, 타입 체크를 자동으로 실행하는 워크플로우를 도입했다.

```yaml
# .github/workflows/pr-quality.yml
name: PR Quality Check

on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: 타입 체크
        run: pnpm type-check

      - name: 포맷 검증
        run: pnpm prettier --check "src/**/*.{ts,tsx}"
```

사소해 보이지만 효과가 컸다. 1인 개발이라 코드 리뷰어가 없는 상황에서, CI가 최소한의 품질 게이트 역할을 해줬다. 포맷팅 불일치로 diff가 지저분해지는 일도 사라졌다.

## 마치며

이 작업들을 관통하는 원칙은 하나다. **반복되는 일은 사람이 하지 않는다.**

4인 스타트업에서 개발자가 1명이면, 자동화하지 않으면 병목이 된다. 리포트 작성, 공고 확인, 코드 포맷팅 같은 일에 시간을 쓰면 정작 제품 개발에 쓸 시간이 줄어든다.

자동화 효과를 숫자로 정리하면 이렇다.

| 작업 | 자동화 전 | 자동화 후 |
|------|-----------|-----------|
| 주간 리포트 작성 | 2~3시간/주 | 30분/주 |
| R&D 공고 확인 | 30분/일 | 0분 (Slack 알림) |
| 코드 포맷팅 수동 수정 | 수시 | 0분 (CI 자동 검증) |
| 리포트 공유 (Slack 복붙) | 10분/주 | 0분 (URL 자동 발송) |

총 절약 시간은 주당 약 5~6시간이다. 이 시간에 제품 기능을 개발하는 게 훨씬 가치 있었다.

기술적으로 어려운 건 없었다. Google Sheets API, Notion API, GitHub Actions 크론 — 모두 잘 문서화된 도구들이다. 중요한 건 "이걸 자동화해야겠다"는 판단을 빠르게 내리고, 처음부터 완벽하지 않아도 일단 돌아가게 만드는 것이다. Google Sheets에서 시작해서 Notion으로 이전한 것처럼, 점진적으로 개선하면 된다.
