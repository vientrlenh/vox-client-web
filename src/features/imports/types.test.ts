import { getImportTypeDisplay, getImportUpdatedRows } from './types'

describe('imports type helpers', () => {
  it('maps known import types to Vietnamese labels', () => {
    expect(getImportTypeDisplay('SCHOOL_CLASS')).toBe('Lớp học')
    expect(getImportTypeDisplay('SCHOOL_CLASS_USER')).toBe('Học viên trong lớp')
    expect(getImportTypeDisplay('USER')).toBe('Người dùng')
    expect(getImportTypeDisplay('user')).toBe('Người dùng')
  })

  it('falls back to the raw value for unknown types', () => {
    expect(getImportTypeDisplay('UNKNOWN')).toBe('UNKNOWN')
    expect(getImportTypeDisplay(null)).toBe('-')
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
})
