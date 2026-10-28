---
title: "SAIRO React Native 전환"
description: "Capacitor로 만든 부산 관광 추천 앱을 React Native(Expo)로 옮기며, 전환 공수를 실제 화면으로 재 본 스파이크입니다."
role: "프론트엔드 개발자 (개인)"
period: "2026.09 ~ 진행 중"
stack: ["Expo", "React Native", "expo-router", "NativeWind", "MMKV", "TypeScript"]
github: "https://github.com/shionpark/sairo-rn"
published: true
order: 1
---

Cultural Fit Busan(SAIRO)의 Capacitor 앱을 React Native로 옮길 때 얼마나 드는지 확인하려고, 화면을 실제로 옮겨 보는 스파이크입니다. Android 에뮬레이터에서 실행해 검증했고 iOS는 실행하지 않았습니다. 상세 화면 이식과 저장 탭은 아직 하지 않았습니다.

## 한 일

- **재사용 범위를 숫자로 확인** — 웹의 추천 엔진·타입·데이터 22개 파일 중 20개를 수정 없이 썼습니다(파일 91%, 줄 97%). 고친 2개 파일은 next-intl 의존과 화면 컴포넌트 타입 의존을 제거한 것입니다.
- **저장소 교체** — 웹은 동기 `localStorage`를 써서, 동기 API가 있는 MMKV를 골랐습니다. 원본 `storage.ts` 본문은 그대로 두고 18줄을 추가했고, 앱을 강제로 종료한 뒤에도 값이 남는 것을 확인했습니다. 네이티브 모듈이 Expo Go에서 돌지 않아 dev build(`expo run:android`)로 실행했습니다.
- **추천 훅과 API** — 3개 파일 257줄 중 6줄을 고쳤고, 운영 API 데이터로 웹과 22위까지 같은 순위가 나오는 것을 확인했습니다.
- **피드 화면** — 웹 화면 코드 10개 파일 735줄을 RN 436줄로 다시 썼습니다. 줄높이 배수, em 자간, CSS 변수, 그라데이션, 그림자 같은 CSS로 막힌 8가지를 RN 방식으로 바꿨습니다.
- **티켓·PR 단위 진행** — 티켓마다 브랜치를 만들고 요약·확인·측정을 적은 PR로 남겼습니다. PR 7건을 병합했고 리뷰어는 없었습니다.
