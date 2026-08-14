// src/features/rubric_system/pages/SystemAdminRubricsPage.tsx

import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { ClipboardList, Plus, RefreshCw, Search, Filter } from "lucide-react";

import { useSearchSystemRubricsQuery, type SearchRubricFilter } from "../api/useSearchSystemRubricsQuery";
import { useFrameworkOptionsQuery, useLanguageOptionsQuery } from "../api/useFilterOptionsQuery";
import { useCreateSystemRubricMutation, type CreateRubricPayload } from "../api/useCreateSystemRubricMutation";
import { useDeleteSystemRubricMutation } from "../api/useDeleteSystemRubricMutation";

import { RubricTable } from "../components/RubricTable";
import { CreateRubricDialog } from "../components/CreateRubricDialog";
import { Pagination } from "@/shared/components/Pagination";
import type { Rubric } from "../types";
import { ErrorBanner } from '@/shared/ui/ErrorBanner';
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function SystemAdminRubricsPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmationDialog();
  const navigate = useNavigate();

  const { data: frameworks } = useFrameworkOptionsQuery();
  const { data: languages } = useLanguageOptionsQuery();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [selectedFrameworkId, setSelectedFrameworkId] = useState("");
  const [selectedLanguageId, setSelectedLanguageId] = useState("");

  // STATE ĐÓNG MỞ MODAL THÊM MỚI
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const filter: SearchRubricFilter = {
    keyword: debouncedKeyword.trim() ? debouncedKeyword : null,
    frameworkId: selectedFrameworkId || null,
    languageId: selectedLanguageId || null,
  };

  const { data, isLoading, isError, refetch, isFetching } = useSearchSystemRubricsQuery(filter, page, pageSize);

  const rubrics = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  // KHỞI TẠO MUTATION THÊM MỚI / XÓA
  const { mutateAsync: createRubric, isPending: isCreating } = useCreateSystemRubricMutation();
  const { mutateAsync: deleteRubric } = useDeleteSystemRubricMutation();

  const handleCreateRubric = async (formData: CreateRubricPayload) => {
    // Không bắt lỗi ở đây: dialog đang mở sẽ tự bắt và hiện lỗi ngay trong form.
    // Banner của trang nằm sau lớp backdrop-blur của overlay nên không đọc được.
    const newRubricId = await createRubric(formData);
    setIsCreateModalOpen(false);

    // UX xịn: Tạo thành công đá thẳng sang trang chi tiết để User add Versions!
    navigate(`/system-admin/rubrics/${newRubricId}`);
  };

  const handleDeleteRubric = async (rubric: Rubric) => {
    const isConfirmed = await confirm({
      confirmLabel: 'Xóa',
      message: `Bạn có chắc chắn muốn xóa bộ tiêu chí đánh giá "${rubric.name}"? Chỉ xóa được khi chưa có phiên bản nào PUBLISHED/ARCHIVED.`,
      title: 'Xác nhận xóa',
    });
    if (!isConfirmed) return;

    setErrorMessage(null);

    try {
      await deleteRubric(rubric.id);
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Có lỗi xảy ra khi xóa tiêu chí đánh giá.');
    }
  };

  return (
    <section className="grid gap-6">
      {dialog}
      <ErrorBanner message={errorMessage} />

      {/* HEADER */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-blue-950 sm:text-3xl">
            <ClipboardList className="size-6 text-indigo-600" /> Quản lý tiêu chí đánh giá
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Bộ tiêu chí chấm điểm dùng chung toàn hệ thống, gắn với một khung năng lực và một ngôn
            ngữ. Mỗi bộ có nhiều phiên bản, chỉ phiên bản đã xuất bản mới dùng để chấm bài.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-70"
            disabled={isFetching}
            onClick={() => refetch()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            Làm mới
          </button>

          {/* NÚT MỞ MODAL THÊM MỚI */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700"
          >
            <Plus className="size-4" /> Thêm tiêu chí đánh giá
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><Search className="size-4 text-slate-400" /></div>
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm theo mã hoặc tên tiêu chí đánh giá..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
          </div>
          <div className="relative min-w-50">
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><Filter className="size-4 text-slate-400" /></div>
            <select value={selectedFrameworkId} onChange={(e) => {setSelectedFrameworkId(e.target.value); setPage(1);}} className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
              <option value="">Tất cả Khung năng lực</option>
              {frameworks?.map((fw) => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
            </select>
          </div>
          <div className="relative min-w-50">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><Filter className="size-4 text-slate-400" /></div>
            <select value={selectedLanguageId} onChange={(e) => {setSelectedLanguageId(e.target.value); setPage(1);}} className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
              <option value="">Tất cả Ngôn ngữ</option>
              {languages?.map((lang) => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <RubricTable
          rubrics={rubrics}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onViewDetails={(rubric) => navigate(`/system-admin/rubrics/${rubric.id}`)}
          onDelete={handleDeleteRubric}
        />
        {!isLoading && !isError && rubrics.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} totalElements={totalElements} itemName="tiêu chí đánh giá" onPageChange={setPage} />
        )}
      </div>

      {/* COMPONENT MODAL THÊM MỚI */}
      <CreateRubricDialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRubric}
        isPending={isCreating}
        frameworks={frameworks || []} // Đẩy Data dropdown vào Form
        languages={languages || []}   // Đẩy Data dropdown vào Form
      />
    </section>
  );
}
