import { formatDurationSeconds } from '../types'

export function getMaxAttemptSeconds(maxTimePerAttemptMin?: number | null): number | null {
  if (maxTimePerAttemptMin == null || maxTimePerAttemptMin <= 0) {
    return null
  }
  return maxTimePerAttemptMin * 60
}

export function exceedsTimeQuota(durationSeconds?: number | null, maxTimePerAttemptMin?: number | null): boolean {
  const maxSeconds = getMaxAttemptSeconds(maxTimePerAttemptMin)
  return maxSeconds != null && durationSeconds != null && durationSeconds > maxSeconds
}

export function buildTimeQuotaWarning(
  targetLabel: string,
  durationSeconds?: number | null,
  maxTimePerAttemptMin?: number | null,
): string | null {
  const maxSeconds = getMaxAttemptSeconds(maxTimePerAttemptMin)
  if (maxSeconds == null || durationSeconds == null || durationSeconds <= maxSeconds) {
    return null
  }
  return `${targetLabel} có thời lượng ${formatDurationSeconds(durationSeconds)}, vượt giới hạn gói hiện tại (${formatDurationSeconds(maxSeconds)}).`
}

export function getQuestionAttemptSeconds(question: {
  maxResponseSeconds?: number | null
  preparationTimeSeconds?: number | null
}): number {
  return (question.preparationTimeSeconds ?? 0) + (question.maxResponseSeconds ?? 0)
}
