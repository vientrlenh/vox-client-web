import { configureStore } from '@reduxjs/toolkit'
import { preferencesReducer } from './preferencesSlice'

export function configureAppStore() {
  return configureStore({
    reducer: {
      preferences: preferencesReducer,
    },
  })
}

export const store = configureAppStore()

export type AppStore = ReturnType<typeof configureAppStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
