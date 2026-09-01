import { appConfig } from '@/shared/config/env'
import {
  createNotificationDevice,
  deleteNotificationDevice,
} from '../api/notificationDeviceApi'

export const NOTIFICATION_INSTALLATION_STORAGE_KEY =
  'vox.notification.installationId'

export type PushPermissionStatus = NotificationPermission | 'unsupported'

/**
 * Đăng ký đang chạy dở, dùng chung cho mọi lời gọi song song: chuông ở layout và nút bật
 * thông báo trong bảng cùng gọi hàm này, không có lý do gì để chạy hai lần.
 */
let pendingRegistration: Promise<void> | null = null

/** `${userId}:${installationId}` của lần đăng ký thành công gần nhất trong phiên trang. */
let registeredKey: string | null = null

let listenerCleanups: Array<() => void> = []

function getStorage() {
  if (typeof globalThis.localStorage === 'undefined') {
    return null
  }

  return globalThis.localStorage
}

export function isPushSupported() {
  return (
    typeof globalThis.Notification !== 'undefined' &&
    typeof globalThis.navigator !== 'undefined' &&
    'serviceWorker' in globalThis.navigator &&
    Boolean(appConfig.firebase.vapidKey)
  )
}

export function readPushPermission(): PushPermissionStatus {
  if (!isPushSupported()) {
    return 'unsupported'
  }

  return globalThis.Notification.permission
}

/**
 * Quyền thông báo là trạng thái của cả tab chứ không của riêng component nào, và có hai
 * nơi cùng quan tâm: nút bật trong bảng thông báo, và vòng đăng ký thiết bị ở chuông. Một
 * store nhỏ dùng chung để cả hai không lệch nhau -- nếu mỗi bên giữ `useState` riêng, bật
 * quyền từ trong bảng sẽ không đánh thức được vòng đăng ký cho tới lần tải lại trang.
 */
const permissionListeners = new Set<() => void>()
let permissionSnapshot: PushPermissionStatus | null = null

export function getPushPermissionSnapshot(): PushPermissionStatus {
  permissionSnapshot ??= readPushPermission()
  return permissionSnapshot
}

export function subscribeToPushPermission(listener: () => void) {
  permissionListeners.add(listener)

  return () => {
    permissionListeners.delete(listener)
  }
}

function publishPushPermission(next: PushPermissionStatus) {
  if (permissionSnapshot === next) {
    return
  }

  permissionSnapshot = next
  permissionListeners.forEach((listener) => listener())
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (!isPushSupported()) {
    return 'unsupported'
  }

  const permission = await globalThis.Notification.requestPermission()
  publishPushPermission(permission)

  return permission
}

/**
 * Service worker nằm ngoài pipeline của Vite nên không đọc được biến môi trường; cấu hình
 * Firebase đi kèm theo query string. Chuỗi này phải ổn định giữa các lần gọi, vì mỗi URL
 * khác nhau là một bản đăng ký service worker khác nhau.
 */
function serviceWorkerUrl() {
  const { apiKey, appId, messagingSenderId, projectId } = appConfig.firebase
  const params = new URLSearchParams({
    apiKey,
    appId,
    messagingSenderId,
    projectId,
  })

  return `/firebase-messaging-sw.js?${params.toString()}`
}

/**
 * Nạp động: giữ gói firebase/messaging ra khỏi bundle chính (người dùng chưa bật thông
 * báo thì không phải tải), và không kéo `initializeApp` vào mọi test chạm tới feature này.
 */
async function loadMessaging() {
  const [{ firebaseApp }, messaging] = await Promise.all([
    import('@/shared/firebase'),
    import('firebase/messaging'),
  ])

  if (!(await messaging.isSupported())) {
    return null
  }

  return { app: firebaseApp, messaging }
}

function rememberInstallationId(installationId: string) {
  getStorage()?.setItem(NOTIFICATION_INSTALLATION_STORAGE_KEY, installationId)
}

function forgetInstallationId() {
  getStorage()?.removeItem(NOTIFICATION_INSTALLATION_STORAGE_KEY)
}

async function handleRegistered(userId: string, installationId: string) {
  if (registeredKey === `${userId}:${installationId}`) {
    return
  }

  try {
    await createNotificationDevice(installationId)
    registeredKey = `${userId}:${installationId}`
    rememberInstallationId(installationId)
  } catch (error: unknown) {
    console.warn('Không đăng ký được thiết bị nhận thông báo', error)
  }
}

/**
 * FCM tự huỷ đăng ký khi FID hết hiệu lực. Không gỡ dòng tương ứng thì mọi lần đẩy sau đó
 * đều đâm vào một FID chết -- đúng cảnh mà `PushDispatchResult.stale` bên backend phải
 * dọn dẹp về sau.
 */
async function handleUnregistered(installationId: string) {
  registeredKey = null
  forgetInstallationId()

  try {
    await deleteNotificationDevice(installationId)
  } catch {
    // Thiết bị đã được gỡ từ trước là kết quả mong muốn rồi.
  }
}

/**
 * Gọi lại mỗi lần khởi động ứng dụng là có chủ ý, không phải lãng phí: endpoint là upsert
 * idempotent, và `last_seen_at` mà nó ghi lại chính là thứ giữ thiết bị không bị
 * `NotificationDeviceCleanUpJob` dọn sau 90 ngày im lặng.
 */
export function ensurePushDeviceRegistered(userId: string) {
  if (readPushPermission() !== 'granted') {
    return Promise.resolve()
  }

  if (pendingRegistration) {
    return pendingRegistration
  }

  pendingRegistration = (async () => {
    const loaded = await loadMessaging()

    if (!loaded) {
      return
    }

    const { getMessaging, onRegistered, onUnregistered, register } = loaded.messaging
    const instance = getMessaging(loaded.app)
    const serviceWorkerRegistration = await navigator.serviceWorker.register(
      serviceWorkerUrl(),
    )

    // Thứ tự bắt buộc: `register` ném lỗi nếu chưa có handler nào được gắn, và FID chỉ
    // đến qua callback chứ không nằm trong giá trị trả về. SDK gọi lại handler này ở mọi
    // lần `register` và cả khi FID xoay vòng, nên nhịp làm tươi `last_seen_at` và việc
    // đổi FID đều đi chung một đường.
    listenerCleanups.forEach((cleanup) => cleanup())
    listenerCleanups = [
      onRegistered(instance, (installationId) => {
        void handleRegistered(userId, installationId)
      }),
      onUnregistered(instance, (installationId) => {
        void handleUnregistered(installationId)
      }),
    ]

    await register(instance, {
      serviceWorkerRegistration,
      vapidKey: appConfig.firebase.vapidKey,
    })
  })()
    .catch((error: unknown) => {
      // Đăng ký hỏng chỉ mất lớp đánh động; sổ thông báo trong ứng dụng vẫn đầy đủ. Cùng
      // triết lý với `pushBestEffort` bên backend, nên không nổi lên thành lỗi cho người
      // dùng.
      console.warn('Không thiết lập được thông báo đẩy', error)
    })
    .finally(() => {
      pendingRegistration = null
    })

  return pendingRegistration
}

/**
 * Phải chạy XONG trước khi xoá token đăng nhập, nếu không request rơi vào 401.
 *
 * <p>POST /v1/auth/logout giờ đã thu hồi phiên và backend tự gỡ thiết bị theo
 * `DeviceSessionRevokedEvent`, nên bước này KHÔNG còn là đường duy nhất -- nhưng vẫn giữ:
 * nó dọn cả trạng thái phía client (FID đã lưu, các listener đang gắn) mà server không với
 * tới được, và nó vẫn chạy đúng khi lời gọi thu hồi thất bại. Bỏ hẳn thì trên máy dùng
 * chung, thông báo điểm thi của người vừa rời đi có thể hiện lên cho người ngồi xuống sau.
 *
 * <p>Cố tình đọc FID từ localStorage thay vì hỏi lại Firebase: đọc đồng bộ nên không phải
 * chờ nạp SDK ngay giữa đường đăng xuất, và vẫn gỡ được thiết bị đã đăng ký từ phiên
 * trang trước.
 */
export async function unregisterPushDevice() {
  const installationId = getStorage()?.getItem(
    NOTIFICATION_INSTALLATION_STORAGE_KEY,
  )

  forgetInstallationId()
  registeredKey = null
  listenerCleanups.forEach((cleanup) => cleanup())
  listenerCleanups = []

  if (!installationId) {
    return
  }

  try {
    await deleteNotificationDevice(installationId)
  } catch {
    // 404 nghĩa là thiết bị đã được gỡ từ trước -- đúng kết quả mong muốn. Mọi lỗi khác
    // cũng không được phép chặn đường đăng xuất.
  }
}

export async function subscribeToForegroundMessages(
  onMessageReceived: () => void,
) {
  if (readPushPermission() !== 'granted') {
    return () => {}
  }

  const loaded = await loadMessaging()

  if (!loaded) {
    return () => {}
  }

  return loaded.messaging.onMessage(
    loaded.messaging.getMessaging(loaded.app),
    () => onMessageReceived(),
  )
}
