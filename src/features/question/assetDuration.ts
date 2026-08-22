import type { QuestionAssetType } from './types'

/** Chỉ hai loại này mới có thời lượng phát; ảnh và đoạn văn hiện suốt lúc chuẩn bị. */
export function hasPlaybackDuration(type: QuestionAssetType): boolean {
  return type === 'AUDIO' || type === 'VIDEO'
}

export type NextDurationInput = {
  /** Loại của tài nguyên TRƯỚC thao tác. */
  previousType: QuestionAssetType
  /** Loại sau thao tác — suy từ MIME khi chọn tệp, hoặc từ dropdown. */
  nextType: QuestionAssetType
  /** Thời lượng đang có trên form (chuỗi vì form giữ mọi thứ dạng chuỗi). */
  previousDuration: string
  /**
   * Số giây đo được từ TỆP VỪA CHỌN. `null` = đo hỏng (trình duyệt không giải mã được, luồng không
   * có thời lượng xác định, hoặc quá hạn chờ). `undefined` = người dùng KHÔNG chọn tệp nào — chỉ
   * đổi loại bằng dropdown.
   */
  measuredDuration: number | null | undefined
}

/**
 * Thời lượng của tài nguyên sau khi người dùng đổi loại hoặc chọn tệp khác.
 *
 * <p>Một quy tắc duy nhất: **thời lượng luôn thuộc về đúng tệp đang được chọn**. Không có tệp, đo
 * hỏng, hoặc loại không phát được thì để rỗng — thà thiếu còn hơn mang số của tệp cũ.
 *
 * <p>Vì sao không giữ lại số cũ cho chắc: backend CỘNG thời lượng này vào thời gian làm bài của mã
 * đề (`PaperTimeCalculator`). Một con số lạc — ví dụ 20 giây còn sót lại sau khi đổi audio thành
 * ảnh — sẽ theo tài nguyên đó đi tiếp, và nếu người dùng đổi ngược về audio mà không chọn tệp mới
 * thì nó sống lại, lần này gần như chắc chắn lệch với tệp thật.
 */
export function nextDurationSeconds({
  previousType,
  nextType,
  previousDuration,
  measuredDuration,
}: NextDurationInput): string {
  if (!hasPlaybackDuration(nextType)) {
    return ''
  }
  if (measuredDuration === undefined) {
    // Không chọn tệp nào. Đổi loại thì tệp cũ không còn dùng được nữa (url cũng bị xoá theo), nên
    // số cũ hết nghĩa. Giữ nguyên loại thì không có gì thay đổi — giữ số đang có.
    return nextType === previousType ? previousDuration : ''
  }
  return measuredDuration === null ? '' : String(measuredDuration)
}
