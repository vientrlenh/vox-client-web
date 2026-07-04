import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { examQueryKeys, useExamBlueprintQuery, useExamBlueprintsQuery } from '../api/useExamQueries'
import { useAttachExamBlueprintMutation } from '../api/useExamMutations'
import { BlueprintSummaryCard } from './BlueprintSummaryCard'

type BlueprintAttachPanelProps = {
  blueprintId?: string | null
  blueprintVersionId?: string | null
  canManage: boolean
  examId: string
  onOpenBlueprint: (blueprintId: string) => void
  optional?: boolean
}

export function BlueprintAttachPanel({
  blueprintId,
  blueprintVersionId,
  canManage,
  examId,
  onOpenBlueprint,
  optional = false,
}: BlueprintAttachPanelProps) {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const blueprintsQuery = useExamBlueprintsQuery({ isActive: true, keyword, page: 1, size: 50 })
  const attachedBlueprintQuery = useExamBlueprintQuery(blueprintId ?? null)
  const attachMutation = useAttachExamBlueprintMutation()
  const { confirm, dialog } = useConfirmationDialog()

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  async function attach(nextBlueprintId: string | null, nextVersionId: string | null) {
    await attachMutation.mutateAsync({ blueprintId: nextBlueprintId, blueprintVersionId: nextVersionId, examId })
    await invalidate()
  }

  if (!blueprintId) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5.5">
        <h3 className="text-[15px] font-extrabold text-slate-900">Chọn blueprint để gắn vào kỳ thi</h3>
        {optional ? (
          <p className="mt-1 text-[13px] text-slate-500">
            Không bắt buộc — bạn có thể bỏ qua bước này và thêm câu hỏi trực tiếp ở tab Đề bài.
          </p>
        ) : null}
        <input
          className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm blueprint theo mã hoặc tên…"
          value={keyword}
        />
        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
          {blueprintsQuery.data?.content.length === 0 ? (
            <p className="col-span-full text-sm text-slate-400">Không tìm thấy blueprint phù hợp.</p>
          ) : (
            blueprintsQuery.data?.content.map((blueprint) => (
              <button
                className="grid gap-0.5 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60"
                disabled={!canManage}
                key={blueprint.id}
                onClick={() => void attach(blueprint.id, null)}
                type="button"
              >
                <span className="text-sm font-bold text-slate-900">{blueprint.name}</span>
                <span className="text-xs text-slate-500">{blueprint.code}</span>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  const blueprint = attachedBlueprintQuery.data

  if (!blueprint) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5.5 text-sm text-slate-400">
        Đang tải blueprint…
      </div>
    )
  }

  const publishedVersions = blueprint.versions.filter((version) => version.status === 'PUBLISHED')
  const currentVersion = publishedVersions.find((version) => version.id === blueprintVersionId)

  if (!currentVersion) {
    return (
      <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-5.5">
        <h3 className="text-[15px] font-extrabold text-slate-900">Chốt phiên bản blueprint</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          Đã gắn <b className="text-slate-900">{blueprint.name}</b>. Chọn phiên bản đã xuất bản để CHAIR chốt dùng cho kỳ thi.
        </p>
        {publishedVersions.length === 0 ? (
          <p className="mt-3 text-sm text-amber-700">Blueprint chưa có phiên bản nào được xuất bản.</p>
        ) : (
          <div className="mt-3.5 grid gap-2 sm:grid-cols-3">
            {publishedVersions.map((version) => (
              <button
                className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60"
                disabled={!canManage}
                key={version.id}
                onClick={() => void attach(blueprintId, version.id)}
                type="button"
              >
                <span className="text-sm font-bold text-slate-900">{version.code}</span>
                <span className="block text-xs text-slate-500">{version.sections.length} phần</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {dialog}
      <BlueprintSummaryCard blueprint={blueprint} onOpen={() => onOpenBlueprint(blueprint.id)} version={currentVersion} />
      {canManage ? (
        <div className="mt-2.5 flex justify-end">
          <button
            className="text-xs font-bold text-slate-400 underline-offset-2 hover:text-red-600 hover:underline"
            onClick={() => {
              void (async () => {
                if (!(await confirm({ message: 'Bạn có chắc muốn gỡ blueprint đang gắn không?' }))) {
                  return
                }
                await attach(null, null)
              })()
            }}
            type="button"
          >
            Gỡ blueprint
          </button>
        </div>
      ) : null}
    </>
  )
}
