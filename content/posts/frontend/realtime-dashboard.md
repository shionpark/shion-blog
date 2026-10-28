---
title: "실제 데이터 기반 ApexCharts 차트 구현 기록"
description: "ApexCharts로 회원 통계, 연령 분포, 시간대별 방문 등 실제 데이터 기반 대시보드 차트를 구현한 과정을 정리합니다."
date: "2025-03-05"
tags: ["apexCharts", "Dashboard"]
published: true
---

[앞선 글](/posts/career/projects-gymlight-dashboard-1)에서 샘플 데이터로 시각화 구조를 먼저 검증한 뒤, 실제 데이터를 기반으로 개별 차트 컴포넌트를 구현했다. 다양한 비즈니스 로직이 적용된 차트들은 실제 요구사항에 대응하는 방식으로 구성되었고, 반복적인 패턴은 가능한 컴포넌트화하여 추후 재사용 가능성을 고려했다.

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

## **다음 글 예고**

차트 공통 옵션 관리, 차트 유형별 컴포넌트 분리(`<BarChart />`, `<LineChart />` 등), 그리고 사용자 정의 스타일 시스템 도입까지 포함한 **차트 컴포넌트 리팩토링 전략**을 다음 포스트에서 정리할 예정이다.
