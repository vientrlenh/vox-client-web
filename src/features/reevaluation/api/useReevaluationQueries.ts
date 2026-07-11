import { useQuery } from '@tanstack/react-query'
import {
  getRequest,
  getStats,
  listRequests,
  listReviewers,
  listTeacherTasks,
} from '../mock/reevaluationStore'

export const reevaluationKeys = {
  all: ['reevaluation'] as const,
  list: () => [...reevaluationKeys.all, 'list'] as const,
  stats: () => [...reevaluationKeys.all, 'stats'] as const,
  detail: (id: string) => [...reevaluationKeys.all, 'detail', id] as const,
  teacherTasks: (teacherId: string) => [...reevaluationKeys.all, 'teacher', teacherId] as const,
  reviewers: () => [...reevaluationKeys.all, 'reviewers'] as const,
}

/**
 * Các hook dưới đây bọc mock store (in-memory). queryFn được bọc trong Promise
 * để giữ nguyên shape khi sau này thay bằng REST/GraphQL thật.
 */

export function useReevaluationRequestsQuery() {
  return useQuery({
    queryFn: async () => listRequests(),
    queryKey: reevaluationKeys.list(),
  })
}

export function useReevaluationStatsQuery() {
  return useQuery({
    queryFn: async () => getStats(),
    queryKey: reevaluationKeys.stats(),
  })
}

export function useReevaluationRequestQuery(id: string | null) {
  return useQuery({
    enabled: id != null,
    queryFn: async () => (id ? getRequest(id) : null),
    queryKey: reevaluationKeys.detail(id ?? ''),
  })
}

export function useTeacherTasksQuery(teacherId: string) {
  return useQuery({
    queryFn: async () => listTeacherTasks(teacherId),
    queryKey: reevaluationKeys.teacherTasks(teacherId),
  })
}

export function useReviewersQuery() {
  return useQuery({
    queryFn: async () => listReviewers(),
    queryKey: reevaluationKeys.reviewers(),
  })
}
