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
  // vox-streaming: manifest HLS và WebSocket giám sát. Có giá trị thật (dù là giả) chứ không để
  // trống vì `manifestUrl` gọi thẳng `.replace` trên nó -- bỏ trống thì mọi test chạm trình phát
  // live đều chết bằng TypeError thay vì bằng thứ nó định kiểm.
  streamApiUrl: 'http://stream.test',
  streamWsUrl: 'ws://stream.test',
} as const
