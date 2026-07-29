type ResultBandValue = {
  rubricResultBandCode?: string | null
  rubricResultBandName?: string | null
}

export function formatPublishedResult(value?: ResultBandValue | null) {
  return value?.rubricResultBandName ?? value?.rubricResultBandCode ?? 'Chưa xếp loại'
}
