// src/features/rubrics/pages/SystemAdminRubricCriterionDetailPage.tsx

import { useParams, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { ChevronLeft, ListChecks, RefreshCw, AlertTriangle, Edit, Plus, Trash2, Search, FileSpreadsheet } from 'lucide-react';

import { useSystemRubricCriterionQuery } from '../api/useSystemRubricCriterionQuery';
import { useUpdateSystemRubricCriterionMutation, type UpdateRubricCriterionPayload } from '../api/useUpdateSystemRubricCriterionMutation';
import { useDeleteSystemRubricCriterionMutation } from '../api/useDeleteSystemRubricCriterionMutation';
import {
  useSearchSystemRubricCriterionBandsQuery,
  type SearchRubricCriterionBandFilter,
} from '../api/useSearchSystemRubricCriterionBandsQuery';
import { useAddSystemRubricCriterionBandsMutation, type AddRubricCriterionBandsPayload } from '../api/useAddSystemRubricCriterionBandsMutation';
import { useUpdateSystemRubricCriterionBandMutation, type UpdateRubricCriterionBandPayload } from '../api/useUpdateSystemRubricCriterionBandMutation';
import { useDeleteSystemRubricCriterionBandMutation } from '../api/useDeleteSystemRubricCriterionBandMutation';

import { UpdateRubricCriterionDialog } from '../components/UpdateRubricCriterionDialog';
import { RubricCriterionBandTable } from '../components/RubricCriterionBandTable';
import { AddRubricCriterionBandDialog } from '../components/AddRubricCriterionBandDialog';
import { UpdateRubricCriterionBandDialog } from '../components/UpdateRubricCriterionBandDialog';
import { ViewRubricCriterionBandDialog } from '../components/ViewRubricCriterionBandDialog';
import { Pagination } from '@/shared/components/Pagination';
import type { RubricCriterionBand } from '../types';

type ExampleItem = { transcript: string; explanation: string; expectedScore: number };

function parseExamplesReadOnly(examplesJson?: string | null): ExampleItem[] {
  if (!examplesJson) return [];
  try {
    const parsed: unknown = JSON.parse(examplesJson);
    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { values?: unknown[] })?.values)
        ? (parsed as { values: unknown[] }).values
        : [];

    return rawList.map((item) => {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        return {
          transcript: String(obj.transcript ?? ''),
          explanation: String(obj.explanation ?? ''),
          expectedScore: Number(obj.expectedScore ?? 0),
        };
      }
      return { transcript: String(item), explanation: '', expectedScore: 0 };
    });
  } catch {
    return [];
  }
}

export function SystemAdminRubricCriterionDetailPage() {
  const { rubricId, versionId, criterionId } = useParams<{ rubricId: string; versionId: string; criterionId: string }>();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddBandModalOpen, setIsAddBandModalOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<RubricCriterionBand | null>(null);
  const [viewingBandId, setViewingBandId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const bandFilter: SearchRubricCriterionBandFilter = {
    keyword: debouncedKeyword.trim() ? debouncedKeyword : null,
  };

  const {
    data: criterion,
    isLoading: isCriterionLoading,
    isError: isCriterionError,
    refetch: refetchCriterion,
  } = useSystemRubricCriterionQuery(criterionId);

  const {
    data: bandsData,
    isLoading: isBandsLoading,
    isError: isBandsError,
    refetch: refetchBands,
  } = useSearchSystemRubricCriterionBandsQuery(criterionId, bandFilter, page, pageSize);

  const bands = bandsData?.content ?? [];
  const totalPages = bandsData?.totalPages ?? 0;
  const totalElements = bandsData?.totalElements ?? 0;

  const { mutateAsync: updateCriterion, isPending: isUpdatingCriterion } = useUpdateSystemRubricCriterionMutation(criterionId);
  const { mutateAsync: deleteCriterion, isPending: isDeletingCriterion } = useDeleteSystemRubricCriterionMutation(versionId);
  const { mutateAsync: addBands, isPending: isAddingBand } = useAddSystemRubricCriterionBandsMutation(versionId, criterionId);
  const { mutateAsync: updateBand, isPending: isUpdatingBand } = useUpdateSystemRubricCriterionBandMutation(editingBand?.id);
  const { mutateAsync: deleteBand, isPending: isDeletingBand } = useDeleteSystemRubricCriterionBandMutation(versionId, criterionId);
  const isBandActionPending = isUpdatingBand || isDeletingBand;

  const handleUpdateCriterion = async (payload: UpdateRubricCriterionPayload) => {
    try {
      await updateCriterion(payload);
      setIsEditModalOpen(false);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi cập nhật tiêu chí.');
    }
  };

  const handleDeleteCriterion = async () => {
    if (!criterionId) return;
    const isConfirm = window.confirm('Bạn có chắc chắn muốn xóa tiêu chí này? Hành động này không thể hoàn tác!');
    if (!isConfirm) return;

    try {
      await deleteCriterion(criterionId);
      navigate(`/system-admin/rubrics/${rubricId}/versions/${versionId}`);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi xóa tiêu chí.');
    }
  };

  const handleAddBand = async (payload: AddRubricCriterionBandsPayload) => {
    try {
      await addBands(payload);
      setIsAddBandModalOpen(false);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi thêm mức điểm.');
    }
  };

  const handleUpdateBand = async (payload: UpdateRubricCriterionBandPayload) => {
    try {
      await updateBand(payload);
      setEditingBand(null);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi cập nhật mức điểm.');
    }
  };

  const handleDeleteBand = async (band: RubricCriterionBand) => {
    const isConfirm = window.confirm(`Bạn có chắc chắn muốn xóa mức điểm "${band.code}"?`);
    if (!isConfirm) return;

    try {
      await deleteBand(band.id);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi xóa mức điểm.');
    }
  };

  if (isCriterionLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-cyan-600" />
        <p className="text-sm text-slate-500">Đang tải thông tin Tiêu chí...</p>
      </div>
    );
  }

  if (isCriterionError || !criterion) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tìm thấy Tiêu chí hoặc bạn không có quyền truy cập.</p>
        <button onClick={() => refetchCriterion()} className="rounded-lg bg-cyan-600 px-4 py-2 font-bold text-white hover:bg-cyan-700">
          Thử lại
        </button>
      </div>
    );
  }

  const examples = parseExamplesReadOnly(criterion.examplesJson);

  return (
    <section className="relative grid gap-6 overflow-hidden font-['Be_Vietnam_Pro',sans-serif]">
      <div
        className="pointer-events-none absolute -right-40 -top-44 size-[480px] rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.16), rgba(6,182,212,0.10) 55%, transparent 75%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-36 size-[420px] rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12), rgba(139,92,246,0.08) 55%, transparent 75%)' }}
      />

      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/system-admin/rubrics/${rubricId}/versions/${versionId}`)}
            aria-label="Quay lại"
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex items-center gap-2.5 text-[32px] font-bold tracking-tight text-slate-950">
            <ListChecks className="size-[26px] text-indigo-600" /> Chi tiết Tiêu chí
          </h1>
        </div>
      </div>

      {/* THÔNG TIN CHUNG CỦA TIÊU CHÍ */}
      <div className="rounded-[14px] border border-slate-200 bg-white p-6">
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tên Tiêu chí</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{criterion.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center font-mono rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/20">
                Code: {criterion.code}
              </span>
              {criterion.isRequired ? (
                <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                  Bắt buộc
                </span>
              ) : (
                <span className="text-xs text-slate-400">Tùy chọn</span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">{criterion.description || 'Không có mô tả'}</p>
          </div>

          <div className="rounded-[10px] bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Điểm số</p>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p><span className="font-medium">Thang:</span> {criterion.minScore} - {criterion.maxScore}</p>
              <p><span className="font-medium">Trọng số:</span> {criterion.weight}%</p>
              <p><span className="font-medium">Thứ tự:</span> {criterion.order}</p>
            </div>
          </div>
        </div>

        {examples.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ví dụ minh họa</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {examples.map((example, index) => (
                <div key={index} className="rounded-[10px] border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-950">{example.transcript}</p>
                  {example.explanation && (
                    <p className="mt-1 text-xs text-slate-500">{example.explanation}</p>
                  )}
                  <span className="mt-2 inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 ring-1 ring-inset ring-indigo-600/10">
                    Điểm kỳ vọng: {example.expectedScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm sm:max-w-xs">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ngày tạo</p>
            <p className="mt-1 text-slate-700">{criterion.createdAt ? new Date(criterion.createdAt).toLocaleString('vi-VN') : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cập nhật gần nhất</p>
            <p className="mt-1 text-slate-700">{criterion.updatedAt ? new Date(criterion.updatedAt).toLocaleString('vi-VN') : '—'}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={handleDeleteCriterion}
            disabled={isDeletingCriterion}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-5 text-sm font-medium text-red-500 transition hover:bg-red-100 disabled:opacity-50"
          >
            {isDeletingCriterion ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Xóa Tiêu chí
          </button>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Edit className="size-4" /> Chỉnh sửa Tiêu chí
          </button>
        </div>
      </div>

      {/* DANH SÁCH MỨC ĐIỂM (CRITERION BANDS) */}
      <div className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:px-6">
          <h2 className="text-lg font-medium text-slate-950">Danh sách Mức điểm (Bands)</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/system-admin/rubrics/${rubricId}/versions/${versionId}/criteria/${criterionId}/bands/import`)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-indigo-600 transition hover:bg-slate-50"
            >
              <FileSpreadsheet className="size-4" /> Nhập từ Excel/CSV
            </button>
            <button
              type="button"
              onClick={() => setIsAddBandModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-4 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus className="size-4" /> Thêm Mức điểm
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:px-6">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="size-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo mã mức điểm..."
              className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>

        <RubricCriterionBandTable
          bands={bands}
          isLoading={isBandsLoading}
          isError={isBandsError}
          onRetry={() => refetchBands()}
          onView={(item) => setViewingBandId(item.id)}
          onEdit={(item) => setEditingBand(item)}
          onDelete={handleDeleteBand}
          isActionPending={isBandActionPending}
        />

        {!isBandsLoading && !isBandsError && bands.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            itemName="mức điểm"
            onPageChange={setPage}
          />
        )}
      </div>

      {isEditModalOpen && (
        <UpdateRubricCriterionDialog
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateCriterion}
          isPending={isUpdatingCriterion}
          initialData={criterion}
        />
      )}

      {isAddBandModalOpen && (
        <AddRubricCriterionBandDialog
          isOpen={isAddBandModalOpen}
          onClose={() => setIsAddBandModalOpen(false)}
          onSubmit={handleAddBand}
          isPending={isAddingBand}
        />
      )}

      {editingBand && (
        <UpdateRubricCriterionBandDialog
          isOpen={Boolean(editingBand)}
          onClose={() => setEditingBand(null)}
          onSubmit={handleUpdateBand}
          isPending={isUpdatingBand}
          initialData={editingBand}
        />
      )}

      <ViewRubricCriterionBandDialog
        isOpen={Boolean(viewingBandId)}
        onClose={() => setViewingBandId(null)}
        bandId={viewingBandId ?? undefined}
      />
    </section>
  );
}
