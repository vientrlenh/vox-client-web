import type { MySubscription } from '@/features/subscription_school/types'
import {
  buildSubscriptionWindowError,
  getSubscriptionWindowBounds,
  hasActiveSubscriptionPeriod,
} from './subscriptionWindow'

/**
 * Điểm dễ sai nhất là cận trên: `endDate` của gói là chuỗi chỉ có ngày và INCLUSIVE, nên trọn ngày
 * cuối cùng vẫn phải nằm trong hạn. Lấy 00:00 ngày đó làm cận trên là chặn oan cả ngày cuối.
 */
function subscription(overrides: Partial<MySubscription> = {}): MySubscription {
  return {
    cancelledAt: null,
    endDate: '2026-12-31',
    id: 'sub-1',
    plan: null,
    planId: 'plan-1',
    pricePaidSnapshot: 0,
    schoolId: 'school-1',
    startDate: '2026-01-01',
    status: 'ACTIVE',
    ...overrides,
  }
}

/** Dựng ISO từ giờ ĐỊA PHƯƠNG — cùng hệ quy chiếu với giá trị người dùng nhập ở datetime-local. */
function localIso(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString()
}

describe('getSubscriptionWindowBounds', () => {
  it('kẹp picker theo trọn ngày đầu và ngày cuối của gói', () => {
    expect(getSubscriptionWindowBounds(subscription())).toEqual({
      max: '2026-12-31T23:59',
      min: '2026-01-01T00:00',
    })
  })

  it('không kẹp gì khi chưa xác định được hạn gói', () => {
    expect(getSubscriptionWindowBounds(null)).toBeNull()
    expect(getSubscriptionWindowBounds(subscription({ status: 'EXPIRED' }))).toBeNull()
    expect(getSubscriptionWindowBounds(subscription({ startDate: null }))).toBeNull()
  })
})

describe('buildSubscriptionWindowError', () => {
  it('cho qua khi khung nằm gọn trong hạn gói', () => {
    expect(
      buildSubscriptionWindowError(localIso(2026, 6, 1, 7), localIso(2026, 6, 1, 9), subscription()),
    ).toBeNull()
  })

  it('cho qua ở đúng biên: 00:00 ngày bắt đầu và 23:59 ngày kết thúc', () => {
    expect(
      buildSubscriptionWindowError(
        localIso(2026, 1, 1, 0, 0),
        localIso(2026, 12, 31, 23, 59),
        subscription(),
      ),
    ).toBeNull()
  })

  it('chặn khi thời gian mở bài trước ngày bắt đầu gói', () => {
    expect(
      buildSubscriptionWindowError(
        localIso(2025, 12, 31, 23),
        localIso(2026, 1, 2, 9),
        subscription(),
      ),
    ).toMatch(/Thời gian mở bài.*01\/01\/2026.*31\/12\/2026/)
  })

  it('chặn khi thời gian đóng bài vượt ngày kết thúc gói', () => {
    expect(
      buildSubscriptionWindowError(localIso(2026, 6, 1, 7), localIso(2027, 1, 5, 9), subscription()),
    ).toMatch(/Thời gian đóng bài/)
  })

  it('chặn ngay khi sang 00:00 ngày kế tiếp ngày kết thúc', () => {
    expect(
      buildSubscriptionWindowError(
        localIso(2026, 12, 31, 7),
        localIso(2027, 1, 1, 0, 0),
        subscription(),
      ),
    ).toMatch(/Thời gian đóng bài/)
  })

  it('báo chưa có gói khi trường không có thuê bao đang hoạt động', () => {
    expect(
      buildSubscriptionWindowError(localIso(2026, 6, 1, 7), localIso(2026, 6, 1, 9), null),
    ).toMatch(/chưa có gói dịch vụ/)
  })

  /** Chưa nhập gì thì chưa có gì để soi — việc bắt buộc nhập là của form, không phải hàm này. */
  it('bỏ qua khi cả hai mốc đều trống', () => {
    expect(buildSubscriptionWindowError(null, null, null)).toBeNull()
  })
})

describe('hasActiveSubscriptionPeriod', () => {
  it('chỉ đúng khi gói ACTIVE và có đủ hai mốc ngày', () => {
    expect(hasActiveSubscriptionPeriod(subscription())).toBe(true)
    expect(hasActiveSubscriptionPeriod(subscription({ status: 'CANCELLED' }))).toBe(false)
    expect(hasActiveSubscriptionPeriod(subscription({ endDate: null }))).toBe(false)
    expect(hasActiveSubscriptionPeriod(undefined)).toBe(false)
  })
})
