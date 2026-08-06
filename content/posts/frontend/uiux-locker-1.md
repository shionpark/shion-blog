---
title: "락커 그룹 생성하기 – 유동적인 배치도 구조 설계 (Part 1)"
description: "사용자 정의 배치 기반 락커 그룹 생성 기능 구현"
date: "2024-06-09"
tags: ["Recoil", "React Query", "React"]
published: true
---

이 글은 락커 그룹 생성 및 배치 기능을 구현하며 겪은 구조 설계와 로직 결정 과정을 정리한 기록이다.

사용자가 입력한 정보에 따라 실시간 미리보기를 제공하고, API와 연동해 실제로 락커 그룹을 등록하는 기능까지 구현했다.

## 구현하고 싶은 기능

내가 구현하고 싶었던 기능은 헬스장에 존재하는 락커룸을 사용자에게 직관적으로 보여주고, 그 락커들에 **회원들을 배정할 수 있는 기반 기능**을 먼저 만드는 것이었다.

단순히 데이터를 리스트로 나열하는 것이 아니라, **공간에 배치된 락커 구조를 시각적으로 표현**하고, 각 그룹별로 구성되는 방식이 다를 수 있다는 점을 고려해 **사용자 맞춤형 배치 설계**가 가능하도록 만들고자 했다.

## **문제 상황과 해결 방식**

### 문제 1. **락커는 헬스장 곳곳에 흩어져 있다**

헬스장 곳곳에는 입구, 탈의실, 화장실 옆 등 다양한 위치에 락커들이 나뉘어 배치되어 있었다. 이 모든 락커를 하나의 리스트로 보여주기에는 사용자 입장에서 인지하기 어렵다고 판단했고, **공간 단위로 그룹을 나누는 구조**가 필요하다고 느꼈다.

![지점마다 상이한 락커 배치도](https://velog.velcdn.com/images/shionpark/post/5945b86a-0f42-4b34-9ed1-6d8d9038fddc/image.png)

> ✅ 여러 위치에 배치된 락커를 ‘락커 그룹’ 단위로 묶어 관리한다.

![초기 락커 배치도](https://velog.velcdn.com/images/shionpark/post/87390d44-8862-4214-b085-4988687a013a/image.png)

각 락커 그룹은 고유한 이름과 위치, 배치도를 가질 수 있도록 구성했다.

> **최종 구현 화면**

![락커관리 페이지](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/ec7106f7-91ad-47b1-b1aa-0d4b79e12f25/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XPXUHILI%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152919Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJIMEYCIQDX7wI47HIHua3ZkljDSFwOG%2FApKp%2F%2B2EDML5uXaE40%2FgIhAII8SNXSRcjwW4xjAuxQs1pHw3IZK1NOk98yEI83RFHhKv8DCCcQABoMNjM3NDIzMTgzODA1IgznDL6OZSk7WeDxnpwq3ANFG77NL5V0gNDLIh3PTttvHp0kg%2BKEXSxZMF6jh%2BTANNZZdEVUYdhbOuhvULUhtq1JRWXZnCTCbiJEdQ2QJJyl9RdnWa1Ezv1ypt2MmKbElriyriSXDdBA2VTOyU9%2BzrnpXdvZxE45Hks4NHjuMc310qxisief59HrCz1J%2FfvAzJVpTp34wzjBK0dl3eMqbFQ41zWbMQTQvYnFs7r7ErhvUkQ5Jq1U8pMFhea4Dk4MjmxHI6%2BQHjcVfezU3yXVIBsc0ft92wVt8CoWfcR67usuFwy%2FxKBpcQIN7sK8vjc208V%2Flg7%2F1IHEIzUnwXN55D5HmLsAtveBNsDKygxH7r7m9szhp8gI7fQQaHfedrRsJTmU6DkycR4QsVArP2w5uzpaJKOZOP%2FKMrHyUXtDI6JKlYG2xcUx0ZYAqMBfolWD0Z%2BtIb%2B4%2FzNungJ3OtDMUbZzAMDeExx8ZMzKcLdA42jMSxIOADcVvS4HPWBEzDvZug6cSgtLg%2BcnJ7Sq%2FPbPjdi2SEFJkF0NZrE%2FAR%2FKd6EtpdzC8p%2FkGa6SZIL3h7VqzaMl%2FQQCf6mS6YDb6uuzskJYEu4DlDOUBtc%2FfJu6KBLa2bMyhKpecZjWw7nMeEl2biBm30c%2B54jcUnQfjjDnis3TBjqkAew5e0UdDQkcSAeUT7kfbBkYAfmFyVSr8uxHDhrpFB6x6%2FagOfNE5LozYYqAvssvph8Q2bX0RR0hf3k65yr%2F6FlHLfkiq1bhSgFpGhMHlFnaQR1RgYAvDXsaJyM9QpkotYIHwplSpWp1bC4Icpi%2F%2B92vxirbgEPR%2BmIN3tAHATkZtOzXGTzLLnJMX8NiayyfnnEYNsgV4J4jhGaHouvCb0UoFSQL&X-Amz-Signature=b3f190b07f59c916e7e88068c40b1d6a4d52df1336174c4bcfc9311925eb4cff&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

### **문제 2. 락커 그룹마다 배치 구조가 다르다**

락커 그룹 A는 5개의 열, 락커 50개로 구성될 수 있고, 그룹 B는 10개의 열, 락커 70개로 구성될 수 있다. 이처럼 **각 그룹의 구조가 달라지기 때문에** 단순한 리스트로는 표현할 수 없다.

처음엔 높이, 간격 등 다양한 옵션을 사용자에게 입력받아야 한다고 생각했지만, 사실상 열(column) 수와 락커 수(quantity)만 입력받으면 가로 길이에 맞춰 자동 배치할 수 있다는 결론에 도달했다.

```typescript
// 필요한 정보만 추린 API 요청 타입
export interface IRegisterLockerGroupRequest {
  name: string;
  quantity: number;
  column: number;
  branchId: number;
}
```

> ✅ 락커 그룹은 ‘전체 락커 수’와 ‘열(column) 수’만 입력하면 원하는 배치가 자동으로 구성된다.

![](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/0254e5a7-3d90-4dca-a922-4bc805bf4fe6/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466Z64GLE2L%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152920Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJHMEUCIQCzeJJfviTfJHvimwCqPPKWhGM4D30XFZobRZClXpm4ugIgE9NoYcxGxy5Z%2BSYuwDC6bbT%2FUqaFHd8M%2F9QUfGiIFq8q%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDNT07ynNaAlARJ8keSrcAxaSYkFWE3nbgY0lXjXZEKkIBUgw5QRFVTS%2BnxOkrwi242837OGwP3LsKMUWC4dYWUfzGMHb5FY1X0Ywn2iXw0RwzIaje0785lcZOCKvMkH6YMl0W8aFiqvlswiOWmW%2F2kob%2Fteg45JPlBMS1rbmhlpuSxf0Je5xmkW0aEqSaJIE4InnCA9pBsoXIJmXbMkMJAGom%2ByrAWep2gnoCRvmiXoItvfT4mePMb76ApkdQmP7li0upIaDnfeqb%2BWRAtYp%2BVOouu8zRHBB%2BLQ41UxK0ulAcX6ruc6muzUBEdnMU1TNBQYNASC4NOMHROnR1JEsrIrJn3KYd%2F8pVJlsYZDQSMGAHaINKT3Qva7VIgCEwdiqgon28hS9iOuRFtjR4lVaGgqhrjBuNRn69BHinkzndNLwZhZIaOf179pPHlKf9fyrkSH6iuO7e%2BwXvLIhmr6Vyj7PF7hy1tFuNvFAWIDxMnfXhGXm5g0HOup6vuPpkDdyYVFHz%2BlnqNmt8SuHOWMjIZY0kAY56tqZU%2FInwrK2DQg6o7IrWwhE7c%2FoBzZ8VZKOdVNRKvy79hsYo7cmwESgQZ8xcsOpFD3yfxg3fEyrh2I5LZFhed9zU1XDUqNcvIPuj0iSrEXlmRm1IyQGMNyKzdMGOqUBZt0Ydj8S1I9hutX%2BtYt%2BAeAFsBgyq9Mwin4WBDTQ6HlXdduqxK7OpFN99O7qMITHed56snwROYziJDVCe4bdoRgfOjV%2FrbziUtP%2FbqtL8KhH4vz4qu1oHBCLFM2M576pOCvqd9MdYKOWuHOsk3T4H6VS6RQAAzslQi4QZN2ySCgb04akgNpVIJ1MnKxctzDYbySA03LqgF8KqMH7jWB0AToqdnWr&X-Amz-Signature=2fea32edadb365ec71298d9ed49aae4d461c14bccf64b3315571fd721ea5a719&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

`column = 5, quantity = 50`

![](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/aa2642a5-24f1-42df-9c09-cf6a8ca0d744/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466UBCBHRLP%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152920Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJGMEQCIHQyzq3SRRlWkFKYqD2nfjDNpLlDjgRwpMaQFBMZ6A%2FrAiAIJqWTmMj7z%2FXMOSjFUKrnnCkP0vMwqj2EMPKzZJyhxSr%2FAwgnEAAaDDYzNzQyMzE4MzgwNSIMnN7izqb5E%2FCZzJwrKtwDk4JsTdgFFZcwIe87TJRBsdSlratHd5yv2WWIFvbab75J9Z04WwLSPt3wEU0Isj5qA5J2izb2s9SN33PuWRW3hg61%2B4XlFtADiZ%2FW93ulAiZpD4eNf0eoJJtYcTBLX%2FBAIJbJQjw72CdrVmpkIPCFs4MRwFfeOJziIddsUU26BpkkRD5%2FXSsnaCKbbCXzm2ZHBF4RkjKKALLuW%2FJXX%2BHti1MX6yws7lt73iWcV%2FRjFzgpo%2Bmh88WNauKNbn5PPCHqgoPO7I6Ghpky6PrmzEHnZjEEOaeQ9l5gcLM1yCOxwQvV9NnDPDKGPiV7c%2BYAoim1Rkppwd9PfFxZ2PJ9oMkvd7tC5fGySRbPfi%2B2H2RbuOpr2fSfrWSxzkHjAmhCArSFsNmJUtlY0twB1kYlpJiJ%2Fanzs1f1We74uqbBX1cLLKN7TFN7Phg3YNtGAb24IwAQPxgEo5m6%2BMcqYuiASx%2FaUevU5ORSQ3VZSascWzxWuIOHWb%2FcwHywpBg5eRzfolM%2F6Bu5IeuzlIh1kojOiGE0h21b%2B6Q4bdyy5bshIxXscrfMONX%2Bzg3bWxklDmUxFCPtKLaQvTgz828dKELTKwpTMETxuqzVCt3CLNZkqFRS4b37oJoheej9nS%2FxeTAwl4vN0wY6pgFYTEjGEL6fh%2Fz5iLvOQ7DSu2VP63xAcwwLYKbXIrjO%2BGGM6ELLMS4pFls9LTdAfIL9Q3yCm%2F7kgBOQEoeFN9%2FIqbl2aFPVjZ%2F5%2FcnUigMf3SSPASomsPK60s91wXNkUUQ414hmKL9i9gpGa2tvSMZT6Xgrksqoq%2BH8M4kWj2%2Brnnbn%2F5KpCT%2FZMJlvgq8cZb9F8Mup8jsx5zHbcxV%2FfOFK58aZLIRW&X-Amz-Signature=44389e8c7d1a52920f04c4fd3632471c64d0a64e0c54f5a84dcced09b00ad3b3&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

`column = 10, quantity = 70`

### **문제 3. 락커 그룹 배치를 실시간으로 확인하고 싶다**

사용자가 폼을 작성하면서 **실제로 어떻게 락커가 배치되는지 시각적으로 확인할 수 있어야 한다**고 생각했다.

따라서 락커 그룹 등록 폼은 모달로 띄우고, **오른쪽에는 실시간 미리보기 UI**를 함께 제공했다.

- column = 5, quantity = 50 → 10행 5열
- column = 10, quantity = 70 → 7행 10열
사용자는 수치를 바꾸면 바로 옆에서 배치도가 바뀌는 것을 보며 최종 결정할 수 있다.

![초기 화면](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/0846a625-ae2a-42ac-aee5-6d3a4a2c064a/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466QW2Y4R2A%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152923Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJIMEYCIQC9PoYJfUhxIRuzztbOgDr6issiTnVjkZlMZnPoKBFQVgIhAI1Khjpr8dYODbH9EvTqFYZL7udcQWwKjV3rCMqTpGjGKv8DCCcQABoMNjM3NDIzMTgzODA1IgyeKzP22Y6ntGK%2FBBYq3AMdg77lqknZgx8CgM6LKS65UTz8RlWoNcI9ivSa4F4NB7cKBqMx69mMTo4ChdF%2Fq17t%2FqCskamefYQ46lxkbkzrhWTKsqha%2Frkd3rIdcpD7SYtiXUzctCUImsZHZC%2Bp%2FlZcWJ%2FJkDbLl0ZEUGuxZk1z9b5dbWhXlmMFfFUayNx7o%2FUXQ%2FDPkUnwl947ceJmlHzcgd8hKoRPe6k0NPbKihkBwjKHT7nHVD0UQ9gHLgKD4ykqYARem9eKKU0E66SSZqwR2YUJp%2BqFXI%2BASUWrmhTWyd8u1I%2Br0dWLXlIhwQeHW59QUFOfjAoEnxj9cqIv%2BqZosE1U%2F9jYtRZxvtVCyOhkDrLSYT8zd8YFF5UO1xdXsJY6R2e17JrjHWYNorawv2JczLr28L1mUqSoqca%2FYtKrqtpgApcsThOtz1J5cEBtAeE%2FoysucXBoDfeJv0OcUzsoYEBLhHbvcSRxhE3x%2FRE%2BdV0210ROR7vsKGTTsdKpzlt%2BcVOkNQ2TTBVbTuVct7Whjh4DO0RXgvK1hqgf5f1JHqjnkizeNiZxTede2Kxle%2FQdV7uFczX3TnMwU8%2BrdkHOGLQ%2FZbGGCi3VcANfqY6HMulXoOeH%2FzL7infmFlMMjuR8YyJKODRb3rkvejDqis3TBjqkAUtexhUudvXsg5BFFZxatB4bnjX0kZV82uUSmPLwNPLmV%2Bd%2F%2BmZvCbfUUZqkqAI9HEz0ZV6hsX3b%2Bw56jyh2xAKdwYBiPeyCLfQECurMWHovxndHydUm9GsmTMWErZqldSUVCsXipWu36cDsm78kuCTNAEhguHgg8WB0mULJwHLRyRbRvAxlAQU%2FQEP0xqF2%2BITVz1IAzI8vOcR4bE5vfXke%2FLSG&X-Amz-Signature=bb3541d46c098813c39d967f42cb211f57e096be7f7e4224d49f8a7300faad10&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

![미리보기 기능](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/4e032498-1844-4374-95c9-4cbe1c5c23e1/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466REIR2CCN%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152923Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJHMEUCIQC%2BLh%2FP5EUYybMe9c0Zwzq1msleZ4SEkELGt9gzhlS4UQIgPwV2yxSXoQIvoEPwpUyGo2pyunQqh3pZj%2FrVCm0tFsYq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDMuJ%2BKpMEj9paCCklCrcA5rgTSSkx6D6%2FFGX9XvdriWrCMGvLsHy0WM6%2B49ZVBrfUghXgPrFY7%2BVJXsIS3Kih1rXet0Rr0tvxo%2BH86cW8ykBVQJAYAi6h0p2o2ZVzTT0D%2FXaWBuOgnLINhVdfd79J8KtCfjNsmhV0sX%2Fl1tKIOa83hwXxKzu%2Bk%2FkVxJmBRjrOM08f2QrJTW7TBjxhi%2F3YVMtrfRpTzoCTYZNIUPq2mvVVd49SE9chQh3MQMslVgGynCfWexkJAJQVQdNXayBoZCSUil1djXxfGoLYlcg8bZtZtTeKp0loew1F%2BLK6DaBxJVuSeiNfCg%2FEGkUS05o16k%2FZevJqaA6q8d%2B4GPJ0uWKvxX3uVbKrqdVqYsXxiG7XlyJK0OrAyn3omYWhdWQPIaZyzv87XhUvSZ9AAJanAtwQYl8%2F%2Fb4m3XqFNq%2FhxBnvbrXPX9NWKHZiQuO2RB0K8cJBWnJCyeLy7yinFpFTHrTCszcXLvCztwYvP979eqhMGrx6YvCTM%2BPMSdx9Qxpslfel8aoY5iCjECXPZGcCW3kXHIZKovC0Wl44jvIAxfd9ojy42kcWjS7K%2FGlx4t80LRmus45QwU%2BCzKv7%2BObefp4a8b8fjDO0rXctWIGSg7UuI9AhtLoqZsHcVviMOaKzdMGOqUBob2rC4z1lqq3SUMXpgfyKqij3nppbWXf5S7P4X7rSQ%2FQKZFnVfcuL%2BHOwy%2FZGBb%2FvCkTYX%2FTaIgucLbQqrCSrhl6YE6oGAlLI6P0RFS6ZhUULbVvEIPW%2BM8PVUi0KVOpiJ8%2BK87y3PVX%2Fm22anvzbarE3sSchOeAL0p6W9l0PmJXCAq8ua0SgJ5bEpeRL%2Bi5zj68aM5ORLQ4kmkLUN8Q68j1mn8h&X-Amz-Signature=db0af56d467c1d2cbda0eec19445fbe2894d038ebef241b3ad80ff3b2ce16117&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

### **데이터 저장 방식 고민 과정**

초기엔 아직 API가 완성되지 않은 상태였기 때문에, 폼의 입력값을 Recoil 상태로 저장하고, 로컬 스토리지를 통해 유지했다.

```typescript
const lockerGridFormState = atom({
  key: 'lockerGridFormState',
  default: {
    row: 100,
    col: 5,
    colGap: 0,
    rowGap: 0,
  },
  effects: [localStorageEffect('locker')],
});
```

하지만 실제로 필요한 정보는 `column`과 `quantity`뿐이라는 판단 하에 폼 구성과 API 타입도 간결하게 재정의했다.

## **락커 그룹 등록 요청: 전체 흐름**

### ** 1. API 요청 함수 정의**

```typescript
export const registerLockerGroup = async (lockerGroup: IRegisterLockerGroupRequest) =>
  client.post('/api/lockers/register', lockerGroup);
```

### 2. useMutation 훅 정의

```typescript
export const useCreateLockerGroupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(registerLockerGroup, {
    onSuccess: () => {
      queryClient.refetchQueries([QUERY.LOCKERS.GROUP]);
      alert('락커 그룹 등록이 완료되었습니다!');
    },
    onError: () => {
      alert('등록 중 오류가 발생했습니다.');
    },
  });
};
```

### 3. Form 컴포넌트 연결

```typescript
const { mutate: createLockerGroup } = useCreateLockerGroupMutation();

const onSubmit = () => {
  if (confirm('락커 그룹을 생성하시겠습니까?')) {
    createLockerGroup({
      name,
      quantity,
      column,
      branchId,
    });
  }
};
```

사용자가 입력한 데이터를 기반으로 서버에 POST 요청을 보내면, 락커 그룹이 생성되고 목록을 다시 불러오도록 `refetchQueries`를 설정했다.

## **정리하며**

이번 기능은 **단순한 CRUD 이상의 복합 UI/UX 요구사항을 반영한 기능**이었다. 락커 그룹이라는 추상적 개념을 시각적으로 구성하고, 사용자 입력에 따라 즉시 반응하도록 설계하며 여러 가지 고민이 필요했다.

- 그룹 단위로 락커를 구분하고
- 열(column)과 수량(quantity)을 기반으로 자동 배치하며
- 실시간 UI 프리뷰를 통해 사용자의 인지력을 높이고
- 폼에서 입력된 데이터를 실제 API로 전송하여 상태를 반영
이러한 흐름을 거치면서, **폼 설계 → 상태 관리 → API 연동 → UI 시각화 **기능 개발의 전 과정을 경험해볼 수 있었다.
