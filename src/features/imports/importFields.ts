export type ImportField = {
  isRequired: boolean
  label: string
  value: string
}

export const IMPORT_FIELDS_BY_TYPE: Record<string, ImportField[]> = {
  SCHOOL_CLASS: [
    { isRequired: true, label: 'Mã lớp', value: 'code' },
    { isRequired: true, label: 'Tên lớp', value: 'name' },
    { isRequired: true, label: 'Mã ngôn ngữ', value: 'languageCode' },
    { isRequired: true, label: 'Mã khối lớp', value: 'schoolGradeCode' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
  ],
  SCHOOL_CLASS_USER: [
    { isRequired: true, label: 'Email', value: 'email' },
    { isRequired: true, label: 'Mã lớp', value: 'classCode' },
  ],
  SCHOOL_DIRECTORY: [
    { isRequired: true, label: 'Mã trường', value: 'code' },
    { isRequired: true, label: 'Tên trường', value: 'name' },
    { isRequired: false, label: 'Mã tỉnh', value: 'provinceCode' },
    { isRequired: false, label: 'Tên tỉnh', value: 'provinceName' },
    { isRequired: false, label: 'Tên quận/huyện', value: 'districtName' },
    { isRequired: false, label: 'Domain', value: 'domain' },
    { isRequired: false, label: 'Địa chỉ', value: 'address' },
    { isRequired: false, label: 'Nguồn gốc', value: 'origin' },
  ],
  USER: [
    { isRequired: true, label: 'Email', value: 'email' },
    { isRequired: true, label: 'Họ tên', value: 'fullName' },
    { isRequired: true, label: 'Vai trò', value: 'roleCode' },
    { isRequired: true, label: 'Số điện thoại', value: 'phone' },
    { isRequired: true, label: 'Ngày sinh', value: 'dateOfBirth' },
    { isRequired: true, label: 'Ngày bắt đầu', value: 'startDate' },
    { isRequired: true, label: 'Ngày kết thúc', value: 'endDate' },
    { isRequired: true, label: 'Địa chỉ', value: 'address' },
  ],
}

export function getImportFields(type?: string | null): ImportField[] {
  const normalized = type?.trim().toUpperCase()

  if (!normalized) {
    return []
  }

  return IMPORT_FIELDS_BY_TYPE[normalized] ?? []
}

export function getMissingRequiredFields(
  fields: ImportField[],
  mapping: Record<string, string>,
) {
  const mappedFields = new Set(
    Object.values(mapping)
      .map((value) => value.trim())
      .filter(Boolean),
  )

  return fields.filter(
    (field) => field.isRequired && !mappedFields.has(field.value),
  )
}
