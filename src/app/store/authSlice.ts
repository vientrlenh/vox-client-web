import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  getStoredAuthUser,
  isAccessTokenExpired,
} from '@/features/auth/session/authSession'
import type { AuthUser } from '@/features/auth/types'

export type AuthStatus = 'anonymous' | 'authenticated'

type AuthState = {
  status: AuthStatus
  user: AuthUser | null
}

function createInitialState(): AuthState {
  const user = getStoredAuthUser()

  return {
    status: user ? 'authenticated' : 'anonymous',
    user,
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
