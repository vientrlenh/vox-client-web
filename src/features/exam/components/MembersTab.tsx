import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, UserPlus } from 'lucide-react'
import { examQueryKeys } from '@/features/examCore/api/queries'
import type { ExamMemberDto } from '@/features/examCore/types'
import { useCreateExamMemberMutation, useDeleteExamMemberMutation, useUpdateExamMemberMutation } from '../api/useExamMutations'
import { TeacherPickerModal } from './TeacherPickerModal'
import { getMemberRoleDisplay, type ExamMemberRole } from '../types'

const ROLE_ORDER: ExamMemberRole[] = ['CHAIR', 'AUTHOR', 'REVIEWER']
const REQUIRED_ROLES: ExamMemberRole[] = ['CHAIR', 'AUTHOR']

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
  const [showTeacherPicker, setShowTeacherPicker] = useState(false)
  const addMemberMutation = useCreateExamMemberMutation()
  const updateRoleMutation = useUpdateExamMemberMutation()
  const removeMemberMutation = useDeleteExamMemberMutation()

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  async function handleAddMember(userId: string, role: ExamMemberRole) {
    await addMemberMutation.mutateAsync({ examId, payload: { role, userId } })
    await invalidate()
    setShowTeacherPicker(false)
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
          const isRequired = REQUIRED_ROLES.includes(role)
          const toneClass = isSatisfied ? 'emerald' : isRequired ? 'amber' : 'slate'
          return (
            <div
              className={[
                'flex items-center gap-3 rounded-2xl border bg-white p-4',
                toneClass === 'emerald' ? 'border-emerald-200' : toneClass === 'amber' ? 'border-amber-200' : 'border-slate-200',
              ].join(' ')}
              key={role}
            >
              <span
                className={[
                  'flex size-9 items-center justify-center rounded-full',
                  toneClass === 'emerald'
                    ? 'bg-emerald-50 text-emerald-700'
                    : toneClass === 'amber'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-500',
                ].join(' ')}
              >
                <Check aria-hidden="true" className="size-4.5" />
              </span>
              <div>
                <div className="text-[13px] font-bold text-slate-900">{role}</div>
                <div
                  className={[
                    'text-xs font-semibold',
                    toneClass === 'emerald' ? 'text-emerald-600' : toneClass === 'amber' ? 'text-amber-700' : 'text-slate-500',
                  ].join(' ')}
                >
                  {isSatisfied ? `Đủ · ${count} người` : isRequired ? 'Chưa có' : 'Không bắt buộc'}
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
              onClick={() => setShowTeacherPicker(true)}
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
              const isBusy = busyMemberId === member.id
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
                  {canManage ? (
                    <select
                      className="h-8.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isBusy}
                      onChange={(event) => void handleChangeRole(member.id, event.target.value as ExamMemberRole)}
                      value={member.role}
                    >
                      {ROLE_ORDER.map((role) => (
                        <option key={role} value={role}>
                          {getMemberRoleDisplay(role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700">
                      {getMemberRoleDisplay(member.role)}
                    </span>
                  )}
                  {canManage ? (
                    <button
                      aria-label={`Xóa ${member.user?.fullName ?? member.userId} khỏi hội đồng`}
                      className="inline-flex h-8.5 items-center justify-center rounded-full border border-red-200 px-3 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isBusy}
                      onClick={() => void handleRemove(member.id)}
                      type="button"
                    >
                      Xóa
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showTeacherPicker ? (
        <TeacherPickerModal
          excludeUserIds={members.map((member) => member.userId)}
          onClose={() => setShowTeacherPicker(false)}
          onSelect={(teacher, role) => {
            if (!teacher.userId) {
              return
            }
            void handleAddMember(teacher.userId, role)
          }}
        />
      ) : null}
    </div>
  )
}
