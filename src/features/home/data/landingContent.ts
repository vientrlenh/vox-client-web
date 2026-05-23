export type IconName =
  | 'barChart'
  | 'book'
  | 'brain'
  | 'calendar'
  | 'check'
  | 'clock'
  | 'folder'
  | 'graduation'
  | 'headphones'
  | 'lock'
  | 'message'
  | 'mic'
  | 'scale'
  | 'school'
  | 'shield'
  | 'sparkles'
  | 'users'

export type AudienceImage = 'school' | 'student' | 'teacher'

export const routeLinks = {
  about: '/about',
  contact: '/contact',
  login: '/login',
  pricing: '/pricing',
  register: '/register',
} as const

export const navItems = [
  { href: '#features', label: 'Tính năng' },
  { href: '#benefits', label: 'Lợi ích' },
  { href: '#audiences', label: 'Dành cho ai' },
  { href: routeLinks.pricing, label: 'Bảng giá' },
  { href: routeLinks.about, label: 'Về chúng tôi' },
]

export const heroHighlights = [
  { icon: 'sparkles', label: 'AI chấm điểm tự động' },
  { icon: 'message', label: 'Phản hồi chi tiết' },
  { icon: 'folder', label: 'Quản lý dễ dàng' },
  { icon: 'shield', label: 'Bảo mật tuyệt đối' },
] satisfies Array<{ icon: IconName; label: string }>

export const problemItems = [
  {
    icon: 'calendar',
    label: 'Tốn nhiều thời gian xếp lịch và giám sát',
  },
  {
    icon: 'users',
    label: 'Chấm điểm thủ công mất thời gian, thiếu nhất quán',
  },
  {
    icon: 'folder',
    label: 'Khó lưu trữ và quản lý bài làm, bản ghi âm',
  },
  {
    icon: 'barChart',
    label: 'Báo cáo kết quả phức tạp, khó tổng hợp',
  },
  {
    icon: 'headphones',
    label: 'Phúc khảo và sự cố xử lý chậm',
  },
] satisfies Array<{ icon: IconName; label: string }>

export const featureItems = [
  {
    description:
      'Tạo đề thi, phân lịch, theo dõi trạng thái làm bài của học sinh.',
    icon: 'mic',
    mobileDescription: 'Thiết lập, phân ca, giám sát dễ dàng',
    title: 'Tổ chức kỳ thi nói',
  },
  {
    description:
      'Đánh giá tự động theo nhiều tiêu chí với độ chính xác cao.',
    icon: 'brain',
    mobileDescription: 'Đánh giá tự động với độ chính xác cao',
    title: 'Chấm điểm bằng AI',
  },
  {
    description:
      'Luyện tập theo chương trình học và nhận phản hồi tức thì.',
    icon: 'book',
    mobileDescription: 'Luyện tập theo chủ đề và trình độ',
    title: 'Luyện nói cá nhân hóa',
  },
  {
    description:
      'Tạo và quản lý câu hỏi theo chủ đề, độ khó, kỹ năng đánh giá.',
    icon: 'folder',
    mobileDescription: 'Kho câu hỏi đa dạng theo chủ đề, độ khó',
    title: 'Ngân hàng câu hỏi',
  },
  {
    description:
      'Xem báo cáo kết quả theo lớp, kỹ năng và tiến độ học tập.',
    icon: 'clock',
    mobileDescription: 'Thống kê chi tiết, trực quan và dễ theo dõi',
    title: 'Báo cáo & thống kê',
  },
  {
    description:
      'Học sinh gửi yêu cầu, giáo viên xem lại và điều chỉnh khi cần.',
    icon: 'headphones',
    mobileDescription: 'Hỗ trợ yêu cầu phúc khảo minh bạch, nhanh chóng',
    title: 'Phúc khảo bài thi',
  },
] satisfies Array<{
  description: string
  icon: IconName
  mobileDescription?: string
  title: string
}>

export const audienceItems = [
  {
    bullets: [
      'Làm bài thi nói trực tuyến',
      'Luyện tập và cải thiện kỹ năng',
      'Xem điểm, nhận xét chi tiết',
      'Gửi yêu cầu phúc khảo khi cần',
    ],
    image: 'student',
    mobileBullets: ['Làm bài mọi lúc, mọi nơi.', 'Luyện nói hiệu quả.'],
    title: 'Học sinh',
  },
  {
    bullets: [
      'Tạo đề thi và theo dõi bài thi',
      'Xem kết quả và báo cáo lớp',
      'Nhận diện điểm yếu của học sinh',
      'Xử lý phúc khảo nhanh chóng',
    ],
    image: 'teacher',
    mobileBullets: [
      'Tạo đề thi, chấm điểm dễ dàng.',
      'Xem kết quả và báo cáo tức thì.',
    ],
    title: 'Giáo viên',
  },
  {
    bullets: [
      'Quản lý lớp học và kỳ thi',
      'Chuẩn hóa tiêu chí đánh giá',
      'Theo dõi chất lượng toàn trường',
      'Báo cáo tổng quan, đề xuất dữ liệu',
    ],
    image: 'school',
    mobileBullets: ['Quản lý kỳ thi tập trung.', 'Báo cáo tổng quan, dễ dàng.'],
    title: 'Nhà trường',
  },
] satisfies Array<{
  bullets: string[]
  image: AudienceImage
  mobileBullets?: string[]
  title: string
}>

export const benefitItems = [
  {
    description: 'AI xử lý và trả kết quả trong vài phút.',
    icon: 'shield',
    title: 'Nhanh chóng',
  },
  {
    description: 'Tiêu chí rõ ràng, chấm điểm thống nhất toàn trường.',
    icon: 'scale',
    title: 'Công bằng',
  },
  {
    description: 'Bảo mật dữ liệu, phân quyền chặt chẽ theo vai trò.',
    icon: 'lock',
    title: 'An toàn',
  },
  {
    description: 'Lưu trữ bản ghi âm, nhận xét và lịch sử chấm điểm.',
    icon: 'check',
    title: 'Minh bạch',
  },
] satisfies Array<{ description: string; icon: IconName; title: string }>

export const footerColumns = [
  {
    links: ['Tính năng', 'Bảng giá', 'Dùng thử'],
    title: 'Sản phẩm',
  },
  {
    links: ['Trung tâm hỗ trợ', 'Hướng dẫn sử dụng', 'Liên hệ'],
    title: 'Hỗ trợ',
  },
  {
    links: ['Về chúng tôi', 'Chính sách bảo mật', 'Điều khoản sử dụng'],
    title: 'Công ty',
  },
]
