import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  isAccessTokenExpired,
  readStoredAuthState,
} from '@/features/auth/session/authSession'
import type { AuthUser } from '@/features/auth/types'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

type AuthState = {
  status: AuthStatus
  user: AuthUser | null
}

function createInitialState(): AuthState {
  const stored = readStoredAuthState()

  if (stored.status === "authenticated") {
    return { status: "authenticated", user: stored.user }
  }

  if (stored.status === "expired") {
    return { status: 'loading', user: null }
  }

  return {
    status: 'anonymous', 
    user: null
  }
}

const authSlice = createSlice({
  initialState: createInitialState,
  name: 'auth',
  reducers: {
    clearAuthState(state) {
      state.status = 'anonymous'
      state.user = null
    },
    setAuthenticatedUser(state, action: PayloadAction<AuthUser>) {
      if (isAccessTokenExpired(action.payload)) {
        state.status = 'anonymous'
        state.user = null
        return
      }

      state.status = 'authenticated'
      state.user = action.payload
    },
  },
})

export const { clearAuthState, setAuthenticatedUser } = authSlice.actions
export const authReducer = authSlice.reducer
