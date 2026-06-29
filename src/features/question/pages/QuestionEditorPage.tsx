import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useQuestionBanksQuery } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionTopicsQuery } from '@/features/question-topic/api/useQuestionTopicsQuery'
import { useQuestionQuery } from '../api/useQuestionQuery'
import {
  useCreateQuestionMutation,
  useDeleteQuestionMutation,
  useUpdateQuestionMutation,
} from '../api/useQuestionMutations'
import { questionQueryKeys } from '../api/useQuestionsQuery'
import { useReviewQuestionMutation } from '../api/useQuestionReviewMutation'
import {
  useCreateQuestionAssetMutation,
  useDeleteQuestionAssetMutation,
  useUpdateQuestionAssetMutation,
  useUpsertQuestionEvaluationGuideMutation,
} from '../api/useQuestionSectionMutations'
import {
  canCreateQuestion,
  canDeleteQuestion,
  canEditQuestion,
  canEditQuestionAssetsOrGuide,
  getQuestionActorRole,
  getQuestionReviewActions,
  resolveTeacherQuestionContext,
} from '../permissions'
import type {
  CreateQuestionRequest,
  QuestionAssetType,
  QuestionSharing,
  QuestionType,
  UpdateQuestionStatusRequest,
} from '../types'
import { formatNullableText } from '../types'

type TabKey = 'assets' | 'content' | 'guide' | 'workflow'

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
  { label: 'Doc to', value: 'READ_ALOUD' },
  { label: 'Tra loi ngan', value: 'SHORT_ANSWER' },
  { label: 'Tra loi dai', value: 'LONG_ANSWER' },
  { label: 'Y kien', value: 'OPINION' },
  { label: 'Mo ta', value: 'DESCRIPTION' },
]

const QUESTION_SHARING_OPTIONS: Array<{ label: string; value: QuestionSharing }> = [
  { label: 'Private', value: 'PRIVATE' },
  { label: 'School shared', value: 'SCHOOL_SHARED' },
]

const QUESTION_ASSET_TYPE_OPTIONS: Array<{ label: string; value: QuestionAssetType }> = [
  { label: 'Audio', value: 'AUDIO' },
  { label: 'Image', value: 'IMAGE' },
  { label: 'Video', value: 'VIDEO' },
  { label: 'Text passage', value: 'TEXT_PASSAGE' },
]

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
    type: 'AUDIO',
    url: '',
  }
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

  return 'Khong the luu cau hoi. Vui long thu lai.'
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

  const questionQuery = useQuestionQuery(mode === 'edit' ? questionId : null)
  const createMutation = useCreateQuestionMutation()
  const updateMutation = useUpdateQuestionMutation()
  const deleteMutation = useDeleteQuestionMutation()
  const reviewMutation = useReviewQuestionMutation()
  const createAssetMutation = useCreateQuestionAssetMutation()
  const updateAssetMutation = useUpdateQuestionAssetMutation()
  const deleteAssetMutation = useDeleteQuestionAssetMutation()
  const upsertGuideMutation = useUpsertQuestionEvaluationGuideMutation()

  const [activeTab, setActiveTab] = useState<TabKey>('content')
  const [selectedBankId, setSelectedBankId] = useState(searchParams.get('bankId') ?? '')
  const [selectedTopicId, setSelectedTopicId] = useState(searchParams.get('topicId') ?? '')
  const [form, setForm] = useState<EditorFormState>(createInitialForm())
  const [assetForm, setAssetForm] = useState<AssetFormState[]>([createAssetForm()])
  const [guideForm, setGuideForm] = useState<EvaluationGuideFormState>(createGuideForm())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [workflowAction, setWorkflowAction] = useState('')
  const [workflowNote, setWorkflowNote] = useState('')

  const actorRole = getQuestionActorRole(user?.roles)
  const teacherContext = resolveTeacherQuestionContext(
    teacherView,
    questionQuery.data,
    user?.userId,
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
  const workflowActions = getQuestionReviewActions(
    questionQuery.data,
    actorRole,
    teacherContext,
    user?.userId,
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

  useEffect(() => {
    if (!questionQuery.data) {
      return
    }

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
    setAssetForm(
      questionQuery.data.assets?.length
        ? questionQuery.data.assets.map((asset) => ({
            altText: asset.altText ?? '',
            description: asset.description ?? '',
            durationSeconds:
              asset.durationSeconds == null ? '' : String(asset.durationSeconds),
            id: asset.id,
            order: String(asset.order),
            title: asset.title ?? '',
            transcript: asset.transcript ?? '',
            type: asset.type,
            url: asset.url,
          }))
        : [createAssetForm()],
    )
    setGuideForm({
      acceptableResponses:
        questionQuery.data.evaluationGuide?.acceptableResponses ?? '',
      commonMistakes: questionQuery.data.evaluationGuide?.commonMistakes ?? '',
      expectedContent: questionQuery.data.evaluationGuide?.expectedContent ?? '',
      keyPoints: questionQuery.data.evaluationGuide?.keyPoints ?? '',
      offTopicExamples: questionQuery.data.evaluationGuide?.offTopicExamples ?? '',
      scoringHints: questionQuery.data.evaluationGuide?.scoringHints ?? '',
    })
  }, [questionQuery.data])

  async function refreshQuestionData(targetQuestionId?: string | null) {
    await queryClient.invalidateQueries({ queryKey: questionQueryKeys.all })
    if (targetQuestionId) {
      await queryClient.invalidateQueries({
        queryKey: questionQueryKeys.question(targetQuestionId),
      })
    }
  }

  if (mode === 'create' && !canCreate) {
    return (
      <section className="grid gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">
        <span>Role hien tai khong duoc tao question.</span>
      </section>
    )
  }

  if (mode === 'edit' && questionQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Dang tai question...
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
      setErrorMessage('Noi dung cau hoi khong duoc de trong.')
      return
    }

    if (
      preparationTimeSeconds == null ||
      minResponseSeconds == null ||
      maxResponseSeconds == null
    ) {
      setErrorMessage('Cac truong thoi gian phai la so nguyen khong am.')
      return
    }

    try {
      if (mode === 'create') {
        if (!selectedBankId || !selectedTopicId) {
          setErrorMessage('Can chon ngan hang va chu de truoc khi tao.')
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
        setErrorMessage('Ban khong co quyen cap nhat cau hoi nay.')
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
            successMessage: `${result.message}. He thong da tao ban clone moi de ban tiep tuc chinh sua.`,
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
      setErrorMessage('Ban khong co quyen cap nhat assets cho cau hoi nay.')
      return
    }

    const asset = assetForm[index]
    if (!asset.url.trim()) {
      setErrorMessage('URL asset khong duoc de trong.')
      return
    }

    try {
      const payload = {
        altText: asset.altText.trim() || null,
        description: asset.description.trim() || null,
        durationSeconds: asset.durationSeconds.trim()
          ? Number(asset.durationSeconds)
          : null,
        order: asset.order.trim() ? Number(asset.order) : index + 1,
        title: asset.title.trim() || null,
        transcript: asset.transcript.trim() || null,
        type: asset.type,
        url: asset.url.trim(),
      }

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
      setSuccessMessage(message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteAsset(index: number) {
    const asset = assetForm[index]

    if (!asset.id) {
      setAssetForm((current) => current.filter((_, currentIndex) => currentIndex !== index))
      return
    }

    if (!questionId || !canManageAssetOrGuide) {
      setErrorMessage('Ban khong co quyen xoa asset nay.')
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
      setErrorMessage('Ban khong co quyen cap nhat evaluation guide.')
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
      setErrorMessage('Ban khong co quyen xoa cau hoi nay.')
      return
    }

    try {
      const result = await deleteMutation.mutateAsync(questionId)
      navigate(`${basePath}/questions/my`, {
        replace: true,
        state: {
          successMessage: result.archivedInstead
            ? `${result.message}. Backend da archive thay vi xoa.`
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
      setErrorMessage('Can chon workflow action truoc khi gui.')
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
            {mode === 'create' ? 'Tao cau hoi moi' : 'Chinh sua cau hoi'}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            {mode === 'create'
              ? 'Tao noi dung, asset va evaluation guide theo contract moi.'
              : 'Cap nhat noi dung, asset va workflow cua cau hoi.'}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'content', label: 'Noi dung' },
            { id: 'assets', label: 'Assets' },
            { id: 'guide', label: 'Evaluation guide' },
            ...(mode === 'edit' ? [{ id: 'workflow', label: 'Workflow' }] : []),
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
                  <option value="">Chon ngan hang</option>
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
                  <option value="">Chon chu de</option>
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
            label="Noi dung cau hoi"
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
                Xoa question
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
          {assetForm.map((asset, index) => (
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
                        { type: event.target.value as QuestionAssetType },
                        setAssetForm,
                      )
                    }
                    value={asset.type}
                  >
                    {QUESTION_ASSET_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <InputField
                  label="URL"
                  onChange={(value) => updateAssetForm(index, { url: value }, setAssetForm)}
                  value={asset.url}
                />
                <InputField
                  label="Thoi luong"
                  onChange={(value) =>
                    updateAssetForm(index, { durationSeconds: value }, setAssetForm)
                  }
                  type="number"
                  value={asset.durationSeconds}
                />
                <InputField
                  label="Thu tu"
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
                label="Mo ta"
                onChange={(value) =>
                  updateAssetForm(index, { description: value }, setAssetForm)
                }
                value={asset.description}
              />
              <TextareaField
                label="Transcript"
                onChange={(value) =>
                  updateAssetForm(index, { transcript: value }, setAssetForm)
                }
                value={asset.transcript}
              />

              <div className="flex justify-end">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
                  type="submit"
                >
                  <Save aria-hidden="true" className="size-4" />
                  {asset.id ? 'Cap nhat asset' : 'Tao asset'}
                </button>
              </div>
            </form>
          ))}

          <div className="flex justify-end">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setAssetForm((current) => [...current, createAssetForm()])}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Them asset
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === 'guide' ? (
        <form
          className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6"
          onSubmit={handleGuideSubmit}
        >
          <TextareaField
            label="Expected content"
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
              Luu evaluation guide
            </button>
          </div>
        </form>
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
            Action
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
              onChange={(event) => setWorkflowAction(event.target.value)}
              value={workflowAction}
            >
              <option value="">Chon action</option>
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
              'Chon mot workflow action de xem mo ta.'}
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
