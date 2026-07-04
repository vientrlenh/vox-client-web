import { useState } from 'react'
import { Lock, Plus, Shuffle, UserPlus, Wand2 } from 'lucide-react'
import type { ClassUser } from '@/features/classes/types'
import type { ExamScheduleState } from './useExamScheduleState'

type ScheduleTabProps = {
  locked: boolean
  onGoToPapers: () => void
  paperCodes: string[]
  scheduleState: ExamScheduleState
  students: ClassUser[]
}

export function ScheduleTab({ locked, onGoToPapers, paperCodes, scheduleState, students }: ScheduleTabProps) {
  if (locked) {
    return (
      <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Lock size={26} />
        </span>
        <div className="mt-1 text-base font-extrabold text-slate-900">Phân lịch chưa được mở</div>
        <p className="max-w-md text-sm font-medium text-slate-500">
          Tab này sẽ tự động mở khi tất cả mã đề đã được duyệt và khóa. Hãy hoàn tất bước Soạn & duyệt đề trước.
        </p>
        <button
          className="mt-2 h-10 rounded-full border border-slate-200 px-4.5 text-sm font-semibold text-indigo-600 transition hover:bg-slate-50"
          onClick={onGoToPapers}
          type="button"
        >
          Quay lại Đề thi
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <DeviceModeBanner scheduleState={scheduleState} />
      <SessionsPanel scheduleState={scheduleState} students={students} />
      <AutoAssignPanel paperCodes={paperCodes} scheduleState={scheduleState} students={students} />
    </div>
  )
}

function DeviceModeBanner({ scheduleState }: { scheduleState: ExamScheduleState }) {
  const { mode, setMode } = scheduleState

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-sm font-extrabold text-slate-900">Hình thức làm bài</div>
      <p className="mt-1 text-xs font-medium text-slate-500">
        Chọn nơi học sinh làm bài — có thể thi ngay trên thiết bị của học sinh hoặc tập trung tại phòng máy.
      </p>
      <div className="mt-3 grid gap-2.5 md:grid-cols-2">
        <ModeCard
          active={mode === 'device'}
          description="Không cần xếp phòng máy, chỉ cần khung giờ mở – đóng bài."
          onClick={() => setMode('device')}
          title="Thiết bị học sinh"
        />
        <ModeCard
          active={mode === 'lab'}
          description="Thi tập trung tại phòng máy, xếp chỗ theo phòng."
          onClick={() => setMode('lab')}
          title="Phòng máy của trường"
        />
      </div>
    </div>
  )
}

function ModeCard({
  active,
  description,
  onClick,
  title,
}: {
  active: boolean
  description: string
  onClick: () => void
  title: string
}) {
  return (
    <button
      className={`rounded-xl border p-3.5 text-left transition ${active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-900">{title}</span>
        {active ? <span className="ml-auto rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">Đang chọn</span> : null}
      </div>
      <div className="mt-1.5 text-xs font-medium text-slate-500">{description}</div>
    </button>
  )
}

function SessionsPanel({ scheduleState, students }: { scheduleState: ExamScheduleState; students: ClassUser[] }) {
  const { addSession, addStudentsToSession, mode, removeStudentFromSession, selectedSessionId, sessions, setSelectedSessionId } = scheduleState
  const [search, setSearch] = useState('')
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null
  const assignedIds = new Set(sessions.flatMap((session) => session.studentIds))
  const unassignedStudents = students.filter(
    (student) => !assignedIds.has(student.userId) && (student.user?.fullName ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-extrabold text-slate-900">{mode === 'device' ? 'Ca thi' : 'Ca thi & phòng'}</h3>
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-semibold text-white"
          onClick={addSession}
          type="button"
        >
          <Plus size={16} />
          Thêm ca thi
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500">
          Chưa có ca thi nào. Bấm "Thêm ca thi" để bắt đầu.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="grid gap-2">
            {sessions.map((session) => (
              <button
                className={`rounded-xl border p-3 text-left transition ${
                  session.id === selectedSessionId ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                type="button"
              >
                <div className="text-sm font-bold text-slate-900">{session.label}</div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">{session.dateTime}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{session.studentIds.length} học sinh</div>
              </button>
            ))}
          </div>

          {selectedSession ? (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">{selectedSession.label}</div>
                  <div className="text-xs font-medium text-slate-500">Đã thêm {selectedSession.studentIds.length} học sinh</div>
                </div>
                <input
                  className="h-9 w-48 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none focus:border-indigo-400"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm học sinh…"
                  value={search}
                />
              </div>

              <div className="grid gap-1.5">
                {selectedSession.studentIds.map((studentId) => {
                  const student = students.find((candidate) => candidate.userId === studentId)
                  return (
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm" key={studentId}>
                      <span className="font-semibold text-slate-800">{student?.user?.fullName ?? studentId}</span>
                      <button
                        className="text-xs font-bold text-red-600 hover:underline"
                        onClick={() => removeStudentFromSession(selectedSession.id, studentId)}
                        type="button"
                      >
                        Bỏ
                      </button>
                    </div>
                  )
                })}
                {unassignedStudents.slice(0, 8).map((student) => (
                  <button
                    className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 px-3 py-2 text-left text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                    key={student.userId}
                    onClick={() => addStudentsToSession(selectedSession.id, [student.userId])}
                    type="button"
                  >
                    <span>{student.user?.fullName ?? student.userId}</span>
                    <UserPlus size={15} />
                  </button>
                ))}
                {unassignedStudents.length === 0 && selectedSession.studentIds.length === 0 ? (
                  <div className="py-6 text-center text-xs font-semibold text-slate-400">Không còn học sinh nào chưa xếp ca.</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function AutoAssignPanel({
  paperCodes,
  scheduleState,
  students,
}: {
  paperCodes: string[]
  scheduleState: ExamScheduleState
  students: ClassUser[]
}) {
  const { assignmentByStudentId, cycleAssignment, runAutoAssign } = scheduleState
  const hasRun = Object.keys(scheduleState.paperAssignments).length > 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-extrabold text-slate-900">Tự động phân đề</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
          <Shuffle size={13} />
          Phân đều theo mã đề
        </span>
      </div>

      {paperCodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500">
          Kỳ thi chưa có mã đề nào đã khóa để phân.
        </div>
      ) : !hasRun ? (
        <div className="flex flex-col items-center gap-2.5 rounded-xl border border-slate-200 px-4 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Wand2 size={22} />
          </span>
          <div className="text-sm font-extrabold text-slate-900">Chưa phân đề</div>
          <p className="max-w-sm text-xs font-medium text-slate-500">
            Hệ thống sẽ random mã đề {paperCodes.join(' / ')} cho học sinh, chia đều số lượng theo từng mã. Đây là bản xem trước, chưa lưu vào hệ thống.
          </p>
          <button
            className="mt-1 inline-flex h-10 items-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-bold text-white"
            onClick={() => runAutoAssign(students.map((student) => student.userId), paperCodes)}
            type="button"
          >
            Chạy tự động phân đề
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex justify-end gap-2">
            <button
              className="h-9 rounded-full border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
              onClick={() => runAutoAssign(students.map((student) => student.userId), paperCodes)}
              type="button"
            >
              Chạy lại
            </button>
          </div>
          <div className="grid gap-1.5">
            {students.map((student) => {
              const assignment = assignmentByStudentId[student.userId]
              return (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm" key={student.userId}>
                  <span className="font-semibold text-slate-800">{student.user?.fullName ?? student.userId}</span>
                  <button
                    className="rounded-full px-3 py-1 text-xs font-bold text-white"
                    onClick={() => cycleAssignment(student.userId, paperCodes)}
                    style={{ backgroundColor: assignment?.paperColor ?? '#94A3B8' }}
                    type="button"
                  >
                    {assignment?.paperCode ?? '—'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
