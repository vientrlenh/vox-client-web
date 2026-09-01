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

  // 'expired' LẪN 'absent' đều vào 'loading' để AuthProvider hỏi cookie refresh_token đúng một
  // lần. Trước đây 'absent' đi thẳng ra 'anonymous', nghĩa là access token biến mất khỏi
  // localStorage là phiên coi như mất -- dù server vẫn giữ nó sống đủ 72 giờ và cookie vẫn nằm
  // nguyên trong trình duyệt. Mất token mà không hề đăng xuất là chuyện xảy ra thật: trình duyệt
  // dọn dung lượng, người dùng xoá dữ liệu trang, hoặc một nhánh clearAuthTokens chạy giữa chừng.
  //
  // Không có cách nào đoán trước: cookie là httpOnly nên JS không đọc được, và một cờ đánh dấu
  // trong localStorage thì chết chung với chính localStorage trong đúng tình huống cần nó. Chỉ
  // còn cách hỏi thẳng server.
  //
  // Giá phải trả, biết trước và chấp nhận: mỗi lần mở trang bằng trình duyệt CHƯA từng đăng nhập
  // cũng tốn một lượt POST /v1/auth/refresh hỏng (401, hoặc 403 nếu trình duyệt còn chưa có
  // cookie XSRF-TOKEN -- đừng mất công truy con 403 đó, nó vô hại) và một nhịp PageLoader trước
  // khi trang chủ hiện ra.
  return { status: 'loading', user: null }
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
