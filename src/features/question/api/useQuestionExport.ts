import { apiClient } from '@/shared/api'
import { downloadBlob, extractFileName } from '@/shared/lib/downloadFile'
import type { QuestionQueryFilters } from './useQuestionsQuery'

export async function exportQuestions(filters: QuestionQueryFilters) {
  const response = await apiClient.get('/v1/questions/export', {
    params: {
      keyword: filters.keyword || undefined,
      questionBankId: filters.questionBankId || undefined,
      questionTopicId: filters.questionTopicId || undefined,
      scope: filters.scope || undefined,
      sharing: filters.sharing || undefined,
      status: filters.status || undefined,
      topicName: filters.topicName || undefined,
      type: filters.type || undefined,
    },
    responseType: 'blob',
  })

  downloadBlob(
    response.data as Blob,
    extractFileName(response.headers['content-disposition'], 'questions-export.xlsx'),
  )
}

export async function downloadQuestionImportTemplate() {
  const response = await apiClient.get('/v1/questions/import/template', {
    responseType: 'blob',
  })

  downloadBlob(
    response.data as Blob,
    extractFileName(response.headers['content-disposition'], 'questions-import-template.xlsx'),
  )
}
