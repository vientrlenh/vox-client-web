import { IMPORT_STATUS_VALUES, IMPORT_TYPE_VALUES } from './importTypes'
import {
  getImportResultCounts,
  getImportStatusDisplay,
  getImportTypeDisplay,
  getImportUpdatedRows,
} from './types'

describe('imports type helpers', () => {
  it('maps known import types to Vietnamese labels', () => {
    expect(getImportTypeDisplay('SCHOOL_CLASS')).toBe('Lớp học')
    expect(getImportTypeDisplay('SCHOOL_CLASS_USER')).toBe(
      'Người dùng trong lớp',
    )
    expect(getImportTypeDisplay('USER')).toBe('Người dùng')
    expect(getImportTypeDisplay('user')).toBe('Người dùng')
  })

  it('labels every backend import type', () => {
    IMPORT_TYPE_VALUES.forEach((type) => {
      expect(getImportTypeDisplay(type)).not.toBe(type)
    })

    expect(getImportTypeDisplay('SCHOOL_GRADE_LEVEL')).toBe('Khối')
    expect(getImportTypeDisplay('QUESTION')).toBe('Câu hỏi')
    expect(getImportTypeDisplay('RUBRIC_CRITERION_BAND')).toBe(
      'Mức điểm tiêu chí',
    )
  })

  it('falls back to the raw value for unknown types', () => {
    expect(getImportTypeDisplay('UNKNOWN')).toBe('UNKNOWN')
    expect(getImportTypeDisplay(null)).toBe('-')
  })

  it('labels every backend session status, including in-progress ones', () => {
    IMPORT_STATUS_VALUES.forEach((status) => {
      expect(getImportStatusDisplay(status).label).not.toBe(status)
    })

    expect(getImportStatusDisplay('QUEUED').label).toBe('Đang chờ')
    expect(getImportStatusDisplay('VALIDATING').label).toBe('Đang kiểm tra')
    expect(getImportStatusDisplay('IMPORTING').label).toBe('Đang import')
    expect(getImportStatusDisplay('COMPLETED').label).toBe('Hoàn tất')
  })

  it('falls back to the raw value for unknown statuses', () => {
    expect(getImportStatusDisplay('UNKNOWN').label).toBe('UNKNOWN')
    expect(getImportStatusDisplay(null).label).toBe('-')
  })

  it('derives updated rows from total minus imported and invalid', () => {
    expect(
      getImportUpdatedRows({ importedRows: 3, invalidRows: 1, totalRows: 10 }),
    ).toBe(6)
  })

  it('never returns a negative number of updated rows', () => {
    expect(
      getImportUpdatedRows({ importedRows: 8, invalidRows: 5, totalRows: 10 }),
    ).toBe(0)
  })

  it('computes result counts only for completed sessions', () => {
    expect(
      getImportResultCounts({
        importedRows: 3,
        invalidRows: 1,
        skippedRows: 2,
        status: 'COMPLETED',
        totalRows: 10,
      }),
    ).toEqual({ added: 3, invalid: 1, skipped: 2, updated: 6 })
  })

  it('returns zeroed result counts for non-completed sessions', () => {
    expect(
      getImportResultCounts({
        importedRows: 3,
        invalidRows: 1,
        skippedRows: 2,
        status: 'PREVIEWED',
        totalRows: 10,
      }),
    ).toEqual({ added: 0, invalid: 0, skipped: 0, updated: 0 })
  })
})
