---
title: "Date Picker"
description: ""
date: "2026-01-02"
tags: []
published: true
---

최근 프로젝트 요구사항에 맞춰 Calendar(DatePicker) 컴포넌트를 전반적으로 개선했습니다.

구조적 리팩토링(PR [#110](https://github.com/runfit26/run-fit/pull/110))을 진행하는 과정에서 자연스럽게 UX 측면에서도 개선해야 할 지점들이 보여 함께 수정하게 되었습니다.

이 문서는 **구조‧타입 정리와 분리해서**,
사용자 경험(UX)에 직접적인 영향을 주는 변화만을 핵심적으로 다룹니다.

구조 개선 과정은 [이 Discussion](https://github.com/fesi12-team1/run-fit/discussions/114)에 상세히 정리되어 있습니다.

---

## 문제 발견

이전 PR([#55](https://github.com/runfit26/run-fit/pull/55))에서 shadcn Calendar 기반으로 날짜/시간 선택 UI를 구성했습니다.

하지만 실제 사용 시 다음과 같은 UX 문제들이 확인되었습니다:

1. 단일/범위 선택 UX가 직관적이지 않음
(ex: `2~10` 선택 후 `3` 클릭 시 `3~10`이 아닌 `2~3`으로 축소)
1. 지난 날짜(disabled)가 hover/pointer로 인해 클릭 가능한 요소처럼 보임
1. DayButton 크기가 반응형 환경에서 유지되지 않아 range 배경이 끊겨 보임
1. today / range / outside 스타일 우선순위 충돌
이 문제들은 모두 날짜 선택 경험과 직결되기 때문에 이번 개선 작업의 핵심 목표가 되었습니다.

---

## 주요 개선 내용

### **1. Range 선택 UX — Start-Date First Selection 방식으로 개선**

기존에는 range가 선택된 상태에서 다른 날짜를 클릭하면
사용자가 의도하지 않은 방식으로 "range가 재조정"되는 문제가 있었습니다.

> **기존 문제 예시**

> **개선된 규칙 (Start-Date First Selection)**

즉, **언제든지 클릭 2번으로 새로운 범위를 선택할 수 있는 일관된 UX**로 변경했습니다.

![기존 동작](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/bfb31ea3-d2a4-40ec-bc41-eca9aba46b4c/%E1%84%92%E1%85%AA%E1%84%86%E1%85%A7%E1%86%AB_%E1%84%80%E1%85%B5%E1%84%85%E1%85%A9%E1%86%A8_2025-12-10_00.04.29.gif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RFOIZ4DW%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152759Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJIMEYCIQCx%2Bpd%2FlTKn0RTD0SmUOA90dMZeL1ccLAvYviztyTwBTwIhAM8GZ2OKXSWKKkAEhok9riBMrwg2%2FX7FlnSxx9cl79VzKv8DCCcQABoMNjM3NDIzMTgzODA1Igwae%2BtgPIzs%2B9GjiKkq3ANDM5IBd%2Bjy%2BRp1lpF5%2Bv8DpU1d5fstxkgOaeCNSmvslo9aLWXSCliKEQZxCzKVYL1keF8c7GNuxOsbIPrtkjJ1%2FLs0014gVnzp45ubth0xG9%2BfOGQ4kxsqY29rPIlO8j8r78uAOl3CjcKgFPIWkKgeI2LuDLbqQljY6F%2FQ783oAjpgndPwChwcA1MmZSS9R9r77MLY6kud8saf3Vdw0Wp0OHo9kM8NteAvgOlzCfwTCHNEiGWxEn%2B6nhYvQFXGvVo5EoTrFQzv8lfy%2BLCuktjfXgzfGyB02U7O9KcGiLsHFMZ7gvk2z59iHcLZIuNkgooxhDyyCeOM%2BZayv3mplpnRi3HY9wYds6I9bo95zJZ57Rjyc9JWxvXaU9pI%2B%2BDjniHHkLiCZ3fQ1Xr5M%2BFKvBzinE0aBU9opcMWi1GVlTIdNhJV2pTA79a1WWctyOGq12%2FH7%2FpdVVi9cNa0mXziDQpYRw6vPsTC3P21%2FFv9CVGBB1azUnqXEwmwTdgwQgFTHcpLjjkusq9JwEpdCzJJOHPsl2ApmHwhkXwRFNF4ekXEUjSRDBmvRlYKDIACcXsoTcf0aFGCn4cuFkhRHa4vn%2FtWPtth7HnJ7k5lVfVPWuCmBBpPie7nsJ0ISYmN1DCGi83TBjqkAS4uMcVVoFgDvnfpxjOYPFhEoMkKggiYIPn16gahogsaGK%2Bw2I6S9eDmVFVC3dGMmS3GqSCKe6qfsA1iktcUh%2FNFDmjJHwGbJ6lHFHzMGojYOVXKDYUneMNY5CWVJb6%2BmsySEk2j0dxl%2Fa%2FDHc7mDfD%2BUMqcun4KzGoBPoc7xAQBvrJ5C6jLhsp7nGD4vHSn8g4KgpE%2B6yCEQI%2Fccuj3q3VutJP7&X-Amz-Signature=613c131286e96af35124fd0a56eaad453bf124e56189bfe5af05039a212e1b12&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

![개선 이후 동작](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/d91727d6-1421-4575-9e0e-526f083bd9f3/%E1%84%92%E1%85%AA%E1%84%86%E1%85%A7%E1%86%AB_%E1%84%80%E1%85%B5%E1%84%85%E1%85%A9%E1%86%A8_2025-12-10_00.07.21.gif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RFOIZ4DW%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152759Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJIMEYCIQCx%2Bpd%2FlTKn0RTD0SmUOA90dMZeL1ccLAvYviztyTwBTwIhAM8GZ2OKXSWKKkAEhok9riBMrwg2%2FX7FlnSxx9cl79VzKv8DCCcQABoMNjM3NDIzMTgzODA1Igwae%2BtgPIzs%2B9GjiKkq3ANDM5IBd%2Bjy%2BRp1lpF5%2Bv8DpU1d5fstxkgOaeCNSmvslo9aLWXSCliKEQZxCzKVYL1keF8c7GNuxOsbIPrtkjJ1%2FLs0014gVnzp45ubth0xG9%2BfOGQ4kxsqY29rPIlO8j8r78uAOl3CjcKgFPIWkKgeI2LuDLbqQljY6F%2FQ783oAjpgndPwChwcA1MmZSS9R9r77MLY6kud8saf3Vdw0Wp0OHo9kM8NteAvgOlzCfwTCHNEiGWxEn%2B6nhYvQFXGvVo5EoTrFQzv8lfy%2BLCuktjfXgzfGyB02U7O9KcGiLsHFMZ7gvk2z59iHcLZIuNkgooxhDyyCeOM%2BZayv3mplpnRi3HY9wYds6I9bo95zJZ57Rjyc9JWxvXaU9pI%2B%2BDjniHHkLiCZ3fQ1Xr5M%2BFKvBzinE0aBU9opcMWi1GVlTIdNhJV2pTA79a1WWctyOGq12%2FH7%2FpdVVi9cNa0mXziDQpYRw6vPsTC3P21%2FFv9CVGBB1azUnqXEwmwTdgwQgFTHcpLjjkusq9JwEpdCzJJOHPsl2ApmHwhkXwRFNF4ekXEUjSRDBmvRlYKDIACcXsoTcf0aFGCn4cuFkhRHa4vn%2FtWPtth7HnJ7k5lVfVPWuCmBBpPie7nsJ0ISYmN1DCGi83TBjqkAS4uMcVVoFgDvnfpxjOYPFhEoMkKggiYIPn16gahogsaGK%2Bw2I6S9eDmVFVC3dGMmS3GqSCKe6qfsA1iktcUh%2FNFDmjJHwGbJ6lHFHzMGojYOVXKDYUneMNY5CWVJb6%2BmsySEk2j0dxl%2Fa%2FDHc7mDfD%2BUMqcun4KzGoBPoc7xAQBvrJ5C6jLhsp7nGD4vHSn8g4KgpE%2B6yCEQI%2Fccuj3q3VutJP7&X-Amz-Signature=3a277b5c361d1dd856c232e83e7f083b2e83bc649b66a30f5cdc3816f077aff7&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

### **2. 지난 날짜 선택 불가(disablePastDates) 기능 추가**

지난 날짜는 모임 생성에 사용될 수 없기 때문에 완전히 비활성화해야 합니다.

이번 개선에서는:

- 오늘 이전 날짜는 클릭 불가능
- hover/pointer/active 효과 제거
- outsideDays도 pointer가 나타나지 않도록 수정
- range Start-Date로도 사용할 수 없음
→ **“지난 날짜는 절대 선택되지 않는다”는 UX가 일관적으로 보장됨**

### **3. DayButton 레이아웃 보완**

반응형 환경에서 DayButton이 정사각형을 유지하지 못해

range 배경이 들쭉날쭉해지는 문제가 있었습니다.

### **개선 방법**

- wrapper에 `aspect-square` 적용하여 항상 정사각형 유지
- range 배경 및 radius는 wrapper에서 통일 처리
- button 크기는 `-cell-size` 기준으로 고정
→ 화면 크기와 상관없이 균일한 달력 UI 유지

### **4. today / range / outside 스타일 우선순위 재정의**

기존에는 스타일 우선순위가 뒤섞여 몇 가지 혼란이 있었습니다:

- today가 range에 덮이거나, 반대로 너무 강조됨
- outside 날짜가 선택된 것처럼 보이기도 함
### **개선된 우선순위**

1. **range (최우선)**
1. **today (range가 아닐 때 강조)**
1. **outside (항상 가장 낮은 우선순위)**
이제 시각적으로 명확하고 일관된 날짜 상태 표현이 가능합니다.

![초기 화면](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/9192fd7c-0d92-4aa2-ba4d-b958c9eaa774/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RFOIZ4DW%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152759Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJIMEYCIQCx%2Bpd%2FlTKn0RTD0SmUOA90dMZeL1ccLAvYviztyTwBTwIhAM8GZ2OKXSWKKkAEhok9riBMrwg2%2FX7FlnSxx9cl79VzKv8DCCcQABoMNjM3NDIzMTgzODA1Igwae%2BtgPIzs%2B9GjiKkq3ANDM5IBd%2Bjy%2BRp1lpF5%2Bv8DpU1d5fstxkgOaeCNSmvslo9aLWXSCliKEQZxCzKVYL1keF8c7GNuxOsbIPrtkjJ1%2FLs0014gVnzp45ubth0xG9%2BfOGQ4kxsqY29rPIlO8j8r78uAOl3CjcKgFPIWkKgeI2LuDLbqQljY6F%2FQ783oAjpgndPwChwcA1MmZSS9R9r77MLY6kud8saf3Vdw0Wp0OHo9kM8NteAvgOlzCfwTCHNEiGWxEn%2B6nhYvQFXGvVo5EoTrFQzv8lfy%2BLCuktjfXgzfGyB02U7O9KcGiLsHFMZ7gvk2z59iHcLZIuNkgooxhDyyCeOM%2BZayv3mplpnRi3HY9wYds6I9bo95zJZ57Rjyc9JWxvXaU9pI%2B%2BDjniHHkLiCZ3fQ1Xr5M%2BFKvBzinE0aBU9opcMWi1GVlTIdNhJV2pTA79a1WWctyOGq12%2FH7%2FpdVVi9cNa0mXziDQpYRw6vPsTC3P21%2FFv9CVGBB1azUnqXEwmwTdgwQgFTHcpLjjkusq9JwEpdCzJJOHPsl2ApmHwhkXwRFNF4ekXEUjSRDBmvRlYKDIACcXsoTcf0aFGCn4cuFkhRHa4vn%2FtWPtth7HnJ7k5lVfVPWuCmBBpPie7nsJ0ISYmN1DCGi83TBjqkAS4uMcVVoFgDvnfpxjOYPFhEoMkKggiYIPn16gahogsaGK%2Bw2I6S9eDmVFVC3dGMmS3GqSCKe6qfsA1iktcUh%2FNFDmjJHwGbJ6lHFHzMGojYOVXKDYUneMNY5CWVJb6%2BmsySEk2j0dxl%2Fa%2FDHc7mDfD%2BUMqcun4KzGoBPoc7xAQBvrJ5C6jLhsp7nGD4vHSn8g4KgpE%2B6yCEQI%2Fccuj3q3VutJP7&X-Amz-Signature=0017928f321148588d9696b33cfaec8e4337d1ff3ad267f55f3a1fa4115a9213&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

![날짜 선택 시](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/3a0dc0ae-4c89-4df3-b2bf-2b2ab1f9c638/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RFOIZ4DW%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152759Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJIMEYCIQCx%2Bpd%2FlTKn0RTD0SmUOA90dMZeL1ccLAvYviztyTwBTwIhAM8GZ2OKXSWKKkAEhok9riBMrwg2%2FX7FlnSxx9cl79VzKv8DCCcQABoMNjM3NDIzMTgzODA1Igwae%2BtgPIzs%2B9GjiKkq3ANDM5IBd%2Bjy%2BRp1lpF5%2Bv8DpU1d5fstxkgOaeCNSmvslo9aLWXSCliKEQZxCzKVYL1keF8c7GNuxOsbIPrtkjJ1%2FLs0014gVnzp45ubth0xG9%2BfOGQ4kxsqY29rPIlO8j8r78uAOl3CjcKgFPIWkKgeI2LuDLbqQljY6F%2FQ783oAjpgndPwChwcA1MmZSS9R9r77MLY6kud8saf3Vdw0Wp0OHo9kM8NteAvgOlzCfwTCHNEiGWxEn%2B6nhYvQFXGvVo5EoTrFQzv8lfy%2BLCuktjfXgzfGyB02U7O9KcGiLsHFMZ7gvk2z59iHcLZIuNkgooxhDyyCeOM%2BZayv3mplpnRi3HY9wYds6I9bo95zJZ57Rjyc9JWxvXaU9pI%2B%2BDjniHHkLiCZ3fQ1Xr5M%2BFKvBzinE0aBU9opcMWi1GVlTIdNhJV2pTA79a1WWctyOGq12%2FH7%2FpdVVi9cNa0mXziDQpYRw6vPsTC3P21%2FFv9CVGBB1azUnqXEwmwTdgwQgFTHcpLjjkusq9JwEpdCzJJOHPsl2ApmHwhkXwRFNF4ekXEUjSRDBmvRlYKDIACcXsoTcf0aFGCn4cuFkhRHa4vn%2FtWPtth7HnJ7k5lVfVPWuCmBBpPie7nsJ0ISYmN1DCGi83TBjqkAS4uMcVVoFgDvnfpxjOYPFhEoMkKggiYIPn16gahogsaGK%2Bw2I6S9eDmVFVC3dGMmS3GqSCKe6qfsA1iktcUh%2FNFDmjJHwGbJ6lHFHzMGojYOVXKDYUneMNY5CWVJb6%2BmsySEk2j0dxl%2Fa%2FDHc7mDfD%2BUMqcun4KzGoBPoc7xAQBvrJ5C6jLhsp7nGD4vHSn8g4KgpE%2B6yCEQI%2Fccuj3q3VutJP7&X-Amz-Signature=1257a03bcb77d55b6b47d74dc374d0761efffe0c10518c15b9417f3fc0019c66&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
