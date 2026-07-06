import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, LayoutList, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { useSupportedLanguagesQuery } from '@/features/languages/api/useSupportedLanguagesQuery'
import { Pagination } from '@/shared/components/Pagination'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { examQueryKeys, useExamBlueprintQuery, useExamBlueprintsQuery } from '../api/useExamQueries'
import { useCreateBlueprintMutation, useDeleteBlueprintVersionMutation, useUpdateBlueprintVersionStatusMutation } from '../api/useExamMutations'
import {
  formatNullableText,
  getBlueprintVersionStatusDisplay,
  type ExamBlueprintDto,
  type ExamBlueprintVersionDto,
  type ExamBlueprintVersionStatus,
} from '../types'

const ACTIVE_LANGUAGE_FILTERS = { isActive: 'active' as const, search: '' }

function getBlueprintCardStatus(blueprint: ExamBlueprintDto): { label: string; tone: 'neutral' | 'success' | 'warning' } {
  if (!blueprint.isActive) {
    return { label: 'Luu tru', tone: 'neutral' }
  }
  const hasPublished = blueprint.versions.some((version) => version.status === 'PUBLISHED')
  return hasPublished ? { label: 'Dang hoat dong', tone: 'success' } : { label: 'Nhap phien ban', tone: 'warning' }
}

type CreateBlueprintModalProps = {
  onClose: () => void
  onCreated: (blueprintId: string) => void
}

function CreateBlueprintModal({ onClose, onCreated }: CreateBlueprintModalProps) {
  const createMutation = useCreateBlueprintMutation()
  const languagesQuery = useSupportedLanguagesQuery(1, 100, ACTIVE_LANGUAGE_FILTERS)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [languageId, setLanguageId] = useState('')

  async function handleSubmit() {
    if (!name.trim() || !code.trim() || !languageId) {
      window.alert('Vui long nhap ten va ma blueprint.')
      return
    }
    const blueprint = await createMutation.mutateAsync({
      code: code.trim(),
      description: description || null,
      languageId,
      name,
    })
    onCreated(blueprint.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section className="w-full max-w-md rounded-2xl bg-white shadow-2xl" role="dialog">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900">Tao blueprint moi</h2>
          <button
            aria-label="Dong"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="grid gap-3.5 px-6 py-5">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Ten blueprint
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Ma
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setCode(event.target.value)}
              placeholder="VD: BP-SPEAK-11"
              value={code}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mo ta
            <textarea
              className="min-h-20 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Ngon ngu
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setLanguageId(event.target.value)}
              value={languageId}
            >
              <option value="">Chon ngon ngu</option>
              {languagesQuery.data?.content.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.name ?? language.code ?? language.id}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Huy
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-60"
            disabled={createMutation.isPending}
            onClick={() => void handleSubmit()}
            type="button"
          >
            Tao blueprint
          </button>
        </div>
      </section>
    </div>
  )
}

type BlueprintListPageProps = {
  basePath: string
  canCreate: boolean
}

function BlueprintListPage({ basePath, canCreate }: BlueprintListPageProps) {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [page, setPage] = useState(1)
  const blueprintsQuery = useExamBlueprintsQuery({ page, size: 12 })

  return (
    <section className="mx-auto max-w-290">
      <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Blueprint de thi</h1>
      <p className="mt-2 text-[15px] text-slate-500">Khuon mau cau truc de: phan, o cau hoi, trong so va thoi luong.</p>
      {canCreate ? (
        <button
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:opacity-90"
          onClick={() => setShowCreate(true)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4.5" />
          Tao blueprint
        </button>
      ) : (
        <p className="mt-5 text-[13px] text-slate-400">
          Giáo viên tạo blueprint mới ngay trong lúc gắn vào kỳ thi (tab Blueprint của kỳ thi bạn là AUTHOR).
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {blueprintsQuery.data?.content.map((blueprint) => {
          const cardStatus = getBlueprintCardStatus(blueprint)
          const latestVersion = blueprint.versions[blueprint.versions.length - 1]
          const versionDisplay = latestVersion ? getBlueprintVersionStatusDisplay(latestVersion.status) : null
          return (
            <button
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5.5 text-left transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/8"
              key={blueprint.id}
              onClick={() => navigate(`${basePath}/${blueprint.id}`)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-[13px] bg-indigo-50 text-indigo-600">
                  <LayoutList aria-hidden="true" className="size-6" />
                </span>
                <StatusBadge label={cardStatus.label} tone={cardStatus.tone} />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">{blueprint.name}</div>
                <div className="text-xs text-slate-500">{blueprint.code}</div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>{blueprint.sectionCount ?? 0} phan</span>·
                <span>{blueprint.versionCount ?? 0} phien ban</span>
              </div>
              {versionDisplay ? (
                <StatusBadge label={`${latestVersion.code} · ${versionDisplay.label.toLowerCase()}`} tone={versionDisplay.tone} />
              ) : null}
            </button>
          )
        })}
      </div>

      {blueprintsQuery.data ? (
        <Pagination
          currentPage={page}
          itemName="blueprint"
          onPageChange={setPage}
          totalElements={blueprintsQuery.data.totalElements}
          totalPages={blueprintsQuery.data.totalPages}
        />
      ) : null}

      {showCreate ? (
        <CreateBlueprintModal
          onClose={() => setShowCreate(false)}
          onCreated={(blueprintId) => {
            setShowCreate(false)
            navigate(`${basePath}/${blueprintId}`)
          }}
        />
      ) : null}
    </section>
  )
}

export function TeacherBlueprintsPage() {
  return <BlueprintListPage basePath="/teacher/blueprints" canCreate={false} />
}

export function SchoolAdminBlueprintsPage() {
  return <BlueprintListPage basePath="/school-admin/blueprints" canCreate />
}

const STATUS_ORDER: ExamBlueprintVersionStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED']

type VersionStatusSelectProps = {
  onArchive: (version: ExamBlueprintVersionDto) => void
  onPublish: (version: ExamBlueprintVersionDto) => void
  pending: boolean
  version: ExamBlueprintVersionDto
}

function VersionStatusSelect({ onArchive, onPublish, pending, version }: VersionStatusSelectProps) {
  const weightSum = version.weightSum ?? 0
  const sectionsWeightOk = Math.abs(weightSum - 1) < 0.01
  const invalidSlotSection = version.sections.find((section) => {
    const slotWeightSum = section.slots.reduce((sum, slot) => sum + (slot.weight ?? 0), 0)
    return Math.abs(slotWeightSum - 1) >= 0.01
  })
  const canPublish = version.status === 'DRAFT' && sectionsWeightOk && !invalidSlotSection
  const canArchive = version.status === 'PUBLISHED'
  const publishBlockedReason = !sectionsWeightOk
    ? `Tổng trọng số phần phải bằng 1.00 (hiện tại ${weightSum.toFixed(2)})`
    : invalidSlotSection
      ? `Tổng trọng số ô câu hỏi trong phần "${invalidSlotSection.title}" phải bằng 1.00`
      : undefined

  return (
    <select
      className="h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending || version.status === 'ARCHIVED'}
      onChange={(event) => {
        const next = event.target.value as ExamBlueprintVersionStatus
        if (next === version.status) {
          return
        }
        if (next === 'PUBLISHED') {
          onPublish(version)
        } else if (next === 'ARCHIVED') {
          onArchive(version)
        }
      }}
      title={!canPublish && version.status === 'DRAFT' ? publishBlockedReason : undefined}
      value={version.status}
    >
      {STATUS_ORDER.map((status) => {
        const display = getBlueprintVersionStatusDisplay(status)
        const isCurrent = status === version.status
        const isReachable = status === 'DRAFT' ? isCurrent : status === 'PUBLISHED' ? isCurrent || canPublish : isCurrent || canArchive
        return (
          <option disabled={!isReachable} key={status} value={status}>
            {display.label}
          </option>
        )
      })}
    </select>
  )
}

type BlueprintDetailPageProps = {
  basePath: string
  canManage: boolean
}

function BlueprintDetailPage({ basePath, canManage }: BlueprintDetailPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { blueprintId } = useParams()
  const blueprintQuery = useExamBlueprintQuery(blueprintId ?? null)
  const blueprint = blueprintQuery.data
  const updateVersionStatusMutation = useUpdateBlueprintVersionStatusMutation()
  const deleteVersionMutation = useDeleteBlueprintVersionMutation()
  const [message, setMessage] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmationDialog()

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (blueprintQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Dang tai...</section>
  }

  if (!blueprint) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Khong tim thay blueprint.</section>
  }

  async function handlePublish(version: ExamBlueprintVersionDto) {
    await updateVersionStatusMutation.mutateAsync({ payload: { action: 'PUBLISH' }, versionId: version.id })
    await invalidate()
    setMessage(`Đã xuất bản phiên bản ${version.code}.`)
  }

  async function handleArchive(version: ExamBlueprintVersionDto) {
    if (!(await confirm({ message: 'Lưu trữ phiên bản này? Các kỳ thi đang dùng sẽ không bị ảnh hưởng.' }))) {
      return
    }
    await updateVersionStatusMutation.mutateAsync({ payload: { action: 'ARCHIVE' }, versionId: version.id })
    await invalidate()
    setMessage(`Đã lưu trữ phiên bản ${version.code}.`)
  }

  async function handleDeleteVersion(version: ExamBlueprintVersionDto) {
    if (!(await confirm({ message: `Xóa phiên bản ${version.code}? Toàn bộ phần và ô câu hỏi trong phiên bản cũng sẽ bị xóa.` }))) {
      return
    }
    await deleteVersionMutation.mutateAsync(version.id)
    await invalidate()
    setMessage(`Đã xóa phiên bản ${version.code}.`)
  }

  return (
    <section className="mx-auto max-w-290">
      <button
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600"
        onClick={() => navigate(-1)}
        type="button"
      >
        ← Blueprint đề thi
      </button>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      {dialog}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3.5">
          <span className="flex size-13 items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-600">
            <LayoutList aria-hidden="true" className="size-7" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">{blueprint.name}</h1>
            <p className="text-sm text-slate-500">{blueprint.code}</p>
          </div>
        </div>
        {blueprint.description ? <p className="mt-3 text-sm text-slate-600">{formatNullableText(blueprint.description)}</p> : null}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-extrabold text-slate-900">Phiên bản</h2>
          {canManage ? (
            <button
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-indigo-600 hover:bg-slate-50"
              onClick={() => navigate(`${basePath}/${blueprint.id}/versions/new`)}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Tạo phiên bản mới
            </button>
          ) : null}
        </div>

        {blueprint.versions.length ? (
          <div className="mt-3.5 overflow-x-auto">
            <table className="w-full min-w-175 border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Mã</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 pr-3">Phần</th>
                  <th className="py-2 pr-3">Ô câu hỏi</th>
                  <th className="py-2 pr-3">Trọng số</th>
                  <th className="py-2 pr-3">Thời lượng</th>
                  <th className="py-2 pr-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {blueprint.versions.map((version) => (
                  <tr className="border-b border-slate-100 last:border-0" key={version.id}>
                    <td className="py-2.5 pr-3 font-bold text-slate-900">{version.code}</td>
                    <td className="py-2.5 pr-3">
                      {canManage ? (
                        <VersionStatusSelect
                          onArchive={(v) => void handleArchive(v)}
                          onPublish={(v) => void handlePublish(v)}
                          pending={updateVersionStatusMutation.isPending}
                          version={version}
                        />
                      ) : (
                        <StatusBadge {...getBlueprintVersionStatusDisplay(version.status)} />
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{version.sectionCount ?? version.sections.length}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{version.slotCount ?? 0}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{(version.weightSum ?? 0).toFixed(2)}</td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      {version.totalTimeLimitSeconds ? `${Math.round(version.totalTimeLimitSeconds / 60)} phút` : '-'}
                    </td>
                    <td className="py-2.5 pr-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          aria-label={`Chi tiết phiên bản ${version.code}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          onClick={() => navigate(`${basePath}/${blueprint.id}/versions/${version.id}`)}
                          title="Chi tiết"
                          type="button"
                        >
                          <Eye aria-hidden="true" className="size-4" />
                        </button>
                        {canManage ? (
                          <button
                            aria-label={`Cập nhật phiên bản ${version.code}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                            disabled={version.status !== 'DRAFT'}
                            onClick={() => navigate(`${basePath}/${blueprint.id}/versions/${version.id}/edit`)}
                            title={version.status === 'DRAFT' ? 'Cập nhật' : 'Chỉ chỉnh sửa được khi phiên bản đang ở Bản nháp'}
                            type="button"
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                        ) : null}
                        {canManage && version.status === 'DRAFT' ? (
                          <button
                            aria-label={`Xóa phiên bản ${version.code}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            disabled={deleteVersionMutation.isPending}
                            onClick={() => void handleDeleteVersion(version)}
                            title="Xóa"
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Blueprint chưa có phiên bản nào.</p>
        )}
      </div>
    </section>
  )
}

export function TeacherBlueprintDetailPage() {
  return <BlueprintDetailPage basePath="/teacher/blueprints" canManage />
}

export function SchoolAdminBlueprintDetailPage() {
  return <BlueprintDetailPage basePath="/school-admin/blueprints" canManage />
}
