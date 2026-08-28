import type { QuestionAssetType } from './types'
import { nextDurationSeconds } from './assetDuration'

const TYPES: QuestionAssetType[] = ['IMAGE', 'AUDIO', 'VIDEO', 'TEXT_PASSAGE']
const MEDIA: QuestionAssetType[] = ['AUDIO', 'VIDEO']

/** Người dùng chọn một tệp mới; nếu tệp đó phát được thì trình duyệt đo ra 35 giây. */
function pickFile(previousType: QuestionAssetType, nextType: QuestionAssetType, previousDuration = '20') {
  return nextDurationSeconds({
    measuredDuration: MEDIA.includes(nextType) ? 35 : null,
    nextType,
    previousDuration,
    previousType,
  })
}

/** Người dùng chỉ đổi ô chọn loại, không đụng tới tệp. */
function switchTypeOnly(previousType: QuestionAssetType, nextType: QuestionAssetType, previousDuration = '20') {
  return nextDurationSeconds({
    measuredDuration: undefined,
    nextType,
    previousDuration,
    previousType,
  })
}

describe('nextDurationSeconds — chọn tệp mới', () => {
  // Quét đủ 16 tổ hợp thay vì liệt kê tay vài cái: sót một ô là sót đúng cái ô hiếm gặp.
  for (const previousType of TYPES) {
    for (const nextType of TYPES) {
      const expected = MEDIA.includes(nextType) ? '35' : ''
      it(`${previousType} → ${nextType} cho ra "${expected}"`, () => {
        expect(pickFile(previousType, nextType)).toBe(expected)
      })
    }
  }

  it('đổi audio này sang audio khác thì lấy số MỚI, không giữ số cũ', () => {
    expect(pickFile('AUDIO', 'AUDIO', '20')).toBe('35')
  })

  it('audio sang video cũng đo lại từ tệp mới', () => {
    expect(pickFile('AUDIO', 'VIDEO', '20')).toBe('35')
  })

  it('đo hỏng thì để RỖNG chứ không giữ số của tệp cũ', () => {
    expect(nextDurationSeconds({
      measuredDuration: null,
      nextType: 'AUDIO',
      previousDuration: '20',
      previousType: 'AUDIO',
    })).toBe('')
  })
})

describe('nextDurationSeconds — chỉ đổi ô chọn loại, không chọn tệp', () => {
  for (const previousType of TYPES) {
    for (const nextType of TYPES) {
      const expected = MEDIA.includes(nextType) && nextType === previousType ? '20' : ''
      it(`${previousType} → ${nextType} cho ra "${expected}"`, () => {
        expect(switchTypeOnly(previousType, nextType)).toBe(expected)
      })
    }
  }

  it('audio sang ảnh thì XOÁ số cũ, không để 20 giây nằm lại trên tấm ảnh', () => {
    expect(switchTypeOnly('AUDIO', 'IMAGE', '20')).toBe('')
  })

  it('ảnh sang video thì rỗng vì chưa có tệp nào để đo', () => {
    expect(switchTypeOnly('IMAGE', 'VIDEO', '')).toBe('')
  })

  it('audio sang video rồi chưa chọn tệp thì KHÔNG bê số của bản audio cũ sang', () => {
    expect(switchTypeOnly('AUDIO', 'VIDEO', '20')).toBe('')
  })
})
