// src/features/rubrics/pages/SchoolAdminRubricsPage.tsx

import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { ClipboardList, Plus, RefreshCw, Search, Filter } from "lucide-react";

import { useSearchSchoolRubricsQuery, type SearchRubricFilter } from "../api/useSearchSchoolRubricsQuery";
import { useFrameworkOptionsQuery, useLanguageOptionsQuery } from "../api/useFilterOptionsQuery";
// IMPORT THÊM TYPE CreateRubricPayload TỪ FILE API
import { useCreateSchoolRubricMutation, type CreateRubricPayload } from "../api/useCreateSchoolRubricMutation"; 

import { RubricTable } from "../components/RubricTable";
import { CreateRubricDialog } from "../components/CreateRubricDialog"; 
import { Pagination } from "@/shared/components/Pagination";
import { useAppSelector } from "@/app/store/hooks";
import { ErrorBanner } from '@/shared/ui/ErrorBanner';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function SchoolAdminRubricsPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

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

  const { data, isLoading, isError, refetch, isFetching } = useSearchSchoolRubricsQuery(schoolId, filter, page, pageSize);

  const rubrics = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  // KHỞI TẠO MUTATION THÊM MỚI
  const { mutateAsync: createRubric, isPending: isCreating } = useCreateSchoolRubricMutation(schoolId);

  // HÀM XỬ LÝ SUBMIT VÀ BẮT LỖI TỪ BE (Đã thay 'any' bằng type cụ thể)
  const handleCreateRubric = async (formData: CreateRubricPayload) => {
    setErrorMessage(null);
    try {
      const newRubricId = await createRubric(formData);
      setIsCreateModalOpen(false);
      
      // UX xịn: Tạo thành công đá thẳng sang trang chi tiết để User add Versions!
      navigate(`/school-admin/rubrics/${newRubricId}`);
    } catch (error) {
      // Ép kiểu error về Error thuần để gọi được thuộc tính message
      const err = error as Error;
      console.error("Lỗi tạo Rubric:", err);
      // Nơi này sẽ hứng cái lỗi "Trường của bạn đã thiết lập một bộ tiêu chí đánh giá cho ngôn ngữ này rồi."
      setErrorMessage(err.message || 'Có lỗi xảy ra khi tạo tiêu chí đánh giá.');
    }
  };

  return (
    <section className="grid gap-6">
      <ErrorBanner message={errorMessage} />

      {/* HEADER */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-blue-950 sm:text-3xl">
            <ClipboardList className="size-6 text-indigo-600" /> Quản lý tiêu chí đánh giá
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Bộ tiêu chí chấm điểm của trường, gắn với một khung năng lực và một ngôn ngữ. Mỗi bộ có
            nhiều phiên bản, chỉ phiên bản đã xuất bản mới dùng để chấm bài.
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
        <RubricTable rubrics={rubrics} isLoading={isLoading} isError={isError} onRetry={() => refetch()} onViewDetails={(rubric) => navigate(`/school-admin/rubrics/${rubric.id}`)} />
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