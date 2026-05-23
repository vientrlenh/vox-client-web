import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'dark' | 'light' | 'system'

type PreferencesState = {
  themeMode: ThemeMode
}

const initialState: PreferencesState = {
  themeMode: 'system',
}

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload
    },
  },
})

export const { setThemeMode } = preferencesSlice.actions
export const preferencesReducer = preferencesSlice.reducer
