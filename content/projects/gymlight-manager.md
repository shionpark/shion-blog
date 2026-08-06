---
title: "Gymlight Manager"
description: "다지점 헬스장 운영 관리 시스템. 회원·직원·상품·출석·매출 데이터를 통합하고, 조회 시점 분리와 권한 로직 통합으로 렌더링 비용과 유지보수 범위를 줄였습니다."
role: "프론트엔드 엔지니어"
period: "2023.12 ~ 2025.04"
stack: ["React", "TypeScript", "TanStack Query"]
url: "https://gymlight-demo.vercel.app"
github: "https://github.com/shionpark/gymlight-demo"
published: true
order: 3
---

## 개요

다지점 헬스장의 통합 운영 관리 시스템입니다. 회원, 직원, 상품, 출석, 매출 데이터를 하나의 대시보드에서 관리할 수 있도록 설계했습니다.

## 주요 기여

- **조회 시점 분리**: 실시간 조회와 배치 조회를 분리하여 불필요한 렌더링 비용 절감
- **권한 로직 통합**: 분산된 권한 체크 로직을 공통 레이어로 추출하여 유지보수 범위 축소
- **다지점 데이터 통합**: 복수 지점의 회원·매출 데이터를 통합 조회할 수 있는 대시보드 구현
