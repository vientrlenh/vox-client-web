import { apiClient, toApiError } from '@/shared/api'
import { exportExamScores, exportExamScoresExcel } from './useExamResultMutations'

const get = jest.spyOn(apiClient, 'get')

/**
 * `downloadBlob` dựng một thẻ `<a>` rồi bấm vào nó; jsdom không có `createObjectURL` nên
 * phải vá vào, và giữ lại tên file để assert.
 */
let downloadedFileName: string | null = null

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:fake')
  URL.revokeObjectURL = jest.fn()
  jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFileName = this.download
    })
})

beforeEach(() => {
  get.mockReset()
  downloadedFileName = null
})

function xlsxResponse(contentDisposition?: string) {
  return {
    data: new Blob(['xlsx']),
    headers: contentDisposition ? { 'content-disposition': contentDisposition } : {},
  }
}

describe('exam score export', () => {
  it('sends the whole on-screen filter set so the file matches the table', async () => {
    get.mockResolvedValue(xlsxResponse())

    await exportExamScoresExcel({
      assignmentStatus: 'COMPLETED',
      examId: 'e1',
      hasOpenAppeal: true,
      keyword: '  nguyen  ',
      kind: 'CLASS_TEST',
      overdueOnly: true,
      resultStatus: 'RELEASED',
      roundType: 'APPEAL',
      teacherId: 't1',
      unassignedOnly: true,
    })

    expect(get).toHaveBeenCalledWith('/v1/exam-results/export/excel', {
      params: {
        assignmentStatus: 'COMPLETED',
        examId: 'e1',
        hasOpenAppeal: true,
        keyword: 'nguyen',
        kind: 'CLASS_TEST',
        overdueOnly: true,
        resultStatus: 'RELEASED',
        roundType: 'APPEAL',
        scheduleId: undefined,
        teacherId: 't1',
        unassignedOnly: true,
      },
      responseType: 'blob',
    })
  })

  /**
   * `kind` thiếu là BE hiểu CENTRALIZED — màn theo dõi bài trên lớp mà không gửi thì tải về
   * bảng điểm của loại bài kia.
   */
  it('passes the class test kind through', async () => {
    get.mockResolvedValue(xlsxResponse())

    await exportExamScoresExcel({ examId: 'e1', kind: 'CLASS_TEST' })

    expect(get.mock.calls[0][1]?.params).toMatchObject({ kind: 'CLASS_TEST' })
  })

  /** Gửi `false` cho `hasOpenAppeal` là bộ lọc khác hẳn: chỉ bài KHÔNG có đơn đang mở. */
  it('omits the boolean flags when they are off', async () => {
    get.mockResolvedValue(xlsxResponse())

    await exportExamScoresExcel({
      examId: 'e1',
      hasOpenAppeal: false,
      overdueOnly: false,
      unassignedOnly: false,
    })

    const params = get.mock.calls[0][1]?.params as Record<string, unknown>
    expect(params.hasOpenAppeal).toBeUndefined()
    expect(params.overdueOnly).toBeUndefined()
    expect(params.unassignedOnly).toBeUndefined()
  })

  it('names the file from the Content-Disposition header', async () => {
    get.mockResolvedValue(xlsxResponse('attachment; filename="bang-diem-lop-20260806.xlsx"'))

    await exportExamScoresExcel({ examId: 'e1' })

    expect(downloadedFileName).toBe('bang-diem-lop-20260806.xlsx')
  })

  it('falls back to a default name when the header is missing', async () => {
    get.mockResolvedValue(xlsxResponse())

    await exportExamScoresExcel({ examId: 'e1' })

    expect(downloadedFileName).toBe('bang-diem.xlsx')
  })

  /**
   * `responseType: 'blob'` áp cho cả response LỖI, nên message tiếng Việt của BE nằm trong
   * một Blob mà `toApiError` không đọc được — không unwrap thì người dùng chỉ thấy
   * "Request failed with status code 400".
   */
  it('unwraps a JSON error body that arrived as a Blob', async () => {
    get.mockRejectedValue({
      response: {
        data: new Blob([JSON.stringify({ message: 'Phải chọn kỳ thi hoặc ca thi để xuất bảng điểm.' })]),
        status: 400,
      },
    })

    await expect(exportExamScoresExcel({})).rejects.toMatchObject({
      response: { data: { message: 'Phải chọn kỳ thi hoặc ca thi để xuất bảng điểm.' } },
    })
  })

  it('sends the same filters on the CSV route', async () => {
    get.mockResolvedValue({ data: new Blob(['csv']), headers: {} })

    await exportExamScores({ examId: 'e1', kind: 'CLASS_TEST', resultStatus: 'RELEASED' })

    expect(get).toHaveBeenCalledWith(
      '/v1/exam-results/export',
      expect.objectContaining({
        params: expect.objectContaining({
          examId: 'e1',
          kind: 'CLASS_TEST',
          resultStatus: 'RELEASED',
        }),
      }),
    )
  })
})

describe('toApiError over an unwrapped blob error', () => {
  it('reads the Vietnamese message after the blob has been parsed', async () => {
    get.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: new Blob([JSON.stringify({ message: 'Phải chọn kỳ thi hoặc ca thi để xuất bảng điểm.' })]),
        status: 400,
      },
    })

    const error = await exportExamScoresExcel({}).catch((caught: unknown) => caught)

    expect(toApiError(error).message).toBe('Phải chọn kỳ thi hoặc ca thi để xuất bảng điểm.')
  })
})
