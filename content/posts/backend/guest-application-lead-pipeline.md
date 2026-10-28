---
title: "신청이 어디서 왔는지 남기기 — 비회원 신청과 Meta 리드를 한 DB로"
description: "웹 비회원 폼, 카카오봇, Meta 리드 광고로 따로 들어오던 매칭 신청을 DB로 모으고 UTM을 남긴 과정. 같은 리드가 10분마다 다시 들어오던 버그의 원인은 구글 시트가 긴 숫자를 숫자로 바꾼 것이었다."
date: "2026-09-05"
tags: ["NestJS", "Meta Ads", "Google Sheets", "UTM", "파이프라인"]
published: true
---

## 어디서 온 신청인지 알 수 없었다

매칭 신청이 세 군데로 따로 들어왔다. 웹의 비회원 폼, 카카오봇, Meta 리드 광고였다. 그중 비회원 신청은 DB에 남지 않았고, 광고에서 왔는지 다른 경로에서 왔는지 추적할 수 없었다. 이 글은 그 경로들을 DB 한 곳으로 모으고 출처를 남긴 작업이다.

랜딩에서 바로 신청하는 모달(`ConnectApplicationModal`)부터 DB 저장, 회원 연결, 리드 파이프라인은 내가 만들었다.

## 비회원 신청을 DB에 남기기

6월 15일에 랜딩의 "지금 시작하기"에서 여는 비회원 신청 모달을 만들었다. 이어서 6월 25일에 신청을 케어 API로 보내는 것과 별개로 파트너스 DB에도 저장하는 경로를 넣었고, 6월 30일에는 이 저장 단계에 fail-safe를 더했다(FEAT-009 Phase 2).

그 신청자가 나중에 같은 전화번호로 가입하면 기존 신청이 계정에 붙는다. 비회원이 회원이 될 때 케어 API의 `link-member`를 호출해서 두 기록을 잇는다.

## UTM 이어 붙이기

신청이 어느 광고에서 왔는지가 핵심이었다.

- 카카오로 가입하면 OAuth 왕복 중에 UTM이 사라졌다. 7월 2일에 카카오 OAuth의 `state` 파라미터로 UTM을 실어 보내고 콜백에서 복원하게 했다(BE-BUG-015, FE-BUG-016).
- 8월 10일에 Meta 광고 캠페인이 UTM 캠페인 테이블에 자동으로 들어오는 동기화와 크론을 만들었다. 내가 만든 건 기존 UTM 캠페인 테이블을 Meta 쪽 캠페인으로 자동으로 채우는 일이다.
- 8월 11일에 `NonMemberApplication`에 `utm_source`, `utm_medium`, `utm_campaign` 컬럼을 더하고, 신청 DTO와 서비스에서 `utmCampaign`을 받아 저장하게 했다. 컨트롤러가 값을 넘기지 않는 누락도 같은 날 고쳤다.
- 8월 12일에는 프런트에서 커넥트 신청 때 `utmCampaign`을 보내고, Mixpanel과 GTM 이벤트에도 UTM 속성을 붙였다.

## Meta 리드를 손으로 옮기던 것을 10분마다

Meta 리드 광고로 들어온 사람은 CSV로 받아 사람이 옮기고 있었다. 7월 24일에 CSV를 `NonMemberApplication`에 넣는 스크립트를 먼저 만들고, 8월 18일에 `SheetLeadImportModule`로 바꿔 올렸다. 10분마다 두 단계가 돈다.

1. Meta Lead Ads에서 구글 시트로 새 리드를 추가한다.
2. 구글 시트에서 파트너스 DB와 케어 API로 가져온다.

`phoneHash`로 같은 전화번호를 걸러서 몇 번 실행해도 한 번만 들어가게 했다. 시트에 이미 들어간 리드는 `leadgen_id`로 걸러 중복으로 추가하지 않는다.

## 같은 리드가 10분마다 다시 들어왔다

배포한 뒤 같은 리드가 크론이 돌 때마다 다시 들어오고 Slack 알림도 반복됐다. 8월 28일에 고쳤다.

시트에 리드를 추가할 때 `valueInputOption: 'RAW'`를 썼는데, 구글 시트가 `leadgen_id` 같은 긴 숫자 문자열을 숫자로 바꾸면서 끝자리 정밀도가 날아갔다. 다음 크론이 시트에서 읽은 `leadgen_id`는 Meta가 준 값과 달랐고, 그래서 중복 체크를 통과해 같은 리드가 다시 들어갔다.

`values.append` 대신 `batchUpdate`로 바꾸고, `leadgen_id`(B열), 전화번호(J열), 폼 ID(AC열)는 수식 `="값"`으로 넣어 문자열 타입을 강제했다.

```typescript
const FORCE_TEXT_COLS = new Set<number>([COL.LEADGEN_ID, COL.PHONE, COL.FORM_ID]);

values: row.map((val, colIdx) =>
  FORCE_TEXT_COLS.has(colIdx) && val
    ? { userEnteredValue: { formulaValue: `="${val}"` } }
    : { userEnteredValue: { stringValue: val || '' } },
),
```

내가 만든 중복 방지 로직이 내가 고른 입력 방식 때문에 깨진 경우였다. 중복 체크 키가 길어서 숫자로 읽히는 값이면 저장 단계에서 타입을 고정해야 한다.

## 이어서 한 것

8월 31일에는 이 시트에서 컨택 플레이북 시트를 자동으로 만드는 작업(BE-FEAT-046)을 붙였다.

## 남은 것

이 글에는 비회원 신청 건수를 적지 않았다. 웹 폼 신청에 Meta 리드와 수기로 보정한 값이 섞여 있어서, 한 숫자로 말할 수 없다.
