export type QuestionBankDto = {
  id: string
  bankName: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type QuestionBankPage = {
  content: QuestionBankDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CreateQuestionBankRequest = {
  code: string
  description: string | null
  languageId: string
  name: string
  schoolId?: string
}

export type UpdateQuestionBankRequest = {
  bankName: string
  description: string | null
  isActive: boolean
}

export type ReviewQuestionBankRequest = {
  targetStatus: string
}

export function formatQuestionBankDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)

  if (isoDate) {
    const [, year, month, day] = isoDate
    return `${day}/${month}/${year}`
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
}

export function getActiveStatusDisplay(isActive: boolean) {
  return isActive
    ? {
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        label: 'Hoạt động',
      }
    : {
        className: 'border-slate-200 bg-slate-50 text-slate-500',
        label: 'Ngừng hoạt động',
      }
}
