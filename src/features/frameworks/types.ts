export type Framework = {
  createdAt: string | null
  description: string | null
  id: string
  isActive: boolean
  name: string
  updatedAt: string | null
}

export type FrameworkPage = {
  content: Framework[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type FrameworkFilters = {
  isActive: '' | 'active' | 'inactive'
  search: string
}

export type CreateFrameworkRequest = {
  code: string
  description: string | null
  name: string
}

export type UpdateFrameworkRequest = {
  description?: string | null
  name?: string
}

export type CreateFrameworkResponse = string

export type UpdateFrameworkResponse = {
  frameworkId: string
}

export type DeleteFrameworkResponse = void

export type FrameworkVersionStatus = 'ARCHIVED' | 'DRAFT' | 'PUBLISHED'

export type FrameworkVersion = {
  code: string
  createdAt: string | null
  description: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  frameworkId: string
  id: string
  name: string
  status: FrameworkVersionStatus
  updatedAt: string | null
  version: number
}

export type FrameworkVersionPage = {
  content: FrameworkVersion[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type FrameworkSignal = {
  code: string
  description: string | null
  evidenceHint: string | null
  importance: string | null
}

export type FrameworkCriterionBand = {
  descriptor: string | null
  frameworkCriterionId: string
  frameworkResultBandId: string
  id: string
  negativeSignals: { values: FrameworkSignal[] } | null
  positiveSignals: { values: FrameworkSignal[] } | null
}

export type FrameworkCriterion = {
  bands: FrameworkCriterionBand[]
  code: string
  description: string | null
  frameworkVersionId: string
  id: string
  name: string
  order: number
}

export type FrameworkResultBand = {
  code: string
  description: string | null
  frameworkVersionId: string
  id: string
  label: string
  order: number
}

export type FrameworkVersionDetail = FrameworkVersion & {
  criteria: FrameworkCriterion[]
  resultBands: FrameworkResultBand[]
}

export type CreateFrameworkVersionRequest = {
  code: string
  description: string | null
  effectiveFrom: string
  effectiveTo: string | null
  name: string
  version: number
}

export type CreateFrameworkVersionResponse = {
  versionId: string
}

export type DeleteFrameworkVersionResponse = void

export type SignalImportance = 'HIGH' | 'MEDIUM' | 'LOW'

export type FrameworkSignalInput = {
  code: string
  description: string
  evidenceHint: string | null
  importance: SignalImportance
}

export type FrameworkCriterionBandInput = {
  descriptor: string | null
  negativeSignals: FrameworkSignalInput[]
  positiveSignals: FrameworkSignalInput[]
  resultBandCode: string
}

export type FrameworkResultBandInput = {
  code: string
  description: string | null
  label: string
  order: number
}

export type FrameworkCriterionInput = {
  code: string
  description: string | null
  name: string
  order: number
}

export type UpdateFrameworkVersionRequest = {
  code: string
  description?: string | null
  effectiveFrom: string
  effectiveTo?: string | null
  name: string
}

export type UpdateFrameworkVersionResponse = string

export type UpdateFrameworkVersionStatusRequest = {
  status: FrameworkVersionStatus
}

export type UpdateFrameworkVersionStatusResponse = string

export type CreateFrameworkCriteriaRequest = {
  criteria: FrameworkCriterionInput[]
}

export type CreateFrameworkCriteriaResponse = string[]

export type UpdateFrameworkCriterionRequest = FrameworkCriterionInput

export type UpdateFrameworkCriterionResponse = string

export type DeleteFrameworkCriterionResponse = void

export type CreateFrameworkCriterionBandsRequest = {
  bands: FrameworkCriterionBandInput[]
}

export type CreateFrameworkCriterionBandsResponse = string[]

export type UpdateFrameworkCriterionBandRequest = {
  descriptor: string | null
  negativeSignals: FrameworkSignalInput[]
  positiveSignals: FrameworkSignalInput[]
}

export type UpdateFrameworkCriterionBandResponse = string

export type DeleteFrameworkCriterionBandResponse = void

export type CreateFrameworkResultBandsRequest = {
  bands: FrameworkResultBandInput[]
}

export type CreateFrameworkResultBandsResponse = string[]

export type UpdateFrameworkResultBandRequest = FrameworkResultBandInput

export type UpdateFrameworkResultBandResponse = string

export type DeleteFrameworkResultBandResponse = void

export type MutationResult<TData> = {
  data: TData
  message: string
}

export type FrameworkStatusDisplay = {
  className: string
  label: string
}

export function getFrameworkStatusDisplay(
  isActive?: boolean | null,
): FrameworkStatusDisplay {
  if (isActive) {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Đang hoạt động',
    }
  }

  return {
    className: 'border-slate-200 bg-slate-100 text-slate-600',
    label: 'Đã vô hiệu hóa',
  }
}

export type FrameworkVersionStatusDisplay = {
  className: string
  label: string
}

export function getVersionStatusDisplay(
  status?: FrameworkVersionStatus | null,
): FrameworkVersionStatusDisplay {
  if (status === 'PUBLISHED') {
    return {
      className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      label: 'Đã xuất bản',
    }
  }

  if (status === 'ARCHIVED') {
    return {
      className: 'border-slate-200 bg-slate-100 text-slate-600',
      label: 'Đã lưu trữ',
    }
  }

  return {
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Bản nháp',
  }
}

export function formatFrameworkDate(value?: string | null) {
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
