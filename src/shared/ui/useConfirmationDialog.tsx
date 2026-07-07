import { useEffect, useRef, useState } from 'react'
import { ConfirmationDialog } from './ConfirmationDialog'

type ConfirmOptions = {
  cancelLabel?: string
  confirmLabel?: string
  message: string
  title?: string
}

type ConfirmState = ConfirmOptions & {
  isOpen: boolean
}

const DEFAULT_STATE: ConfirmState = {
  cancelLabel: 'No',
  confirmLabel: 'Yes',
  isOpen: false,
  message: '',
  title: 'Xac nhan thao tac',
}

export function useConfirmationDialog() {
  const resolverRef = useRef<((value: boolean) => void) | null>(null)
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE)

  useEffect(() => {
    return () => {
      resolverRef.current?.(false)
      resolverRef.current = null
    }
  }, [])

  function closeWith(value: boolean) {
    resolverRef.current?.(value)
    resolverRef.current = null
    setState((current) => ({ ...current, isOpen: false }))
  }

  function confirm(options: ConfirmOptions) {
    setState({
      cancelLabel: options.cancelLabel ?? 'No',
      confirmLabel: options.confirmLabel ?? 'Yes',
      isOpen: true,
      message: options.message,
      title: options.title ?? 'Xac nhan thao tac',
    })

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }

  return {
    confirm,
    dialog: (
      <ConfirmationDialog
        cancelLabel={state.cancelLabel}
        confirmLabel={state.confirmLabel}
        isOpen={state.isOpen}
        message={state.message}
        onCancel={() => closeWith(false)}
        onConfirm={() => closeWith(true)}
        title={state.title}
      />
    ),
  }
}
