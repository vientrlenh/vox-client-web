import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionQuery } from '../api/useQuestionQuery'
import { questionQueryKeys } from '../api/useQuestionsQuery'
import {
  useCreateQuestionMutation,
  useDeleteQuestionMutation,
  useUpdateQuestionMutation,
} from '../api/useQuestionMutations'
import {
  useCreateQuestionAssetsMutation,
  useCreateQuestionEvaluationGuideMutation,
  useDeleteQuestionAssetsMutation,
  useDeleteQuestionEvaluationGuideMutation,
  useUpdateQuestionAssetsMutation,
  useUpdateQuestionEvaluationGuideMutation,
} from '../api/useQuestionSectionMutations'
import {
  canCreateQuestion,
  canDeleteQuestion,
  canDeleteQuestionAssetsOrGuide,
  canEditQuestion,
  getQuestionActorRole,
  getTeacherQuestionContext,
} from '../permissions'
import type {
  CreateQuestionRequest,
  QuestionAssetDto,
  QuestionDto,
  QuestionEvaluationGuideDto,
  QuestionType,
  UpdateQuestionAssetsRequest,
  UpdateQuestionEvaluationGuideRequest,
  UpdateQuestionRequest,
} from '../types'

type EditorFormState = {
  code: string
  instructionText: string
  maxResponseSeconds: string
  minResponseSeconds: string
  preparationText: string
  preparationTimeSeconds: string
  promptText: string
  questionText: string
  type: QuestionType
}

type AssetFormState = {
  altText: string
  description: string
  durationSeconds: string
  order: string
  title: string
  transcript: string
  type: string
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

type TabKey = 'assets' | 'content' | 'guide'

const QUESTION_TYPE_OPTIONS: Array<{ label: string; value: QuestionType }> = [
  { label: 'Doc to', value: 'READ_ALOUD' },
  { label: 'Tra loi ngan', value: 'SHORT_ANSWER' },
  { label: 'Tra loi dai', value: 'LONG_ANSWER' },
  { label: 'Y kien', value: 'OPINION' },
  { label: 'Mo ta', value: 'DESCRIPTION' },
]

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

function createInitialForm(question: QuestionDto | null): EditorFormState {
  return {
    code: question?.code ?? '',
    instructionText: question?.instructionText ?? '',
    maxResponseSeconds: String(question?.maxResponseSeconds ?? ''),
    minResponseSeconds: String(question?.minResponseSeconds ?? ''),
    preparationText: question?.preparationText ?? '',
    preparationTimeSeconds: String(question?.preparationTimeSeconds ?? ''),
    promptText: question?.promptText ?? '',
    questionText: question?.questionText ?? '',
    type: (question?.type as QuestionType) ?? 'READ_ALOUD',
  }
}

function createAssetForm(asset?: QuestionAssetDto | null): AssetFormState {
  return {
    altText: asset?.altText ?? '',
    description: asset?.description ?? '',
    durationSeconds:
      asset?.durationSeconds == null ? '' : String(asset.durationSeconds),
    order: String(asset?.order ?? 1),
    title: asset?.title ?? '',
    transcript: asset?.transcript ?? '',
    type: asset?.type ?? 'AUDIO',
    url: asset?.url ?? '',
  }
}

function createEvaluationGuideForm(
  guide?: QuestionEvaluationGuideDto | null,
): EvaluationGuideFormState {
  return {
    acceptableResponses: guide?.acceptableResponses ?? '',
    commonMistakes: guide?.commonMistakes ?? '',
    expectedContent: guide?.expectedContent ?? '',
    keyPoints: guide?.keyPoints ?? '',
    offTopicExamples: guide?.offTopicExamples ?? '',
    scoringHints: guide?.scoringHints ?? '',
  }
}

function parsePositiveInt(value: string) {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function SuccessPopup({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl shadow-slate-950/20">
        <h2 className="text-xl font-black text-slate-950">Thanh cong</h2>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          {message}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
            onClick={onClose}
            type="button"
          >
            Dong
          </button>
        </div>
      </div>
    </div>
  )
}

type QuestionEditorPageProps = {
  basePath: string
  mode: 'create' | 'edit'
  scope: QuestionModuleScope
}

function QuestionEditorPage({
  basePath,
  mode,
  scope,
}: QuestionEditorPageProps) {
  const user = useAppSelector((state) => state.auth.user)
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const questionId = params.questionId ?? null
  const topicId = searchParams.get('topicId') ?? ''
  const bankId = searchParams.get('bankId') ?? ''
  const topicName = searchParams.get('topicName') ?? ''
  const teacherView =
    ((location.state as { fromView?: 'all' | 'my' | 'review' } | null)?.fromView ??
      null)

  const questionQuery = useQuestionQuery(mode === 'edit' ? questionId : null)
  const createMutation = useCreateQuestionMutation()
  const deleteQuestionMutation = useDeleteQuestionMutation()
  const updateMutation = useUpdateQuestionMutation()
  const createAssetsMutation = useCreateQuestionAssetsMutation()
  const updateAssetsMutation = useUpdateQuestionAssetsMutation()
  const deleteAssetsMutation = useDeleteQuestionAssetsMutation()
  const createGuideMutation = useCreateQuestionEvaluationGuideMutation()
  const updateGuideMutation = useUpdateQuestionEvaluationGuideMutation()
  const deleteGuideMutation = useDeleteQuestionEvaluationGuideMutation()

  const [activeTab, setActiveTab] = useState<TabKey>('content')
  const [form, setForm] = useState<EditorFormState>(createInitialForm(null))
  const [assetForm, setAssetForm] = useState<AssetFormState[]>([
    createAssetForm(),
  ])
  const [guideForm, setGuideForm] = useState<EvaluationGuideFormState>(
    createEvaluationGuideForm(null),
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { successMessage?: string } | null)?.successMessage ?? null,
  )

  useEffect(() => {
    if (!questionQuery.data) {
      return
    }

    setForm(createInitialForm(questionQuery.data))
    setAssetForm(
      questionQuery.data.assets?.length
        ? questionQuery.data.assets.map((asset) => createAssetForm(asset))
        : [createAssetForm()],
    )
    setGuideForm(createEvaluationGuideForm(questionQuery.data.evaluationGuide))
  }, [questionQuery.data])

  const actorRole = getQuestionActorRole(user?.roles)
  const teacherContext = getTeacherQuestionContext(teacherView)
  const canCreate = canCreateQuestion(actorRole)
  const resolvedTopicId =
    mode === 'create'
      ? topicId
      : (questionQuery.data?.questionTopicId ?? questionQuery.data?.topicId ?? '')
  const canEdit =
    mode === 'create'
      ? canCreate
      : canEditQuestion(questionQuery.data, actorRole, teacherContext)
  const canDelete =
    mode === 'edit'
      ? canDeleteQuestion(questionQuery.data, actorRole, teacherContext)
      : false
  const canDeleteAssetsOrGuide =
    mode === 'edit'
      ? canDeleteQuestionAssetsOrGuide(
          questionQuery.data,
          actorRole,
          teacherContext,
        )
      : false

  const isSubmitting =
    createMutation.isPending ||
    deleteQuestionMutation.isPending ||
    updateMutation.isPending ||
    createAssetsMutation.isPending ||
    updateAssetsMutation.isPending ||
    deleteAssetsMutation.isPending ||
    createGuideMutation.isPending ||
    updateGuideMutation.isPending ||
    deleteGuideMutation.isPending

  async function refreshQuestionDetail() {
    await queryClient.invalidateQueries({ queryKey: questionQueryKeys.all })
    if (questionId) {
      await queryClient.invalidateQueries({
        queryKey: questionQueryKeys.question(questionId),
      })
    }
  }

  function getReturnPath() {
    const targetBankId =
      bankId || questionQuery.data?.questionTopic?.questionBankId || ''
    const targetTopicId = resolvedTopicId
    const targetTopicName =
      topicName || questionQuery.data?.questionTopic?.name || ''

    if (targetBankId && targetTopicId) {
      return `${basePath}/questions/all?bankId=${targetBankId}&topicId=${targetTopicId}&topicName=${encodeURIComponent(targetTopicName)}`
    }

    return `${basePath}/questions/all`
  }

  async function handleContentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (!canEdit) {
      setErrorMessage('Ban khong co quyen cap nhat cau hoi nay.')
      return
    }

    if (!resolvedTopicId) {
      setErrorMessage('Can chon chu de truoc khi tao hoac cap nhat cau hoi.')
      return
    }

    if (!form.questionText.trim()) {
      setErrorMessage('Noi dung cau hoi khong duoc de trong.')
      return
    }

    if (mode === 'create' && !form.code.trim()) {
      setErrorMessage('Ma cau hoi khong duoc de trong.')
      return
    }

    const preparationTimeSeconds = parsePositiveInt(form.preparationTimeSeconds)
    const minResponseSeconds = parsePositiveInt(form.minResponseSeconds)
    const maxResponseSeconds = parsePositiveInt(form.maxResponseSeconds)

    if (
      preparationTimeSeconds === null ||
      minResponseSeconds === null ||
      maxResponseSeconds === null
    ) {
      setErrorMessage('Cac truong thoi gian phai la so nguyen khong am.')
      return
    }

    const payloadBase = {
      instructionText: form.instructionText.trim() || null,
      maxResponseSeconds,
      minResponseSeconds,
      preparationText: form.preparationText.trim() || null,
      preparationTimeSeconds,
      promptText: form.promptText.trim() || null,
      questionText: form.questionText.trim(),
      questionTopicId: resolvedTopicId,
      type: form.type,
    }

    try {
      if (mode === 'create') {
        const createdResult = await createMutation.mutateAsync({
          payload: {
            ...payloadBase,
            code: form.code.trim(),
          } satisfies CreateQuestionRequest,
          scope,
        })

        await refreshQuestionDetail()
        navigate(
          createdResult.questionId
            ? `${basePath}/questions/${createdResult.questionId}/edit`
            : getReturnPath(),
          {
            replace: true,
            state: {
              fromView: teacherView,
              successMessage: createdResult.message,
            },
          },
        )
        return
      }

      const updatedMessage = await updateMutation.mutateAsync({
        id: questionId!,
        payload: payloadBase satisfies UpdateQuestionRequest,
      })

      await refreshQuestionDetail()
      setSuccessMessage(updatedMessage)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleAssetsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (!questionId || !canEdit) {
      setErrorMessage('Ban khong co quyen cap nhat assets cho cau hoi nay.')
      return
    }

    const payload: UpdateQuestionAssetsRequest = {
      assets: assetForm.map((asset, index) => ({
        altText: asset.altText.trim() || null,
        description: asset.description.trim() || null,
        durationSeconds: asset.durationSeconds.trim()
          ? Number(asset.durationSeconds)
          : null,
        order: asset.order.trim() ? Number(asset.order) : index + 1,
        title: asset.title.trim() || null,
        transcript: asset.transcript.trim() || null,
        type: asset.type.trim() || 'AUDIO',
        url: asset.url.trim() || null,
      })),
    }

    try {
      const messageText = questionQuery.data?.assets?.length
        ? await updateAssetsMutation.mutateAsync({ payload, questionId })
        : await createAssetsMutation.mutateAsync({ payload, questionId })

      await refreshQuestionDetail()
      setSuccessMessage(messageText)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteAssets() {
    if (!questionId || !canDeleteAssetsOrGuide) {
      setErrorMessage('Chi duoc xoa assets khi question dang o trang thai DRAFT.')
      return
    }

    try {
      const messageText = await deleteAssetsMutation.mutateAsync(questionId)
      setAssetForm([createAssetForm()])
      await refreshQuestionDetail()
      setSuccessMessage(messageText)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleGuideSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (!questionId || !canEdit) {
      setErrorMessage('Ban khong co quyen cap nhat evaluation guide cho cau hoi nay.')
      return
    }

    const payload: UpdateQuestionEvaluationGuideRequest = {
      acceptableResponses: guideForm.acceptableResponses.trim() || null,
      commonMistakes: guideForm.commonMistakes.trim() || null,
      expectedContent: guideForm.expectedContent.trim() || null,
      keyPoints: guideForm.keyPoints.trim() || null,
      offTopicExamples: guideForm.offTopicExamples.trim() || null,
      scoringHints: guideForm.scoringHints.trim() || null,
    }

    try {
      const messageText = questionQuery.data?.evaluationGuide
        ? await updateGuideMutation.mutateAsync({ payload, questionId })
        : await createGuideMutation.mutateAsync({ payload, questionId })

      await refreshQuestionDetail()
      setSuccessMessage(messageText)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteGuide() {
    if (!questionId || !canDeleteAssetsOrGuide) {
      setErrorMessage('Chi duoc xoa guide khi question dang o trang thai DRAFT.')
      return
    }

    try {
      const messageText = await deleteGuideMutation.mutateAsync(questionId)
      setGuideForm(createEvaluationGuideForm(null))
      await refreshQuestionDetail()
      setSuccessMessage(messageText)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteQuestion() {
    if (!questionId || !canDelete) {
      setErrorMessage('Ban khong co quyen xoa cau hoi nay.')
      return
    }

    if (!window.confirm('Ban co chac muon xoa cau hoi nay khong?')) {
      return
    }

    try {
      const messageText = await deleteQuestionMutation.mutateAsync(questionId)
      await refreshQuestionDetail()
      navigate(getReturnPath(), {
        replace: true,
        state: { successMessage: messageText },
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  const tabs: Array<{ id: TabKey; label: string }> =
    mode === 'create'
      ? [{ id: 'content', label: 'Content' }]
      : [
          { id: 'content', label: 'Content' },
          { id: 'assets', label: 'Assets' },
          { id: 'guide', label: 'Evaluation guide' },
        ]

  if (mode === 'edit' && questionQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Dang tai du lieu cau hoi...
      </section>
    )
  }

  if (mode === 'edit' && (questionQuery.isError || !questionQuery.data)) {
    return (
      <section className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        <span>{getErrorMessage(questionQuery.error)}</span>
        <button
          className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
          onClick={() => navigate(-1)}
          type="button"
        >
          Quay lai
        </button>
      </section>
    )
  }

  if (mode === 'edit' && !canEdit) {
    return (
      <section className="grid gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">
        <span>
          Ban khong co quyen chinh sua question nay theo role hoac trang thai hien tai.
        </span>
        <button
          className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-bold text-white"
          onClick={() => navigate(`${basePath}/questions/${questionId}`)}
          type="button"
        >
          Ve trang chi tiet
        </button>
      </section>
    )
  }

  return (
    <section className="grid gap-6">
      {successMessage ? (
        <SuccessPopup
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      ) : null}

      <div className="flex items-center justify-between gap-4">
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
            {mode === 'create' ? 'Tao cau hoi' : 'Cap nhat cau hoi'}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            {mode === 'create'
              ? 'Buoc dau chi tao phan content cua cau hoi. Assets va evaluation guide se bo sung sau o trang cap nhat.'
              : 'Cap nhat tung phan noi dung, assets va evaluation guide theo tab rieng.'}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-1">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              className={[
                'rounded-lg px-4 py-2 text-sm font-bold transition',
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50',
              ].join(' ')}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Ma cau hoi
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              disabled={isSubmitting || questionQuery.isLoading || mode === 'edit'}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
              value={form.code}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Noi dung cau hoi
            <textarea
              className="min-h-28 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              disabled={isSubmitting || questionQuery.isLoading}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  questionText: event.target.value,
                }))
              }
              value={form.questionText}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Loai cau hoi
              <select
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                disabled={isSubmitting || questionQuery.isLoading}
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
              Huong dan
              <input
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                disabled={isSubmitting || questionQuery.isLoading}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    instructionText: event.target.value,
                  }))
                }
                value={form.instructionText}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <InputField
              disabled={isSubmitting || questionQuery.isLoading}
              label="Thoi gian chuan bi"
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
              disabled={isSubmitting || questionQuery.isLoading}
              label="Phan hoi toi thieu"
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  minResponseSeconds: value,
                }))
              }
              type="number"
              value={form.minResponseSeconds}
            />
            <InputField
              disabled={isSubmitting || questionQuery.isLoading}
              label="Phan hoi toi da"
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  maxResponseSeconds: value,
                }))
              }
              type="number"
              value={form.maxResponseSeconds}
            />
          </div>

          <TextareaField
            disabled={isSubmitting || questionQuery.isLoading}
            label="Prompt"
            onChange={(value) =>
              setForm((current) => ({ ...current, promptText: value }))
            }
            value={form.promptText}
          />

          <TextareaField
            disabled={isSubmitting || questionQuery.isLoading}
            label="Noi dung chuan bi"
            onChange={(value) =>
              setForm((current) => ({ ...current, preparationText: value }))
            }
            value={form.preparationText}
          />

          <div className="flex flex-wrap justify-end gap-3">
            {mode === 'edit' ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                disabled={!canDelete || isSubmitting}
                onClick={handleDeleteQuestion}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Xoa question
              </button>
            ) : null}
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => navigate(-1)}
              type="button"
            >
              Huy
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              disabled={isSubmitting || questionQuery.isLoading}
              type="submit"
            >
              <Save aria-hidden="true" className="size-4" />
              {mode === 'create' ? 'Tao content' : 'Luu content'}
            </button>
          </div>
        </form>
      ) : null}

      {mode === 'edit' && activeTab === 'assets' ? (
        <form
          className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6"
          onSubmit={handleAssetsSubmit}
        >
          {assetForm.map((asset, index) => (
            <div className="grid gap-4 rounded-lg border border-slate-200 p-4" key={index}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-950">
                  Asset {index + 1}
                </h2>
                {assetForm.length > 1 ? (
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
                    onClick={() =>
                      setAssetForm((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    type="button"
                  >
                    Xoa dong
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  disabled={isSubmitting}
                  label="Tieu de"
                  onChange={(value) =>
                    setAssetForm((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title: value } : item,
                      ),
                    )
                  }
                  value={asset.title}
                />
                <InputField
                  disabled={isSubmitting}
                  label="Loai asset"
                  onChange={(value) =>
                    setAssetForm((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, type: value } : item,
                      ),
                    )
                  }
                  value={asset.type}
                />
                <InputField
                  disabled={isSubmitting}
                  label="URL"
                  onChange={(value) =>
                    setAssetForm((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, url: value } : item,
                      ),
                    )
                  }
                  value={asset.url}
                />
                <InputField
                  disabled={isSubmitting}
                  label="Thoi luong"
                  onChange={(value) =>
                    setAssetForm((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, durationSeconds: value }
                          : item,
                      ),
                    )
                  }
                  type="number"
                  value={asset.durationSeconds}
                />
                <InputField
                  disabled={isSubmitting}
                  label="Thu tu"
                  onChange={(value) =>
                    setAssetForm((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, order: value } : item,
                      ),
                    )
                  }
                  type="number"
                  value={asset.order}
                />
                <InputField
                  disabled={isSubmitting}
                  label="Alt text"
                  onChange={(value) =>
                    setAssetForm((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, altText: value } : item,
                      ),
                    )
                  }
                  value={asset.altText}
                />
              </div>

              <TextareaField
                disabled={isSubmitting}
                label="Mo ta"
                onChange={(value) =>
                  setAssetForm((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, description: value } : item,
                    ),
                  )
                }
                value={asset.description}
              />
              <TextareaField
                disabled={isSubmitting}
                label="Transcript"
                onChange={(value) =>
                  setAssetForm((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, transcript: value } : item,
                    ),
                  )
                }
                value={asset.transcript}
              />
            </div>
          ))}

          <div className="flex flex-wrap justify-between gap-3">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() =>
                setAssetForm((current) => [...current, createAssetForm()])
              }
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Them asset
            </button>

            <div className="flex gap-3">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                disabled={
                  !questionQuery.data?.assets?.length ||
                  isSubmitting ||
                  !canDeleteAssetsOrGuide
                }
                onClick={handleDeleteAssets}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Xoa assets
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                <Save aria-hidden="true" className="size-4" />
                {questionQuery.data?.assets?.length ? 'Cap nhat assets' : 'Tao assets'}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {mode === 'edit' && activeTab === 'guide' ? (
        <form
          className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6"
          onSubmit={handleGuideSubmit}
        >
          <TextareaField
            disabled={isSubmitting}
            label="Expected content"
            onChange={(value) =>
              setGuideForm((current) => ({ ...current, expectedContent: value }))
            }
            value={guideForm.expectedContent}
          />
          <TextareaField
            disabled={isSubmitting}
            label="Key points"
            onChange={(value) =>
              setGuideForm((current) => ({ ...current, keyPoints: value }))
            }
            value={guideForm.keyPoints}
          />
          <TextareaField
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
            label="Scoring hints"
            onChange={(value) =>
              setGuideForm((current) => ({ ...current, scoringHints: value }))
            }
            value={guideForm.scoringHints}
          />
          <TextareaField
            disabled={isSubmitting}
            label="Common mistakes"
            onChange={(value) =>
              setGuideForm((current) => ({ ...current, commonMistakes: value }))
            }
            value={guideForm.commonMistakes}
          />

          <div className="flex justify-end gap-3">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              disabled={
                !questionQuery.data?.evaluationGuide ||
                isSubmitting ||
                !canDeleteAssetsOrGuide
              }
              onClick={handleDeleteGuide}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Xoa guide
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              <Save aria-hidden="true" className="size-4" />
              {questionQuery.data?.evaluationGuide ? 'Cap nhat guide' : 'Tao guide'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function InputField({
  disabled = false,
  label,
  onChange,
  type = 'text',
  value,
}: {
  disabled?: boolean
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
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  )
}

function TextareaField({
  disabled = false,
  label,
  onChange,
  value,
}: {
  disabled?: boolean
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea
        className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}

export function TeacherCreateQuestionPage() {
  return <QuestionEditorPage basePath="/teacher" mode="create" scope="teacher" />
}

export function TeacherEditQuestionPage() {
  return <QuestionEditorPage basePath="/teacher" mode="edit" scope="teacher" />
}

export function SchoolAdminCreateQuestionPage() {
  return (
    <QuestionEditorPage basePath="/school-admin" mode="create" scope="school" />
  )
}

export function SchoolAdminEditQuestionPage() {
  return (
    <QuestionEditorPage basePath="/school-admin" mode="edit" scope="school" />
  )
}

export function SystemAdminCreateQuestionPage() {
  return (
    <QuestionEditorPage basePath="/system-admin" mode="create" scope="admin" />
  )
}

export function SystemAdminEditQuestionPage() {
  return (
    <QuestionEditorPage basePath="/system-admin" mode="edit" scope="admin" />
  )
}
