import { configureStore } from '@reduxjs/toolkit'
<<<<<<< HEAD
import { authReducer } from './authSlice'
=======
>>>>>>> origin/main
import { preferencesReducer } from './preferencesSlice'

export function configureAppStore() {
  return configureStore({
    reducer: {
<<<<<<< HEAD
      auth: authReducer,
=======
>>>>>>> origin/main
      preferences: preferencesReducer,
    },
  })
}

export const store = configureAppStore()

export type AppStore = ReturnType<typeof configureAppStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
