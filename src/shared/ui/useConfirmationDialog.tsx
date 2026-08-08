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
  /** Chặn nút "Xác nhận" tới khi lý do có nội dung thật (không chỉ khoảng trắng). */
  requireReason?: boolean
}

type SelectOption = {
  label: string
  value: string
}

type ConfirmWithSelectionOptions = ConfirmOptions & {
  selectLabel?: string
  selectOptions: SelectOption[]
  selectPlaceholder?: string
}

type ConfirmResultResolver =
  | { kind: 'boolean'; resolve: (value: boolean) => void }
  | { kind: 'reason'; resolve: (value: { confirmed: boolean; reason: string }) => void }
  | { kind: 'selection'; resolve: (value: { confirmed: boolean; selection: string }) => void }

type ConfirmState = ConfirmOptions & {
  isOpen: boolean
  reason: string
  reasonLabel?: string
  reasonPlaceholder?: string
  requireReason: boolean
  selection: string
  selectLabel?: string
  selectOptions: SelectOption[]
  selectPlaceholder?: string
  showReasonField: boolean
  showSelectField: boolean
}

const DEFAULT_STATE: ConfirmState = {
  cancelLabel: 'Không',
  confirmLabel: 'Xác nhận',
  isOpen: false,
  message: '',
  reason: '',
  reasonLabel: 'Lý do',
  reasonPlaceholder: 'Nhập lý do nếu cần...',
  requireReason: false,
  selection: '',
  selectLabel: '',
  selectOptions: [],
  selectPlaceholder: '',
  showReasonField: false,
  showSelectField: false,
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
      } else if (resolverRef.current.kind === 'reason') {
        resolverRef.current.resolve({ confirmed: false, reason: '' })
      } else {
        resolverRef.current.resolve({ confirmed: false, selection: '' })
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
    // Chặn xác nhận với lý do rỗng/toàn khoảng trắng khi dialog yêu cầu bắt buộc - nút "Xác
    // nhận" đã bị disable cho trường hợp này, đây là lớp phòng vệ thứ hai (vd: Enter trong form).
    if (confirmed && state.requireReason && !state.reason.trim()) {
      return
    }
    if (resolverRef.current?.kind === 'reason') {
      resolverRef.current.resolve({
        confirmed,
        reason: confirmed ? state.reason.trim() : '',
      })
    }
    resolverRef.current = null
    setState(DEFAULT_STATE)
  }

  function closeWithSelection(confirmed: boolean) {
    if (resolverRef.current?.kind === 'selection') {
      resolverRef.current.resolve({
        confirmed,
        selection: confirmed ? state.selection : '',
      })
    }
    resolverRef.current = null
    setState(DEFAULT_STATE)
  }

  function confirm(options: ConfirmOptions) {
    setState({
      ...DEFAULT_STATE,
      cancelLabel: options.cancelLabel ?? 'Không',
      confirmLabel: options.confirmLabel ?? 'Xác nhận',
      isOpen: true,
      message: options.message,
      title: options.title ?? 'Xác nhận thao tác',
    })

    return new Promise<boolean>((resolve) => {
      resolverRef.current = { kind: 'boolean', resolve }
    })
  }

  function confirmWithReason(options: ConfirmWithReasonOptions) {
    setState({
      ...DEFAULT_STATE,
      cancelLabel: options.cancelLabel ?? 'Không',
      confirmLabel: options.confirmLabel ?? 'Xác nhận',
      isOpen: true,
      message: options.message,
      reasonLabel: options.reasonLabel ?? 'Lý do',
      reasonPlaceholder: options.reasonPlaceholder ?? 'Nhập lý do nếu cần...',
      requireReason: options.requireReason ?? false,
      showReasonField: true,
      title: options.title ?? 'Xác nhận thao tác',
    })

    return new Promise<{ confirmed: boolean; reason: string }>((resolve) => {
      resolverRef.current = { kind: 'reason', resolve }
    })
  }

  function confirmWithSelection(options: ConfirmWithSelectionOptions) {
    setState({
      ...DEFAULT_STATE,
      cancelLabel: options.cancelLabel ?? 'Không',
      confirmLabel: options.confirmLabel ?? 'Xác nhận',
      isOpen: true,
      message: options.message,
      selectLabel: options.selectLabel ?? '',
      selectOptions: options.selectOptions,
      selectPlaceholder: options.selectPlaceholder ?? '',
      showSelectField: true,
      title: options.title ?? 'Xác nhận thao tác',
    })

    return new Promise<{ confirmed: boolean; selection: string }>((resolve) => {
      resolverRef.current = { kind: 'selection', resolve }
    })
  }

  function handleCancel() {
    if (resolverRef.current?.kind === 'reason') {
      closeWithReason(false)
      return
    }
    if (resolverRef.current?.kind === 'selection') {
      closeWithSelection(false)
      return
    }
    closeWithBoolean(false)
  }

  function handleConfirm() {
    if (resolverRef.current?.kind === 'reason') {
      closeWithReason(true)
      return
    }
    if (resolverRef.current?.kind === 'selection') {
      closeWithSelection(true)
      return
    }
    closeWithBoolean(true)
  }

  return {
    confirm,
    confirmWithReason,
    confirmWithSelection,
    dialog: (
      <ConfirmationDialog
        cancelLabel={state.cancelLabel}
        confirmDisabled={state.requireReason && !state.reason.trim()}
        confirmLabel={state.confirmLabel}
        isOpen={state.isOpen}
        message={state.message}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        onReasonChange={(value) => setState((current) => ({ ...current, reason: value }))}
        onSelectChange={(value) => setState((current) => ({ ...current, selection: value }))}
        reasonLabel={state.reasonLabel}
        reasonPlaceholder={state.reasonPlaceholder}
        reasonValue={state.reason}
        selectLabel={state.selectLabel}
        selectOptions={state.selectOptions}
        selectPlaceholder={state.selectPlaceholder}
        selectValue={state.selection}
        showReasonField={state.showReasonField}
        showSelectField={state.showSelectField}
        title={state.title}
      />
    ),
  }
}
