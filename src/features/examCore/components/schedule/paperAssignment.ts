import type { ExamCandidateDto } from '../../types'

export const PAPER_COLORS = [
  { chip: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  { chip: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' },
  { chip: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { chip: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  { chip: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
]

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Chia đều thí sinh cho các mã đề. `bySchedule` chia đều trong TỪNG ca thay vì trên toàn bộ danh
 * sách — nếu chia trên toàn bộ thì một ca có thể lĩnh trọn một mã đề, mất tác dụng chống nhìn bài.
 */
export function computeAssignments(
  candidates: ExamCandidateDto[],
  paperIds: string[],
  bySchedule: boolean,
  randomize: boolean,
): Map<string, string> {
  const result = new Map<string, string>()
  if (!paperIds.length) {
    return result
  }

  function assignList(list: ExamCandidateDto[]) {
    const ordered = randomize ? shuffle(list) : list
    const offset = randomize ? Math.floor(Math.random() * paperIds.length) : 0
    ordered.forEach((candidate, index) => {
      result.set(candidate.id, paperIds[(index + offset) % paperIds.length])
    })
  }

  if (bySchedule) {
    const groups = new Map<string, ExamCandidateDto[]>()
    for (const candidate of candidates) {
      const key = candidate.scheduleId ?? ''
      const list = groups.get(key) ?? []
      list.push(candidate)
      groups.set(key, list)
    }
    groups.forEach(assignList)
  } else {
    assignList(candidates)
  }
  return result
}
