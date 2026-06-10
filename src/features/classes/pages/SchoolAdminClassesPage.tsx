import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import {
  useAddClassUserMutation,
  useCreateSchoolClassMutation,
  useDeleteSchoolClassMutation,
  useRemoveClassUserMutation,
  useUpdateClassUserStatusMutation,
  useUpdateSchoolClassMutation,
} from '../api/useSchoolClassMutations'
import { useSchoolClassQuery } from '../api/useSchoolClassQuery'
import { useSchoolClassUsersQuery } from '../api/useSchoolClassUsersQuery'
import {
  classManagementQueryKeys,
  useSchoolClassesQuery,
} from '../api/useSchoolClassesQuery'
import type {
  ClassFilters,
  ClassUser,
  CreateSchoolClassRequest,
  SchoolClass,
  SchoolClassStatus,
  UpdateSchoolClassRequest,
} from '../types'
import {
  formatClassDate,
  formatNullableText,
  getClassStatusDisplay,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_USER_PAGE_SIZE = 6
const EMPTY_FILTERS: ClassFilters = {
  languageId: '',
  schoolGradeId: '',
  search: '',
  status: '',
}

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

type ClassDialogMode = 'create' | 'edit'

type ClassFormState = {
  code: string
  description: string
  languageId: string
  name: string
  schoolGradeId: string
  status: SchoolClassStatus
}

const emptyClassForm: ClassFormState = {
  code: '',
  description: '',
  languageId: '',
  name: '',
  schoolGradeId: '',
  status: 'ACTIVE',
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

  return undefined
}

function toEditForm(schoolClass: SchoolClass): ClassFormState {
  return {
    code: schoolClass.code,
    description: schoolClass.description ?? '',
    languageId: schoolClass.languageId,
    name: schoolClass.name,
    schoolGradeId: schoolClass.schoolGradeId,
    status:
      schoolClass.status === 'ARCHIVED' || schoolClass.status === 'INACTIVE'
        ? schoolClass.status
        : 'ACTIVE',
  }
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}

type FieldInputProps = {
  disabled?: boolean
  label: string
  name: keyof ClassFormState
  onChange: (name: keyof ClassFormState, value: string) => void
  placeholder?: string
  required?: boolean
  value: string
}

function FieldInput({
  disabled = false,
  label,
  name,
  onChange,
  placeholder,
  required = false,
  value,
}: FieldInputProps) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100 disabled:text-slate-500"
        disabled={disabled}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
    </label>
  )
}

type ClassDialogProps = {
  errorMessage?: string
  form: ClassFormState
  isSubmitting: boolean
  mode: ClassDialogMode | null
  onChange: (name: keyof ClassFormState, value: string) => void
  onClose: () => void
  onSubmit: () => void
}

function ClassDialog({
  errorMessage,
  form,
  isSubmitting,
  mode,
  onChange,
  onClose,
  onSubmit,
}: ClassDialogProps) {
  if (!mode) {
    return null
  }

  const isEdit = mode === 'edit'
  const title = isEdit ? 'Edit class' : 'Create class'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <form
        aria-labelledby="class-dialog-title"
        className="grid max-h-[92vh] w-full max-w-2xl gap-5 overflow-y-auto rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-black tracking-0 text-slate-950"
              id="class-dialog-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isEdit
                ? 'Update class name, description, and status.'
                : 'Create a class for the configured school.'}
            </p>
          </div>
          <button
            aria-label="Close class dialog"
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {errorMessage ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldInput
            disabled={isEdit || isSubmitting}
            label="Class code"
            name="code"
            onChange={onChange}
            placeholder="ENG-6A"
            required={!isEdit}
            value={form.code}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Class name"
            name="name"
            onChange={onChange}
            placeholder="English 6A"
            required
            value={form.name}
          />
          <FieldInput
            disabled={isEdit || isSubmitting}
            label="Language ID"
            name="languageId"
            onChange={onChange}
            placeholder="UUID"
            required={!isEdit}
            value={form.languageId}
          />
          <FieldInput
            disabled={isEdit || isSubmitting}
            label="School grade ID"
            name="schoolGradeId"
            onChange={onChange}
            placeholder="UUID"
            required={!isEdit}
            value={form.schoolGradeId}
          />
        </div>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Description
          <textarea
            className="min-h-28 rounded-lg border border-slate-200 px-3 py-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            disabled={isSubmitting}
            onChange={(event) => onChange('description', event.target.value)}
            placeholder="Optional class description"
            value={form.description}
          />
        </label>

        {isEdit ? (
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Status
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              disabled={isSubmitting}
              onChange={(event) => onChange('status', event.target.value)}
              value={form.status}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Saving...' : 'Save class'}
          </button>
        </div>
      </form>
    </div>
  )
}

type DeleteDialogProps = {
  errorMessage?: string
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
  schoolClass: SchoolClass | null
}

function DeleteDialog({
  errorMessage,
  isSubmitting,
  onClose,
  onConfirm,
  schoolClass,
}: DeleteDialogProps) {
  if (!schoolClass) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <div
        aria-labelledby="delete-class-title"
        className="grid w-full max-w-md gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        role="dialog"
      >
        <div>
          <h2
            className="text-xl font-black tracking-0 text-slate-950"
            id="delete-class-title"
          >
            Delete class
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            This will archive class {schoolClass.code}. Existing records are
            kept by the backend soft-delete flow.
          </p>
        </div>

        {errorMessage ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

type AddUserDialogProps = {
  errorMessage?: string
  isSubmitting: boolean
  onChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
  open: boolean
  value: string
}

function AddUserDialog({
  errorMessage,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
  open,
  value,
}: AddUserDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <form
        aria-labelledby="add-user-title"
        className="grid w-full max-w-md gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        role="dialog"
      >
        <div>
          <h2
            className="text-xl font-black tracking-0 text-slate-950"
            id="add-user-title"
          >
            Add user to class
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Enter an existing user UUID to enroll them in this class.
          </p>
        </div>

        {errorMessage ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          User ID
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            disabled={isSubmitting}
            onChange={(event) => onChange(event.target.value)}
            placeholder="UUID"
            required
            value={value}
          />
        </label>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <UserPlus aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Adding...' : 'Add user'}
          </button>
        </div>
      </form>
    </div>
  )
}

type ClassTableProps = {
  classes: SchoolClass[]
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  onDelete: (schoolClass: SchoolClass) => void
  onEdit: (schoolClass: SchoolClass) => void
  onRetry: () => void
  onSelect: (id: string) => void
  selectedId: string | null
}

function ClassTable({
  classes,
  errorMessage,
  isError,
  isLoading,
  onDelete,
  onEdit,
  onRetry,
  onSelect,
  selectedId,
}: ClassTableProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
        role="status"
      >
        Loading classes...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
        role="alert"
      >
        <span>{errorMessage ?? 'Could not load classes.'}</span>
        <button
          className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!classes.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-base font-black text-slate-950">No classes found</p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Adjust filters or create the first class.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Language</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classes.map((schoolClass) => {
              const status = getClassStatusDisplay(schoolClass.status)
              const isSelected = schoolClass.id === selectedId

              return (
                <tr
                  className={isSelected ? 'bg-cyan-50/70' : 'bg-white'}
                  key={schoolClass.id}
                >
                  <td className="px-4 py-4">
                    <button
                      className="grid text-left"
                      onClick={() => onSelect(schoolClass.id)}
                      type="button"
                    >
                      <span className="text-sm font-black text-slate-950">
                        {schoolClass.name}
                      </span>
                      <span className="mt-1 text-xs font-bold text-slate-500">
                        {schoolClass.code}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                    {schoolClass.languageId}
                  </td>
                  <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                    {schoolClass.schoolGradeId}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        aria-label={`Edit ${schoolClass.code}`}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                        onClick={() => onEdit(schoolClass)}
                        type="button"
                      >
                        <Edit aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        aria-label={`Delete ${schoolClass.code}`}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                        onClick={() => onDelete(schoolClass)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type PaginationProps = {
  isDisabled: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

function Pagination({
  isDisabled,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  totalElements,
  totalPages,
}: PaginationProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {totalElements} classes, page {totalPages ? page : 0} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <select
          aria-label="Rows per page"
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
          disabled={isDisabled}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          value={pageSize}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <button
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
          disabled={isDisabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Prev
        </button>
        <button
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
          disabled={isDisabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  )
}

type DetailPanelProps = {
  classUsers: ClassUser[]
  detail: SchoolClass | null
  detailError?: string
  isDetailError: boolean
  isDetailLoading: boolean
  isMutatingUser: boolean
  isUsersError: boolean
  isUsersLoading: boolean
  onAddUser: () => void
  onRemoveUser: (userId: string) => void
  onRetryDetail: () => void
  onRetryUsers: () => void
  onToggleUserStatus: (user: ClassUser) => void
  usersError?: string
}

function DetailPanel({
  classUsers,
  detail,
  detailError,
  isDetailError,
  isDetailLoading,
  isMutatingUser,
  isUsersError,
  isUsersLoading,
  onAddUser,
  onRemoveUser,
  onRetryDetail,
  onRetryUsers,
  onToggleUserStatus,
  usersError,
}: DetailPanelProps) {
  if (!detail && !isDetailLoading) {
    return (
      <aside className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm font-semibold text-slate-500">
        Select a class to view details.
      </aside>
    )
  }

  return (
    <aside className="grid h-fit gap-4 rounded-lg border border-slate-200 bg-white p-5">
      {isDetailLoading ? (
        <div className="text-sm font-semibold text-slate-600" role="status">
          Loading class detail...
        </div>
      ) : null}

      {isDetailError ? (
        <div
          className="grid gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>{detailError ?? 'Could not load class detail.'}</span>
          <button
            className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
            onClick={onRetryDetail}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      {detail ? (
        <>
          <div>
            <p className="text-xs font-black uppercase text-cyan-700">
              Class detail
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-0 text-slate-950">
              {detail.name}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {detail.code}
            </p>
          </div>

          <dl className="grid gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs font-black uppercase text-slate-500">
                Description
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {formatNullableText(detail.description)}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-xs font-black uppercase text-slate-500">
                  Created
                </dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {formatClassDate(detail.createdAt)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-xs font-black uppercase text-slate-500">
                  Updated
                </dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {formatClassDate(detail.updatedAt)}
                </dd>
              </div>
            </div>
          </dl>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-slate-950">
                Class users
              </h3>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 text-sm font-bold text-white transition hover:bg-cyan-700"
                onClick={onAddUser}
                type="button"
              >
                <UserPlus aria-hidden="true" className="size-4" />
                Add
              </button>
            </div>

            {isUsersLoading ? (
              <div
                className="mt-4 text-sm font-semibold text-slate-600"
                role="status"
              >
                Loading class users...
              </div>
            ) : null}

            {isUsersError ? (
              <div
                className="mt-4 grid gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
                role="alert"
              >
                <span>{usersError ?? 'Could not load class users.'}</span>
                <button
                  className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
                  onClick={onRetryUsers}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {!isUsersLoading && !isUsersError && !classUsers.length ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
                No users in this class yet.
              </p>
            ) : null}

            <div className="mt-4 grid gap-3">
              {classUsers.map((classUser) => {
                const displayName =
                  classUser.user?.fullName ||
                  classUser.user?.email ||
                  classUser.userId

                return (
                  <div
                    className="grid gap-3 rounded-lg border border-slate-200 p-3"
                    key={classUser.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {displayName}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        {classUser.user?.email ?? classUser.userId}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        disabled={isMutatingUser}
                        onClick={() => onToggleUserStatus(classUser)}
                        type="button"
                      >
                        {classUser.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        disabled={isMutatingUser}
                        onClick={() => onRemoveUser(classUser.userId)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </aside>
  )
}

export function SchoolAdminClassesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [userPage] = useState(DEFAULT_PAGE)
  const [filters, setFilters] = useState<ClassFilters>(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const [classDialogMode, setClassDialogMode] =
    useState<ClassDialogMode | null>(null)
  const [classForm, setClassForm] = useState<ClassFormState>(emptyClassForm)
  const [classDialogError, setClassDialogError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [addUserId, setAddUserId] = useState('')
  const [userMutationError, setUserMutationError] = useState<string | null>(
    null,
  )

  const classesQuery = useSchoolClassesQuery(page, pageSize, filters)
  const classes = classesQuery.data?.content ?? []
  const selectedListClass =
    classes.find((schoolClass) => schoolClass.id === selectedId) ??
    classes[0] ??
    null
  const effectiveSelectedId = selectedListClass?.id ?? null
  const detailQuery = useSchoolClassQuery(effectiveSelectedId)
  const detailClass = detailQuery.data ?? selectedListClass
  const usersQuery = useSchoolClassUsersQuery(
    effectiveSelectedId,
    userPage,
    DEFAULT_USER_PAGE_SIZE,
  )
  const createMutation = useCreateSchoolClassMutation()
  const updateMutation = useUpdateSchoolClassMutation()
  const deleteMutation = useDeleteSchoolClassMutation()
  const addUserMutation = useAddClassUserMutation()
  const removeUserMutation = useRemoveClassUserMutation()
  const updateUserStatusMutation = useUpdateClassUserStatusMutation()
  const isSavingClass = createMutation.isPending || updateMutation.isPending
  const isMutatingUser =
    addUserMutation.isPending ||
    removeUserMutation.isPending ||
    updateUserStatusMutation.isPending

  function handleFilterChange(name: keyof ClassFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
    setSelectedId(null)
    setPage(DEFAULT_PAGE)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setSelectedId(null)
    setPage(DEFAULT_PAGE)
    setPageSize(nextPageSize)
  }

  function openCreateDialog() {
    setClassForm(emptyClassForm)
    setClassDialogError(null)
    setClassDialogMode('create')
  }

  function openEditDialog(schoolClass: SchoolClass) {
    setClassForm(toEditForm(schoolClass))
    setClassDialogError(null)
    setSelectedId(schoolClass.id)
    setClassDialogMode('edit')
  }

  function closeClassDialog() {
    if (isSavingClass) {
      return
    }

    setClassDialogError(null)
    setClassDialogMode(null)
  }

  function handleClassFormChange(name: keyof ClassFormState, value: string) {
    setClassForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function validateClassForm() {
    if (!classForm.name.trim()) {
      return 'Class name is required.'
    }

    if (classDialogMode === 'create') {
      if (!classForm.code.trim()) {
        return 'Class code is required.'
      }

      if (
        !isUuidLike(classForm.languageId) ||
        !isUuidLike(classForm.schoolGradeId)
      ) {
        return 'Language ID and school grade ID must be valid UUID values.'
      }
    }

    return null
  }

  async function handleClassSubmit() {
    const validationError = validateClassForm()

    if (validationError) {
      setClassDialogError(validationError)
      return
    }

    try {
      setClassDialogError(null)

      if (classDialogMode === 'create') {
        const payload: CreateSchoolClassRequest = {
          code: classForm.code.trim(),
          description: classForm.description.trim() || null,
          languageId: classForm.languageId.trim(),
          name: classForm.name.trim(),
          schoolGradeId: classForm.schoolGradeId.trim(),
        }
        const result = await createMutation.mutateAsync({ payload })

        setSelectedId(result.data.schoolClassId)
        setPageMessage({ text: result.message, tone: 'success' })
      } else if (classDialogMode === 'edit' && effectiveSelectedId) {
        const payload: UpdateSchoolClassRequest = {
          description: classForm.description.trim() || null,
          name: classForm.name.trim(),
          status: classForm.status,
        }
        const result = await updateMutation.mutateAsync({
          id: effectiveSelectedId,
          payload,
        })

        setSelectedId(result.data.schoolClassId)
        setPageMessage({ text: result.message, tone: 'success' })
      }

      await queryClient.invalidateQueries({
        queryKey: classManagementQueryKeys.all,
      })
      setClassDialogMode(null)
    } catch (error) {
      setClassDialogError(
        getErrorMessage(error) ?? 'Could not save class. Try again.',
      )
    }
  }

  function openDeleteDialog(schoolClass: SchoolClass) {
    setDeleteError(null)
    setDeleteTarget(schoolClass)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return
    }

    try {
      setDeleteError(null)
      const result = await deleteMutation.mutateAsync({
        classId: deleteTarget.id,
      })

      await queryClient.invalidateQueries({
        queryKey: classManagementQueryKeys.all,
      })
      setSelectedId(null)
      setDeleteTarget(null)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setDeleteError(
        getErrorMessage(error) ?? 'Could not delete class. Try again.',
      )
    }
  }

  async function handleAddUserSubmit() {
    if (!effectiveSelectedId) {
      return
    }

    if (!isUuidLike(addUserId)) {
      setUserMutationError('User ID must be a valid UUID value.')
      return
    }

    try {
      setUserMutationError(null)
      const result = await addUserMutation.mutateAsync({
        classId: effectiveSelectedId,
        userId: addUserId.trim(),
      })

      await queryClient.invalidateQueries({
        queryKey: classManagementQueryKeys.classUsers(
          effectiveSelectedId,
          userPage,
          DEFAULT_USER_PAGE_SIZE,
        ),
      })
      setAddUserId('')
      setIsAddUserOpen(false)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setUserMutationError(
        getErrorMessage(error) ?? 'Could not add user to class. Try again.',
      )
    }
  }

  async function handleRemoveUser(userId: string) {
    if (!effectiveSelectedId) {
      return
    }

    try {
      setUserMutationError(null)
      const result = await removeUserMutation.mutateAsync({
        classId: effectiveSelectedId,
        userId,
      })

      await queryClient.invalidateQueries({
        queryKey: classManagementQueryKeys.classUsers(
          effectiveSelectedId,
          userPage,
          DEFAULT_USER_PAGE_SIZE,
        ),
      })
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setPageMessage({
        text: getErrorMessage(error) ?? 'Could not remove user. Try again.',
        tone: 'error',
      })
    }
  }

  async function handleToggleUserStatus(classUser: ClassUser) {
    if (!effectiveSelectedId) {
      return
    }

    try {
      setUserMutationError(null)
      const result = await updateUserStatusMutation.mutateAsync({
        classId: effectiveSelectedId,
        isActive: !classUser.isActive,
        userId: classUser.userId,
      })

      await queryClient.invalidateQueries({
        queryKey: classManagementQueryKeys.classUsers(
          effectiveSelectedId,
          userPage,
          DEFAULT_USER_PAGE_SIZE,
        ),
      })
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setPageMessage({
        text:
          getErrorMessage(error) ??
          'Could not update user status. Try again.',
        tone: 'error',
      })
    }
  }

  const pageMessageClassName =
    pageMessage?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section aria-labelledby="school-admin-classes-title" className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-cyan-700">
            Class management
          </p>
          <h1
            className="mt-2 text-3xl font-black tracking-0 text-slate-950"
            id="school-admin-classes-title"
          >
            Manage school classes
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Create classes, review class details, and manage enrolled users.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={classesQuery.isFetching}
            onClick={() => {
              void classesQuery.refetch()
            }}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Refresh
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700"
            onClick={openCreateDialog}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            New class
          </button>
        </div>
      </div>

      {pageMessage ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${pageMessageClassName}`}
          role={pageMessage.tone === 'error' ? 'alert' : 'status'}
        >
          {pageMessage.text}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(180px,1fr)_180px_minmax(180px,1fr)_minmax(180px,1fr)]">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Search
          <span className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              onChange={(event) =>
                handleFilterChange('search', event.target.value)
              }
              placeholder="Code or name"
              type="search"
              value={filters.search}
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Status
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) =>
              handleFilterChange('status', event.target.value)
            }
            value={filters.status}
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Language ID
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) =>
              handleFilterChange('languageId', event.target.value)
            }
            placeholder="Optional UUID"
            value={filters.languageId}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          School grade ID
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) =>
              handleFilterChange('schoolGradeId', event.target.value)
            }
            placeholder="Optional UUID"
            value={filters.schoolGradeId}
          />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid h-fit gap-4">
          <ClassTable
            classes={classes}
            errorMessage={getErrorMessage(classesQuery.error)}
            isError={classesQuery.isError}
            isLoading={classesQuery.isLoading}
            onDelete={openDeleteDialog}
            onEdit={openEditDialog}
            onRetry={() => {
              void classesQuery.refetch()
            }}
            onSelect={setSelectedId}
            selectedId={effectiveSelectedId}
          />
          <Pagination
            isDisabled={classesQuery.isLoading || classesQuery.isError}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            pageSize={pageSize}
            totalElements={classesQuery.data?.totalElements ?? 0}
            totalPages={classesQuery.data?.totalPages ?? 0}
          />
        </div>

        <DetailPanel
          classUsers={usersQuery.data?.content ?? []}
          detail={detailClass}
          detailError={getErrorMessage(detailQuery.error)}
          isDetailError={detailQuery.isError}
          isDetailLoading={Boolean(effectiveSelectedId) && detailQuery.isLoading}
          isMutatingUser={isMutatingUser}
          isUsersError={usersQuery.isError}
          isUsersLoading={Boolean(effectiveSelectedId) && usersQuery.isLoading}
          onAddUser={() => {
            setUserMutationError(null)
            setIsAddUserOpen(true)
          }}
          onRemoveUser={(userId) => {
            void handleRemoveUser(userId)
          }}
          onRetryDetail={() => {
            void detailQuery.refetch()
          }}
          onRetryUsers={() => {
            void usersQuery.refetch()
          }}
          onToggleUserStatus={(classUser) => {
            void handleToggleUserStatus(classUser)
          }}
          usersError={getErrorMessage(usersQuery.error)}
        />
      </div>

      <ClassDialog
        errorMessage={classDialogError ?? undefined}
        form={classForm}
        isSubmitting={isSavingClass}
        mode={classDialogMode}
        onChange={handleClassFormChange}
        onClose={closeClassDialog}
        onSubmit={() => {
          void handleClassSubmit()
        }}
      />
      <DeleteDialog
        errorMessage={deleteError ?? undefined}
        isSubmitting={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={() => {
          void handleDeleteConfirm()
        }}
        schoolClass={deleteTarget}
      />
      <AddUserDialog
        errorMessage={userMutationError ?? undefined}
        isSubmitting={addUserMutation.isPending}
        onChange={setAddUserId}
        onClose={() => {
          if (!addUserMutation.isPending) {
            setUserMutationError(null)
            setIsAddUserOpen(false)
          }
        }}
        onSubmit={() => {
          void handleAddUserSubmit()
        }}
        open={isAddUserOpen}
        value={addUserId}
      />
    </section>
  )
}
