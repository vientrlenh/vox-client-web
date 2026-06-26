import { getImportFields, getMissingRequiredFields } from './importFields'

describe('import fields config', () => {
  it('returns fields for every supported import type', () => {
    expect(getImportFields('SCHOOL_CLASS').map((field) => field.value)).toEqual([
      'code',
      'name',
      'languageCode',
      'schoolGradeCode',
      'description',
    ])
    expect(getImportFields('SCHOOL_CLASS_USER').map((field) => field.value)).toEqual(
      ['email', 'classCode'],
    )
    expect(getImportFields('USER').map((field) => field.value)).toContain(
      'fullName',
    )
    expect(
      getImportFields('SCHOOL_DIRECTORY').map((field) => field.value),
    ).toEqual([
      'code',
      'name',
      'provinceCode',
      'provinceName',
      'districtName',
      'domain',
      'address',
      'origin',
    ])
  })

  it('normalizes the type and returns an empty list for unknown types', () => {
    expect(getImportFields('school_class')).toHaveLength(5)
    expect(getImportFields('UNKNOWN')).toEqual([])
    expect(getImportFields(null)).toEqual([])
  })

  it('reports required fields that are not mapped', () => {
    const fields = getImportFields('SCHOOL_CLASS_USER')

    expect(
      getMissingRequiredFields(fields, { Email: 'email' }).map(
        (field) => field.value,
      ),
    ).toEqual(['classCode'])
    expect(
      getMissingRequiredFields(fields, {
        Email: 'email',
        MaLop: 'classCode',
      }),
    ).toEqual([])
  })
})
