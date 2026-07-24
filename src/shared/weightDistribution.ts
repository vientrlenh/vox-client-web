// H.6: thuật toán chia trọng số tự động dùng chung cho blueprint (section/slot) và class test
// (section/câu hỏi). Không chia đều kiểu 0.33/0.33/0.33 (làm tròn ngây thơ mất 0.01) - phần tử
// CUỐI luôn hấp thụ phần dư làm tròn để tổng chính xác bằng giá trị mong muốn.

const EPSILON = 1e-9

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

// perItem = total/count làm tròn XUỐNG 2 chữ số cho (count-1) phần tử đầu,
// phần tử CUỐI = total - tổng các phần đã gán (hấp thụ phần dư làm tròn).
function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) {
    return []
  }
  if (count === 1) {
    return [round2(total)]
  }

  const perItem = Math.floor((total / count) * 100 + EPSILON) / 100
  const weights = new Array<number>(count - 1).fill(perItem)
  const runningSum = perItem * (count - 1)
  weights.push(round2(total - runningSum))
  return weights
}

/**
 * `provided[i]` là giá trị người dùng đã nhập (null/undefined = ô còn trống).
 * - Chưa ai nhập gì (tất cả trống): phần tử đầu = 0.5, phần còn lại (0.5) chia đều
 *   theo kỹ thuật hấp-thụ-dư cho các phần tử còn lại.
 * - Đã nhập 1 phần: phần dư (1 - tổng đã nhập) chia đều theo kỹ thuật hấp-thụ-dư cho
 *   các ô còn trống, KHÔNG đụng vào ô đã có giá trị.
 * - Đã nhập hết: trả về nguyên trạng (không có gì để tự động chia).
 */
export function autoDistributeWeights(provided: Array<number | null | undefined>): number[] {
  const count = provided.length
  if (count === 0) {
    return []
  }

  const emptyIndexes = provided
    .map((value, index) => (value == null ? index : -1))
    .filter((index) => index >= 0)

  if (emptyIndexes.length === 0) {
    return provided.map((value) => value ?? 0)
  }

  if (emptyIndexes.length === count) {
    if (count === 1) {
      return [1]
    }
    return [0.5, ...splitEvenly(0.5, count - 1)]
  }

  const providedSum = provided.reduce((sum: number, value) => sum + (value ?? 0), 0)
  const remaining = round2(1 - providedSum)
  const filledForEmpties = splitEvenly(remaining, emptyIndexes.length)

  const result = provided.map((value) => value ?? 0)
  emptyIndexes.forEach((index, position) => {
    result[index] = filledForEmpties[position]
  })
  return result
}

export function sumWeights(weights: Array<number | null | undefined>): number {
  return round2(weights.reduce((sum: number, value) => sum + (value ?? 0), 0))
}
