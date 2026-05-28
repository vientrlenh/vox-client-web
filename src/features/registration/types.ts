export type RegisterFormStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'WAITING'

export type RegisterForm = {
  contactAddress: string | null
  contactEmail: string | null
  contactFullName: string | null
  contactPhone: string | null
  dateOfBirth: string | null
  id: string
  identityNumber: string | null
  position: string | null
  postalCode: string | null
  reason: string | null
  schoolAddress: string | null
  schoolDomain: string | null
  schoolName: string | null
  status: RegisterFormStatus | string | null
  studentCount: number | null
}

export type RegisterFormPage = {
  content: RegisterForm[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type RegisterFormStatusDisplay = {
  className: string
  label: string
}

export function getRegisterFormStatusDisplay(
  status?: string | null,
): RegisterFormStatusDisplay {
  const normalized = status?.trim().toUpperCase() ?? ''

  if (
    normalized === 'APPROVED' ||
    normalized === 'APPROVE' ||
    normalized === 'DA_DUYET' ||
    normalized === 'ĐÃ DUYỆT'
  ) {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Đã duyệt',
    }
  }

  if (
    normalized === 'REJECTED' ||
    normalized === 'REJECT' ||
    normalized === 'TU_CHOI' ||
    normalized === 'TỪ CHỐI'
  ) {
    return {
      className: 'border-red-200 bg-red-50 text-red-700',
      label: 'Từ chối',
    }
  }

  return {
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Chờ duyệt',
  }
}

export function formatRegisterFormDate(value?: string | null) {
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

export function formatStudentCount(value?: number | null) {
  if (typeof value !== 'number') {
    return '-'
  }

  return new Intl.NumberFormat('vi-VN').format(value)
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
}
