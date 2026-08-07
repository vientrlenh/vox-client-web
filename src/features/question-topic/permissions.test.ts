import type { QuestionTopicDto } from './types'
import {
  canDeleteQuestionTopic,
  canEditQuestionTopic,
  getQuestionTopicReviewActions,
} from './permissions'

const handlers = {
  onArchive: () => undefined,
  onPublish: () => undefined,
}

function createTopic(status: QuestionTopicDto['status']): QuestionTopicDto {
  return {
    bankId: 'bank-1',
    code: 'TOPIC-1',
    createdAt: '2026-06-01T00:00:00Z',
    description: null,
    id: 'topic-1',
    name: 'Chủ đề thử nghiệm',
    questionBankId: 'bank-1',
    status,
    topicName: 'Chủ đề thử nghiệm',
    updatedAt: '2026-06-01T00:00:00Z',
  }
}

describe('canEditQuestionTopic', () => {
  it('chỉ cho phép sửa chủ đề ở trạng thái Bản nháp', () => {
    expect(canEditQuestionTopic(createTopic('DRAFT'), 'SCHOOL_ADMIN')).toBe(true)
    expect(canEditQuestionTopic(createTopic('PUBLISHED'), 'SCHOOL_ADMIN')).toBe(
      false,
    )
    expect(canEditQuestionTopic(createTopic('ARCHIVED'), 'SCHOOL_ADMIN')).toBe(
      false,
    )
  })

  it('từ chối vai trò không có quyền quản lý', () => {
    expect(canEditQuestionTopic(createTopic('DRAFT'), 'TEACHER')).toBe(false)
    expect(canEditQuestionTopic(createTopic('DRAFT'), null)).toBe(false)
  })
})

describe('canDeleteQuestionTopic', () => {
  it('chỉ cho phép xóa chủ đề ở trạng thái Bản nháp', () => {
    expect(canDeleteQuestionTopic(createTopic('DRAFT'), 'SYSTEM_ADMIN')).toBe(
      true,
    )
    expect(
      canDeleteQuestionTopic(createTopic('PUBLISHED'), 'SYSTEM_ADMIN'),
    ).toBe(false)
    expect(canDeleteQuestionTopic(null, 'SYSTEM_ADMIN')).toBe(false)
  })
})

describe('getQuestionTopicReviewActions', () => {
  it('dùng nhãn tiếng Việt cho các thao tác trạng thái', () => {
    const draftActions = getQuestionTopicReviewActions(
      createTopic('DRAFT'),
      'SCHOOL_ADMIN',
      handlers,
    )

    expect(draftActions.map((action) => action.label)).toEqual([
      'Xuất bản',
      'Lưu trữ',
    ])
  })

  it('chỉ còn Lưu trữ khi chủ đề đã xuất bản', () => {
    const publishedActions = getQuestionTopicReviewActions(
      createTopic('PUBLISHED'),
      'SCHOOL_ADMIN',
      handlers,
    )

    expect(publishedActions.map((action) => action.label)).toEqual(['Lưu trữ'])
  })

  it('không còn thao tác nào khi đã lưu trữ', () => {
    expect(
      getQuestionTopicReviewActions(
        createTopic('ARCHIVED'),
        'SCHOOL_ADMIN',
        handlers,
      ),
    ).toEqual([])
  })

  it('không trả thao tác cho vai trò không quản lý', () => {
    expect(
      getQuestionTopicReviewActions(createTopic('DRAFT'), 'TEACHER', handlers),
    ).toEqual([])
  })

  it('gắn icon cho mọi thao tác để menu không bị lệch', () => {
    const actions = getQuestionTopicReviewActions(
      createTopic('DRAFT'),
      'SYSTEM_ADMIN',
      handlers,
    )

    expect(actions).toHaveLength(2)
    actions.forEach((action) => {
      expect(action.icon).toBeDefined()
    })
  })
})
