import { useCallback, useState } from 'react'
import { FeedbackToast } from './FeedbackToast'

type ToastState = { message: string; tone: 'error' | 'success' } | null

export function useFeedbackToast() {
  const [state, setState] = useState<ToastState>(null)

  const showError = useCallback((message: string) => setState({ message, tone: 'error' }), [])
  const showSuccess = useCallback((message: string) => setState({ message, tone: 'success' }), [])
  const close = useCallback(() => setState(null), [])

  return {
    showError,
    showSuccess,
    feedbackToast: (
      <FeedbackToast message={state?.message ?? null} onClose={close} tone={state?.tone ?? 'error'} />
    ),
  }
}
