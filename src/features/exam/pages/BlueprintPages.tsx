import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import {
  useCreateBlueprintMutation,
  useCreateBlueprintVersionMutation,
  useDeleteBlueprintMutation,
  useUpdateBlueprintMutation,
  useUpdateBlueprintVersionStatusMutation,
} from '../api/useExamMutations'
import { examQueryKeys, useExamBlueprintQuery, useExamBlueprintsQuery } from '../api/useExamQueries'
import type {
  CreateExamBlueprintRequest,
  CreateExamBlueprintVersionRequest,
  ExamBlueprintSectionInput,
  ExamBlueprintSlotInput,
} from '../types'
import {
  formatDateTime,
  formatNullableText,
  getBlueprintVersionStatusDisplay,
} from '../types'

const DEFAULT_LANGUAGE_ID = '00000000-0000-0000-0000-000000000001'

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Khong the xu ly blueprint.'
}

type BlueprintListPageProps = {
  basePath: string
  readOnly?: boolean
  title: string
}

function BlueprintListPage({ basePath, readOnly = false, title }: BlueprintListPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const blueprintsQuery = useExamBlueprintsQuery({ keyword, page: 1, size: 10 })
  const createMutation = useCreateBlueprintMutation()
  const deleteMutation = useDeleteBlueprintMutation()

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-950">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Quan ly danh sach blueprint va version cua de thi.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"
            onClick={() => void blueprintsQuery.refetch()}
            type="button"
          >
            Lam moi
          </button>
          {!readOnly ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
              onClick={() => setShowCreate((current) => !current)}
              type="button"
            >
              {showCreate ? 'Dong form' : 'Tao blueprint'}
            </button>
          ) : null}
        </div>
      </div>

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {showCreate ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const payload: CreateExamBlueprintRequest = {
              code: String(form.get('code') ?? ''),
              description: String(form.get('description') ?? '') || null,
              languageId: DEFAULT_LANGUAGE_ID,
              name: String(form.get('name') ?? ''),
            }
            void (async () => {
              try {
                const result = await createMutation.mutateAsync(payload)
                await refresh()
                setMessage(result)
                setError(null)
                setShowCreate(false)
              } catch (submitError) {
                setError(getErrorMessage(submitError))
              }
            })()
          }}
        >
          <Field label="Code" name="code" />
          <Field label="Ten blueprint" name="name" />
          <Field label="Mo ta" name="description" />
          <div className="md:col-span-3 flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
              Tao blueprint
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <Field label="Tu khoa" name="keyword" onValueChange={setKeyword} value={keyword} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Blueprint</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Thao tac</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {blueprintsQuery.data?.content.map((blueprint) => (
              <tr key={blueprint.id}>
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <span className="text-sm font-black text-slate-950">{blueprint.name}</span>
                    <span className="text-xs font-medium text-slate-500">{formatNullableText(blueprint.description)}</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-600">{blueprint.code}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">{blueprint.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">{formatDateTime(blueprint.updatedAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
                      onClick={() => navigate(`${basePath}/${blueprint.id}`)}
                      type="button"
                    >
                      Chi tiet
                    </button>
                    {!readOnly ? (
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600"
                        onClick={() => {
                          void (async () => {
                            try {
                              const result = await deleteMutation.mutateAsync(blueprint.id)
                              await refresh()
                              setMessage(result)
                              setError(null)
                            } catch (submitError) {
                              setError(getErrorMessage(submitError))
                            }
                          })()
                        }}
                        type="button"
                      >
                        Xoa
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

type BlueprintDetailPageProps = {
  canEdit: boolean
  title: string
}

function BlueprintDetailPage({ canEdit, title }: BlueprintDetailPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { blueprintId } = useParams()
  const blueprintQuery = useExamBlueprintQuery(blueprintId ?? null)
  const blueprint = blueprintQuery.data
  const updateBlueprintMutation = useUpdateBlueprintMutation()
  const createVersionMutation = useCreateBlueprintVersionMutation()
  const updateVersionStatusMutation = useUpdateBlueprintVersionStatusMutation()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sections, setSections] = useState<ExamBlueprintSectionInput[]>([
    {
      instruction: '',
      order: 1,
      sectionTimeLimitSeconds: 0,
      sectionWeight: 1,
      slots: [{ fixedQuestionId: '', order: 1, slotType: 'FIXED', weight: 1 }],
      title: 'Section 1',
    },
  ])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (!blueprint) {
    if (blueprintQuery.isLoading) {
      return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">Dang tai blueprint...</section>
    }
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Khong tim thay blueprint.</section>
  }

  return (
    <section className="grid gap-6">
      <div>
        <button className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600" onClick={() => navigate(-1)} type="button">
          Quay lai
        </button>
        <h1 className="text-3xl font-black text-blue-950">{title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Xem thong tin blueprint, version va tao draft version moi.
        </p>
      </div>

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
        <InfoItem label="Ten" value={blueprint.name} />
        <InfoItem label="Code" value={blueprint.code} />
        <InfoItem label="Active" value={blueprint.isActive ? 'Yes' : 'No'} />
        <InfoItem label="Updated" value={formatDateTime(blueprint.updatedAt)} />
      </div>

      {canEdit ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void (async () => {
              try {
                const result = await updateBlueprintMutation.mutateAsync({
                  blueprintId: blueprint.id,
                  payload: {
                    description: description || blueprint.description || null,
                    name: name || blueprint.name,
                  },
                })
                await refresh()
                setMessage(result)
                setError(null)
              } catch (submitError) {
                setError(getErrorMessage(submitError))
              }
            })()
          }}
        >
          <Field label="Ten blueprint" name="blueprint-name" onValueChange={setName} value={name} />
          <Field label="Mo ta" name="blueprint-description" onValueChange={setDescription} value={description} />
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
              Luu thong tin
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-950">Versions</h2>
        </div>
        <div className="grid gap-4">
          {blueprint.versions?.map((version) => {
            const status = getBlueprintVersionStatusDisplay(version.status)
            return (
              <div className="grid gap-4 rounded-lg border border-slate-200 p-4" key={version.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">Version {version.version} - {version.code}</p>
                    <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
                  </div>
                  {canEdit ? (
                    <div className="flex gap-2">
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"
                        onClick={() => {
                          void (async () => {
                            try {
                              const result = await updateVersionStatusMutation.mutateAsync({
                                payload: { action: 'PUBLISH' },
                                versionId: version.id,
                              })
                              await refresh()
                              setMessage(result)
                              setError(null)
                            } catch (submitError) {
                              setError(getErrorMessage(submitError))
                            }
                          })()
                        }}
                        type="button"
                      >
                        Publish
                      </button>
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"
                        onClick={() => {
                          void (async () => {
                            try {
                              const result = await updateVersionStatusMutation.mutateAsync({
                                payload: { action: 'ARCHIVE' },
                                versionId: version.id,
                              })
                              await refresh()
                              setMessage(result)
                              setError(null)
                            } catch (submitError) {
                              setError(getErrorMessage(submitError))
                            }
                          })()
                        }}
                        type="button"
                      >
                        Archive
                      </button>
                    </div>
                  ) : null}
                </div>
                {version.sections.map((section) => (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-4" key={section.id}>
                    <p className="text-sm font-black text-slate-950">
                      Section {section.order}: {section.title}
                    </p>
                    <div className="mt-2 grid gap-2">
                      {section.slots.map((slot) => (
                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700" key={slot.id}>
                          Slot {slot.order} - {slot.slotType}
                          {slot.fixedQuestion?.code ? ` - ${slot.fixedQuestion.code}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {canEdit ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6"
          onSubmit={(event) => {
            event.preventDefault()
            const payload: CreateExamBlueprintVersionRequest = {
              sections,
              totalTimeLimitSeconds: sections.reduce(
                (sum, section) => sum + (section.sectionTimeLimitSeconds ?? 0),
                0,
              ),
            }
            void (async () => {
              try {
                const result = await createVersionMutation.mutateAsync({
                  blueprintId: blueprint.id,
                  payload,
                })
                await refresh()
                setMessage(result)
                setError(null)
              } catch (submitError) {
                setError(getErrorMessage(submitError))
              }
            })()
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950">Tao draft version</h2>
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
              onClick={() =>
                setSections((current) => [
                  ...current,
                  {
                    instruction: '',
                    order: current.length + 1,
                    sectionTimeLimitSeconds: 0,
                    sectionWeight: 1,
                    slots: [{ fixedQuestionId: '', order: 1, slotType: 'FIXED', weight: 1 }],
                    title: `Section ${current.length + 1}`,
                  },
                ])
              }
              type="button"
            >
              Them section
            </button>
          </div>

          {sections.map((section, sectionIndex) => (
            <div className="grid gap-4 rounded-lg border border-slate-200 p-4" key={`section-${sectionIndex}`}>
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Tieu de section"
                  name={`section-title-${sectionIndex}`}
                  onValueChange={(value) =>
                    setSections((current) =>
                      current.map((item, index) => (index === sectionIndex ? { ...item, title: value } : item)),
                    )
                  }
                  value={section.title}
                />
                <Field
                  label="Section time"
                  name={`section-time-${sectionIndex}`}
                  onValueChange={(value) =>
                    setSections((current) =>
                      current.map((item, index) =>
                        index === sectionIndex ? { ...item, sectionTimeLimitSeconds: Number(value) || 0 } : item,
                      ),
                    )
                  }
                  value={String(section.sectionTimeLimitSeconds ?? 0)}
                />
                <Field
                  label="Section weight"
                  name={`section-weight-${sectionIndex}`}
                  onValueChange={(value) =>
                    setSections((current) =>
                      current.map((item, index) =>
                        index === sectionIndex ? { ...item, sectionWeight: Number(value) || 1 } : item,
                      ),
                    )
                  }
                  value={String(section.sectionWeight ?? 1)}
                />
              </div>
              {section.slots.map((slot, slotIndex) => (
                <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 md:grid-cols-4" key={`slot-${sectionIndex}-${slotIndex}`}>
                  <SelectField
                    label="Slot type"
                    onChange={(value) =>
                      setSections((current) =>
                        current.map((item, currentSectionIndex) =>
                          currentSectionIndex === sectionIndex
                            ? {
                                ...item,
                                slots: item.slots.map((currentSlot, currentSlotIndex) =>
                                  currentSlotIndex === slotIndex
                                    ? { ...currentSlot, slotType: value as ExamBlueprintSlotInput['slotType'] }
                                    : currentSlot,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    options={[
                      { label: 'Fixed', value: 'FIXED' },
                      { label: 'Selection', value: 'SELECTION' },
                    ]}
                    value={slot.slotType}
                  />
                  <Field
                    label="Fixed question ID"
                    name={`fixed-question-${sectionIndex}-${slotIndex}`}
                    onValueChange={(value) =>
                      setSections((current) =>
                        current.map((item, currentSectionIndex) =>
                          currentSectionIndex === sectionIndex
                            ? {
                                ...item,
                                slots: item.slots.map((currentSlot, currentSlotIndex) =>
                                  currentSlotIndex === slotIndex
                                    ? { ...currentSlot, fixedQuestionId: value }
                                    : currentSlot,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    value={slot.fixedQuestionId ?? ''}
                  />
                  <Field
                    label="Weight"
                    name={`slot-weight-${sectionIndex}-${slotIndex}`}
                    onValueChange={(value) =>
                      setSections((current) =>
                        current.map((item, currentSectionIndex) =>
                          currentSectionIndex === sectionIndex
                            ? {
                                ...item,
                                slots: item.slots.map((currentSlot, currentSlotIndex) =>
                                  currentSlotIndex === slotIndex
                                    ? { ...currentSlot, weight: Number(value) || 1 }
                                    : currentSlot,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    value={String(slot.weight ?? 1)}
                  />
                  <div className="self-end">
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"
                      onClick={() =>
                        setSections((current) =>
                          current.map((item, currentSectionIndex) =>
                            currentSectionIndex === sectionIndex
                              ? {
                                  ...item,
                                  slots: [
                                    ...item.slots,
                                    {
                                      fixedQuestionId: '',
                                      order: item.slots.length + 1,
                                      slotType: 'FIXED',
                                      weight: 1,
                                    },
                                  ],
                                }
                              : item,
                          ),
                        )
                      }
                      type="button"
                    >
                      Them slot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
              Tao draft version
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function Field({
  label,
  name,
  onValueChange,
  value,
}: {
  label: string
  name: string
  onValueChange?: (value: string) => void
  value?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        name={name}
        onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
        value={value}
      />
    </label>
  )
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-bold text-slate-950">{value}</div>
    </div>
  )
}

function Notice({ children, tone }: { children: ReactNode; tone: 'error' | 'success' }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {children}
    </div>
  )
}

export function TeacherBlueprintsPage() {
  return <BlueprintListPage basePath="/teacher/blueprints" title="Blueprint de thi" />
}

export function TeacherBlueprintDetailPage() {
  return <BlueprintDetailPage canEdit title="Chi tiet blueprint" />
}

export function SchoolAdminBlueprintsPage() {
  return <BlueprintListPage basePath="/school-admin/blueprints" readOnly title="Giam sat blueprint de thi" />
}

export function SchoolAdminBlueprintDetailPage() {
  return <BlueprintDetailPage canEdit={false} title="Chi tiet blueprint" />
}

export function SystemAdminBlueprintsPage() {
  return <BlueprintListPage basePath="/system-admin/blueprints" readOnly title="Giam sat blueprint he thong" />
}

export function SystemAdminBlueprintDetailPage() {
  return <BlueprintDetailPage canEdit={false} title="Chi tiet blueprint" />
}
