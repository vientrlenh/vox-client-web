import axios from 'axios'
import { appConfig } from '@/shared/config/env'
import { getAuthTokens } from './authTokenStorage'
import { createRawErrorInterceptorInstaller } from './rawErrorInterceptor'

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  withCredentials: true,
  // Từ axios 1.6 trở đi, header X-XSRF-TOKEN KHÔNG được gắn cho request khác origin nếu
  // thiếu cờ này -- withCredentials ở trên là chuyện khác, nó chỉ lo việc gửi cookie đi.
  // voxenta.net -> api.voxenta.net là khác origin, nên thiếu cờ này thì POST /v1/auth/refresh
  // nhận 403 (BE bật CSRF cho ĐÚNG endpoint đó, xem SecurityConfig#CSRF_PROTECTED_API_PATH).
  //
  // Kiểu hỏng của nó rất khó lần: đăng nhập vẫn chạy, mọi màn hình vẫn chạy, chỉ tới khi
  // access token hết hạn mới gãy -- trông như "tự nhiên bị đăng xuất" chứ không như lỗi cấu hình.
  withXSRFToken: true
})

apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.setContentType(false)
  }

  const tokens = getAuthTokens()

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }

  return config
})

export const addApiClientRawErrorInterceptor = createRawErrorInterceptorInstaller(apiClient)
