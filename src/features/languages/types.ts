export type SupportedLanguage = {
  code: string | null
  createdAt: string | null
  description: string | null
  id: string
  isActive: boolean
  name: string | null
  updatedAt: string | null
}

export type SupportedLanguagePage = {
  content: SupportedLanguage[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type LanguageFilters = {
  isActive: '' | 'active' | 'inactive'
  search: string
}

export type CreateSupportedLanguageRequest = {
  code: string
  description: string | null
  name: string
}

export type UpdateSupportedLanguageRequest = {
  code: string
  description: string | null
  isActive: boolean
  name: string
}

export type CreateSupportedLanguageResponse = {
  supportedLanguageId: string
}

export type UpdateSupportedLanguageResponse = {
  supportedLanguageId: string
}

export type DeleteSupportedLanguageResponse = void

export type MutationResult<TData> = {
  data: TData
  message: string
}

export type LanguageStatusDisplay = {
  className: string
  label: string
}

export function getLanguageStatusDisplay(
  isActive?: boolean | null,
): LanguageStatusDisplay {
  if (isActive) {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Đang hoạt động',
    }
  }

  return {
    className: 'border-slate-200 bg-slate-100 text-slate-600',
    label: 'Đã lưu trữ',
  }
}

export function formatLanguageDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
}
