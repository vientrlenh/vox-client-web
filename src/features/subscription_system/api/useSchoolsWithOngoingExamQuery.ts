import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export const schoolsWithOngoingExamQueryKeys = {
  all: ['schools-with-ongoing-exam'] as const,
}

const SCHOOLS_WITH_ONGOING_EXAM_QUERY = `
  query SchoolsWithOngoingExam {
    schoolsWithOngoingExam
  }
`

// Ca thi mở/đóng theo lịch nên danh sách này cũ đi theo đồng hồ, không theo thao tác của admin.
// Một phút là đủ tươi để nút không chặn nhầm quá lâu sau khi ca thi kết thúc, mà vẫn không bắt màn
// hình gọi lại liên tục.
const STALE_TIME_MS = 60_000

async function fetchSchoolsWithOngoingExam(): Promise<string[]> {
  const data = await graphQLRequest<{ schoolsWithOngoingExam: string[] | null }>(
    SCHOOLS_WITH_ONGOING_EXAM_QUERY,
  )

  return data.schoolsWithOngoingExam ?? []
}

/**
 * Id các trường đang có ca thi diễn ra — dùng để CHẶN TRƯỚC nút đình chỉ.
 *
 * <p>Không phải nguồn sự thật: quyết định cuối vẫn ở ForceSuspendSubscriptionUseCase, nó kiểm lại
 * dưới khóa ngay lúc ghi. Danh sách này chỉ để admin khỏi bấm vào một nút chắc chắn hỏng — nên khi
 * query lỗi, ta trả về tập RỖNG chứ không chặn hết: chặn nhầm cả những trường đang yên ổn thì tệ
 * hơn là để một lần bấm rơi vào thông báo lỗi của BE.
 */
export function useSchoolsWithOngoingExamQuery() {
  return useQuery({
    queryFn: fetchSchoolsWithOngoingExam,
    queryKey: schoolsWithOngoingExamQueryKeys.all,
    staleTime: STALE_TIME_MS,
  })
}
