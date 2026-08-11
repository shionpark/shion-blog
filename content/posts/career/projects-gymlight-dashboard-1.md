---
title: "ApexCharts 기반 대시보드 차트 구성 기록"
description: "실제 데이터를 기반으로 ApexCharts 차트 구현"
date: "2024-05-26"
tags: ["apexCharts"]
published: true
---

이 글은 실제 프로젝트에서 대시보드 UI를 구성하며, ApexCharts를 사용해 차트를 구현하고 컴포넌트화해나간 과정을 정리한 기록이다. 디자인 요소에 맞춰 적절한 차트 유형을 선택하고, 반복되는 설정을 효율적으로 관리하는 방식에 대해 단계적으로 정리했다.

## 클라이언트 요구사항 정리

2024년 5월 10일 미팅에서 클라이언트가 대시보드에 포함하길 희망한 항목은 다음과 같았다.

1. **회원의 위치 지도**
  - 신규 회원 (소개/신규)
  - 재등록 회원 (당월 만료/만료 이후)
1. **방문(가입) 경로**
1. **매출 통계**
  - 월별
  - 일별
  - 상품별
1. **회원 통계**
  - 만료&등록 비율
  - 연령대
이 중 1번 실시간 지도 기능은 계약 범위에서 제외되어, 우선 2~4번 항목에 대한 차트부터 구현을 진행했다.

## 차트 라이브러리 선택

통계 데이터를 시각화하기 위해 선택한 차트 라이브러리는 **ApexCharts**다. 이전 프로젝트에서도 사용한 경험이 있어 빠르게 적용할 수 있었고, 다음과 같은 장점이 있었다.

> **ApexCharts
> **JavaScript 기반의 차트 라이브러리로, 다양한 차트 유형을 손쉽게 생성할 수 있으며, 풍부한 옵션 제공 및 반응형 지원이 특징이다.

### **ApexCharts 사용 시 느낀 장점**

- **데모 기반 학습 용이**
  각 차트 유형에 대해 공식 문서에 샘플 코드가 잘 정리되어 있어, 아직 데이터 타입이 완전히 정리되지 않은 시점에서도 참고하여 빠르게 구현할 수 있었다.

- **반응형 및 커스터마이징 자유도**
  각 차트 유형마다 제공되는 옵션이 세부적으로 달라 처음엔 익숙해지는 데 시간이 걸렸지만, 이를 활용하면 다양한 데이터 특성에 맞게 유연한 시각화가 가능했다.

## 대시보드 기획 스케치

![](https://velog.velcdn.com/images/shionpark/post/8ca4cf94-688a-4286-bb2c-50775f5263b1/image.png)

GoodNotes를 활용해 간단히 화면 구성을 스케치했다. 카테고리를 나누어 정리해보니, 데이터 성격에 따라 사용할 차트 유형을 명확하게 구분할 수 있었다.

- **Pie Chart**: 가입 경로, 연령대
- **Line Chart**: 매출 통계 (일/월 단위)
- **Bar Chart**: 매출 통계 (상품별 구성)
## 샘플 데이터 생성 및 컴포넌트 렌더링

### 샘플 데이터 정의

초기 개발 단계에서는 실제 API 데이터가 준비되지 않았기 때문에 샘플 데이터를 직접 생성해 다양한 차트를 테스트했다.

> ✅ 참고: 차트 옵션은 코드 길이 문제로 생략하였으며, 실제로는 옵션 객체를 함께 설정해 사용함. (관련 내용은 다음 포스팅에서 이어서 정리 예정)

```typescript
// 예시 - 만료 & 등록 비율 (Line Chart)
export const doubleLindeChartData = {
  series: [
    {
      name: '등록',
      data: [143, 123, 109, 138, 81, 130, 87],
    },
    {
      name: '만료(예정)',
      data: [12, 11, 14, 18, 17, 13, 13],
    },
  ],
  // options 생략
};
```

```typescript
// 예시 - 회원 연령대 (Donut Chart)
export const donutChartData = {
  series: [44000, 55000, 41000, 17000, 15000, 4000],
  options: {
    labels: ['10대', '20대', '30대', '40대', '50대', '60대 이상'],
  },
}
```

```typescript
// 예시 - 방문 경로 (Stacked Bar Chart)
export const HorizontalStackedBarChartData = {
  series: [
    {
      name: '지인 추천',
      data: [44, 55, 41, 37, 22, 43, 21],
    },
    {
      name: '인터넷 (지도, 블로그 등)',
      data: [53, 32, 33, 52, 13, 43, 32],
    },
    {
      name: 'SNS',
      data: [12, 17, 11, 9, 15, 11, 20],
    },
    {
      name: '직원 소개',
      data: [9, 7, 5, 8, 6, 9, 4],
    },
    {
      name: '간판/전단지',
      data: [25, 12, 19, 32, 25, 24, 10],
    },
  ],
  // options 생략
```

### 컴포넌트 렌더링 예시

각 차트는 react-apexcharts 컴포넌트를 사용해 렌더링했으며, 다음과 같이 구성했다.

```typescript
<Chart
  series={basicLineChartData.series}
  options={basicLineChartData.options}
  type="line"
  height={400}
  width={500}
/>
```

다양한 유형의 차트를 같은 패턴으로 렌더링할 수 있어 작업 효율이 높았다. 전체 구현은 아래와 같은 방식으로 진행했다.

```typescript
const Home = () => {
  return (
    <>
      <Chart type="line" {...doubleLindeChartData} />
      <Chart type="donut" {...donutChartData} />
      <Chart type="bar" {...HorizontalStackedBarChartData} />
      <Chart type="area" {...zoomableLineChartData} />
      <Chart type="line" {...basicLineChartData} />
      <Chart type="bar" {...stackedBarChartData} />
    </>
  );
};
```

## 1차 구현 결과와 개선점

샘플 데이터를 기반으로 구현한 초기 차트 컴포넌트는 시각적으로 원하는 결과를 잘 보여주었다. 하지만 구현 후 몇 가지 개선점이 발견되었다.

> **반복되는 코드**

같은 차트 유형이라도 options 객체를 계속 정의해야 했고, 차트 종류가 많아질수록 유지보수 비용이 높아졌다.

> **협업 난이도**

ApexCharts의 타입이나 옵션 구조를 이해하지 않으면 차트를 수정하기 어렵기 때문에, 다른 개발자가 바로 사용하기 어려운 구조였다. 특히 차트마다 series와 options의 형태가 다르기 때문에 진입 장벽이 있었다.

### 다음 개선 방향

보다 재사용 가능하고 협업에 유리한 구조로 리팩토링하기 위해 다음 단계를 계획했다.

- 차트 유형별 컴포넌트 분리: BarChart, PieChart, LineChart 등으로 나누어 구현
- 내부적으로 공통 옵션을 적용하고, 최소한의 props만으로도 차트를 생성 가능하게 변경
필요 시 차트 유형과 대응되는 데이터를 일관되게 분리해 hooks, config, types로 구조화하는 방식을 도입할 수 있을 것이라 판단했다. 추후 팀 단위 협업을 고려해 공통 옵션 템플릿과 각 차트별 DSL(Data Specification Layer)을 만드는 방향으로 확장할 계획이다.

> **다음 글:** [실제 데이터 기반 ApexCharts 차트 구현 기록](/posts/career/realtime-dashboard)
