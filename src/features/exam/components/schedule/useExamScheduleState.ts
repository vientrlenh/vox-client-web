import { useMemo, useState } from 'react'

export type ScheduleMode = 'device' | 'lab'

export type ScheduleSession = {
  id: string
  label: string
  dateTime: string
  room: string | null
  studentIds: string[]
}

export type ScheduleAssignment = {
  paperCode?: string
  paperColor?: string
  sessionLabel?: string
}

const PAPER_COLORS = ['#4F46E5', '#0891B2', '#7C3AED', '#DB2777']

/**
 * Frontend-only scratch state for the "Phân lịch" (scheduling) tab prototype: sessions, device/lab
 * mode, and paper auto-assignment. Nothing here is persisted — there is no backend for exam
 * sessions/rooms/auto-assignment yet, so this hook exists purely to make the redesigned tab
 * interactive. State resets whenever the exam changes (call `reset()` on exam id change).
 */
export function useExamScheduleState() {
  const [mode, setMode] = useState<ScheduleMode>('device')
  const [sessions, setSessions] = useState<ScheduleSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [paperAssignments, setPaperAssignments] = useState<Record<string, { code: string; color: string }>>({})

  function reset() {
    setMode('device')
    setSessions([])
    setSelectedSessionId(null)
    setPaperAssignments({})
  }

  function addSession() {
    const nextIndex = sessions.length + 1
    const session: ScheduleSession = {
      dateTime: 'Chưa đặt giờ',
      id: crypto.randomUUID(),
      label: `Ca ${nextIndex}`,
      room: null,
      studentIds: [],
    }
    setSessions((current) => [...current, session])
    setSelectedSessionId(session.id)
  }

  function addStudentsToSession(sessionId: string, studentIds: string[]) {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, studentIds: Array.from(new Set([...session.studentIds, ...studentIds])) }
          : session,
      ),
    )
  }

  function removeStudentFromSession(sessionId: string, studentId: string) {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, studentIds: session.studentIds.filter((id) => id !== studentId) }
          : session,
      ),
    )
  }

  function runAutoAssign(studentIds: string[], paperCodes: string[]) {
    if (paperCodes.length === 0) {
      return
    }

    const shuffled = [...studentIds].sort(() => Math.random() - 0.5)
    const next: Record<string, { code: string; color: string }> = {}
    shuffled.forEach((studentId, index) => {
      const code = paperCodes[index % paperCodes.length]
      next[studentId] = { code, color: PAPER_COLORS[paperCodes.indexOf(code) % PAPER_COLORS.length] }
    })
    setPaperAssignments(next)
  }

  function cycleAssignment(studentId: string, paperCodes: string[]) {
    if (paperCodes.length === 0) {
      return
    }

    setPaperAssignments((current) => {
      const currentCode = current[studentId]?.code
      const currentIndex = currentCode ? paperCodes.indexOf(currentCode) : -1
      const nextCode = paperCodes[(currentIndex + 1) % paperCodes.length]
      return {
        ...current,
        [studentId]: { code: nextCode, color: PAPER_COLORS[paperCodes.indexOf(nextCode) % PAPER_COLORS.length] },
      }
    })
  }

  const assignmentByStudentId = useMemo<Record<string, ScheduleAssignment>>(() => {
    const result: Record<string, ScheduleAssignment> = {}

    for (const session of sessions) {
      for (const studentId of session.studentIds) {
        result[studentId] = { ...result[studentId], sessionLabel: session.room ? `${session.label} · ${session.room}` : session.label }
      }
    }

    for (const [studentId, assignment] of Object.entries(paperAssignments)) {
      result[studentId] = { ...result[studentId], paperCode: assignment.code, paperColor: assignment.color }
    }

    return result
  }, [paperAssignments, sessions])

  return {
    addSession,
    addStudentsToSession,
    assignmentByStudentId,
    cycleAssignment,
    mode,
    paperAssignments,
    removeStudentFromSession,
    reset,
    runAutoAssign,
    selectedSessionId,
    sessions,
    setMode,
    setSelectedSessionId,
  }
}

export type ExamScheduleState = ReturnType<typeof useExamScheduleState>
