import { getImportFields, getMissingRequiredFields } from './importFields'
import { IMPORT_TYPE_VALUES } from './importTypes'

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

  it('covers every backend import type', () => {
    IMPORT_TYPE_VALUES.forEach((type) => {
      expect(getImportFields(type).length).toBeGreaterThan(0)
    })
  })

  it('requires schoolGradeLevelCode for SCHOOL_GRADE', () => {
    const fields = getImportFields('SCHOOL_GRADE')
    const gradeLevelCode = fields.find(
      (field) => field.value === 'schoolGradeLevelCode',
    )

    expect(gradeLevelCode?.isRequired).toBe(true)
    expect(
      getMissingRequiredFields(fields, {
        MaNamHoc: 'code',
        NgayBatDau: 'startDate',
        NgayKetThuc: 'endDate',
        TenNamHoc: 'name',
      }).map((field) => field.value),
    ).toEqual(['schoolGradeLevelCode'])
  })

  it('omits the non-existent minimumFrameworkBand field for ASSESSMENT_POLICY', () => {
    const values = getImportFields('ASSESSMENT_POLICY').map(
      (field) => field.value,
    )

    expect(values).not.toContain('minimumFrameworkBand')
    expect(
      getImportFields('ASSESSMENT_POLICY')
        .filter((field) => field.isRequired)
        .map((field) => field.value),
    ).toEqual([
      'language',
      'frameworkVersion',
      'rubricVersion',
      'targetFrameworkBand',
      'effectiveFrom',
    ])
  })

  it('uses the backend system-field keys for QUESTION', () => {
    const values = getImportFields('QUESTION').map((field) => field.value)

    expect(values).toContain('evaluationExpectedContent')
    expect(values).not.toContain('expectedContent')
    expect(
      getImportFields('QUESTION')
        .filter((field) => field.isRequired)
        .map((field) => field.value),
    ).toEqual([
      'type',
      'questionText',
      'preparationTimeSeconds',
      'minResponseSeconds',
      'maxResponseSeconds',
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
