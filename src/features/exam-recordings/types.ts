export type ExamRecordingStreamType = 'CAMERA' | 'SCREEN'

export type ExamRecordingStatus = 'ABANDONED' | 'FAILED' | 'PARTIAL' | 'PROCESSING' | 'READY'

export type ExamRecordingPlaybackDto = {
  id: string
  streamType: ExamRecordingStreamType | null
  status: ExamRecordingStatus | null
  /**
   * Đường ingest đã tạo ra bản ghi này. Một phiên thi thường có HAI bản cho mỗi luồng:
   * `DESKTOP_SEGMENT_UPLOAD` do máy thí sinh tải lên, `SERVER_WEBRTC` do server ghi lại.
   * Bản server là bản duy nhất không đi qua máy thí sinh, nên khi có tranh chấp nó là chứng cứ
   * đáng tin hơn -- đó là lý do giao diện phải cho đổi nguồn chứ không chỉ hiện bản mặc định.
   */
  source: string | null
  durationSeconds: number | null
  /** Bản nên mở trước cho luồng này. Backend chọn theo RecordingPrecedence. */
  canonical: boolean
  /**
   * Link ký sẵn, HẾT HẠN sau 2 giờ. `null` khi chưa có file để phát (đang PROCESSING, hoặc
   * FAILED/ABANDONED) -- trạng thái bình thường, không phải lỗi.
   */
  playbackUrl: string | null
}
