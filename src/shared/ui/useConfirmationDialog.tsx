import { useEffect, useRef, useState } from 'react'
import { ConfirmationDialog } from './ConfirmationDialog'

type ConfirmOptions = {
  cancelLabel?: string
  confirmLabel?: string
  message: string
  title?: string
}

type ConfirmWithReasonOptions = ConfirmOptions & {
  reasonLabel?: string
  reasonPlaceholder?: string
}

type ConfirmResultResolver =
  | { kind: 'boolean'; resolve: (value: boolean) => void }
  | { kind: 'reason'; resolve: (value: { confirmed: boolean; reason: string }) => void }

type ConfirmState = ConfirmOptions & {
  isOpen: boolean
  reason: string
  reasonLabel?: string
  reasonPlaceholder?: string
  showReasonField: boolean
}

const DEFAULT_STATE: ConfirmState = {
  cancelLabel: 'Không',
  confirmLabel: 'Xác nhận',
  isOpen: false,
  message: '',
  reason: '',
  reasonLabel: 'Lý do',
  reasonPlaceholder: 'Nhập lý do nếu cần...',
  showReasonField: false,
  title: 'Xác nhận thao tác',
}

export function useConfirmationDialog() {
  const resolverRef = useRef<ConfirmResultResolver | null>(null)
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE)

  useEffect(() => {
    return () => {
      if (!resolverRef.current) {
        return
      }

      if (resolverRef.current.kind === 'boolean') {
        resolverRef.current.resolve(false)
      } else {
        resolverRef.current.resolve({ confirmed: false, reason: '' })
      }
      resolverRef.current = null
    }
  }, [])

  function closeWithBoolean(value: boolean) {
    if (resolverRef.current?.kind === 'boolean') {
      resolverRef.current.resolve(value)
    }
    resolverRef.current = null
    setState(DEFAULT_STATE)
  }

  function closeWithReason(confirmed: boolean) {
    if (resolverRef.current?.kind === 'reason') {
      resolverRef.current.resolve({
        confirmed,
        reason: confirmed ? state.reason.trim() : '',
      })
    }
    resolverRef.current = null
    setState(DEFAULT_STATE)
  }

  function confirm(options: ConfirmOptions) {
    setState({
      cancelLabel: options.cancelLabel ?? 'Không',
      confirmLabel: options.confirmLabel ?? 'Xác nhận',
      isOpen: true,
      message: options.message,
      reason: '',
      reasonLabel: 'Lý do',
      reasonPlaceholder: 'Nhập lý do nếu cần...',
      showReasonField: false,
      title: options.title ?? 'Xác nhận thao tác',
    })

    return new Promise<boolean>((resolve) => {
      resolverRef.current = { kind: 'boolean', resolve }
    })
  }

  function confirmWithReason(options: ConfirmWithReasonOptions) {
    setState({
      cancelLabel: options.cancelLabel ?? 'Không',
      confirmLabel: options.confirmLabel ?? 'Xác nhận',
      isOpen: true,
      message: options.message,
      reason: '',
      reasonLabel: options.reasonLabel ?? 'Lý do',
      reasonPlaceholder: options.reasonPlaceholder ?? 'Nhập lý do nếu cần...',
      showReasonField: true,
      title: options.title ?? 'Xác nhận thao tác',
    })

    return new Promise<{ confirmed: boolean; reason: string }>((resolve) => {
      resolverRef.current = { kind: 'reason', resolve }
    })
  }

  return {
    confirm,
    confirmWithReason,
    dialog: (
      <ConfirmationDialog
        cancelLabel={state.cancelLabel}
        confirmLabel={state.confirmLabel}
        isOpen={state.isOpen}
        message={state.message}
        onCancel={() => {
          if (resolverRef.current?.kind === 'reason') {
            closeWithReason(false)
            return
          }
          closeWithBoolean(false)
        }}
        onConfirm={() => {
          if (resolverRef.current?.kind === 'reason') {
            closeWithReason(true)
            return
          }
          closeWithBoolean(true)
        }}
        onReasonChange={(value) => setState((current) => ({ ...current, reason: value }))}
        reasonLabel={state.reasonLabel}
        reasonPlaceholder={state.reasonPlaceholder}
        reasonValue={state.reason}
        showReasonField={state.showReasonField}
        title={state.title}
      />
    ),
  }
}
