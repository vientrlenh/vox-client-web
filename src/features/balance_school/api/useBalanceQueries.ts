import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type {
  BalanceEntryType,
  SchoolBalance,
  SchoolBalanceEntryPage,
  SchoolBalanceSummary,
  SchoolDebtEventPage,
} from '../model'

export const balanceQueryKeys = {
  all: ['school-balance'] as const,
  balance: () => [...balanceQueryKeys.all, 'balance'] as const,
  debtEvents: (page: number) => [...balanceQueryKeys.all, 'debt-events', page] as const,
  entries: (page: number, entryType: BalanceEntryType | null) =>
    [...balanceQueryKeys.all, 'entries', page, entryType ?? 'ALL'] as const,
  summary: (from: string | null) => [...balanceQueryKeys.all, 'summary', from ?? 'ALL'] as const,
}

const BALANCE_QUERY = `
  query SchoolBalance($schoolId: ID!) {
    schoolBalance(schoolId: $schoolId) {
      schoolId
      balanceVnd
      locked
      updatedAt
    }
  }
`

const ENTRIES_QUERY = `
  query SchoolBalanceEntries($schoolId: ID!, $entryType: SchoolBalanceEntryType, $page: Int!, $size: Int!) {
    schoolBalanceEntries(schoolId: $schoolId, entryType: $entryType, page: $page, size: $size) {
      page
      size
      totalElements
      totalPages
      content {
        id
        entryType
        amountVnd
        balanceAfterVnd
        occurredAt
        orderId
        examSessionId
        practiceSessionId
        quotaType
        costUsd
        fxRateUsed
        reason
        actorId
      }
    }
  }
`

const SUMMARY_QUERY = `
  query SchoolBalanceSummary($schoolId: ID!, $from: String, $to: String) {
    schoolBalanceSummary(schoolId: $schoolId, from: $from, to: $to) {
      creditedVnd
      overageChargedVnd
      adjustedVnd
    }
  }
`

const DEBT_EVENTS_QUERY = `
  query SchoolDebtEvents($schoolId: ID!, $page: Int!, $size: Int!) {
    schoolDebtEvents(schoolId: $schoolId, page: $page, size: $size) {
      page
      size
      totalElements
      totalPages
      content {
        id
        eventType
        quotaType
        triggerExamSessionId
        triggerPracticeSessionId
        triggerAmountVnd
        totalAllocatedVnd
        usedAmountVnd
        overageVnd
        occurredAt
      }
    }
  }
`

export function useSchoolBalanceQuery() {
  return useQuery({
    queryFn: async () => {
      const schoolId = requireSchoolId()
      const data = await graphQLRequest<{ schoolBalance: SchoolBalance }>(BALANCE_QUERY, { schoolId })
      return data.schoolBalance
    },
    queryKey: balanceQueryKeys.balance(),
  })
}

export function useBalanceEntriesQuery(page: number, size: number, entryType: BalanceEntryType | null = null) {
  return useQuery({
    queryFn: async () => {
      const schoolId = requireSchoolId()
      const data = await graphQLRequest<{ schoolBalanceEntries: SchoolBalanceEntryPage }>(ENTRIES_QUERY, {
        entryType,
        page,
        schoolId,
        size,
      })
      return data.schoolBalanceEntries
    },
    queryKey: [...balanceQueryKeys.entries(page, entryType), size],
  })
}

/**
 * @param from mốc ISO-8601, null = không chặn đầu nào. Backend dùng khoảng NỬA MỞ [from, to) nên hai
 *   dải liền nhau không đếm trùng bút toán rơi đúng mốc giao.
 */
export function useBalanceSummaryQuery(from: string | null) {
  return useQuery({
    queryFn: async () => {
      const schoolId = requireSchoolId()
      const data = await graphQLRequest<{ schoolBalanceSummary: SchoolBalanceSummary }>(SUMMARY_QUERY, {
        from,
        schoolId,
        to: null,
      })
      return data.schoolBalanceSummary
    },
    queryKey: balanceQueryKeys.summary(from),
  })
}

export function useDebtEventsQuery(page: number, size: number) {
  return useQuery({
    queryFn: async () => {
      const schoolId = requireSchoolId()
      const data = await graphQLRequest<{ schoolDebtEvents: SchoolDebtEventPage }>(DEBT_EVENTS_QUERY, {
        page,
        schoolId,
        size,
      })
      return data.schoolDebtEvents
    },
    queryKey: [...balanceQueryKeys.debtEvents(page), size],
  })
}

/** Mốc "30 ngày qua" cho trang tổng quan. Tính một lần mỗi lần render trang, đủ chính xác cho một mốc thống kê. */
export function thirtyDaysAgoIso() {
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return from.toISOString()
}
