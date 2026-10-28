---
title: "ApexCharts 대시보드 구현기 — 샘플 데이터에서 실제 데이터까지"
description: "클라이언트 요구사항을 차트로 옮기며 ApexCharts를 고르고, 샘플 데이터로 구조를 검증한 뒤 실제 데이터 차트 6종으로 바꾼 기록."
date: "2025-03-05"
tags: ["ApexCharts", "Dashboard", "React"]
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

> ✅ 참고: 차트 옵션은 코드 길이 문제로 생략하였으며, 실제로는 옵션 객체를 함께 설정해 사용함.

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


---

## 실제 데이터로 옮기기

위에서 샘플 데이터로 시각화 구조를 먼저 검증한 뒤, 실제 데이터를 기반으로 개별 차트 컴포넌트를 구현했다. 다양한 비즈니스 로직이 적용된 차트들은 실제 요구사항에 대응하는 방식으로 구성되었고, 반복적인 패턴은 가능한 컴포넌트화하여 추후 재사용 가능성을 고려했다.

## 실제 데이터 기반 차트 구현

### 1. 월별 등록 / 만료 회원 추이

- **차트 유형**: Line Chart
- **목적**: 월별 회원 수 증감 흐름 확인
- **데이터 처리 방식**: `countRegisteredMembersByMonth`, `countExpiredMembersByMonth` 유틸 함수를 활용해 월별 집계
```typescript
const series = [
  { name: '등록 회원 수', data: monthlyStats.map((stat) => stat.registered) },
  { name: '만료 회원 수', data: monthlyStats.map((stat) => stat.expired) },
];
```

이 차트는 연간(1~12월) 단위로 회원 등록/만료 수를 비교하여, 특정 시기에 회원 수가 크게 변동되는지 파악하는 데 유용하다.

<details>
<summary>**📄 관련 유틸 함수**</summary>

```typescript
export const countRegisteredMembersByMonth = (memberList: IMemberResponse[], month: number) =>
  memberList
    .map((member) => new Date(member.startDate))
    .filter((date) => date.getMonth() + 1 === month).length;

export const countExpiredMembersByMonth = (memberList: IMemberResponse[], month: number) =>
  memberList
    .map((member) => new Date(member.endDate))
    .filter((date) => date.getMonth() + 1 === month).length;
```

유틸 함수는 이렇게 사용했다:

```typescript
const getMonthlyMemberStats = (memberList: IMemberResponse[], months: number[]) => {
  return months.map((month) => ({
    month: `${month}월`,
    registered: countRegisteredMembersByMonth(memberList, month),
    expired: countExpiredMembersByMonth(memberList, month),
  }));
};

const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const monthlyStats = getMonthlyMemberStats(members, months);
```

</details>

### 2. 회원 연령 분포

- **차트 유형**: Pie Chart
- **목적**: 회원 연령대별 구성 비율 시각화
- **데이터 처리 방식**: `getAgeGroup` 함수로 연령대 범주화, `transformData` 함수로 연령대별 인원수 계산
```typescript
const getAgeGroup = (age: number) => {
  if (age < 20) return '10대 이하';
  if (age < 30) return '20대';
  ...
};
```

```typescript
const transformData = (data?: IMemberResponse[]) => {
  const ageGroupMap = new Map<string, number>();

  data?.forEach((member) => {
    const group = getAgeGroup(member.age);
    ageGroupMap.set(group, (ageGroupMap.get(group) || 0) + 1);
  });

  return {
    labels: Array.from(ageGroupMap.keys()),
    series: Array.from(ageGroupMap.values()),
  };
};
```

연령 데이터를 기반으로 사용자 그룹을 정의하고, 파이 차트로 직관적인 시각화를 구현했다. 연령 그룹 수에 따라 색상 구분도 명확히 설정했다.

### 3. 시간대별 방문 회원 수

- **차트 유형**: Area Chart
- **목적**: 시간대별 유입 흐름 파악
- **데이터 처리 방식**: 커스텀 훅 `useHourlyAttendanceStats`를 활용해 24시간 기준 통계 집계
```typescript
const hourlyStats = useHourlyAttendanceStats(checkedInMembers);
const allHours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}`);

const attendanceData = allHours.map((hour) => {
  const entry = hourlyStats.find((stat) => stat.hour === `${hour}:00`);
  return entry ? entry.count : 0;
});
```

이 차트는 하루 중 어떤 시간대에 회원 방문이 집중되는지를 확인하는 용도로 설계됐다. 시계열 흐름을 강조하기 위해 area chart 유형을 사용했다.

<details>
<summary>**📄 관련 유틸 함수**</summary>

```typescript
export const useHourlyAttendanceStats = (attendanceList?: ICheckedMemberResponse[]) => {
  // 시간별 출석 통계 계산
  const statsMap = new Map<string, number>();

  attendanceList?.forEach((member: ICheckedMemberResponse) => {
    // "2024:10:31 14:32:33" → "14:00" 변환
    const hour = member.time.split(' ')[1].split(':')[0] + ':00';

    // 해당 시간에 대한 카운트 증가
    statsMap.set(hour, (statsMap.get(hour) || 0) + 1);
  });

  // 결과를 { hour: string; count: number }[] 형태로 변환
  return Array.from(statsMap.entries()).map(([hour, count]) => ({ hour, count }));
};
```

</details>

### 4. 회원 성별 분포

- **차트 유형**: Pie Chart
- **목적**: 성별 구성 확인
- **데이터 처리 방식**: 단순 성별 기준 필터링 후 카운트
```typescript
const transformData = (data?: IMemberResponse[]) => {
  let male = 0, female = 0;
  data?.forEach((m) => m.gender === '남' ? male++ : female++);
  return { labels: ['남성', '여성'], series: [male, female] };
};
```

성별 비율은 마케팅 및 브랜딩 전략에 활용할 수 있는 기본 데이터로, 대시보드 구성에 필수적인 요소였다.

### 5. 회원 상태 분포

- **차트 유형**: Pie Chart
- **목적**: 회원 활성화 상태 파악 (예: 활성, 만료, 홀딩, 만료 예정)
- **데이터 처리 방식**: `status` 필드를 기준으로 카운트 집계
```typescript
const series = [active, expired, holding, due]; // status별 count
```

운영 현황을 파악하는 데 있어 유의미한 데이터로, 사용자의 라이프사이클을 확인하고 CRM 전략에 적용할 수 있다.

<details>
<summary>**📄 관련 유틸 함수**</summary>

```typescript
export const countMemberStatus = (members: IMemberResponse[]) => {
  return members.reduce(
    (acc, member) => {
      if (member.status === '활성화') acc.active++;
      else if (member.status === '만료') acc.expired++;
      else if (member.status === '홀딩') acc.holding++;
      else if (member.status === '만료예정') acc.due++;
      return acc;
    },
    { active: 0, expired: 0, holding: 0, due: 0 },
  );
};
```

</details>

## 목업 기반 차트 구현

실제 데이터가 확보되지 않았거나, 구조 설계 중이던 항목에 대해서는 목업 데이터를 기반으로 먼저 차트를 구현해 UI 레이아웃을 검증했다.

### 6. 방문 경로별 유입 비율

- **차트 유형**: 100% Stacked Bar Chart
- **목적**: 마케팅 채널별 방문 비율 확인
- **데이터 처리 방식**: 랜덤 수치 기반의 목업 생성
```typescript
const generateDummyData = () => Array.from({ length: 8 }, () => Math.floor(Math.random() * 20));
```

목업 데이터를 활용했지만 실제 구현과 동일한 컴포넌트 구조로 작성했기 때문에, API 연결 이후에도 동일한 방식으로 교체가 가능하도록 설계했다. `VisitPaths`는 별도의 상수로 정의된 채널 목록을 참조한다.

```typescript
export const VisitPaths = ['인터넷 검색', 'SNS', '지인 소개', '기타', '선택 안함'] as const;

const series = VisitPaths.map((path) => ({
  name: path,
  data: generateDummyData(),
}));
```

## 정리 및 회고

이번 차트 구현 과정에서는 다음과 같은 기준을 유지하려고 했다.

- **차트 유형 선택 기준**: 데이터 흐름이 필요한 경우 → Line/Area, 구성 비율을 확인하는 경우 → Pie/Donut
- **비즈니스 로직 분리**: 유틸 함수(`utils/member.utils.ts`) 또는 훅(`useHourlyAttendanceStats`)을 통해 데이터를 전처리한 뒤 차트에 전달
- **스타일 일관성**: 모든 차트의 옵션 구조를 통일하고, 색상은 수동으로 지정하여 브랜드 톤 앤 매너에 맞춤
> 초반에는 차트를 prop 기반으로 완전히 범용화하려 했지만, 구현 시간과 우선순위 이슈로 인해 개별 컴포넌트로 분기하였다. 이후 공통 옵션 분리 및 chart type 기반 DSL 설계로 확장할 계획이다.

