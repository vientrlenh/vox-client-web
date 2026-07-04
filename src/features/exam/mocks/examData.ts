import type {
  ExamBlueprintDto,
  ExamCandidateDto,
  ExamDto,
  ExamProctorDto,
  ExamRoomDto,
  ExamScheduleDto,
} from '../types'

export const MOCK_SCHOOL_ID = 'school-1'
export const MOCK_LANGUAGE_ID = 'lang-en'

export const MOCK_COUNCIL = {
  chair: { id: 'user-lan', email: 'lan.nguyen@vox.edu.vn', fullName: 'Nguyễn Thị Lan' },
  authorMinh: { id: 'user-minh', email: 'minh.tran@vox.edu.vn', fullName: 'Trần Văn Minh' },
  authorNam: { id: 'user-nam', email: 'nam.le@vox.edu.vn', fullName: 'Lê Hoàng Nam' },
  reviewerHa: { id: 'user-ha', email: 'ha.pham@vox.edu.vn', fullName: 'Phạm Thu Hà' },
}

export const MOCK_CLASSES = [
  { id: 'class-11a', name: 'Lớp 11A', code: '11A' },
  { id: 'class-11b', name: 'Lớp 11B', code: '11B' },
  { id: 'class-11c', name: 'Lớp 11C', code: '11C' },
  { id: 'class-10c', name: 'Lớp 10C', code: '10C' },
  { id: 'class-12a', name: 'Lớp 12A', code: '12A' },
]

function makeCandidates(
  examId: string,
  className: string,
  schoolClassId: string,
  count: number,
  startSbd: number,
  status: ExamCandidateDto['status'],
  scheduleId?: string,
  roomId?: string,
): ExamCandidateDto[] {
  return Array.from({ length: count }, (_, index) => ({
    examId,
    id: `${examId}-cand-${startSbd + index}`,
    paperId: null,
    roomId: roomId ?? null,
    scheduleId: scheduleId ?? null,
    sbd: String(startSbd + index).padStart(6, '0'),
    schoolClassId,
    schoolClassName: className,
    status,
    studentId: `student-${startSbd + index}`,
    studentName: `Học sinh ${startSbd + index}`,
  }))
}

export const mockBlueprints: ExamBlueprintDto[] = [
  {
    code: 'BP-SPEAK-11',
    createdAt: '2024-08-01T00:00:00Z',
    description: 'Khung đánh giá kỹ năng nói dành cho học sinh khối 11.',
    id: 'bp-speak-11',
    isActive: true,
    languageId: MOCK_LANGUAGE_ID,
    name: 'Khung nói Khối 11',
    schoolGradeLevelId: 'grade-11',
    schoolId: MOCK_SCHOOL_ID,
    updatedAt: '2024-11-01T00:00:00Z',
    versions: [
      {
        code: 'v1', description: 'Phiên bản khởi tạo', effectiveFrom: '2024-08-01T00:00:00Z', effectiveTo: null,
        id: 'bpv-speak-11-v1', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 1200, version: 1,
      },
      {
        code: 'v2', description: 'Bổ sung phần mô tả tranh', effectiveFrom: '2024-09-15T00:00:00Z', effectiveTo: null,
        id: 'bpv-speak-11-v2', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 1200, version: 2,
      },
      {
        code: 'v3', description: 'Điều chỉnh trọng số phần trả lời mở', effectiveFrom: '2024-11-01T00:00:00Z', effectiveTo: null,
        id: 'bpv-speak-11-v3', status: 'PUBLISHED', totalTimeLimitSeconds: 1200, version: 3,
        sections: [
          {
            id: 'bps-11-1', instruction: 'Đọc to đoạn văn cho sẵn.', order: 1, sectionTimeLimitSeconds: 300,
            sectionWeight: 0.25, title: 'Phần 1 · Đọc to',
            slots: [
              { id: 'bpsl-11-1-1', order: 1, sectionId: 'bps-11-1', slotType: 'FIXED', weight: 0.5, fixedQuestionId: 'q-read-1', fixedQuestion: { id: 'q-read-1', code: 'Q-READ-01', questionText: 'Đọc to đoạn văn về môi trường.', status: 'PUBLISHED' } },
              { id: 'bpsl-11-1-2', order: 2, sectionId: 'bps-11-1', slotType: 'FIXED', weight: 0.5, fixedQuestionId: 'q-read-2', fixedQuestion: { id: 'q-read-2', code: 'Q-READ-02', questionText: 'Đọc to đoạn văn về du lịch.', status: 'PUBLISHED' } },
            ],
          },
          {
            id: 'bps-11-2', instruction: 'Mô tả bức tranh trong 60 giây.', order: 2, sectionTimeLimitSeconds: 420,
            sectionWeight: 0.35, title: 'Phần 2 · Mô tả tranh',
            slots: [
              { id: 'bpsl-11-2-1', order: 1, sectionId: 'bps-11-2', slotType: 'SELECTION', weight: 0.34, selectionSpec: { topicId: 'topic-daily-life', difficulty: 'MEDIUM' } },
              { id: 'bpsl-11-2-2', order: 2, sectionId: 'bps-11-2', slotType: 'SELECTION', weight: 0.33, selectionSpec: { topicId: 'topic-nature', difficulty: 'MEDIUM' } },
              { id: 'bpsl-11-2-3', order: 3, sectionId: 'bps-11-2', slotType: 'SELECTION', weight: 0.33, selectionSpec: { topicId: 'topic-people', difficulty: 'MEDIUM' } },
            ],
          },
          {
            id: 'bps-11-3', instruction: 'Trả lời câu hỏi mở theo chủ đề.', order: 3, sectionTimeLimitSeconds: 480,
            sectionWeight: 0.4, title: 'Phần 3 · Trả lời mở',
            slots: [
              { id: 'bpsl-11-3-1', order: 1, sectionId: 'bps-11-3', slotType: 'SELECTION', weight: 0.34, selectionSpec: { topicId: 'topic-education' } },
              { id: 'bpsl-11-3-2', order: 2, sectionId: 'bps-11-3', slotType: 'SELECTION', weight: 0.33, selectionSpec: { topicId: 'topic-technology' } },
              { id: 'bpsl-11-3-3', order: 3, sectionId: 'bps-11-3', slotType: 'SELECTION', weight: 0.33, selectionSpec: { topicId: 'topic-environment' } },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'BP-IELTS-SPK',
    createdAt: '2024-06-01T00:00:00Z',
    description: 'Khung mô phỏng IELTS Speaking cho khối 12.',
    id: 'bp-ielts-spk',
    isActive: true,
    languageId: MOCK_LANGUAGE_ID,
    name: 'Khung IELTS Speaking',
    schoolGradeLevelId: 'grade-12',
    schoolId: MOCK_SCHOOL_ID,
    updatedAt: '2024-10-01T00:00:00Z',
    versions: [
      { code: 'v1', description: null, effectiveFrom: '2024-06-01T00:00:00Z', effectiveTo: null, id: 'bpv-ielts-v1', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 900, version: 1 },
      {
        code: 'v2', description: 'Cập nhật bộ câu hỏi Part 3', effectiveFrom: '2024-10-01T00:00:00Z', effectiveTo: null,
        id: 'bpv-ielts-spk-v2', status: 'PUBLISHED', totalTimeLimitSeconds: 900, version: 2,
        sections: [
          { id: 'bps-ielts-1', instruction: 'Giới thiệu bản thân.', order: 1, sectionTimeLimitSeconds: 180, sectionWeight: 0.2, title: 'Part 1', slots: [] },
          { id: 'bps-ielts-2', instruction: 'Trình bày chủ đề trong 2 phút.', order: 2, sectionTimeLimitSeconds: 300, sectionWeight: 0.4, title: 'Part 2', slots: [] },
          { id: 'bps-ielts-3', instruction: 'Thảo luận mở rộng.', order: 3, sectionTimeLimitSeconds: 420, sectionWeight: 0.4, title: 'Part 3', slots: [] },
        ],
      },
    ],
  },
  {
    code: 'BP-SPEAK-10',
    createdAt: '2025-01-02T00:00:00Z',
    description: 'Khung nói dành cho khối 10, đang soạn thảo.',
    id: 'bp-speak-10',
    isActive: true,
    languageId: MOCK_LANGUAGE_ID,
    name: 'Khung nói Khối 10',
    schoolGradeLevelId: 'grade-10',
    schoolId: MOCK_SCHOOL_ID,
    updatedAt: '2025-01-02T00:00:00Z',
    versions: [
      {
        code: 'v1', description: 'Bản nháp đầu tiên', effectiveFrom: '2025-01-02T00:00:00Z', effectiveTo: null,
        id: 'bpv-speak-10-v1', status: 'DRAFT', totalTimeLimitSeconds: 900, version: 1,
        sections: [
          { id: 'bps-10-1', instruction: 'Đọc to đoạn văn ngắn.', order: 1, sectionTimeLimitSeconds: 240, sectionWeight: 0.4, title: 'Phần 1 · Đọc to', slots: [] },
          { id: 'bps-10-2', instruction: 'Trả lời câu hỏi cá nhân.', order: 2, sectionTimeLimitSeconds: 300, sectionWeight: 0.6, title: 'Phần 2 · Trả lời ngắn', slots: [] },
        ],
      },
    ],
  },
  {
    code: 'BP-SPEAK-BASIC',
    createdAt: '2022-01-01T00:00:00Z',
    description: 'Khung nói cơ bản dùng trước 2024, đã ngừng sử dụng.',
    id: 'bp-speak-basic',
    isActive: false,
    languageId: MOCK_LANGUAGE_ID,
    name: 'Khung nói cơ bản (cũ)',
    schoolGradeLevelId: null,
    schoolId: MOCK_SCHOOL_ID,
    updatedAt: '2024-01-01T00:00:00Z',
    versions: [
      { code: 'v1', description: null, effectiveFrom: '2022-01-01T00:00:00Z', effectiveTo: '2022-08-01T00:00:00Z', id: 'bpv-basic-v1', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 600, version: 1 },
      { code: 'v2', description: null, effectiveFrom: '2022-08-01T00:00:00Z', effectiveTo: '2023-01-01T00:00:00Z', id: 'bpv-basic-v2', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 600, version: 2 },
      { code: 'v3', description: null, effectiveFrom: '2023-01-01T00:00:00Z', effectiveTo: '2023-08-01T00:00:00Z', id: 'bpv-basic-v3', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 600, version: 3 },
      { code: 'v4', description: null, effectiveFrom: '2023-08-01T00:00:00Z', effectiveTo: '2024-01-01T00:00:00Z', id: 'bpv-basic-v4', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 600, version: 4 },
    ],
  },
  {
    code: 'BP-SPEAK-12',
    createdAt: '2023-05-01T00:00:00Z',
    description: 'Khung nói dành cho khối 12.',
    id: 'bp-speak-12',
    isActive: true,
    languageId: MOCK_LANGUAGE_ID,
    name: 'Khung nói Khối 12',
    schoolGradeLevelId: 'grade-12',
    schoolId: MOCK_SCHOOL_ID,
    updatedAt: '2024-09-01T00:00:00Z',
    versions: [
      { code: 'v1', description: null, effectiveFrom: '2023-05-01T00:00:00Z', effectiveTo: null, id: 'bpv-12-v1', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 900, version: 1 },
      { code: 'v2', description: null, effectiveFrom: '2023-09-01T00:00:00Z', effectiveTo: null, id: 'bpv-12-v2', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 900, version: 2 },
      { code: 'v3', description: null, effectiveFrom: '2024-01-01T00:00:00Z', effectiveTo: null, id: 'bpv-12-v3', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 900, version: 3 },
      { code: 'v4', description: null, effectiveFrom: '2024-05-01T00:00:00Z', effectiveTo: null, id: 'bpv-12-v4', sections: [], status: 'ARCHIVED', totalTimeLimitSeconds: 900, version: 4 },
      {
        code: 'v5', description: 'Phiên bản cuối năm học', effectiveFrom: '2024-09-01T00:00:00Z', effectiveTo: null,
        id: 'bpv-12-v5', status: 'PUBLISHED', totalTimeLimitSeconds: 900, version: 5,
        sections: [
          { id: 'bps-12-1', instruction: 'Đọc to đoạn văn.', order: 1, sectionTimeLimitSeconds: 300, sectionWeight: 0.4, title: 'Phần 1 · Đọc to', slots: [] },
          { id: 'bps-12-2', instruction: 'Trả lời mở theo chủ đề.', order: 2, sectionTimeLimitSeconds: 480, sectionWeight: 0.6, title: 'Phần 2 · Trả lời mở', slots: [] },
        ],
      },
    ],
  },
]

function paper(
  examId: string,
  id: string,
  variant: number,
  status: ExamDto['papers'][number]['status'],
  blueprintVersionId: string | null,
): ExamDto['papers'][number] {
  const codeLetter = String.fromCharCode(64 + variant)
  return {
    blueprintVersionId,
    code: `SP-${codeLetter}`,
    createdAt: '2024-12-01T00:00:00Z',
    examId,
    id,
    status,
    updatedAt: '2024-12-10T00:00:00Z',
    variant,
    sections: [
      {
        id: `${id}-sec-1`, instruction: 'Đọc to đoạn văn cho sẵn.', order: 1, paperId: id,
        sectionTimeLimitSeconds: 300, title: 'Phần 1 · Đọc to',
        items: [
          { id: `${id}-item-1`, order: 1, sectionId: `${id}-sec-1`, questionId: 'q-read-1', question: { id: 'q-read-1', code: 'Q-READ-01', questionText: 'Đọc to đoạn văn về môi trường.' }, weight: 0.5 },
          { id: `${id}-item-2`, order: 2, sectionId: `${id}-sec-1`, questionId: 'q-read-2', question: { id: 'q-read-2', code: 'Q-READ-02', questionText: 'Đọc to đoạn văn về du lịch.' }, weight: 0.5 },
        ],
      },
      {
        id: `${id}-sec-2`, instruction: 'Mô tả bức tranh trong 60 giây.', order: 2, paperId: id,
        sectionTimeLimitSeconds: 420, title: 'Phần 2 · Mô tả tranh',
        items: [
          { id: `${id}-item-3`, order: 1, sectionId: `${id}-sec-2`, questionId: 'q-desc-1', question: { id: 'q-desc-1', code: 'Q-DESC-01', questionText: 'Mô tả bức tranh về cuộc sống hàng ngày.' }, weight: 0.34 },
          { id: `${id}-item-4`, order: 2, sectionId: `${id}-sec-2`, questionId: 'q-desc-2', question: { id: 'q-desc-2', code: 'Q-DESC-02', questionText: 'Mô tả bức tranh về thiên nhiên.' }, weight: 0.33 },
          { id: `${id}-item-5`, order: 3, sectionId: `${id}-sec-2`, questionId: null, question: null, weight: 0.33 },
        ],
      },
      {
        id: `${id}-sec-3`, instruction: 'Trả lời câu hỏi mở theo chủ đề.', order: 3, paperId: id,
        sectionTimeLimitSeconds: 480, title: 'Phần 3 · Trả lời mở',
        items: [
          { id: `${id}-item-6`, order: 1, sectionId: `${id}-sec-3`, questionId: 'q-open-1', question: { id: 'q-open-1', code: 'Q-OPEN-01', questionText: 'Bạn nghĩ gì về việc học ngoại ngữ từ nhỏ?' }, weight: 0.34 },
          { id: `${id}-item-7`, order: 2, sectionId: `${id}-sec-3`, questionId: null, question: null, weight: 0.33 },
          { id: `${id}-item-8`, order: 3, sectionId: `${id}-sec-3`, questionId: null, question: null, weight: 0.33 },
        ],
      },
    ],
  }
}

export const mockExams: ExamDto[] = [
  {
    blueprintId: 'bp-speak-11', blueprintVersionId: 'bpv-speak-11-v3', closeAt: '2025-01-07T17:00:00Z',
    code: 'EXAM-2024-K11', createdAt: '2024-12-01T00:00:00Z', deliveryMode: 'LAB',
    description: 'Kỳ thi đánh giá kỹ năng nói cuối học kỳ I cho toàn khối 11.', id: 'exam-k11-fall',
    kind: 'CENTRALIZED', languageId: MOCK_LANGUAGE_ID, name: 'Đánh giá nói cuối kỳ I — Khối 11',
    openAt: '2025-01-05T08:00:00Z', schoolId: MOCK_SCHOOL_ID, status: 'IN_PROGRESS', updatedAt: '2025-01-06T00:00:00Z',
    members: [
      { id: 'mem-k11-1', userId: MOCK_COUNCIL.chair.id, role: 'CHAIR', grantedAt: '2024-12-01T00:00:00Z', user: MOCK_COUNCIL.chair },
      { id: 'mem-k11-2', userId: MOCK_COUNCIL.authorMinh.id, role: 'AUTHOR', grantedAt: '2024-12-01T00:00:00Z', user: MOCK_COUNCIL.authorMinh },
      { id: 'mem-k11-3', userId: MOCK_COUNCIL.authorNam.id, role: 'AUTHOR', grantedAt: '2024-12-01T00:00:00Z', user: MOCK_COUNCIL.authorNam },
      { id: 'mem-k11-4', userId: MOCK_COUNCIL.reviewerHa.id, role: 'REVIEWER', grantedAt: '2024-12-01T00:00:00Z', user: MOCK_COUNCIL.reviewerHa },
    ],
    papers: [
      paper('exam-k11-fall', 'paper-k11-a', 1, 'LOCKED', 'bpv-speak-11-v3'),
      paper('exam-k11-fall', 'paper-k11-b', 2, 'LOCKED', 'bpv-speak-11-v3'),
      paper('exam-k11-fall', 'paper-k11-c', 3, 'LOCKED', 'bpv-speak-11-v3'),
    ],
  },
  {
    blueprintId: 'bp-speak-11', blueprintVersionId: 'bpv-speak-11-v3', closeAt: null,
    code: 'EXAM-2024-MID11', createdAt: '2025-01-02T00:00:00Z', deliveryMode: undefined,
    description: 'Kiểm tra giữa học kỳ II, đánh giá kỹ năng nói theo khung BP-SPEAK-11.', id: 'exam-mid11',
    kind: 'CENTRALIZED', languageId: MOCK_LANGUAGE_ID, name: 'Kiểm tra giữa kỳ II — Khối 11',
    openAt: null, schoolId: MOCK_SCHOOL_ID, status: 'DRAFT', updatedAt: '2025-01-02T00:00:00Z',
    members: [
      { id: 'mem-mid11-1', userId: MOCK_COUNCIL.chair.id, role: 'CHAIR', grantedAt: '2025-01-02T00:00:00Z', user: MOCK_COUNCIL.chair },
      { id: 'mem-mid11-2', userId: MOCK_COUNCIL.authorMinh.id, role: 'AUTHOR', grantedAt: '2025-01-02T00:00:00Z', user: MOCK_COUNCIL.authorMinh },
      { id: 'mem-mid11-3', userId: MOCK_COUNCIL.authorNam.id, role: 'AUTHOR', grantedAt: '2025-01-02T00:00:00Z', user: MOCK_COUNCIL.authorNam },
      { id: 'mem-mid11-4', userId: MOCK_COUNCIL.reviewerHa.id, role: 'REVIEWER', grantedAt: '2025-01-02T00:00:00Z', user: MOCK_COUNCIL.reviewerHa },
    ],
    papers: [
      paper('exam-mid11', 'paper-mid11-a', 1, 'APPROVED', 'bpv-speak-11-v3'),
      paper('exam-mid11', 'paper-mid11-b', 2, 'IN_REVIEW', 'bpv-speak-11-v3'),
      paper('exam-mid11', 'paper-mid11-c', 3, 'DRAFT', 'bpv-speak-11-v3'),
    ],
  },
  {
    blueprintId: 'bp-ielts-spk', blueprintVersionId: 'bpv-ielts-spk-v2', closeAt: null,
    code: 'EXAM-2024-IELTS12', createdAt: '2024-12-15T00:00:00Z', deliveryMode: 'LAB',
    description: 'Thi thử định dạng IELTS Speaking cho khối 12.', id: 'exam-ielts12',
    kind: 'CENTRALIZED', languageId: MOCK_LANGUAGE_ID, name: 'Thi thử IELTS Speaking — Khối 12',
    openAt: '2025-01-12T09:00:00Z', schoolId: MOCK_SCHOOL_ID, status: 'SCHEDULED', updatedAt: '2025-01-03T00:00:00Z',
    members: [
      { id: 'mem-ielts-1', userId: MOCK_COUNCIL.chair.id, role: 'CHAIR', grantedAt: '2024-12-15T00:00:00Z', user: MOCK_COUNCIL.chair },
      { id: 'mem-ielts-2', userId: MOCK_COUNCIL.authorMinh.id, role: 'AUTHOR', grantedAt: '2024-12-15T00:00:00Z', user: MOCK_COUNCIL.authorMinh },
    ],
    papers: [
      paper('exam-ielts12', 'paper-ielts-a', 1, 'LOCKED', 'bpv-ielts-spk-v2'),
      paper('exam-ielts12', 'paper-ielts-b', 2, 'LOCKED', 'bpv-ielts-spk-v2'),
    ],
  },
  {
    blueprintId: null, blueprintVersionId: null, closeAt: null,
    code: 'EXAM-2024-IN10', createdAt: '2025-01-04T00:00:00Z', deliveryMode: undefined,
    description: 'Đánh giá đầu vào kỹ năng nói cho học sinh khối 10.', id: 'exam-in10',
    kind: 'CENTRALIZED', languageId: MOCK_LANGUAGE_ID, name: 'Đánh giá đầu vào — Khối 10',
    openAt: null, schoolId: MOCK_SCHOOL_ID, status: 'DRAFT', updatedAt: '2025-01-04T00:00:00Z',
    members: [
      { id: 'mem-in10-1', userId: MOCK_COUNCIL.chair.id, role: 'CHAIR', grantedAt: '2025-01-04T00:00:00Z', user: MOCK_COUNCIL.chair },
    ],
    papers: [],
  },
  {
    blueprintId: 'bp-speak-12', blueprintVersionId: 'bpv-12-v5', closeAt: '2024-06-05T17:00:00Z',
    code: 'EXAM-2023-FIN12', createdAt: '2024-05-01T00:00:00Z', deliveryMode: 'LAB',
    description: 'Kỳ thi nói cuối năm học dành cho khối 12.', id: 'exam-fin12',
    kind: 'CENTRALIZED', languageId: MOCK_LANGUAGE_ID, name: 'Speaking cuối năm — Khối 12',
    openAt: '2024-06-03T08:00:00Z', schoolId: MOCK_SCHOOL_ID, status: 'RESULTS_PUBLISHED', updatedAt: '2024-06-10T00:00:00Z',
    members: [
      { id: 'mem-fin12-1', userId: MOCK_COUNCIL.chair.id, role: 'CHAIR', grantedAt: '2024-05-01T00:00:00Z', user: MOCK_COUNCIL.chair },
      { id: 'mem-fin12-2', userId: MOCK_COUNCIL.authorMinh.id, role: 'AUTHOR', grantedAt: '2024-05-01T00:00:00Z', user: MOCK_COUNCIL.authorMinh },
      { id: 'mem-fin12-3', userId: MOCK_COUNCIL.reviewerHa.id, role: 'REVIEWER', grantedAt: '2024-05-01T00:00:00Z', user: MOCK_COUNCIL.reviewerHa },
    ],
    papers: [
      paper('exam-fin12', 'paper-fin12-a', 1, 'LOCKED', 'bpv-12-v5'),
      paper('exam-fin12', 'paper-fin12-b', 2, 'LOCKED', 'bpv-12-v5'),
      paper('exam-fin12', 'paper-fin12-c', 3, 'LOCKED', 'bpv-12-v5'),
    ],
  },
]

export const mockClassTests: ExamDto[] = [
  {
    blueprintId: 'bp-speak-11', blueprintVersionId: 'bpv-speak-11-v3', closeAt: todayAt(15, 0),
    code: 'CW-2024-U4-11A', createdAt: '2025-01-06T00:00:00Z', deliveryMode: 'DEVICE',
    description: 'Kiểm tra nói theo Unit 4, thực hiện ngay trên lớp.', id: 'cw-u4-11a',
    kind: 'CLASS_TEST', languageId: MOCK_LANGUAGE_ID, name: 'Kiểm tra nói Unit 4 — Lớp 11A',
    openAt: todayAt(8, 0), schoolClassId: 'class-11a', schoolClassName: 'Lớp 11A', schoolId: MOCK_SCHOOL_ID, status: 'IN_PROGRESS',
    teacherName: 'Trần Văn Minh', updatedAt: '2025-01-06T08:00:00Z',
    members: [{ id: 'mem-cw4-1', userId: MOCK_COUNCIL.authorMinh.id, role: 'AUTHOR', grantedAt: '2025-01-06T00:00:00Z', user: MOCK_COUNCIL.authorMinh }],
    papers: [paper('cw-u4-11a', 'paper-cw4-a', 1, 'LOCKED', 'bpv-speak-11-v3')],
  },
  {
    blueprintId: 'bp-speak-11', blueprintVersionId: 'bpv-speak-11-v3', closeAt: null,
    code: 'CW-2024-U5-11A', createdAt: '2025-01-08T00:00:00Z', deliveryMode: undefined,
    description: 'Kiểm tra 15 phút theo Unit 5.', id: 'cw-u5-11a',
    kind: 'CLASS_TEST', languageId: MOCK_LANGUAGE_ID, name: 'Kiểm tra 15 phút — Unit 5 · Lớp 11A',
    openAt: null, schoolClassId: 'class-11a', schoolClassName: 'Lớp 11A', schoolId: MOCK_SCHOOL_ID, status: 'DRAFT',
    teacherName: 'Trần Văn Minh', updatedAt: '2025-01-08T00:00:00Z',
    members: [{ id: 'mem-cw5-1', userId: MOCK_COUNCIL.authorMinh.id, role: 'AUTHOR', grantedAt: '2025-01-08T00:00:00Z', user: MOCK_COUNCIL.authorMinh }],
    papers: [
      paper('cw-u5-11a', 'paper-cw5-a', 1, 'APPROVED', 'bpv-speak-11-v3'),
      paper('cw-u5-11a', 'paper-cw5-b', 2, 'APPROVED', 'bpv-speak-11-v3'),
      paper('cw-u5-11a', 'paper-cw5-c', 3, 'DRAFT', 'bpv-speak-11-v3'),
    ],
  },
  {
    blueprintId: null, blueprintVersionId: null, closeAt: null,
    code: 'CW-2024-PRON-10C', createdAt: '2025-01-09T00:00:00Z', deliveryMode: undefined,
    description: 'Bài luyện phát âm cho lớp 10C.', id: 'cw-pron-10c',
    kind: 'CLASS_TEST', languageId: MOCK_LANGUAGE_ID, name: 'Bài luyện phát âm — Lớp 10C',
    openAt: null, schoolClassId: 'class-10c', schoolClassName: 'Lớp 10C', schoolId: MOCK_SCHOOL_ID, status: 'DRAFT',
    teacherName: 'Lê Hoàng Nam', updatedAt: '2025-01-09T00:00:00Z',
    members: [{ id: 'mem-cwp-1', userId: MOCK_COUNCIL.authorNam.id, role: 'AUTHOR', grantedAt: '2025-01-09T00:00:00Z', user: MOCK_COUNCIL.authorNam }],
    papers: [],
  },
  {
    blueprintId: 'bp-speak-11', blueprintVersionId: 'bpv-speak-11-v3', closeAt: '2024-12-20T15:00:00Z',
    code: 'CW-2024-U3-11A', createdAt: '2024-12-15T00:00:00Z', deliveryMode: 'DEVICE',
    description: 'Kiểm tra từ vựng Unit 3.', id: 'cw-u3-11a',
    kind: 'CLASS_TEST', languageId: MOCK_LANGUAGE_ID, name: 'Kiểm tra từ vựng Unit 3 — Lớp 11A',
    openAt: '2024-12-18T08:00:00Z', schoolClassId: 'class-11a', schoolClassName: 'Lớp 11A', schoolId: MOCK_SCHOOL_ID, status: 'RESULTS_PUBLISHED',
    teacherName: 'Trần Văn Minh', updatedAt: '2024-12-21T00:00:00Z',
    members: [{ id: 'mem-cw3-1', userId: MOCK_COUNCIL.authorMinh.id, role: 'AUTHOR', grantedAt: '2024-12-15T00:00:00Z', user: MOCK_COUNCIL.authorMinh }],
    papers: [paper('cw-u3-11a', 'paper-cw3-a', 1, 'LOCKED', 'bpv-speak-11-v3')],
  },
  {
    blueprintId: 'bp-speak-11', blueprintVersionId: 'bpv-speak-11-v3', closeAt: todayAt(16, 0),
    code: 'CW-2025-MID-11B', createdAt: '2025-01-10T00:00:00Z', deliveryMode: 'LAB',
    description: 'Kiểm tra nói giữa kỳ, thực hiện tại phòng máy của trường.', id: 'cw-mid-11b',
    kind: 'CLASS_TEST', languageId: MOCK_LANGUAGE_ID, name: 'Kiểm tra nói giữa kỳ — Lớp 11B',
    openAt: todayAt(7, 30), schoolClassId: 'class-11b', schoolClassName: 'Lớp 11B', schoolId: MOCK_SCHOOL_ID, status: 'IN_PROGRESS',
    teacherName: 'Lê Hoàng Nam', updatedAt: '2025-01-10T08:00:00Z',
    members: [{ id: 'mem-cwmid-1', userId: MOCK_COUNCIL.authorNam.id, role: 'AUTHOR', grantedAt: '2025-01-10T00:00:00Z', user: MOCK_COUNCIL.authorNam }],
    papers: [
      paper('cw-mid-11b', 'paper-cwmid-a', 1, 'LOCKED', 'bpv-speak-11-v3'),
      paper('cw-mid-11b', 'paper-cwmid-b', 2, 'LOCKED', 'bpv-speak-11-v3'),
    ],
  },
  {
    blueprintId: 'bp-speak-11', blueprintVersionId: 'bpv-speak-11-v3', closeAt: null,
    code: 'CW-2025-U6-11C', createdAt: '2025-01-11T00:00:00Z', deliveryMode: 'LAB',
    description: 'Kiểm tra nói Unit 6, xếp phòng máy — đang chờ xếp nốt học sinh còn lại.', id: 'cw-u6-11c',
    kind: 'CLASS_TEST', languageId: MOCK_LANGUAGE_ID, name: 'Kiểm tra nói Unit 6 — Lớp 11C',
    openAt: null, schoolClassId: 'class-11c', schoolClassName: 'Lớp 11C', schoolId: MOCK_SCHOOL_ID, status: 'SCHEDULED',
    teacherName: 'Lê Hoàng Nam', updatedAt: '2025-01-11T00:00:00Z',
    members: [{ id: 'mem-cwu6-1', userId: MOCK_COUNCIL.authorNam.id, role: 'AUTHOR', grantedAt: '2025-01-11T00:00:00Z', user: MOCK_COUNCIL.authorNam }],
    papers: [paper('cw-u6-11c', 'paper-cwu6-a', 1, 'APPROVED', 'bpv-speak-11-v3')],
  },
]

function todayAt(hour: number, minute: number) {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export const mockRooms: ExamRoomDto[] = [
  { id: 'room-p201-1', capacity: 25, code: 'P.201', occupied: 23, scheduleId: 'sched-k11-1' },
  { id: 'room-p202-1', capacity: 25, code: 'P.202', occupied: 22, scheduleId: 'sched-k11-1' },
  { id: 'room-p203-1', capacity: 25, code: 'P.203', occupied: 24, scheduleId: 'sched-k11-2' },
  { id: 'room-p201-2', capacity: 25, code: 'P.201', occupied: 20, scheduleId: 'sched-k11-3' },
  { id: 'room-p204-1', capacity: 25, code: 'P.204', occupied: 18, scheduleId: 'sched-k11-3' },
  { id: 'room-p202-2', capacity: 25, code: 'P.202', occupied: 21, scheduleId: 'sched-k11-4' },
  { id: 'room-p301-1', capacity: 25, code: 'P.301', occupied: 24, scheduleId: 'sched-ielts-1' },
  { id: 'room-lab1-1', capacity: 20, code: 'Phòng máy 1', occupied: 18, scheduleId: 'sched-cwmid-1' },
  { id: 'room-lab1-2', capacity: 20, code: 'Phòng máy 2', occupied: 14, scheduleId: 'sched-cwmid-2' },
  { id: 'room-lab2-1', capacity: 20, code: 'Phòng máy 3', occupied: 10, scheduleId: 'sched-cwu6-1' },
]

const proctorsCa1: ExamProctorDto[] = [
  { id: 'proc-1', scheduleId: 'sched-k11-1', teacherId: MOCK_COUNCIL.authorMinh.id, teacherName: MOCK_COUNCIL.authorMinh.fullName },
  { id: 'proc-2', scheduleId: 'sched-k11-1', teacherId: MOCK_COUNCIL.authorNam.id, teacherName: MOCK_COUNCIL.authorNam.fullName },
  { id: 'proc-3', scheduleId: 'sched-k11-1', teacherId: MOCK_COUNCIL.reviewerHa.id, teacherName: MOCK_COUNCIL.reviewerHa.fullName },
  { id: 'proc-4', scheduleId: 'sched-k11-1', teacherId: MOCK_COUNCIL.chair.id, teacherName: MOCK_COUNCIL.chair.fullName },
]

export const mockSchedules: ExamScheduleDto[] = [
  {
    candidateCount: 45, endDate: '2025-01-12T09:30:00Z', examId: 'exam-k11-fall', id: 'sched-k11-1',
    label: 'Ca 1 · Sáng', proctors: proctorsCa1, requiredProctorCount: 4,
    roomIds: ['room-p201-1', 'room-p202-1'], startDate: '2025-01-12T08:00:00Z', status: 'PUBLISHED',
  },
  {
    candidateCount: 24, endDate: '2025-01-12T11:30:00Z', examId: 'exam-k11-fall', id: 'sched-k11-2',
    label: 'Ca 2 · Sáng muộn',
    proctors: [
      { id: 'proc-5', scheduleId: 'sched-k11-2', teacherId: MOCK_COUNCIL.authorMinh.id, teacherName: MOCK_COUNCIL.authorMinh.fullName },
      { id: 'proc-6', scheduleId: 'sched-k11-2', teacherId: MOCK_COUNCIL.authorNam.id, teacherName: MOCK_COUNCIL.authorNam.fullName },
    ],
    requiredProctorCount: 2, roomIds: ['room-p203-1'], startDate: '2025-01-12T10:00:00Z', status: 'PUBLISHED',
  },
  {
    candidateCount: 38, endDate: '2025-01-12T15:30:00Z', examId: 'exam-k11-fall', id: 'sched-k11-3',
    label: 'Ca 3 · Chiều',
    proctors: [
      { id: 'proc-7', scheduleId: 'sched-k11-3', teacherId: MOCK_COUNCIL.chair.id, teacherName: MOCK_COUNCIL.chair.fullName },
      { id: 'proc-8', scheduleId: 'sched-k11-3', teacherId: MOCK_COUNCIL.reviewerHa.id, teacherName: MOCK_COUNCIL.reviewerHa.fullName },
      { id: 'proc-9', scheduleId: 'sched-k11-3', teacherId: MOCK_COUNCIL.authorNam.id, teacherName: MOCK_COUNCIL.authorNam.fullName },
    ],
    requiredProctorCount: 4, roomIds: ['room-p201-2', 'room-p204-1'], startDate: '2025-01-12T14:00:00Z', status: 'PUBLISHED',
  },
  {
    candidateCount: 21, endDate: '2025-01-13T17:30:00Z', examId: 'exam-k11-fall', id: 'sched-k11-4',
    label: 'Ca 4 · Chiều muộn',
    proctors: [
      { id: 'proc-10', scheduleId: 'sched-k11-4', teacherId: MOCK_COUNCIL.authorMinh.id, teacherName: MOCK_COUNCIL.authorMinh.fullName },
      { id: 'proc-11', scheduleId: 'sched-k11-4', teacherId: MOCK_COUNCIL.authorNam.id, teacherName: MOCK_COUNCIL.authorNam.fullName },
    ],
    requiredProctorCount: 2, roomIds: ['room-p202-2'], startDate: '2025-01-13T16:00:00Z', status: 'PUBLISHED',
  },
  {
    candidateCount: 24, endDate: '2025-01-12T10:30:00Z', examId: 'exam-ielts12', id: 'sched-ielts-1',
    label: 'Ca duy nhất',
    proctors: [
      { id: 'proc-12', scheduleId: 'sched-ielts-1', teacherId: MOCK_COUNCIL.chair.id, teacherName: MOCK_COUNCIL.chair.fullName },
      { id: 'proc-13', scheduleId: 'sched-ielts-1', teacherId: MOCK_COUNCIL.authorMinh.id, teacherName: MOCK_COUNCIL.authorMinh.fullName },
    ],
    requiredProctorCount: 2, roomIds: ['room-p301-1'], startDate: '2025-01-12T09:00:00Z', status: 'PUBLISHED',
  },
  {
    candidateCount: 18, endDate: todayAt(9, 30), examId: 'cw-mid-11b', id: 'sched-cwmid-1',
    label: 'Ca 1 · Sáng',
    proctors: [{ id: 'proc-cwmid-1', scheduleId: 'sched-cwmid-1', teacherId: MOCK_COUNCIL.authorNam.id, teacherName: MOCK_COUNCIL.authorNam.fullName }],
    requiredProctorCount: 1, roomIds: ['room-lab1-1'], startDate: todayAt(7, 30), status: 'PUBLISHED',
  },
  {
    candidateCount: 14, endDate: todayAt(15, 30), examId: 'cw-mid-11b', id: 'sched-cwmid-2',
    label: 'Ca 2 · Chiều',
    proctors: [{ id: 'proc-cwmid-2', scheduleId: 'sched-cwmid-2', teacherId: MOCK_COUNCIL.authorMinh.id, teacherName: MOCK_COUNCIL.authorMinh.fullName }],
    requiredProctorCount: 1, roomIds: ['room-lab1-2'], startDate: todayAt(13, 30), status: 'PUBLISHED',
  },
  {
    candidateCount: 15, endDate: '2025-01-14T10:30:00Z', examId: 'cw-u6-11c', id: 'sched-cwu6-1',
    label: 'Ca duy nhất', proctors: [], requiredProctorCount: 1,
    roomIds: ['room-lab2-1'], startDate: '2025-01-14T09:00:00Z', status: 'DRAFT',
  },
]

export const mockCandidates: ExamCandidateDto[] = [
  ...makeCandidates('exam-k11-fall', 'Lớp 11A', 'class-11a', 15, 110001, 'ASSIGNED', 'sched-k11-1', 'room-p201-1'),
  ...makeCandidates('exam-k11-fall', 'Lớp 11B', 'class-11b', 15, 110016, 'ASSIGNED', 'sched-k11-1', 'room-p202-1'),
  ...makeCandidates('exam-k11-fall', 'Lớp 11C', 'class-11c', 10, 110031, 'ASSIGNED', 'sched-k11-2', 'room-p203-1'),
  ...makeCandidates('exam-ielts12', 'Lớp 12A', 'class-12a', 24, 120001, 'ASSIGNED', 'sched-ielts-1', 'room-p301-1'),
  ...makeCandidates('exam-fin12', 'Lớp 12A', 'class-12a', 128, 130001, 'COMPLETED'),
  ...makeCandidates('cw-u4-11a', 'Lớp 11A', 'class-11a', 32, 210001, 'ASSIGNED'),
  ...makeCandidates('cw-u3-11a', 'Lớp 11A', 'class-11a', 32, 220001, 'COMPLETED'),
  ...makeCandidates('cw-mid-11b', 'Lớp 11B', 'class-11b', 18, 310001, 'ASSIGNED', 'sched-cwmid-1', 'room-lab1-1'),
  ...makeCandidates('cw-mid-11b', 'Lớp 11B', 'class-11b', 14, 310019, 'ASSIGNED', 'sched-cwmid-2', 'room-lab1-2'),
  ...makeCandidates('cw-u6-11c', 'Lớp 11C', 'class-11c', 10, 320001, 'ASSIGNED', 'sched-cwu6-1', 'room-lab2-1'),
  ...makeCandidates('cw-u6-11c', 'Lớp 11C', 'class-11c', 5, 320011, 'ASSIGNED', 'sched-cwu6-1'),
]
