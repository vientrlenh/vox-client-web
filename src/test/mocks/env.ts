export const appConfig = {
  apiBaseUrl: '/api',
  enableQueryDevtools: false,
  // Firebase để rỗng: jsdom không có service worker lẫn Notification, và `isPushSupported`
  // đọc `vapidKey` nên nhánh thông báo đẩy tự tắt trong test thay vì cố nạp SDK thật.
  firebase: {
    apiKey: '',
    appId: '',
    authDomain: '',
    measurementId: '',
    messagingSenderId: '',
    projectId: '',
    storageBucket: '',
    vapidKey: '',
  },
  graphqlEndpoint: '/graphql',
} as const
