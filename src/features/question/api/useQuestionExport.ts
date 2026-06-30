import { apiClient } from '@/shared/api'
import type { QuestionQueryFilters } from './useQuestionsQuery'

function extractFileName(contentDisposition: unknown, fallback: string) {
  if (typeof contentDisposition !== 'string') {
    return fallback
  }

  const match = /filename="?([^"]+)"?/.exec(contentDisposition)
  return match?.[1] ?? fallback
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

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
