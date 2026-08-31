import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSelector } from '@/app/store/hooks'
import { useQuestionBanksQuery } from '@/features/question-bank/api/useQuestionBanksQuery'
import { SimpleImportWizard } from '../components/SimpleImportWizard'
import {
  acceptQuestionBankImport,
  acceptQuestionTopicImport,
  previewQuestionBankImport,
  previewQuestionTopicImport,
} from '../api/useQuestionScopeImportMutations'

type ScopeImportPageProps = {
  basePath: string
}

/**
 * Nhập ngân hàng câu hỏi.
 *
 * <p>Không có ô chọn trường/phạm vi: backend tự suy từ vai trò người đăng nhập — quản trị hệ
 * thống nhập ngân hàng SYSTEM, quản trị trường nhập ngân hàng của chính trường mình. Bày ô đó ra
 * đây chỉ tạo cảm giác chọn được trong khi backend bỏ qua.
 */
export function QuestionBankImportPage({ basePath }: ScopeImportPageProps) {
  const queryClient = useQueryClient()

  return (
    <SimpleImportWizard
      basePath={basePath}
      description="Tải file danh sách ngân hàng câu hỏi. Hệ thống tự nhận diện cột theo tên tiêu đề. Ngân hàng trùng mã sẽ được cập nhật thay vì tạo mới; trạng thái của ngân hàng đang có không bị đổi."
      onAccept={async (sessionId, confirmedMapping) => {
        const result = await acceptQuestionBankImport({ confirmedMapping, sessionId })
        await queryClient.invalidateQueries({ queryKey: ['question-banks'] })
        return result
      }}
      onPreview={previewQuestionBankImport}
      returnLabel="Quay lại danh sách ngân hàng"
      returnTo={`${basePath}/question-banks`}
      title="Nhập ngân hàng câu hỏi từ Excel"
    />
  )
}

/**
 * Nhập chủ đề vào MỘT ngân hàng. Ngân hàng chọn ở đây rồi được ghim vào phiên import, nên file
 * chỉ cần mã/tên/mô tả chủ đề — không dòng nào lạc được sang ngân hàng khác.
 */
export function QuestionTopicImportPage({ basePath }: ScopeImportPageProps) {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const user = useAppSelector((state) => state.auth.user)
  const isSystemAdmin = user?.roles?.includes('SYSTEM_ADMIN') ?? false

  const [questionBankId, setQuestionBankId] = useState(
    searchParams.get('questionBankId') ?? '',
  )

  // Trang 1, KHÔNG phải 0: backend đếm trang từ 1 và tự trừ đi 1 trước khi dựng PageRequest.
  // Truyền 0 là ra PageRequest.of(-1, size) và Spring Data ném lỗi -- dropdown rỗng lặng lẽ.
  const questionBanksQuery = useQuestionBanksQuery('teacher', 1, 100, true, {
    ownerType: isSystemAdmin ? 'SYSTEM' : 'SCHOOL',
  })

  return (
    <SimpleImportWizard
      basePath={basePath}
      description="Chọn ngân hàng rồi tải file danh sách chủ đề. Chủ đề trùng mã trong cùng ngân hàng sẽ được cập nhật thay vì tạo mới; chủ đề mới tạo ra ở trạng thái nháp."
      isScopeReady={Boolean(questionBankId)}
      onAccept={async (sessionId, confirmedMapping) => {
        const result = await acceptQuestionTopicImport({ confirmedMapping, sessionId })
        await queryClient.invalidateQueries({ queryKey: ['question-topics'] })
        return result
      }}
      onPreview={(file) => previewQuestionTopicImport({ file, questionBankId })}
      returnLabel="Quay lại ngân hàng câu hỏi"
      returnTo={
        questionBankId
          ? `${basePath}/question-banks/${questionBankId}`
          : `${basePath}/question-banks`
      }
      scopeHint="Phải chọn ngân hàng câu hỏi trước."
      scopeSelector={
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Ngân hàng câu hỏi
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
            onChange={(event) => setQuestionBankId(event.target.value)}
            value={questionBankId}
          >
            <option value="">Chọn ngân hàng</option>
            {questionBanksQuery.data?.content.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name} ({bank.code})
              </option>
            ))}
          </select>
        </label>
      }
      title="Nhập chủ đề câu hỏi từ Excel"
    />
  )
}

export function SchoolAdminQuestionBankImportPage() {
  return <QuestionBankImportPage basePath="/school-admin" />
}

export function SystemAdminQuestionBankImportPage() {
  return <QuestionBankImportPage basePath="/system-admin" />
}

export function SchoolAdminQuestionTopicImportPage() {
  return <QuestionTopicImportPage basePath="/school-admin" />
}

export function SystemAdminQuestionTopicImportPage() {
  return <QuestionTopicImportPage basePath="/system-admin" />
}
