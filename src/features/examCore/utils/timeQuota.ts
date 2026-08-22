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

/**
 * Chỉ AUDIO và VIDEO mới tốn thời gian riêng. Ảnh và đoạn văn hiện suốt lúc chuẩn bị nên đã nằm
 * trong preparationTimeSeconds rồi — lọc theo `type` chứ không theo "có durationSeconds", vì
 * durationSeconds là cột dùng chung cho mọi loại asset ở backend.
 */
function getMediaSeconds(
  assets?: Array<{ type?: string | null; durationSeconds?: number | null }> | null,
): number {
  if (!assets) {
    return 0
  }
  return assets.reduce((sum, asset) => {
    if (asset.type !== 'AUDIO' && asset.type !== 'VIDEO') {
      return sum
    }
    return sum + Math.max(0, asset.durationSeconds ?? 0)
  }, 0)
}

/**
 * Thời gian thật một câu hỏi chiếm của mã đề. Phải khớp PaperTimeCalculator.totalSeconds bên backend
 * — nếu backend cộng thời lượng media mà đây không cộng thì người soạn thấy "còn trong hạn mức" rồi
 * bấm lưu mới ăn lỗi đỏ.
 *
 * `assets` để trống (câu hỏi lấy từ query chưa select assets) thì coi như không có media.
 */
export function getQuestionAttemptSeconds(question: {
  maxResponseSeconds?: number | null
  preparationTimeSeconds?: number | null
  assets?: Array<{ type?: string | null; durationSeconds?: number | null }> | null
}): number {
  return (question.preparationTimeSeconds ?? 0)
    + (question.maxResponseSeconds ?? 0)
    + getMediaSeconds(question.assets)
}
