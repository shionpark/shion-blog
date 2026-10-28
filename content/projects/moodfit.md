---
title: "MOODFIT"
description: "분위기로 찾는 패션 추천 서비스. 3인 팀에서 프론트엔드와 앱 빌드를 맡아 웹·앱 공용 빌드로 전환하고 팀원 PR을 리뷰했습니다."
role: "프론트엔드 개발자 (3인 팀)"
period: "2026.08 ~ 진행 중"
stack: ["Next.js", "TypeScript", "Tailwind CSS", "Supabase", "Capacitor"]
url: "https://mood-app-blond.vercel.app"
github: "https://github.com/moodyfit/mood-app"
published: true
order: 3
---

옷 이름이 아니라 분위기로 검색해 패션을 찾는 서비스입니다. 3인 팀이고 저는 8월 중순부터 프론트엔드와 앱 빌드를 맡았습니다. 제품 원칙과 무드 분류 체계는 다른 팀원이 정했습니다.

## 맡은 일

- **웹·앱 공용 빌드** — 서버 컴포넌트와 ISR에 기대던 웹을 앱으로 감싸려면 정적 빌드가 되어야 했습니다. 기존 코드를 더 살릴 수 있는 Capacitor로 팀과 방향을 정하고, 서버 페이지 5개를 클라이언트 데이터 훅으로 바꾼 뒤 빌드를 웹과 앱 두 갈래로 나눴습니다. 네이티브 기능 호출은 플랫폼 분기로 감싸 웹 동작을 유지했고, iOS 시뮬레이터까지 실행했습니다.
- **PR 리뷰** — 팀원 PR을 리뷰하고 머지하면서 인증 없이 service key로 호출되던 API, 이미지 경로가 두 번 붙는 문제, DOM이 끝없이 늘어나는 목록을 찾았습니다. 팀원이 반영한 뒤 머지했습니다.
