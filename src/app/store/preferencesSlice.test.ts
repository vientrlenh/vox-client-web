import { setThemeMode } from './preferencesSlice'
import { configureAppStore } from './store'

describe('preferencesSlice', () => {
  it('updates the theme mode client state', () => {
    const store = configureAppStore()

    store.dispatch(setThemeMode('dark'))

    expect(store.getState().preferences.themeMode).toBe('dark')
  })
})
