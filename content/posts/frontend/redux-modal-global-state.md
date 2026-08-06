---
title: "Redux를 활용한 모달 전역 상태 관리"
description: ""
date: "2025-07-04"
tags: []
published: true
---

> 공식 문서

[https://ko.redux.js.org/tutorials/quick-start](https://ko.redux.js.org/tutorials/quick-start)

## 구성 요소

![](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/db7c5b19-4d3b-47c5-8c4d-d402ef5efec4/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466YB52ONCX%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152855Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJIMEYCIQDjtMWXYahtrRNUbvMhp57bGiVr9kmQhw7SCIsoe2DBEgIhAPRyP5M9wSHhPIT1Lr6laUV8ungGUayE1D9iN9FdjmJBKv8DCCcQABoMNjM3NDIzMTgzODA1IgzSU3RgATc2FtUTOEkq3AMuCP0SJqMH7O7EAJbEnONfeBq0I4eWgYBwk1%2FN7ZDheJV%2BNjHjG1R3r2vgYADBnprRuvo%2Fg3fHBgXxeYh9FfZcyM8JJ5HO47bIMQJeR1lLCE8Ii56mHhiaXR%2Bs5xbcU26pX%2FkeBl9De0Oc4pH%2Ba4BO5AowpzKumMoHz9wTnMXyAE2l%2FnUU1Bg9hKZMB4oczFhmkkbnjER5IvhgGHTMcWcC1Mn1QgfHUsXwLuRt7XCMYJfHR2omitwK%2BUynVUdKdBdG9rx0fg7jUgWTdBGq0pTGS5zcW0kH%2FjxfjuW16vOHVcNSacnjWn9G6Nb2oqZz8vEgl3iHRncunjWrIYQiNdArCQnAMqzXuvKgsxTBddJbu9A0qj5ONzdPXZx9ZozS7zWd6so5iaW%2BecOp5ywsv3AvoMLyXyRPnmLbtcTZB3%2Fodp8bImro%2B%2Ba24mBBa6z%2FFs%2B094C6qtNX1YSKHCp91v9VtqCaGcbRgnOpE%2BhwrKgTbxab12JNwbkWL%2BoJRLdu2ibFKbwmkpSS22dBFRmshKRzRt8z3JQcMdlmuDdgmfAh20CtvkvamOU013mWwYlvZSYGkV%2B0ug1%2BhdiU6DsuUgynDyLM%2Fu%2B2jt7qe7K6JysLYdphF%2F%2BQhXAv8w1VYzDRis3TBjqkAZl20z%2FdIycC183N3%2F4CqnserkPq4QLn4HbYMceJXurU1%2FSZeES%2BC0I6Pn74Yyu2eY7gSdvrm9UeL3g%2BsswMxospmIxO8psPqpZ%2FcHJWyXZIiBA0E4GN0fuKMqAX7rIgsDHbEP0F1Utqc%2BQomsuFfYlxtXquDIA25PeztlopDR%2FZlY7Z1zMScdTrOh9rclWS3cRFlWnnlHFObW6kNfONYLSj9Ph8&X-Amz-Signature=0fbaf48d3b905704b52bd9402e4d65a3ae5bdae738959afa0b6858d17ca81f6f&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

### 1. View

### 2. Store

중앙 저장소

### 3. Reducer

state가 어떻게 업데이트 되는지 작성

### Action

### Dispatch 작업 전달

## 동작 과정

### 1. 리덕스 스토어 생성 `configureStore()`

```typescript
import { configureStore } from '@reduxjs/toolkit'

export default configureStore({
  reducer: {}
})
```

```typescript
// packages/store/src/index.ts

import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import modalReducer from "./modules/modalSlice";

export const store = configureStore({
  reducer: {
    modal: modalReducer,
  },
});

// 전역 타입
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 👉 여기
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### 2. React에 Redux store 제공 `<Provider />`

```typescript
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import store from './app/store'
import { Provider } from 'react-redux'

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)
```

### 3. Redux State Slice 생성 `createSlice()`

slice에 지정: `name` (slice를 판별하는 이름), `initialState` (초깃값), `reducers` (state가 어떻게 업데이트 되는지 작성)

```typescript
import { createSlice } from '@reduxjs/toolkit'

export const counterSlice = createSlice({
  name: 'counter',
  initialState: {
    value: 0
  },
  reducers: {
    increment: state => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.value += 1
    },
    decrement: state => {
      state.value -= 1
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload
    }
  }
})

// Action creators are generated for each case reducer function
export const { increment, decrement, incrementByAmount } = counterSlice.actions

export default counterSlice.reducer
```

### 4. Slice Reducer를 Store에 추가 `configureStore({ reducer: { counter: ?? } })`

```typescript
import { configureStore } from '@reduxjs/toolkit'
import counterReducer from '../features/counter/counterSlice'

export default configureStore({
  reducer: {
    counter: counterReducer
  }
})
```

### 5. Redux State와 Actions을 리액트 컴포넌트에서 사용

4번까지 진행하면 이제 React-Redux 훅을 사용해 React Component와 Redux Store가 상호작용 가능하다.

useSelect를 사용해 저장소의 데이터를 읽고, useDispatch를 사용해 작업을 전달할 수 있다.

```typescript
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { decrement, increment } from './counterSlice'
import styles from './Counter.module.css'

export function Counter() {
  const count = useSelector(state => state.counter.value)
  const dispatch = useDispatch()

  return (
    <div>
      <div>
        <button
          aria-label="Increment value"
          onClick={() => dispatch(increment())}
        >
          Increment
        </button>
        <span>{count}</span>
        <button
          aria-label="Decrement value"
          onClick={() => dispatch(decrement())}
        >
          Decrement
        </button>
      </div>
    </div>
  )
}
```
