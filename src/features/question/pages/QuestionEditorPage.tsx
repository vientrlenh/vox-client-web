import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useSchoolUsersForRequesterQuery } from '@/features/classes/api/useSchoolUsersForRequesterQuery'
import { useQuestionBanksQuery } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionTopicsQuery } from '@/features/question-topic/api/useQuestionTopicsQuery'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { useQuestionQuery } from '../api/useQuestionQuery'
import {
  useCreateQuestionCollaboratorMutation,
  useCreateQuestionMutation,
  useDeleteQuestionCollaboratorMutation,
  useDeleteQuestionMutation,
  useUpdateQuestionCollaboratorMutation,
  useUpdateQuestionMutation,
} from '../api/useQuestionMutations'
import { questionQueryKeys } from '../api/useQuestionsQuery'
import { useReviewQuestionMutation } from '../api/useQuestionReviewMutation'
import {
  useCreateQuestionAssetMutation,
  useDeleteQuestionAssetMutation,
  useRegenerateQuestionAssetAnalysisMutation,
  useUploadQuestionAssetMutation,
  useUpdateQuestionAssetMutation,
  useUpsertQuestionEvaluationGuideMutation,
} from '../api/useQuestionSectionMutations'
import {
  canCreateQuestion,
  canDeleteQuestion,
  canEditQuestion,
  canEditQuestionAssetsOrGuide,
  canManageQuestionSharing,
  getQuestionActorRole,
  getQuestionReviewActions,
  resolveTeacherQuestionContext,
} from '../permissions'
import type {
  CreateQuestionRequest,
  QuestionAssetDto,
  QuestionCollaboratorPermission,
  QuestionDto,
  QuestionAssetType,
  QuestionSharing,
  QuestionType,
  UpdateQuestionStatusRequest,
} from '../types'
import {
  formatNullableText,
  formatQuestionDate,
  getQuestionCollaboratorPermissionDisplay,
  getQuestionSharingDisplay,
} from '../types'

type TabKey = 'assets' | 'content' | 'guide' | 'sharing' | 'workflow'

// Tạm ẩn tab "Tài nguyên" khỏi UI (chưa cho người dùng tương tác) — logic/mutations giữ nguyên, chỉ bật lại bằng cách đổi hằng số này.
const ASSETS_TAB_ENABLED = true

// Khớp đúng với việc backend hiện chỉ hỗ trợ IMAGE/VIDEO cho asset (AUDIO/TEXT_PASSAGE để sau)
// và chặn content type ở GetQuestionAssetUploadUrlUseCase (Java) — giữ danh sách hẹp, cụ thể ở
// đây thay vì "image/*"/"video/*" chung chung để tránh nhận nhầm định dạng ít dùng/khó phát ở WPF.
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png'])
const ALLOWED_VIDEO_MIME_TYPES = new Set(['video/mp4'])
const ASSET_FILE_INPUT_ACCEPT = '.jpg,.jpeg,.png,.mp4,image/jpeg,image/png,video/mp4'
const ASSET_ANALYSIS_POLL_INTERVAL_MS = 3000
const ASSET_ANALYSIS_POLL_TIMEOUT_MS = 60000

type EditorFormState = {
  instructionText: string
  maxResponseSeconds: string
  minResponseSeconds: string
  preparationText: string
  preparationTimeSeconds: string
  promptText: string
  questionText: string
  sharing: QuestionSharing
  type: QuestionType
}

type AssetFormState = {
  altText: string
  description: string
  durationSeconds: string
  id: string | null
  order: string
  title: string
  transcript: string
  type: QuestionAssetType
  url: string
}

type EvaluationGuideFormState = {
  acceptableResponses: string
  commonMistakes: string
  expectedContent: string
  keyPoints: string
  offTopicExamples: string
  scoringHints: string
}

const QUESTION_TYPE_OPTIONS: Array<{ label: string; value: QuestionType }> = [
  { label: 'Đọc to', value: 'READ_ALOUD' },
  { label: 'Trả lời ngắn', value: 'SHORT_ANSWER' },
  { label: 'Trả lời dài', value: 'LONG_ANSWER' },
  { label: 'Ý kiến', value: 'OPINION' },
  { label: 'Mô tả', value: 'DESCRIPTION' },
]

const QUESTION_SHARING_OPTIONS: Array<{ label: string; value: QuestionSharing }> = [
  { label: 'Riêng tư', value: 'PRIVATE' },
  { label: 'Chia sẻ trong trường', value: 'SCHOOL_SHARED' },
]

const QUESTION_ASSET_TYPE_OPTIONS: Array<{ label: string; value: QuestionAssetType }> = [
  { label: 'Image', value: 'IMAGE' },
  { label: 'Video', value: 'VIDEO' },
  { label: 'Doan van (Text passage)', value: 'TEXT_PASSAGE' },
]

const LEGACY_QUESTION_ASSET_TYPE_LABELS: Partial<Record<QuestionAssetType, string>> = {
  AUDIO: 'Audio (legacy)',
}

function createInitialForm() {
  return {
    instructionText: '',
    maxResponseSeconds: '',
    minResponseSeconds: '',
    preparationText: '',
    preparationTimeSeconds: '',
    promptText: '',
    questionText: '',
    sharing: 'PRIVATE' as QuestionSharing,
    type: 'READ_ALOUD' as QuestionType,
  }
}

function createAssetForm(): AssetFormState {
  return {
    altText: '',
    description: '',
    durationSeconds: '',
    id: null,
    order: '1',
    title: '',
    transcript: '',
    type: 'IMAGE',
    url: '',
  }
}

function shouldShowTranscriptField(type: QuestionAssetType) {
  return type === 'VIDEO' || type === 'AUDIO' || type === 'TEXT_PASSAGE'
}

function isTextPassage(type: QuestionAssetType) {
  return type === 'TEXT_PASSAGE'
}

function needsTranscriptAnalysis(asset: Pick<AssetFormState, 'type' | 'transcript'>) {
  return (asset.type === 'VIDEO' || asset.type === 'AUDIO') && !asset.transcript.trim()
}

function needsDescriptionAnalysis(asset: Pick<AssetFormState, 'description'>) {
  return !asset.description.trim()
}

function hasPendingAnalysis(
  asset: Pick<AssetFormState, 'id' | 'type' | 'transcript' | 'description'>,
) {
  if (!asset.id) {
    return false
  }

  return needsTranscriptAnalysis(asset) || needsDescriptionAnalysis(asset)
}

function createAssetFormFromDto(asset: QuestionAssetDto): AssetFormState {
  return {
    altText: asset.altText ?? '',
    description: asset.description ?? '',
    durationSeconds: asset.durationSeconds == null ? '' : String(asset.durationSeconds),
    id: asset.id,
    order: String(asset.order),
    title: asset.title ?? '',
    transcript: asset.transcript ?? '',
    type: asset.type,
    url: asset.url ?? '',
  }
}

function mergeAssetForms(
  current: AssetFormState[],
  serverAssets: QuestionAssetDto[] | null | undefined,
) {
  if (!serverAssets?.length) {
    return [createAssetForm()]
  }

  return serverAssets.map((asset, index) => {
    const incoming = createAssetFormFromDto(asset)
    const existing = current[index]

    if (!existing) {
      return incoming
    }

    return {
      altText: existing.altText || incoming.altText,
      description: existing.description || incoming.description,
      durationSeconds: existing.durationSeconds || incoming.durationSeconds,
      id: incoming.id,
      order: existing.order || incoming.order,
      title: existing.title || incoming.title,
      transcript: existing.transcript || incoming.transcript,
      type: existing.url ? existing.type : incoming.type,
      url: existing.url || incoming.url,
    }
  })
}

function resetAssetFieldsForType(type: QuestionAssetType): Partial<AssetFormState> {
  return {
    description: '',
    transcript: '',
    type,
    url: '',
  }
}

function getAssetTypeOptions(currentType: QuestionAssetType) {
  const allowedValues = new Set(QUESTION_ASSET_TYPE_OPTIONS.map((option) => option.value))
  if (allowedValues.has(currentType)) {
    return QUESTION_ASSET_TYPE_OPTIONS
  }

  return [
    {
      label: LEGACY_QUESTION_ASSET_TYPE_LABELS[currentType] ?? currentType,
      value: currentType,
    },
    ...QUESTION_ASSET_TYPE_OPTIONS,
  ]
}

function createGuideForm(): EvaluationGuideFormState {
  return {
    acceptableResponses: '',
    commonMistakes: '',
    expectedContent: '',
    keyPoints: '',
    offTopicExamples: '',
    scoringHints: '',
  }
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Không thể lưu câu hỏi. Vui lòng thử lại.'
}

function parsePositiveInt(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

type QuestionEditorPageProps = {
  basePath: string
  mode: 'create' | 'edit'
}

function QuestionEditorPage({ basePath, mode }: QuestionEditorPageProps) {
  const user = useAppSelector((state) => state.auth.user)
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const questionId = params.questionId ?? null
  const teacherView =
    ((location.state as { fromView?: 'all' | 'my' | 'review' } | null)?.fromView ??
      null)
  const locationSuccessMessage =
    (location.state as { successMessage?: string } | null)?.successMessage ?? null

  const [analysisPollingUntil, setAnalysisPollingUntil] = useState<number | null>(null)
  const createMutation = useCreateQuestionMutation()
  const updateMutation = useUpdateQuestionMutation()
  const deleteMutation = useDeleteQuestionMutation()
  const reviewMutation = useReviewQuestionMutation()
  const createAssetMutation = useCreateQuestionAssetMutation()
  const updateAssetMutation = useUpdateQuestionAssetMutation()
  const deleteAssetMutation = useDeleteQuestionAssetMutation()
  const regenerateAssetAnalysisMutation = useRegenerateQuestionAssetAnalysisMutation()
  const uploadAssetMutation = useUploadQuestionAssetMutation()
  const upsertGuideMutation = useUpsertQuestionEvaluationGuideMutation()
  const createCollaboratorMutation = useCreateQuestionCollaboratorMutation()
  const updateCollaboratorMutation = useUpdateQuestionCollaboratorMutation()
  const deleteCollaboratorMutation = useDeleteQuestionCollaboratorMutation()

  const [activeTab, setActiveTab] = useState<TabKey>('content')
  const [selectedBankId, setSelectedBankId] = useState(searchParams.get('bankId') ?? '')
  const [selectedTopicId, setSelectedTopicId] = useState(searchParams.get('topicId') ?? '')
  const [form, setForm] = useState<EditorFormState>(createInitialForm())
  const [assetForm, setAssetForm] = useState<AssetFormState[]>([createAssetForm()])
  const [guideForm, setGuideForm] = useState<EvaluationGuideFormState>(createGuideForm())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(locationSuccessMessage)
  const [uploadingAssetIndex, setUploadingAssetIndex] = useState<number | null>(null)
  const [regeneratingAssetId, setRegeneratingAssetId] = useState<string | null>(null)
  const [workflowAction, setWorkflowAction] = useState('')
  const [workflowNote, setWorkflowNote] = useState('')
  const [teacherSearch, setTeacherSearch] = useState('')
  const [newUserId, setNewUserId] = useState('')
  const [newPermission, setNewPermission] =
    useState<QuestionCollaboratorPermission>('READ_ONLY')
  const { confirm, dialog } = useConfirmationDialog()
  const questionQuery = useQuestionQuery(mode === 'edit' ? questionId : null, {
    refetchInterval:
      mode === 'edit' &&
      questionId &&
      analysisPollingUntil != null &&
      analysisPollingUntil > Date.now() &&
      assetForm.some((asset) => hasPendingAnalysis(asset))
        ? ASSET_ANALYSIS_POLL_INTERVAL_MS
        : false,
  })

  const actorRole = getQuestionActorRole(user?.roles)
  const teacherContext = resolveTeacherQuestionContext(
    teacherView,
    questionQuery.data,
    user?.userId,
    user?.email,
  )
  const canCreate = canCreateQuestion(actorRole)
  const canEdit = canEditQuestion(
    questionQuery.data,
    actorRole,
    teacherContext,
    user?.userId,
  )
  const canDelete = canDeleteQuestion(questionQuery.data, actorRole, teacherContext)
  const canManageAssetOrGuide = canEditQuestionAssetsOrGuide(
    questionQuery.data,
    actorRole,
    teacherContext,
    user?.userId,
  )
  const canManageSharing = canManageQuestionSharing(
    questionQuery.data,
    actorRole,
    user?.userId,
    user?.email,
  )
  const workflowActions = getQuestionReviewActions(
    questionQuery.data,
    actorRole,
    teacherContext,
    user?.userId,
    user?.email,
  )

  const questionBanksQuery = useQuestionBanksQuery(
    'teacher',
    0,
    50,
    mode === 'create',
    {
      ownerType: actorRole === 'SYSTEM_ADMIN' ? 'SYSTEM' : undefined,
      status: 'PUBLISHED',
    },
  )

  const questionTopicsQuery = useQuestionTopicsQuery(
    'teacher',
    selectedBankId,
    0,
    50,
    mode === 'create' && Boolean(selectedBankId),
    { status: 'PUBLISHED' },
  )
  const schoolUsersQuery = useSchoolUsersForRequesterQuery(1, 8, {
    schoolId: user?.schoolId ?? '',
    search: teacherSearch,
  })

  useEffect(() => {
    if (!locationSuccessMessage) {
      return
    }

    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: teacherView ? { fromView: teacherView } : null,
    })
  }, [location.pathname, location.search, locationSuccessMessage, navigate, teacherView])

  useEffect(() => {
    if (!questionQuery.data) {
      return
    }

    // question data arrives asynchronously after mount, so the editable draft state
    // can only be seeded here once the query resolves
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedBankId(questionQuery.data.questionBankId)
    setSelectedTopicId(questionQuery.data.questionTopicId)
    setForm({
      instructionText: questionQuery.data.instructionText ?? '',
      maxResponseSeconds: String(questionQuery.data.maxResponseSeconds ?? ''),
      minResponseSeconds: String(questionQuery.data.minResponseSeconds ?? ''),
      preparationText: questionQuery.data.preparationText ?? '',
      preparationTimeSeconds: String(questionQuery.data.preparationTimeSeconds ?? ''),
      promptText: questionQuery.data.promptText ?? '',
      questionText: questionQuery.data.questionText ?? '',
      sharing: questionQuery.data.sharing,
      type: questionQuery.data.type,
    })
    setAssetForm((current) => mergeAssetForms(current, questionQuery.data.assets))
    setGuideForm({
      acceptableResponses:
        questionQuery.data.evaluationGuide?.acceptableResponses ?? '',
      commonMistakes: questionQuery.data.evaluationGuide?.commonMistakes ?? '',
      expectedContent: questionQuery.data.evaluationGuide?.expectedContent ?? '',
      keyPoints: questionQuery.data.evaluationGuide?.keyPoints ?? '',
      offTopicExamples: questionQuery.data.evaluationGuide?.offTopicExamples ?? '',
      scoringHints: questionQuery.data.evaluationGuide?.scoringHints ?? '',
    })
    if (questionQuery.data.assets?.some((asset) => hasPendingAnalysis(createAssetFormFromDto(asset)))) {
      setAnalysisPollingUntil((current) =>
        current && current > Date.now()
          ? current
          : Date.now() + ASSET_ANALYSIS_POLL_TIMEOUT_MS,
      )
    }
  }, [questionQuery.data])

  useEffect(() => {
    if (!assetForm.some((asset) => hasPendingAnalysis(asset))) {
      setAnalysisPollingUntil(null)
    }
  }, [assetForm])

  async function refreshQuestionData(targetQuestionId?: string | null) {
    await queryClient.invalidateQueries({ queryKey: questionQueryKeys.all })
    if (targetQuestionId) {
      await queryClient.invalidateQueries({
        queryKey: questionQueryKeys.question(targetQuestionId),
      })
    }
  }

  function buildAssetPayload(asset: AssetFormState, index: number, urlOverride?: string | null) {
    return {
      altText: asset.altText.trim() || null,
      description: asset.description.trim() || null,
      durationSeconds: asset.durationSeconds.trim() ? Number(asset.durationSeconds) : null,
      order: asset.order.trim() ? Number(asset.order) : index + 1,
      title: asset.title.trim() || null,
      transcript: shouldShowTranscriptField(asset.type)
        ? asset.transcript.trim() || null
        : null,
      type: asset.type,
      url: isTextPassage(asset.type) ? null : (urlOverride ?? (asset.url.trim() || null)),
    }
  }

  function startAnalysisPolling() {
    setAnalysisPollingUntil(Date.now() + ASSET_ANALYSIS_POLL_TIMEOUT_MS)
  }

  if (mode === 'create' && !canCreate) {
    return (
      <section className="grid gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">
        <span>Vai trò hiện tại không được tạo câu hỏi.</span>
      </section>
    )
  }

  if (mode === 'edit' && questionQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Đang tải câu hỏi...
      </section>
    )
  }

  async function handleContentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const preparationTimeSeconds = parsePositiveInt(form.preparationTimeSeconds)
    const minResponseSeconds = parsePositiveInt(form.minResponseSeconds)
    const maxResponseSeconds = parsePositiveInt(form.maxResponseSeconds)

    if (!form.questionText.trim()) {
      setErrorMessage('Nội dung câu hỏi không được để trống.')
      return
    }

    if (
      preparationTimeSeconds == null ||
      minResponseSeconds == null ||
      maxResponseSeconds == null
    ) {
      setErrorMessage('Các trường thời gian phải là số nguyên không âm.')
      return
    }

    try {
      if (mode === 'create') {
        if (!selectedBankId || !selectedTopicId) {
          setErrorMessage('Cần chọn ngân hàng và chủ đề trước khi tạo.')
          return
        }

        if (!(await confirm({ message: 'Bạn có chắc muốn tạo câu hỏi này không?' }))) {
          return
        }

        const payload: CreateQuestionRequest = {
          instructionText: form.instructionText.trim() || null,
          maxResponseSeconds,
          minResponseSeconds,
          preparationText: form.preparationText.trim() || null,
          preparationTimeSeconds,
          promptText: form.promptText.trim() || null,
          questionBankId: selectedBankId,
          questionText: form.questionText.trim(),
          questionTopicId: selectedTopicId,
          sharing: form.sharing,
          type: form.type,
        }

        const result = await createMutation.mutateAsync(payload)
        await refreshQuestionData(result.questionId)
        navigate(`${basePath}/questions/${result.questionId}/edit`, {
          replace: true,
          state: { fromView: teacherView, successMessage: result.message },
        })
        return
      }

      if (!questionId || !canEdit) {
        setErrorMessage('Bạn không có quyền cập nhật câu hỏi này.')
        return
      }

      if (!(await confirm({ message: 'Bạn có chắc muốn lưu nội dung câu hỏi này không?' }))) {
        return
      }

      const result = await updateMutation.mutateAsync({
        id: questionId,
        payload: {
          instructionText: form.instructionText.trim() || null,
          maxResponseSeconds,
          minResponseSeconds,
          preparationText: form.preparationText.trim() || null,
          preparationTimeSeconds,
          promptText: form.promptText.trim() || null,
          questionText: form.questionText.trim(),
          sharing: form.sharing,
          type: form.type,
        },
      })

      await refreshQuestionData(result.questionId)
      if (result.clonedAsNew && result.questionId !== questionId) {
        navigate(`${basePath}/questions/${result.questionId}/edit`, {
          replace: true,
          state: {
            fromView: teacherView,
            successMessage: `${result.message}. Hệ thống đã tạo bản sao mới để bạn tiếp tục chỉnh sửa.`,
          },
        })
        return
      }

      setSuccessMessage(result.message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleAssetSubmit(index: number, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!questionId || !canManageAssetOrGuide) {
      setErrorMessage('Bạn không có quyền cập nhật tài nguyên cho câu hỏi này.')
      return
    }

    const asset = assetForm[index]
    if (isTextPassage(asset.type) && !asset.transcript.trim()) {
      setErrorMessage('Nội dung đoạn văn không được để trống.')
      return
    }

    if (!(await confirm({ message: asset.id ? 'Bạn có chắc muốn cập nhật tài nguyên này không?' : 'Bạn có chắc muốn tạo tài nguyên này không?' }))) {
      return
    }

    try {
      const payload = buildAssetPayload(asset, index)

      const message = asset.id
        ? await updateAssetMutation.mutateAsync({
            assetId: asset.id,
            payload,
            questionId,
          })
        : await createAssetMutation.mutateAsync({
            payload,
            questionId,
          })

      await refreshQuestionData(questionId)
      if (needsTranscriptAnalysis(asset) || needsDescriptionAnalysis(asset)) {
        startAnalysisPolling()
      }
      setSuccessMessage(message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleAssetFileSelected(
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!questionId || !canManageAssetOrGuide) {
      setErrorMessage('Bạn không có quyền cập nhật tài nguyên cho câu hỏi này.')
      return
    }

    const nextType: QuestionAssetType | null = ALLOWED_IMAGE_MIME_TYPES.has(file.type)
      ? 'IMAGE'
      : ALLOWED_VIDEO_MIME_TYPES.has(file.type)
        ? 'VIDEO'
        : null

    if (!nextType) {
      setErrorMessage('Chỉ hỗ trợ ảnh JPG/PNG hoặc video MP4.')
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    setUploadingAssetIndex(index)

    // Only wipe description/transcript when the inferred type actually changes (e.g. a
    // previously-picked video file gets swapped for an image) -- selecting a file of the
    // SAME resulting type must not discard content the teacher already typed into the
    // description/transcript fields before choosing the file.
    const previousType = assetForm[index].type
    if (nextType !== previousType) {
      updateAssetForm(index, resetAssetFieldsForType(nextType), setAssetForm)
    }

    try {
      const publicUrl = await uploadAssetMutation.mutateAsync({
        file,
        questionId,
      })
      const draftAsset = {
        ...assetForm[index],
        type: nextType,
        url: publicUrl,
      }
      updateAssetForm(index, draftAsset, setAssetForm)
      const payload = buildAssetPayload(draftAsset, index, publicUrl)
      const message = draftAsset.id
        ? await updateAssetMutation.mutateAsync({
            assetId: draftAsset.id,
            payload,
            questionId,
          })
        : await createAssetMutation.mutateAsync({
            payload,
            questionId,
          })
      await refreshQuestionData(questionId)
      startAnalysisPolling()
      setSuccessMessage(message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setUploadingAssetIndex(null)
    }
  }

  async function handleRegenerateAssetAnalysis(index: number) {
    const asset = assetForm[index]

    if (!asset.id || !questionId || !canManageAssetOrGuide) {
      setErrorMessage('Ban khong co quyen tao lai phan tich asset nay.')
      return
    }

    if (
      !(await confirm({
        message:
          'Tao lai bang AI se ghi de noi dung transcript/description da co. Ban co muon tiep tuc khong?',
      }))
    ) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    setRegeneratingAssetId(asset.id)

    try {
      const message = await regenerateAssetAnalysisMutation.mutateAsync({
        assetId: asset.id,
        questionId,
      })
      updateAssetForm(
        index,
        isTextPassage(asset.type)
          ? { description: '' }
          : {
              description: '',
              transcript: shouldShowTranscriptField(asset.type) ? '' : asset.transcript,
            },
        setAssetForm,
      )
      await refreshQuestionData(questionId)
      startAnalysisPolling()
      setSuccessMessage(message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setRegeneratingAssetId(null)
    }
  }

  async function handleDeleteAsset(index: number) {
    const asset = assetForm[index]

    if (!asset.id) {
      setAssetForm((current) => current.filter((_, currentIndex) => currentIndex !== index))
      return
    }

    if (!questionId || !canManageAssetOrGuide) {
      setErrorMessage('Bạn không có quyền xóa tài nguyên này.')
      return
    }

    try {
      const message = await deleteAssetMutation.mutateAsync({
        assetId: asset.id,
        questionId,
      })
      await refreshQuestionData(questionId)
      setSuccessMessage(message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleGuideSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!questionId || !canManageAssetOrGuide) {
      setErrorMessage('Bạn không có quyền cập nhật hướng dẫn chấm.')
      return
    }

    if (!(await confirm({ message: 'Bạn có chắc muốn lưu hướng dẫn chấm này không?' }))) {
      return
    }

    try {
      const message = await upsertGuideMutation.mutateAsync({
        payload: {
          acceptableResponses: guideForm.acceptableResponses.trim() || null,
          commonMistakes: guideForm.commonMistakes.trim() || null,
          expectedContent: guideForm.expectedContent.trim() || null,
          keyPoints: guideForm.keyPoints.trim() || null,
          offTopicExamples: guideForm.offTopicExamples.trim() || null,
          scoringHints: guideForm.scoringHints.trim() || null,
        },
        questionId,
      })

      await refreshQuestionData(questionId)
      setSuccessMessage(message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteQuestion() {
    if (!questionId || !canDelete) {
      setErrorMessage('Bạn không có quyền xóa câu hỏi này.')
      return
    }

    try {
      const result = await deleteMutation.mutateAsync(questionId)
      navigate(`${basePath}/questions/my`, {
        replace: true,
        state: {
          successMessage: result.archivedInstead
            ? `${result.message}. Hệ thống đã lưu trữ thay vì xóa.`
            : result.message,
        },
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleWorkflowSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!questionId || !workflowAction) {
      setErrorMessage('Cần chọn hành động workflow trước khi gửi.')
      return
    }

    if (!(await confirm({ message: 'Ban co chac muon gui workflow action nay khong?' }))) {
      return
    }

    try {
      const action = workflowAction as UpdateQuestionStatusRequest['action']
      const message = await reviewMutation.mutateAsync({
        payload: {
          action,
          note: workflowNote.trim() || null,
        },
        questionId,
      })
      await refreshQuestionData(questionId)
      setSuccessMessage(message)
      setWorkflowNote('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lai
          </button>
          <h1 className="text-3xl font-black text-blue-950">
            {mode === 'create' ? 'Tạo câu hỏi mới' : 'Chỉnh sửa câu hỏi'}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            {mode === 'create'
              ? 'Tạo nội dung, tài nguyên và hướng dẫn chấm theo contract mới.'
              : 'Cập nhật nội dung, tài nguyên và workflow của câu hỏi.'}
          </p>
        </div>
      </div>

      <FeedbackToast
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
        tone="error"
      />
      <FeedbackToast
        message={successMessage}
        onClose={() => setSuccessMessage(null)}
        tone="success"
      />
      {dialog}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'content', label: 'Nội dung' },
            ...(ASSETS_TAB_ENABLED ? [{ id: 'assets', label: 'Tài nguyên' }] : []),
            { id: 'guide', label: 'Hướng dẫn chấm' },
            ...(mode === 'edit'
              ? [
                  { id: 'sharing', label: 'Assign collaborator' },
                  { id: 'workflow', label: 'Workflow' },
                ]
              : []),
          ].map((tab) => (
            <button
              className={[
                'rounded-lg px-4 py-2 text-sm font-bold transition',
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-white',
              ].join(' ')}
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'content' ? (
        <form
          className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6"
          onSubmit={handleContentSubmit}
        >
          {mode === 'create' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Ngan hang
                <select
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
                  onChange={(event) => {
                    setSelectedBankId(event.target.value)
                    setSelectedTopicId('')
                  }}
                  value={selectedBankId}
                >
                  <option value="">Chọn ngân hàng</option>
                  {questionBanksQuery.data?.content.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.code} - {bank.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Chu de
                <select
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
                  onChange={(event) => setSelectedTopicId(event.target.value)}
                  value={selectedTopicId}
                >
                  <option value="">Chọn chủ đề</option>
                  {questionTopicsQuery.data?.content.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.code} - {topic.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <ReadOnlyItem
                label="Ngan hang"
                value={formatNullableText(questionQuery.data?.bank?.name)}
              />
              <ReadOnlyItem
                label="Chu de"
                value={formatNullableText(questionQuery.data?.topic?.name)}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Loai cau hoi
              <select
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as QuestionType,
                  }))
                }
                value={form.type}
              >
                {QUESTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Chia se
              <select
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sharing: event.target.value as QuestionSharing,
                  }))
                }
                value={form.sharing}
              >
                {QUESTION_SHARING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <TextareaField
            label="Nội dung câu hỏi"
            onChange={(value) =>
              setForm((current) => ({ ...current, questionText: value }))
            }
            value={form.questionText}
          />
          <TextareaField
            label="Instruction"
            onChange={(value) =>
              setForm((current) => ({ ...current, instructionText: value }))
            }
            value={form.instructionText}
          />
          <TextareaField
            label="Prompt"
            onChange={(value) =>
              setForm((current) => ({ ...current, promptText: value }))
            }
            value={form.promptText}
          />
          <TextareaField
            label="Preparation"
            onChange={(value) =>
              setForm((current) => ({ ...current, preparationText: value }))
            }
            value={form.preparationText}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <InputField
              label="Preparation time"
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  preparationTimeSeconds: value,
                }))
              }
              type="number"
              value={form.preparationTimeSeconds}
            />
            <InputField
              label="Min response"
              onChange={(value) =>
                setForm((current) => ({ ...current, minResponseSeconds: value }))
              }
              type="number"
              value={form.minResponseSeconds}
            />
            <InputField
              label="Max response"
              onChange={(value) =>
                setForm((current) => ({ ...current, maxResponseSeconds: value }))
              }
              type="number"
              value={form.maxResponseSeconds}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            {mode === 'edit' ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50"
                onClick={handleDeleteQuestion}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Xóa câu hỏi
              </button>
            ) : null}
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
              type="submit"
            >
              <Save aria-hidden="true" className="size-4" />
              {mode === 'create' ? 'Tao question' : 'Luu content'}
            </button>
          </div>
        </form>
      ) : null}

      {activeTab === 'assets' ? (
        <div className="grid gap-4">
          {questionId ? null : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-600">
              Hãy lưu câu hỏi trước, sau đó quay lại tab này để upload ảnh/video.
            </div>
          )}
          {questionId
            ? assetForm.map((asset, index) => (
            <form
              className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6"
              key={asset.id ?? `draft-${index}`}
              onSubmit={(event) => void handleAssetSubmit(index, event)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">
                  Asset {index + 1}
                </h2>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  onClick={() => void handleDeleteAsset(index)}
                  type="button"
                >
                  Xoa
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Tieu de"
                  onChange={(value) =>
                    updateAssetForm(index, { title: value }, setAssetForm)
                  }
                  value={asset.title}
                />
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Loai asset
                  <select
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
                    onChange={(event) =>
                      updateAssetForm(
                        index,
                        resetAssetFieldsForType(event.target.value as QuestionAssetType),
                        setAssetForm,
                      )
                    }
                    value={asset.type}
                  >
                    {getAssetTypeOptions(asset.type).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {isTextPassage(asset.type) ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    Asset TEXT_PASSAGE khong can upload file. Hay nhap doan van o o Transcript ben duoi.
                  </div>
                ) : (
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  File asset
                  <input
                    accept={ASSET_FILE_INPUT_ACCEPT}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950"
                    onChange={(event) => void handleAssetFileSelected(index, event)}
                    type="file"
                  />
                  <span className="text-xs font-medium text-slate-500">
                    {uploadingAssetIndex === index
                      ? 'Đang upload file...'
                      : asset.url.trim()
                        ? 'Đã upload file asset.'
                        : 'Chưa có file được upload.'}
                  </span>
                </label>
                )}
                <InputField
                  label="Thời lượng (giây)"
                  onChange={(value) =>
                    updateAssetForm(index, { durationSeconds: value }, setAssetForm)
                  }
                  type="number"
                  value={asset.durationSeconds}
                />
                <InputField
                  label="Thứ tự"
                  onChange={(value) => updateAssetForm(index, { order: value }, setAssetForm)}
                  type="number"
                  value={asset.order}
                />
                <InputField
                  label="Alt text"
                  onChange={(value) => updateAssetForm(index, { altText: value }, setAssetForm)}
                  value={asset.altText}
                />
              </div>
              <TextareaField
                label="Mô tả"
                onChange={(value) =>
                  updateAssetForm(index, { description: value }, setAssetForm)
                }
                value={asset.description}
              />
              <p className="text-xs font-medium text-slate-500">
                Để trợ giúp hệ thống tự động tạo bằng AI sau khi upload xong.
              </p>
              {shouldShowTranscriptField(asset.type) ? (
                <>
                  <TextareaField
                    label={isTextPassage(asset.type) ? 'Doan van' : 'Transcript'}
                    onChange={(value) =>
                      updateAssetForm(index, { transcript: value }, setAssetForm)
                    }
                    value={asset.transcript}
                  />
                  <p className="text-xs font-medium text-slate-500">
                    {isTextPassage(asset.type)
                      ? 'Trường này bắt buộc với TEXT_PASSAGE. AI chỉ tạo phần mô tả, không tạo transcript cho đoạn văn.'
                      : 'Để trợ giúp hệ thống tự động tạo bằng AI sau khi upload xong.'}
                  </p>
                </>
              ) : null}

              {asset.url.trim() ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="font-bold text-slate-900">Asset URL:</span> {asset.url}
                </div>
              ) : null}
              {hasPendingAnalysis(asset) ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  Đang phân tích nội dung bằng AI...
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                {asset.id ? (
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    disabled={regeneratingAssetId === asset.id}
                    onClick={() => void handleRegenerateAssetAnalysis(index)}
                    type="button"
                  >
                    {regeneratingAssetId === asset.id ? 'Dang tao lai...' : 'Tao lai bang AI'}
                  </button>
                ) : null}
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
                  disabled={uploadingAssetIndex === index || regeneratingAssetId === asset.id}
                  type="submit"
                >
                  <Save aria-hidden="true" className="size-4" />
                  {asset.id ? 'Cập nhật tài nguyên' : 'Tạo tài nguyên'}
                </button>
              </div>
            </form>
              ))
            : null}

          {questionId ? (
            <div className="flex justify-end">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setAssetForm((current) => [...current, createAssetForm()])}
              disabled={assetForm.length >= 1}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Them asset
            </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'guide' ? (
        <form
          className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6"
          onSubmit={handleGuideSubmit}
        >
          <TextareaField
            label="Nội dung kỳ vọng"
            onChange={(value) =>
              setGuideForm((current) => ({ ...current, expectedContent: value }))
            }
            value={guideForm.expectedContent}
          />
          <TextareaField
            label="Key points"
            onChange={(value) =>
              setGuideForm((current) => ({ ...current, keyPoints: value }))
            }
            value={guideForm.keyPoints}
          />
          <TextareaField
            label="Acceptable responses"
            onChange={(value) =>
              setGuideForm((current) => ({
                ...current,
                acceptableResponses: value,
              }))
            }
            value={guideForm.acceptableResponses}
          />
          <TextareaField
            label="Off-topic examples"
            onChange={(value) =>
              setGuideForm((current) => ({
                ...current,
                offTopicExamples: value,
              }))
            }
            value={guideForm.offTopicExamples}
          />
          <TextareaField
            label="Scoring hints"
            onChange={(value) =>
              setGuideForm((current) => ({ ...current, scoringHints: value }))
            }
            value={guideForm.scoringHints}
          />
          <TextareaField
            label="Common mistakes"
            onChange={(value) =>
              setGuideForm((current) => ({ ...current, commonMistakes: value }))
            }
            value={guideForm.commonMistakes}
          />

          <div className="flex justify-end">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
              type="submit"
            >
              <Save aria-hidden="true" className="size-4" />
              Lưu hướng dẫn chấm
            </button>
          </div>
        </form>
      ) : null}

      {mode === 'edit' && activeTab === 'sharing' && questionQuery.data ? (
        <QuestionSharingPanel
          canManage={canManageSharing}
          createCollaboratorMutation={createCollaboratorMutation}
          deleteCollaboratorMutation={deleteCollaboratorMutation}
          errorMessage={errorMessage}
          message={successMessage}
          newPermission={newPermission}
          newUserId={newUserId}
          onCloseError={() => setErrorMessage(null)}
          onCloseMessage={() => setSuccessMessage(null)}
          onPermissionChange={setNewPermission}
          onRefresh={() => void refreshQuestionData(questionId)}
          onSearchChange={setTeacherSearch}
          onSelectUser={setNewUserId}
          onSuccess={(message) => {
            setSuccessMessage(message)
            setErrorMessage(null)
            setNewUserId('')
            setTeacherSearch('')
          }}
          onUpdateError={setErrorMessage}
          question={questionQuery.data}
          schoolUsers={schoolUsersQuery.data?.content ?? []}
          teacherSearch={teacherSearch}
          updateCollaboratorMutation={updateCollaboratorMutation}
          updateQuestionMutation={updateMutation}
        />
      ) : null}

      {mode === 'edit' && activeTab === 'workflow' ? (
        <form
          className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6"
          onSubmit={handleWorkflowSubmit}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyItem
              label="Trang thai hien tai"
              value={formatNullableText(questionQuery.data?.status)}
            />
            <ReadOnlyItem
              label="So action kha dung"
              value={String(workflowActions.length)}
            />
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Hành động
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
              onChange={(event) => setWorkflowAction(event.target.value)}
              value={workflowAction}
            >
              <option value="">Chọn hành động</option>
              {workflowActions.map((action) => (
                <option key={action.action} value={action.action}>
                  {action.title}
                </option>
              ))}
            </select>
          </label>

          <TextareaField
            label="Note"
            onChange={setWorkflowNote}
            value={workflowNote}
          />

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {workflowActions.find((item) => item.action === workflowAction)?.description ??
              'Chọn một hành động workflow để xem mô tả.'}
          </div>

          <div className="flex justify-end">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
              type="submit"
            >
              <Save aria-hidden="true" className="size-4" />
              Gui workflow
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function QuestionSharingPanel({
  canManage,
  createCollaboratorMutation,
  deleteCollaboratorMutation,
  errorMessage,
  message,
  newPermission,
  newUserId,
  onCloseError,
  onCloseMessage,
  onPermissionChange,
  onRefresh,
  onSearchChange,
  onSelectUser,
  onSuccess,
  onUpdateError,
  question,
  schoolUsers,
  teacherSearch,
  updateCollaboratorMutation,
  updateQuestionMutation,
}: {
  canManage: boolean
  createCollaboratorMutation: ReturnType<typeof useCreateQuestionCollaboratorMutation>
  deleteCollaboratorMutation: ReturnType<typeof useDeleteQuestionCollaboratorMutation>
  errorMessage: string | null
  message: string | null
  newPermission: QuestionCollaboratorPermission
  newUserId: string
  onCloseError: () => void
  onCloseMessage: () => void
  onPermissionChange: (value: QuestionCollaboratorPermission) => void
  onRefresh: () => void
  onSearchChange: (value: string) => void
  onSelectUser: (value: string) => void
  onSuccess: (message: string) => void
  onUpdateError: (message: string) => void
  question: QuestionDto
  schoolUsers: Array<{
    id: string
    userId?: string | null
    user?: {
      email?: string | null
      fullName?: string | null
      id?: string | null
    } | null
  }>
  teacherSearch: string
  updateCollaboratorMutation: ReturnType<typeof useUpdateQuestionCollaboratorMutation>
  updateQuestionMutation: ReturnType<typeof useUpdateQuestionMutation>
}) {
  const [sharing, setSharing] = useState(question.sharing)
  const [collaboratorPermissions, setCollaboratorPermissions] = useState<
    Record<string, QuestionCollaboratorPermission>
  >({})
  const { confirm, dialog } = useConfirmationDialog()

  useEffect(() => {
    // resync the local draft whenever the question is refetched (e.g. after a sharing mutation)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSharing(question.sharing)
  }, [question.sharing])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollaboratorPermissions(
      Object.fromEntries(
        (question.collaborators ?? []).map((collaborator) => [
          collaborator.id,
          collaborator.permission,
        ]),
      ),
    )
  }, [question.collaborators])

  return (
    <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
      <FeedbackToast message={message} onClose={onCloseMessage} tone="success" />
      <FeedbackToast message={errorMessage} onClose={onCloseError} tone="error" />
      {dialog}

      <div className="grid gap-4 md:grid-cols-2">
        <ReadOnlyItem
          label="Chia sẻ hiện tại"
          value={getQuestionSharingDisplay(question.sharing)}
        />
        <ReadOnlyItem
          label="Số cộng tác viên"
          value={String(question.collaborators?.length ?? 0)}
        />
      </div>

      {canManage ? (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <h3 className="text-base font-black text-slate-950">Quyền riêng tư và chia sẻ chung</h3>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Cấu hình quyền truy cập chung cho question này.
              </p>
            </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Quyền truy cập chung
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950"
                onChange={(event) => setSharing(event.target.value as QuestionDto['sharing'])}
                value={sharing}
              >
                <option value="PRIVATE">Riêng tư</option>
                <option value="SCHOOL_SHARED">Chia sẻ trong trường</option>
              </select>
            </label>
            <div className="self-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                onClick={() => {
                  void (async () => {
                    if (!(await confirm({ message: 'Bạn có chắc muốn lưu thay đổi chia sẻ này không?' }))) {
                      return
                    }
                    try {
                      const result = await updateQuestionMutation.mutateAsync({
                        id: question.id,
                        payload: { sharing },
                      })
                      onSuccess(result.message)
                      onRefresh()
                    } catch (submitError) {
                      onUpdateError(getErrorMessage(submitError))
                    }
                  })()
                }}
                type="button"
              >
                Lưu chia sẻ
              </button>
            </div>
          </div>
          </div>

          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <h3 className="text-base font-black text-slate-950">Gán giáo viên cộng tác</h3>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Tìm giáo viên, chọn quyền và thêm vào danh sách cộng tác viên.
              </p>
            </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Tìm giáo viên
              <input
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Nhập tên hoặc email"
                value={teacherSearch}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Quyền
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950"
                onChange={(event) =>
                  onPermissionChange(event.target.value as QuestionCollaboratorPermission)
                }
                value={newPermission}
              >
                <option value="READ_ONLY">Chỉ xem</option>
                <option value="CAN_USE">Được sử dụng</option>
                <option value="CAN_EDIT">Được chỉnh sửa</option>
              </select>
            </label>
            <div className="self-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
                onClick={() => {
                  void (async () => {
                    if (!(await confirm({ message: 'Bạn có chắc muốn thêm cộng tác viên này không?' }))) {
                      return
                    }
                    try {
                      const result = await createCollaboratorMutation.mutateAsync({
                        payload: {
                          permission: newPermission,
                          userId: newUserId,
                        },
                        questionId: question.id,
                      })
                      onSuccess(result)
                      onRefresh()
                    } catch (submitError) {
                      onUpdateError(getErrorMessage(submitError))
                    }
                  })()
                }}
                type="button"
              >
                Thêm cộng tác viên
              </button>
            </div>
          </div>

          {newUserId ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
              Đã chọn người dùng: {newUserId}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {schoolUsers.map((schoolUser) => {
              const displayUserId = schoolUser.userId ?? schoolUser.user?.id ?? ''
              const displayName =
                schoolUser.user?.fullName?.trim() ||
                schoolUser.user?.email ||
                displayUserId

              return (
                <button
                  className={`grid gap-1 rounded-lg border bg-white px-4 py-3 text-left transition ${newUserId === displayUserId ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  key={schoolUser.id}
                  onClick={() => onSelectUser(displayUserId)}
                  type="button"
                >
                  <span className="text-sm font-black text-slate-950">{displayName}</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {schoolUser.user?.email ?? displayUserId}
                  </span>
                </button>
              )
            })}
          </div>
          </div>
        </div>
      ) : (
        <EmptyState text="Chỉ giáo viên tạo câu hỏi mới có thể gán cộng tác viên." />
      )}

      {question.collaborators?.length ? (
        <div className="grid gap-3">
          {question.collaborators.map((collaborator) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"
              key={collaborator.id}
            >
              <div>
                <p className="text-sm font-bold text-slate-950">
                  {collaborator.user?.fullName?.trim() ||
                    collaborator.user?.email ||
                    collaborator.userId}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {collaborator.user?.email ?? collaborator.userId} - Gán lúc:{' '}
                  {formatQuestionDate(collaborator.assignedAt)}
                </p>
              </div>
              {canManage ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
                    onChange={(event) => {
                      void (async () => {
                        const nextPermission =
                          event.target.value as QuestionCollaboratorPermission
                        const previousPermission =
                          collaboratorPermissions[collaborator.id] ?? collaborator.permission

                        setCollaboratorPermissions((current) => ({
                          ...current,
                          [collaborator.id]: nextPermission,
                        }))

                        if (!(await confirm({ message: 'Bạn có chắc muốn cập nhật quyền cộng tác viên này không?' }))) {
                          setCollaboratorPermissions((current) => ({
                            ...current,
                            [collaborator.id]: previousPermission,
                          }))
                          return
                        }
                        try {
                          const result = await updateCollaboratorMutation.mutateAsync({
                            collaboratorId: collaborator.id,
                            payload: {
                              permission: nextPermission,
                            },
                            questionId: question.id,
                          })
                          onSuccess(result)
                          onRefresh()
                        } catch (submitError) {
                          setCollaboratorPermissions((current) => ({
                            ...current,
                            [collaborator.id]: previousPermission,
                          }))
                          onUpdateError(getErrorMessage(submitError))
                        }
                      })()
                    }}
                    value={collaboratorPermissions[collaborator.id] ?? collaborator.permission}
                  >
                    <option value="READ_ONLY">Chỉ xem</option>
                    <option value="CAN_USE">Được sử dụng</option>
                    <option value="CAN_EDIT">Được chỉnh sửa</option>
                  </select>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-bold text-red-600"
                    onClick={() => {
                      void (async () => {
                        try {
                          const result = await deleteCollaboratorMutation.mutateAsync({
                            collaboratorId: collaborator.id,
                            questionId: question.id,
                          })
                          onSuccess(result)
                          onRefresh()
                        } catch (submitError) {
                          onUpdateError(getErrorMessage(submitError))
                        }
                      })()
                    }}
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                  {getQuestionCollaboratorPermissionDisplay(collaborator.permission)}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="Chưa có cộng tác viên nào được gán riêng." />
      )}
    </div>
  )
}

function updateAssetForm(
  index: number,
  value: Partial<AssetFormState>,
  setAssetForm: React.Dispatch<React.SetStateAction<AssetFormState[]>>,
) {
  setAssetForm((current) =>
    current.map((asset, currentIndex) =>
      currentIndex === index ? { ...asset, ...value } : asset,
    ),
  )
}

function ReadOnlyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-950">{value}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  )
}

function InputField({
  label,
  onChange,
  type = 'text',
  value,
}: {
  label: string
  onChange: (value: string) => void
  type?: string
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  )
}

function TextareaField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea
        className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}

export function TeacherCreateQuestionPage() {
  return <QuestionEditorPage basePath="/teacher" mode="create" />
}

export function TeacherEditQuestionPage() {
  return <QuestionEditorPage basePath="/teacher" mode="edit" />
}

export function SchoolAdminCreateQuestionPage() {
  return <QuestionEditorPage basePath="/school-admin" mode="create" />
}

export function SchoolAdminEditQuestionPage() {
  return <QuestionEditorPage basePath="/school-admin" mode="edit" />
}

export function SystemAdminCreateQuestionPage() {
  return <QuestionEditorPage basePath="/system-admin" mode="create" />
}

export function SystemAdminEditQuestionPage() {
  return <QuestionEditorPage basePath="/system-admin" mode="edit" />
}

