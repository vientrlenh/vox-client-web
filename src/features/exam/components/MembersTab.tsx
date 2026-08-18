import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Lock, UserPlus } from 'lucide-react'
import { examQueryKeys } from '@/features/examCore/api/queries'
import type { ExamMemberDto } from '@/features/examCore/types'
import { useCreateExamMemberMutation, useDeleteExamMemberMutation, useUpdateExamMemberMutation } from '../api/useExamMutations'
import { TeacherPickerModal } from './TeacherPickerModal'
import { getMemberRoleDisplay, type ExamMemberRole } from '../types'

const ROLE_ORDER: ExamMemberRole[] = ['CHAIR', 'AUTHOR', 'REVIEWER']

/**
 * Không vai nào bắt buộc: quản trị trường và chủ tịch hội đồng tự chạy được trọn quy trình
 * (`resolveExamAuthority`), và backend cũng không đòi thành viên khi lên lịch kỳ thi. Vì thế thẻ vai
 * trò chỉ tô xanh khi đã có người, còn lại để xám — trước đây CHAIR/AUTHOR để trống bị tô amber như
 * một lỗi cần sửa, trong khi bỏ trống là lựa chọn hợp lệ.
 */
const ROLE_HINT: Record<ExamMemberRole, string> = {
  AUTHOR: 'Soạn nội dung mã đề',
  CHAIR: 'Chốt phiên bản khung đề, khóa mã đề, mở khóa ngân hàng câu hỏi sau kỳ thi',
  REVIEWER: 'Duyệt mã đề do người khác soạn',
}

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
  /**
   * Chủ tịch hội đồng lập được hội đồng ra đề nhưng không đụng vào hàng CHAIR — kể cả của chính mình.
   * Tự thu hồi vai trò là kỳ thi mất người quyết định mà luồng giáo viên không dựng lại được, nên
   * bổ nhiệm/thu hồi chủ tịch vẫn là việc của quản trị trường (khớp ExamMemberManageAccessService).
   */
  canManageChair: boolean
  examId: string
  /**
   * Kỳ thi đã bắt đầu trở đi (`isExamLockedForEditing`) thì hội đồng đề coi như chốt: đổi người ra đề
   * lúc thí sinh đang làm bài chỉ tạo ra tranh chấp trách nhiệm chứ không sửa được gì nữa.
   */
  locked?: boolean
  members: ExamMemberDto[]
}

export function MembersTab({ canManage, canManageChair, examId, locked = false, members }: MembersTabProps) {
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

  const canEditMembers = canManage && !locked

  return (
    <div className="mt-4">
      {canManage && locked ? (
        <div className="mb-3.5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          Kỳ thi đã bắt đầu — hội đồng đề đã chốt, không thể thêm, đổi vai trò hay gỡ thành viên nữa.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {ROLE_ORDER.map((role) => {
          const count = members.filter((member) => member.role === role).length
          const isSatisfied = count > 0
          return (
            <div
              className={[
                'flex items-center gap-3 rounded-2xl border bg-white p-4',
                isSatisfied ? 'border-emerald-200' : 'border-slate-200',
              ].join(' ')}
              key={role}
              title={ROLE_HINT[role]}
            >
              <span
                className={[
                  'flex size-9 shrink-0 items-center justify-center rounded-full',
                  isSatisfied ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400',
                ].join(' ')}
              >
                <Check aria-hidden="true" className="size-4.5" />
              </span>
              <div>
                <div className="text-[13px] font-bold text-slate-900">{getMemberRoleDisplay(role)}</div>
                <div className={['text-xs font-semibold', isSatisfied ? 'text-emerald-600' : 'text-slate-400'].join(' ')}>
                  {isSatisfied ? `${count} người` : 'Chưa phân công'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3.5 rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-slate-900">Hội đồng đề ({members.length})</h3>
          {canEditMembers ? (
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
            Chưa phân công ai — quản trị trường đang tự chạy kỳ thi này.
          </div>
        ) : (
          <div className="grid gap-2.5">
            {members.map((member) => {
              const isBusy = busyMemberId === member.id
              const canTouch = canEditMembers && (canManageChair || member.role !== 'CHAIR')
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
                  {canTouch ? (
                    <select
                      className="h-8.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isBusy}
                      onChange={(event) => void handleChangeRole(member.id, event.target.value as ExamMemberRole)}
                      value={member.role}
                    >
                      {ROLE_ORDER.filter((role) => canManageChair || role !== 'CHAIR').map((role) => (
                        <option key={role} value={role}>
                          {getMemberRoleDisplay(role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className="rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700"
                      title={
                        canManage && locked
                          ? 'Kỳ thi đã bắt đầu — không đổi được thành viên hội đồng'
                          : canManage && member.role === 'CHAIR'
                            ? 'Chỉ quản trị trường thay đổi được chủ tịch hội đồng'
                            : undefined
                      }
                    >
                      {getMemberRoleDisplay(member.role)}
                    </span>
                  )}
                  {canTouch ? (
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
          canManageChair={canManageChair}
          examId={examId}
          excludeUserIds={members.map((member) => member.userId)}
          onClose={() => setShowTeacherPicker(false)}
          onSelect={(teacher, role) => void handleAddMember(teacher.userId, role)}
        />
      ) : null}
    </div>
  )
}
