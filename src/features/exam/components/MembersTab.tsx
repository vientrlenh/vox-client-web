import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, UserPlus } from 'lucide-react'
import { ActionMenuButton, type ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { examQueryKeys } from '../api/useExamQueries'
import { useCreateExamMemberMutation, useDeleteExamMemberMutation, useUpdateExamMemberMutation } from '../api/useExamMutations'
import { getMemberRoleDisplay, type ExamMemberDto, type ExamMemberRole } from '../types'

const ROLE_ORDER: ExamMemberRole[] = ['CHAIR', 'AUTHOR', 'REVIEWER']

const ROLE_AVATAR_COLOR: Record<ExamMemberRole, string> = {
  AUTHOR: 'bg-cyan-600',
  CHAIR: 'bg-indigo-600',
  REVIEWER: 'bg-pink-600',
}

function getInitials(name?: string | null) {
  if (!name?.trim()) {
    return '?'
  }
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

type MembersTabProps = {
  canManage: boolean
  examId: string
  members: ExamMemberDto[]
}

export function MembersTab({ canManage, examId, members }: MembersTabProps) {
  const queryClient = useQueryClient()
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)
  const addMemberMutation = useCreateExamMemberMutation()
  const updateRoleMutation = useUpdateExamMemberMutation()
  const removeMemberMutation = useDeleteExamMemberMutation()

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  async function handleAddMember() {
    const fullName = window.prompt('Họ tên thành viên mới:')
    if (!fullName?.trim()) {
      return
    }
    const roleInput = window.prompt('Vai trò (CHAIR / AUTHOR / REVIEWER):', 'AUTHOR')
    const role = (roleInput?.trim().toUpperCase() as ExamMemberRole) || 'AUTHOR'
    if (!ROLE_ORDER.includes(role)) {
      window.alert('Vai trò không hợp lệ.')
      return
    }
    await addMemberMutation.mutateAsync({
      examId,
      payload: { fullName: fullName.trim(), role, userId: `user-${Date.now()}` },
    })
    await invalidate()
  }

  async function handleChangeRole(memberId: string, role: ExamMemberRole) {
    setBusyMemberId(memberId)
    await updateRoleMutation.mutateAsync({ examId, memberId, role })
    await invalidate()
    setBusyMemberId(null)
  }

  async function handleRemove(memberId: string) {
    setBusyMemberId(memberId)
    await removeMemberMutation.mutateAsync({ examId, memberId })
    await invalidate()
    setBusyMemberId(null)
  }

  return (
    <div className="mt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {ROLE_ORDER.map((role) => {
          const count = members.filter((member) => member.role === role).length
          const isSatisfied = count > 0
          return (
            <div
              className={[
                'flex items-center gap-3 rounded-2xl border bg-white p-4',
                isSatisfied ? 'border-emerald-200' : 'border-amber-200',
              ].join(' ')}
              key={role}
            >
              <span
                className={[
                  'flex size-9 items-center justify-center rounded-full',
                  isSatisfied ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                ].join(' ')}
              >
                <Check aria-hidden="true" className="size-4.5" />
              </span>
              <div>
                <div className="text-[13px] font-bold text-slate-900">{role}</div>
                <div className={['text-xs font-semibold', isSatisfied ? 'text-emerald-600' : 'text-amber-700'].join(' ')}>
                  {isSatisfied ? `Đủ · ${count} người` : 'Chưa có'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3.5 rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-slate-900">Hội đồng đề ({members.length})</h3>
          {canManage ? (
            <button
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 text-[13px] font-semibold text-white transition hover:bg-indigo-700"
              onClick={() => void handleAddMember()}
              type="button"
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Thêm thành viên
            </button>
          ) : null}
        </div>

        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            Chưa có thành viên hội đồng.
          </div>
        ) : (
          <div className="grid gap-2.5">
            {members.map((member) => {
              const actionItems: ActionMenuItem[] = ROLE_ORDER.filter((role) => role !== member.role).map((role) => ({
                id: `set-${role}`,
                label: `Chuyển sang ${getMemberRoleDisplay(role)}`,
                onSelect: () => void handleChangeRole(member.id, role),
              }))
              actionItems.push({
                id: 'remove',
                label: 'Xóa khỏi hội đồng',
                onSelect: () => void handleRemove(member.id),
                tone: 'danger',
              })
              return (
                <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 px-3.5 py-3" key={member.id}>
                  <span
                    className={[
                      'flex size-10.5 items-center justify-center rounded-full text-sm font-bold text-white',
                      ROLE_AVATAR_COLOR[member.role],
                    ].join(' ')}
                  >
                    {getInitials(member.user?.fullName)}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900">{member.user?.fullName ?? member.userId}</div>
                    <div className="text-xs text-slate-500">{member.user?.email ?? '-'}</div>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700">
                    {getMemberRoleDisplay(member.role)}
                  </span>
                  {canManage ? (
                    <ActionMenuButton
                      ariaLabel={`Thao tác cho ${member.user?.fullName ?? member.userId}`}
                      disabled={busyMemberId === member.id}
                      items={actionItems}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
