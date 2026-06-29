import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, ChevronLeft, X } from 'lucide-react'
import type { QuestionBankDto } from '../types'

export type QuestionBankFormMode = 'create' | 'edit'

export type QuestionBankFormValues = {
  code: string
  description: string
  name: string
}

type QuestionBankFormDialogProps = {
  errorMessage?: string
  isSubmitting: boolean
  mode: QuestionBankFormMode | null
  onClose: () => void
  onSubmit: (mode: QuestionBankFormMode, payload: QuestionBankFormValues) => void
  questionBank: QuestionBankDto | null
}

function createFormState(bank: QuestionBankDto | null): QuestionBankFormValues {
  return {
    code: bank?.code ?? '',
    description: bank?.description ?? '',
    name: bank?.name ?? bank?.bankName ?? '',
  }
}

function trimFormState(state: QuestionBankFormValues): QuestionBankFormValues {
  return {
    code: state.code.trim(),
    description: state.description.trim(),
    name: state.name.trim(),
  }
}

export function QuestionBankFormDialog({
  errorMessage,
  isSubmitting,
  mode,
  questionBank,
  onClose,
  onSubmit,
}: QuestionBankFormDialogProps) {
  if (!mode) {
    return null
  }

  const isCreateMode = mode === 'create'
  const [form, setForm] = useState(() => createFormState(questionBank))
  const [step, setStep] = useState<'confirm' | 'form'>('form')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = trimFormState(form)

    if (isCreateMode && !values.code) {
      setValidationMessage('Ma ngan hang khong duoc de trong.')
      return
    }

    if (!values.name) {
      setValidationMessage('Ten ngan hang khong duoc de trong.')
      return
    }

    setValidationMessage(null)
    setStep('confirm')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-blue-950">
              {isCreateMode ? 'Tao ngan hang cau hoi' : 'Chinh sua ngan hang cau hoi'}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isCreateMode
                ? 'Nhap thong tin ngan hang theo contract moi.'
                : 'Chi cap nhat ten va mo ta khi bank dang o DRAFT.'}
            </p>
          </div>
          <button
            aria-label="Dong"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {step === 'form' ? (
            <form className="grid gap-5" onSubmit={handleSubmit}>
              {isCreateMode ? (
                <Field
                  label="Ma ngan hang"
                  onChange={(value) => {
                    setForm((current) => ({ ...current, code: value }))
                    setValidationMessage(null)
                  }}
                  required
                  value={form.code}
                />
              ) : null}

              <Field
                label="Ten ngan hang"
                onChange={(value) => {
                  setForm((current) => ({ ...current, name: value }))
                  setValidationMessage(null)
                }}
                required
                value={form.name}
              />

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Mo ta
                <textarea
                  className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                    setValidationMessage(null)
                  }}
                  value={form.description}
                />
              </label>

              {validationMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {validationMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  disabled={isSubmitting}
                  onClick={onClose}
                  type="button"
                >
                  Huy
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-black text-white transition hover:opacity-90"
                  disabled={isSubmitting}
                  type="submit"
                >
                  <Check className="size-4" />
                  {isCreateMode ? 'Tiep tuc tao' : 'Tiep tuc cap nhat'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Vui long xac nhan thong tin truoc khi luu.
              </div>

              <dl className="grid gap-3 rounded-lg border border-slate-200 px-4 py-4">
                {isCreateMode ? (
                  <ConfirmItem label="Ma ngan hang" value={form.code || '-'} />
                ) : null}
                <ConfirmItem label="Ten ngan hang" value={form.name || '-'} />
                <ConfirmItem label="Mo ta" value={form.description || '-'} />
              </dl>

              {errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  disabled={isSubmitting}
                  onClick={() => setStep('form')}
                  type="button"
                >
                  <ChevronLeft className="size-4" />
                  Quay lai
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-black text-white transition hover:opacity-90"
                  disabled={isSubmitting}
                  onClick={() => onSubmit(mode, trimFormState(form))}
                  type="button"
                >
                  <Check className="size-4" />
                  {isSubmitting ? 'Dang xu ly...' : isCreateMode ? 'Xac nhan tao' : 'Xac nhan cap nhat'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  onChange,
  required = false,
  value,
}: {
  label: string
  onChange: (value: string) => void
  required?: boolean
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      <span>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}

function ConfirmItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-bold text-blue-950">{value}</dd>
    </div>
  )
}
