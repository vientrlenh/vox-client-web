import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from './authSlice'
import { preferencesReducer } from './preferencesSlice'

export function configureAppStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      preferences: preferencesReducer,
    },
  })
}

export const store = configureAppStore()

export type AppStore = ReturnType<typeof configureAppStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
