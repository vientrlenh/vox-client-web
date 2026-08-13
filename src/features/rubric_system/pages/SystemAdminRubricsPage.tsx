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
import { useFeedbackToast } from "@/shared/ui/useFeedbackToast";
import type { Rubric } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function SystemAdminRubricsPage() {
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
  const { showError, feedbackToast } = useFeedbackToast();

  const handleCreateRubric = async (formData: CreateRubricPayload) => {
    try {
      const newRubricId = await createRubric(formData);
      setIsCreateModalOpen(false);

      // UX xịn: Tạo thành công đá thẳng sang trang chi tiết để User add Versions!
      navigate(`/system-admin/rubrics/${newRubricId}`);
    } catch (error) {
      const err = error as Error;
      console.error("Lỗi tạo Rubric:", err);
      showError(err.message || 'Có lỗi xảy ra khi tạo Rubric.');
    }
  };

  const handleDeleteRubric = async (rubric: Rubric) => {
    const isConfirm = window.confirm(
      `Bạn có chắc chắn muốn xóa bộ Rubric "${rubric.name}"? Chỉ xóa được khi chưa có phiên bản nào PUBLISHED/ARCHIVED.`
    );
    if (!isConfirm) return;

    try {
      await deleteRubric(rubric.id);
    } catch (error) {
      const err = error as Error;
      showError(err.message || 'Có lỗi xảy ra khi xóa Rubric.');
    }
  };

  return (
    <section className="relative grid gap-6 overflow-hidden">
      {feedbackToast}
      {/* vox background decoration — đồng bộ với gradient nút */}
      <div
        className="pointer-events-none absolute -right-40 -top-44 size-[480px] rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.16), rgba(6,182,212,0.10) 55%, transparent 75%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-36 size-[420px] rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12), rgba(139,92,246,0.08) 55%, transparent 75%)' }}
      />

      {/* HEADER */}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="flex items-center gap-2.5 text-2xl font-black text-blue-950 sm:text-3xl">
          <ClipboardList className="size-[26px] text-indigo-600" /> Quản lý Rubric
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => refetch()}
            aria-label="Tải lại"
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          {/* NÚT MỞ MODAL THÊM MỚI */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-6 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Plus className="size-4" /> Thêm Rubric
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="relative rounded-[14px] border border-slate-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><Search className="size-4 text-slate-400" /></div>
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm theo mã hoặc tên Rubric..." className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
          </div>
          <div className="relative min-w-50">
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><Filter className="size-4 text-slate-400" /></div>
            <select value={selectedFrameworkId} onChange={(e) => {setSelectedFrameworkId(e.target.value); setPage(1);}} className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
              <option value="">Tất cả Khung năng lực</option>
              {frameworks?.map((fw) => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
            </select>
          </div>
          <div className="relative min-w-50">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><Filter className="size-4 text-slate-400" /></div>
            <select value={selectedLanguageId} onChange={(e) => {setSelectedLanguageId(e.target.value); setPage(1);}} className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
              <option value="">Tất cả Ngôn ngữ</option>
              {languages?.map((lang) => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white">
        <RubricTable
          rubrics={rubrics}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onViewDetails={(rubric) => navigate(`/system-admin/rubrics/${rubric.id}`)}
          onDelete={handleDeleteRubric}
        />
        {!isLoading && !isError && rubrics.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} totalElements={totalElements} itemName="rubric" onPageChange={setPage} />
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
