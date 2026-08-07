import type { QuestionBankDto } from './types'
import {
  canDeleteQuestionBank,
  canEditQuestionBank,
  getQuestionBankStatusActions,
} from './permissions'

function createBank(status: QuestionBankDto['status']): QuestionBankDto {
  return {
    bankName: 'Ngân hàng thử nghiệm',
    code: 'BANK-1',
    createdAt: '2026-06-01T00:00:00Z',
    createdBy: 'admin-1',
    description: null,
    id: 'bank-1',
    isActive: true,
    languageId: 'lang-1',
    name: 'Ngân hàng thử nghiệm',
    ownerType: 'SCHOOL',
    schoolId: 'school-1',
    status,
    updatedAt: '2026-06-01T00:00:00Z',
    updatedBy: 'admin-1',
  }
}

describe('canEditQuestionBank', () => {
  it('chỉ cho phép sửa ngân hàng ở trạng thái Bản nháp', () => {
    expect(canEditQuestionBank(createBank('DRAFT'), 'SCHOOL_ADMIN')).toBe(true)
    expect(canEditQuestionBank(createBank('PUBLISHED'), 'SCHOOL_ADMIN')).toBe(
      false,
    )
    expect(canEditQuestionBank(createBank('ARCHIVED'), 'SCHOOL_ADMIN')).toBe(
      false,
    )
  })

  it('từ chối vai trò không có quyền quản lý', () => {
    expect(canEditQuestionBank(createBank('DRAFT'), 'TEACHER')).toBe(false)
    expect(canEditQuestionBank(createBank('DRAFT'), null)).toBe(false)
  })
})

describe('canDeleteQuestionBank', () => {
  it('chỉ cho phép xóa ngân hàng ở trạng thái Bản nháp', () => {
    expect(canDeleteQuestionBank(createBank('DRAFT'), 'SYSTEM_ADMIN')).toBe(true)
    expect(canDeleteQuestionBank(createBank('PUBLISHED'), 'SYSTEM_ADMIN')).toBe(
      false,
    )
    expect(canDeleteQuestionBank(createBank('ARCHIVED'), 'SYSTEM_ADMIN')).toBe(
      false,
    )
  })

  it('từ chối vai trò không có quyền quản lý', () => {
    expect(canDeleteQuestionBank(createBank('DRAFT'), 'TEACHER')).toBe(false)
    expect(canDeleteQuestionBank(null, 'SYSTEM_ADMIN')).toBe(false)
  })
})

describe('getQuestionBankStatusActions', () => {
  it('dùng nhãn tiếng Việt cho các thao tác trạng thái', () => {
    const draftActions = getQuestionBankStatusActions(
      createBank('DRAFT'),
      'SCHOOL_ADMIN',
    )

    expect(draftActions.map((action) => action.label)).toEqual([
      'Xuất bản',
      'Lưu trữ',
    ])
  })

  it('chỉ còn Lưu trữ khi ngân hàng đã xuất bản', () => {
    const publishedActions = getQuestionBankStatusActions(
      createBank('PUBLISHED'),
      'SCHOOL_ADMIN',
    )

    expect(publishedActions.map((action) => action.action)).toEqual(['ARCHIVE'])
  })

  it('không còn thao tác nào khi đã lưu trữ', () => {
    expect(
      getQuestionBankStatusActions(createBank('ARCHIVED'), 'SCHOOL_ADMIN'),
    ).toEqual([])
  })

  it('không trả thao tác cho vai trò không quản lý', () => {
    expect(getQuestionBankStatusActions(createBank('DRAFT'), 'TEACHER')).toEqual(
      [],
    )
    expect(getQuestionBankStatusActions(createBank('DRAFT'), null)).toEqual([])
  })

  it('gắn icon cho mọi thao tác để menu không bị lệch', () => {
    const actions = getQuestionBankStatusActions(
      createBank('DRAFT'),
      'SYSTEM_ADMIN',
    )

    expect(actions).toHaveLength(2)
    actions.forEach((action) => {
      expect(action.icon).toBeDefined()
    })
  })
})
