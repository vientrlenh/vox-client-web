import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LayoutList, Plus, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { examQueryKeys, useExamBlueprintQuery, useExamBlueprintsQuery } from '../api/useExamQueries'
import {
  useCreateBlueprintMutation,
  useCreateBlueprintSectionMutation,
  useCreateBlueprintSlotMutation,
  useCreateBlueprintVersionMutation,
  useUpdateBlueprintVersionStatusMutation,
} from '../api/useExamMutations'
import { formatNullableText, getBlueprintVersionStatusDisplay, type ExamBlueprintDto } from '../types'

function getBlueprintCardStatus(blueprint: ExamBlueprintDto): { label: string; tone: 'neutral' | 'success' | 'warning' } {
  if (!blueprint.isActive) {
    return { label: 'Lưu trữ', tone: 'neutral' }
  }
  const hasPublished = blueprint.versions.some((version) => version.status === 'PUBLISHED')
  return hasPublished ? { label: 'Đang hoạt động', tone: 'success' } : { label: 'Nháp phiên bản', tone: 'warning' }
}

type CreateBlueprintModalProps = {
  onClose: () => void
  onCreated: (blueprintId: string) => void
}

function CreateBlueprintModal({ onClose, onCreated }: CreateBlueprintModalProps) {
  const createMutation = useCreateBlueprintMutation()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')

  async function handleSubmit() {
    if (!name.trim() || !code.trim()) {
      window.alert('Vui lòng nhập tên và mã blueprint.')
      return
    }
    const blueprint = await createMutation.mutateAsync({
      code: code.trim(),
      description: description || null,
      languageId: 'lang-en',
      name,
    })
    onCreated(blueprint.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section className="w-full max-w-md rounded-2xl bg-white shadow-2xl" role="dialog">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900">Tạo blueprint mới</h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="grid gap-3.5 px-6 py-5">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Tên blueprint
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mã
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setCode(event.target.value)}
              placeholder="VD: BP-SPEAK-11"
              value={code}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mô tả
            <textarea
              className="min-h-20 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-60"
            disabled={createMutation.isPending}
            onClick={() => void handleSubmit()}
            type="button"
          >
            Tạo blueprint
          </button>
        </div>
      </section>
    </div>
  )
}

type BlueprintListPageProps = {
  basePath: string
}

function BlueprintListPage({ basePath }: BlueprintListPageProps) {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const blueprintsQuery = useExamBlueprintsQuery({ page: 1, size: 50 })

  return (
    <section className="mx-auto max-w-290">
      <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Blueprint đề thi</h1>
      <p className="mt-2 text-[15px] text-slate-500">Khuôn mẫu cấu trúc đề: phần, ô câu hỏi, trọng số và thời lượng.</p>
      <button
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:opacity-90"
        onClick={() => setShowCreate(true)}
        type="button"
      >
        <Plus aria-hidden="true" className="size-4.5" />
        Tạo blueprint
      </button>

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
                <span>{blueprint.versions[0]?.sections.length ?? 0} phần</span>·
                <span>{blueprint.versions.length} phiên bản</span>
              </div>
              {versionDisplay ? (
                <StatusBadge label={`${latestVersion.code} · ${versionDisplay.label.toLowerCase()}`} tone={versionDisplay.tone} />
              ) : null}
            </button>
          )
        })}
      </div>

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
  return <BlueprintListPage basePath="/teacher/blueprints" />
}

export function SchoolAdminBlueprintsPage() {
  return <BlueprintListPage basePath="/school-admin/blueprints" />
}

type BlueprintDetailPageProps = {
  canManage: boolean
}

function BlueprintDetailPage({ canManage }: BlueprintDetailPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { blueprintId } = useParams()
  const blueprintQuery = useExamBlueprintQuery(blueprintId ?? null)
  const blueprint = blueprintQuery.data
  const createVersionMutation = useCreateBlueprintVersionMutation()
  const updateVersionStatusMutation = useUpdateBlueprintVersionStatusMutation()
  const createSectionMutation = useCreateBlueprintSectionMutation()
  const createSlotMutation = useCreateBlueprintSlotMutation()
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmationDialog()

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (blueprintQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (!blueprint) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy blueprint.</section>
  }

  const activeVersion = blueprint.versions.find((version) => version.id === selectedVersionId) ?? blueprint.versions[blueprint.versions.length - 1]

  async function handleAddVersion() {
    await createVersionMutation.mutateAsync({ blueprintId: blueprint!.id, payload: {} })
    await invalidate()
    setMessage('Đã tạo phiên bản mới (bản nháp).')
  }

  async function handleAddSection(versionId: string, nextOrder: number) {
    const title = window.prompt('Tên phần (VD: Phần 4 · Hội thoại):')
    if (!title?.trim()) {
      return
    }
    const weightInput = window.prompt('Trọng số phần (0-1):', '0.25')
    await createSectionMutation.mutateAsync({
      payload: { order: nextOrder, sectionWeight: Number(weightInput) || undefined, title: title.trim() },
      versionId,
    })
    await invalidate()
  }

  async function handleAddSlot(sectionId: string, nextOrder: number) {
    const weightInput = window.prompt('Trọng số ô câu hỏi (0-1):', '0.5')
    await createSlotMutation.mutateAsync({
      payload: { order: nextOrder, slotType: 'SELECTION', weight: Number(weightInput) || undefined },
      sectionId,
    })
    await invalidate()
  }

  return (
    <section className="mx-auto max-w-240">
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
              onClick={() => void handleAddVersion()}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Tạo phiên bản mới
            </button>
          ) : null}
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {blueprint.versions.map((version) => {
            const display = getBlueprintVersionStatusDisplay(version.status)
            const isActive = version.id === activeVersion?.id
            return (
              <button
                className={[
                  'rounded-full px-4 py-2 text-[13px] font-bold transition',
                  isActive ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                ].join(' ')}
                key={version.id}
                onClick={() => setSelectedVersionId(version.id)}
                type="button"
              >
                {version.code} · {display.label}
              </button>
            )
          })}
        </div>

        {activeVersion ? (
          <div className="mt-4.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-slate-500">
                {activeVersion.sections.length} phần ·{' '}
                {activeVersion.totalTimeLimitSeconds ? `${Math.round(activeVersion.totalTimeLimitSeconds / 60)} phút` : 'chưa đặt thời lượng'}
              </p>
              {canManage && activeVersion.status === 'DRAFT' ? (
                <button
                  className="inline-flex h-8.5 items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
                  onClick={() =>
                    void updateVersionStatusMutation
                      .mutateAsync({ payload: { action: 'PUBLISH' }, versionId: activeVersion.id })
                      .then(() => invalidate())
                  }
                  type="button"
                >
                  Xuất bản phiên bản
                </button>
              ) : null}
              {canManage && activeVersion.status === 'PUBLISHED' ? (
                <button
                  className="inline-flex h-8.5 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    void (async () => {
                      if (!(await confirm({ message: 'Lưu trữ phiên bản này? Các kỳ thi đang dùng sẽ không bị ảnh hưởng.' }))) {
                        return
                      }
                      await updateVersionStatusMutation.mutateAsync({ payload: { action: 'ARCHIVE' }, versionId: activeVersion.id })
                      await invalidate()
                    })()
                  }}
                  type="button"
                >
                  Lưu trữ
                </button>
              ) : null}
            </div>

            <div className="mt-3.5 grid gap-3">
              {activeVersion.sections.map((section) => (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={section.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{section.title}</div>
                      <div className="text-xs text-slate-500">
                        {section.slots.length} ô · trọng số {section.sectionWeight?.toFixed(2) ?? '-'}
                        {section.sectionTimeLimitSeconds ? ` · ${Math.round(section.sectionTimeLimitSeconds / 60)} phút` : ''}
                      </div>
                    </div>
                    {canManage && activeVersion.status === 'DRAFT' ? (
                      <button
                        className="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-600 hover:bg-slate-50"
                        onClick={() => void handleAddSlot(section.id, section.slots.length + 1)}
                        type="button"
                      >
                        + Ô câu hỏi
                      </button>
                    ) : null}
                  </div>
                  {section.slots.length ? (
                    <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                      {section.slots.map((slot) => (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600" key={slot.id}>
                          {slot.slotType === 'FIXED'
                            ? `Cố định: ${slot.fixedQuestion?.code ?? '-'}`
                            : `Chọn ngẫu nhiên${slot.selectionSpec?.topicId ? ` · ${slot.selectionSpec.topicId}` : ''}`}
                          {' · trọng số '}
                          {slot.weight?.toFixed(2) ?? '-'}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {canManage && activeVersion.status === 'DRAFT' ? (
                <button
                  className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-[13px] font-bold text-indigo-600 hover:bg-indigo-50"
                  onClick={() => void handleAddSection(activeVersion.id, activeVersion.sections.length + 1)}
                  type="button"
                >
                  + Thêm phần
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Blueprint chưa có phiên bản nào.</p>
        )}
      </div>
    </section>
  )
}

export function TeacherBlueprintDetailPage() {
  return <BlueprintDetailPage canManage />
}

export function SchoolAdminBlueprintDetailPage() {
  return <BlueprintDetailPage canManage />
}
