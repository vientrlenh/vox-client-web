import { useQuery } from '@tanstack/react-query'
import {
  countClassTests,
  countExams,
  delay,
  getBlueprint,
  getExam,
  getExamPaper,
  listBlueprints,
  listCandidates,
  listClassTests,
  listExams,
  listRooms,
  listRoomsForExam,
  listSchedules,
} from '../mocks/store'
import type { ExamStatus } from '../types'

export const examQueryKeys = {
  all: ['exam-management'] as const,
  blueprint: (id: string | null) => [...examQueryKeys.all, 'blueprint', id] as const,
  blueprints: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'blueprints', filters] as const,
  candidates: (examId: string | null) => [...examQueryKeys.all, 'candidates', examId] as const,
  classTests: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'class-tests', filters] as const,
  classTestStats: () => [...examQueryKeys.all, 'class-test-stats'] as const,
  exam: (id: string | null) => [...examQueryKeys.all, 'exam', id] as const,
  examPaper: (id: string | null) => [...examQueryKeys.all, 'exam-paper', id] as const,
  examStats: () => [...examQueryKeys.all, 'exam-stats'] as const,
  exams: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'exams', filters] as const,
  rooms: (scheduleId: string | null) => [...examQueryKeys.all, 'rooms', scheduleId] as const,
  schedules: (examId: string | null) => [...examQueryKeys.all, 'schedules', examId] as const,
}

export function useExamsQuery(filters: { keyword?: string; page: number; size: number; status?: ExamStatus | '' }) {
  return useQuery({
    queryFn: async () => {
      await delay()
      return listExams({ keyword: filters.keyword, page: filters.page - 1, size: filters.size, status: filters.status || undefined })
    },
    queryKey: examQueryKeys.exams(filters),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useExamStatsQuery() {
  return useQuery({
    queryFn: async () => {
      await delay(120)
      return {
        inProgress: countExams('IN_PROGRESS'),
        pending: countExams('DRAFT') + countExams('SCHEDULED'),
        published: countExams('RESULTS_PUBLISHED'),
        total: countExams(),
      }
    },
    queryKey: examQueryKeys.examStats(),
  })
}

export function useClassTestsQuery(filters: {
  keyword?: string
  page: number
  schoolClassId?: string
  size: number
  status?: ExamStatus | ''
}) {
  return useQuery({
    queryFn: async () => {
      await delay()
      return listClassTests({
        keyword: filters.keyword,
        page: filters.page - 1,
        schoolClassId: filters.schoolClassId,
        size: filters.size,
        status: filters.status || undefined,
      })
    },
    queryKey: examQueryKeys.classTests(filters),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useClassTestStatsQuery() {
  return useQuery({
    queryFn: async () => {
      await delay(120)
      return {
        graded: countClassTests('RESULTS_PUBLISHED'),
        open: countClassTests('IN_PROGRESS'),
        pendingGrade: countClassTests('CLOSED'),
        total: countClassTests(),
      }
    },
    queryKey: examQueryKeys.classTestStats(),
  })
}

export function useExamQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      await delay()
      return getExam(id as string)
    },
    queryKey: examQueryKeys.exam(id),
  })
}

export function useExamPaperQuery(paperId: string | null) {
  return useQuery({
    enabled: Boolean(paperId),
    queryFn: async () => {
      await delay()
      return getExamPaper(paperId as string)
    },
    queryKey: examQueryKeys.examPaper(paperId),
  })
}

export function useExamBlueprintsQuery(filters: { isActive?: boolean; keyword?: string; page: number; size: number }) {
  return useQuery({
    queryFn: async () => {
      await delay()
      return listBlueprints({ isActive: filters.isActive, keyword: filters.keyword, page: filters.page - 1, size: filters.size })
    },
    queryKey: examQueryKeys.blueprints(filters),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useExamBlueprintQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      await delay()
      return getBlueprint(id as string)
    },
    queryKey: examQueryKeys.blueprint(id),
  })
}

export function useExamCandidatesQuery(examId: string | null) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: async () => {
      await delay()
      return listCandidates(examId as string)
    },
    queryKey: examQueryKeys.candidates(examId),
  })
}

export function useExamSchedulesQuery(examId: string | null) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: async () => {
      await delay()
      return listSchedules(examId as string)
    },
    queryKey: examQueryKeys.schedules(examId),
  })
}

export function useExamRoomsQuery(examId: string | null) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: async () => {
      await delay()
      return listRoomsForExam(examId as string)
    },
    queryKey: [...examQueryKeys.all, 'exam-rooms', examId],
  })
}

export function useScheduleRoomsQuery(scheduleId: string | null) {
  return useQuery({
    enabled: Boolean(scheduleId),
    queryFn: async () => {
      await delay()
      return listRooms(scheduleId as string)
    },
    queryKey: examQueryKeys.rooms(scheduleId),
  })
}
