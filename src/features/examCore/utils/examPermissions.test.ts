import type { ExamMemberRole, ExamPaperStatus } from '../types'
import { canEditPaperContent, resolveExamAuthority, resolvePaperActions } from './examPermissions'

const schoolAdmin = resolveExamAuthority({ isSchoolAdmin: true, myRole: null })
const chair = resolveExamAuthority({ isSchoolAdmin: false, myRole: 'CHAIR' })
const author = resolveExamAuthority({ isSchoolAdmin: false, myRole: 'AUTHOR' })
const reviewer = resolveExamAuthority({ isSchoolAdmin: false, myRole: 'REVIEWER' })
const outsider = resolveExamAuthority({ isSchoolAdmin: false, myRole: null })

function actions(input: {
  authority: ReturnType<typeof resolveExamAuthority>
  isOwnPaper: boolean
  myRole: ExamMemberRole | null
  paperStatus: ExamPaperStatus
}) {
  return resolvePaperActions(input)
}

describe('resolveExamAuthority', () => {
  /** Ba khác biệt dưới đây là toàn bộ ranh giới giữa hai vai — mọi quyền còn lại phải trùng khít. */
  it('gives the chair everything the school admin has, apart from the three deliberate exceptions', () => {
    const except = (authority: typeof schoolAdmin) => {
      const rest = { ...authority }
      delete (rest as Partial<typeof authority>).canDeleteExam
      delete (rest as Partial<typeof authority>).canManageChairMembers
      delete (rest as Partial<typeof authority>).canReleaseSecurePool
      return rest
    }

    expect(except(chair)).toEqual(except(schoolAdmin))
    expect([schoolAdmin.canDeleteExam, schoolAdmin.canManageChairMembers, schoolAdmin.canReleaseSecurePool]).toEqual([
      true,
      true,
      false,
    ])
    expect([chair.canDeleteExam, chair.canManageChairMembers, chair.canReleaseSecurePool]).toEqual([false, false, true])
  })

  it('keeps appointing a chair to the school admin alone', () => {
    expect(schoolAdmin.canManageChairMembers).toBe(true)
    expect(chair.canManageChairMembers).toBe(false)
  })

  it('lets the author attach a blueprint but not finalize its version', () => {
    expect(author.canAttachBlueprint).toBe(true)
    expect(author.canFinalizeBlueprintVersion).toBe(false)
    expect(author.canManagePapers).toBe(true)
    expect(author.canManageStatus).toBe(false)
  })

  it('gives a reviewer no management rights of its own', () => {
    expect(reviewer.canManagePapers).toBe(false)
    expect(reviewer.canAttachBlueprint).toBe(false)
  })

  it('gives someone with no role on the exam nothing', () => {
    expect(Object.values(outsider).every((value) => value === false)).toBe(true)
  })
})

describe('resolvePaperActions — mã đề do chính người quyết định soạn', () => {
  it('offers the chair a one-step lock on their own draft', () => {
    expect(actions({ authority: chair, isOwnPaper: true, myRole: 'CHAIR', paperStatus: 'DRAFT' })).toEqual(['LOCK'])
  })

  it('offers the school admin the same one-step lock', () => {
    expect(actions({ authority: schoolAdmin, isOwnPaper: true, myRole: null, paperStatus: 'DRAFT' })).toEqual(['LOCK'])
  })

  it('lets them reopen what they locked, otherwise they are locked out of their own paper', () => {
    expect(actions({ authority: chair, isOwnPaper: true, myRole: 'CHAIR', paperStatus: 'LOCKED' })).toEqual(['REOPEN'])
  })

  it('never offers approving your own paper', () => {
    expect(actions({ authority: chair, isOwnPaper: true, myRole: 'CHAIR', paperStatus: 'IN_REVIEW' })).toEqual([])
    expect(actions({ authority: schoolAdmin, isOwnPaper: true, myRole: null, paperStatus: 'IN_REVIEW' })).toEqual([])
  })
})

describe('resolvePaperActions — mã đề do người khác soạn', () => {
  it('keeps the full three-step flow', () => {
    expect(actions({ authority: chair, isOwnPaper: false, myRole: 'CHAIR', paperStatus: 'DRAFT' })).toEqual(['SUBMIT'])
    expect(actions({ authority: chair, isOwnPaper: false, myRole: 'CHAIR', paperStatus: 'IN_REVIEW' })).toEqual([
      'APPROVE',
      'REQUEST_REVISION',
    ])
    expect(actions({ authority: chair, isOwnPaper: false, myRole: 'CHAIR', paperStatus: 'APPROVED' })).toEqual(['LOCK'])
  })

  it('lets a reviewer approve but never lock', () => {
    expect(actions({ authority: reviewer, isOwnPaper: false, myRole: 'REVIEWER', paperStatus: 'IN_REVIEW' })).toEqual([])
  })

  it('lets an author submit but never lock', () => {
    expect(actions({ authority: author, isOwnPaper: true, myRole: 'AUTHOR', paperStatus: 'DRAFT' })).toEqual(['SUBMIT'])
    expect(actions({ authority: author, isOwnPaper: false, myRole: 'AUTHOR', paperStatus: 'APPROVED' })).toEqual([])
  })

  it('gives an outsider no buttons at all', () => {
    expect(actions({ authority: outsider, isOwnPaper: false, myRole: null, paperStatus: 'APPROVED' })).toEqual([])
  })
})

describe('canEditPaperContent', () => {
  it('lets the chair edit paper content — they author papers now', () => {
    expect(
      canEditPaperContent({ authority: chair, examKind: 'CENTRALIZED', examStatus: 'DRAFT', paperStatus: 'DRAFT' }),
    ).toBe(true)
  })

  it('stops editing a locked centralized paper', () => {
    expect(
      canEditPaperContent({ authority: chair, examKind: 'CENTRALIZED', examStatus: 'DRAFT', paperStatus: 'LOCKED' }),
    ).toBe(false)
  })

  it('still allows editing a locked class-test paper — LOCKED there is reversible', () => {
    expect(
      canEditPaperContent({ authority: chair, examKind: 'CLASS_TEST', examStatus: 'DRAFT', paperStatus: 'LOCKED' }),
    ).toBe(true)
  })

  it('freezes everything once the exam is running', () => {
    expect(
      canEditPaperContent({ authority: chair, examKind: 'CENTRALIZED', examStatus: 'IN_PROGRESS', paperStatus: 'DRAFT' }),
    ).toBe(false)
  })

  it('keeps papers frozen after the exam ends, for both exam kinds', () => {
    for (const examStatus of ['IN_PROGRESS', 'CLOSED', 'RESULTS_PUBLISHED', 'CANCELLED']) {
      expect(
        canEditPaperContent({ authority: chair, examKind: 'CENTRALIZED', examStatus, paperStatus: 'DRAFT' }),
      ).toBe(false)
      expect(
        canEditPaperContent({ authority: chair, examKind: 'CLASS_TEST', examStatus, paperStatus: 'DRAFT' }),
      ).toBe(false)
    }
  })

  it('still allows editing while the exam is only scheduled', () => {
    expect(
      canEditPaperContent({ authority: chair, examKind: 'CENTRALIZED', examStatus: 'SCHEDULED', paperStatus: 'DRAFT' }),
    ).toBe(true)
  })
})
