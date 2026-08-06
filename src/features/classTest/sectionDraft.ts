import type { QuestionDto } from '@/features/question/types'

/**
 * Trạng thái soạn thảo của một phần trong mã đề bài kiểm tra trên lớp.
 *
 * <p>Dùng chung giữa màn soạn mã đề mới (`ClassTestPaperComposer`) và màn sửa nội dung mã đề ở
 * trang chi tiết — hai nơi tự định nghĩa lại là sớm muộn hai nơi lệch luật trọng số.
 */
export type ClassTestSectionDraft = {
  instruction: string
  key: string
  questions: QuestionDto[]
  questionWeights: Record<string, string>
  title: string
  weight: string
}

let classTestKeySeed = 0

export function nextClassTestKey(prefix: string) {
  classTestKeySeed += 1
  return `${prefix}-${classTestKeySeed}`
}

export function newClassTestSection(order: number): ClassTestSectionDraft {
  return { instruction: '', key: nextClassTestKey('cts'), questions: [], questionWeights: {}, title: `Part ${order}`, weight: '' }
}

const SECTION_WEIGHT_TOLERANCE = 0.01

export function parseOptionalSectionWeight(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function validateOptionalSectionWeights(weights: Array<number | null>) {
  const numericWeights = weights.filter((weight): weight is number => weight !== null)
  if (numericWeights.some(Number.isNaN)) {
    return 'Trọng số section phải là số hợp lệ.'
  }
  if (numericWeights.length === weights.length) {
    const sum = numericWeights.reduce((total, weight) => total + weight, 0)
    if (Math.abs(sum - 1) >= SECTION_WEIGHT_TOLERANCE) {
      return `Tổng trọng số section phải bằng 1.00 (hiện tại ${sum.toFixed(2)}).`
    }
  }
  return null
}

export function sectionWeightInputValue(weight?: number | null) {
  return weight == null ? '' : String(weight)
}
