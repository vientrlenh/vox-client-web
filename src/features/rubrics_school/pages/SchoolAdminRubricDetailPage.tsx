// src/features/rubrics/pages/SchoolAdminRubricDetailPage.tsx

import { useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ClipboardList,
  RefreshCw,
  AlertTriangle,
  Plus,
  Edit,
  Search,
  Filter,
  Upload,
} from "lucide-react";
import { useAppSelector } from "@/app/store/hooks";

// API Queries & Mutations
import { useSchoolRubricQuery } from "../api/useSchoolRubricQuery";
import {
  useSearchSchoolRubricVersionsQuery,
  type SearchRubricVersionFilter,
} from "../api/useSearchSchoolRubricVersionsQuery";
import { useUpdateSchoolRubricMutation } from "../api/useUpdateSchoolRubricMutation";

// IMPORT HOOK THÊM VERSION MỚI LÀM
import { 
  useAddSchoolRubricVersionsMutation, 
  type AddRubricVersionsPayload 
} from "../api/useAddSchoolRubricVersionsMutation";

// Components
import { RubricVersionTable } from "../components/RubricVersionTable";
import { RubricFormDialog } from "../components/RubricFormDialog";
import { AddRubricVersionDialog } from "../components/AddRubricVersionDialog"; // IMPORT MODAL
import { Pagination } from "@/shared/components/Pagination";

export function SchoolAdminRubricDetailPage() {
  const { rubricId } = useParams<{ rubricId: string }>();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  // 1. Quản lý State cho Modal Chỉnh sửa & Modal Thêm mới
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // STATE MỚI

  // 2. Fetch Data
  const {
    data: rubric,
    isLoading,
    isError,
    refetch,
  } = useSchoolRubricQuery(schoolId, rubricId);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);

  // State cho thanh tìm kiếm / lọc theo trạng thái Version
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const versionFilter: SearchRubricVersionFilter = {
    keyword: debouncedKeyword.trim() ? debouncedKeyword : null,
    status: selectedStatus || null,
  };

  const {
    data: versionsData,
    isLoading: isVersionsLoading,
    isError: isVersionsError,
    refetch: refetchVersions,
  } = useSearchSchoolRubricVersionsQuery(
    schoolId,
    rubricId,
    versionFilter,
    page,
    pageSize,
  );

  const versions = versionsData?.content ?? [];
  const totalPages = versionsData?.totalPages ?? 0;
  const totalElements = versionsData?.totalElements ?? 0;

  // 3. Mutations (Cập nhật Rubric & Thêm Version)
  const { mutateAsync: updateRubric, isPending: isUpdating } = useUpdateSchoolRubricMutation(schoolId, rubricId);
  const { mutateAsync: addVersions, isPending: isAdding } = useAddSchoolRubricVersionsMutation(schoolId, rubricId); // HOOK MỚI

  // 4. Hàm xử lý submit Form Cập nhật Rubric
  const handleUpdateRubric = async (formData: { name: string; description: string; }) => {
    // Không bắt lỗi ở đây: dialog đang mở sẽ tự bắt và hiện lỗi ngay trong form.
    // Banner của trang nằm sau lớp backdrop-blur của overlay nên không đọc được.
    await updateRubric(formData);
    setIsEditModalOpen(false);
  };

  // 5. Hàm xử lý submit Form Thêm Version mới
  const handleAddVersion = async (payload: AddRubricVersionsPayload) => {
    // Không bắt lỗi ở đây: dialog đang mở sẽ tự bắt và hiện lỗi ngay trong form.
    // Banner của trang nằm sau lớp backdrop-blur của overlay nên không đọc được.
    await addVersions(payload);
    setIsAddModalOpen(false); // Thành công thì đóng popup
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải thông tin chi tiết...</p>
      </div>
    );
  }

  if (isError || !rubric) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">
          Không tìm thấy tiêu chí đánh giá hoặc có lỗi xảy ra.
        </p>
        <button
          onClick={() => refetch()}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <section className="grid gap-6">

      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/school-admin/rubrics")}
            aria-label="Quay lại"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-blue-950 sm:text-3xl">
            <ClipboardList className="size-6 text-indigo-600" /> Chi tiết tiêu chí đánh giá
          </h1>
        </div>
      </div>

      {/* THÔNG TIN CHUNG */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tên tiêu chí đánh giá
            </p>
            <p className="mt-1 text-lg font-bold text-slate-950">
              {rubric.name}
            </p>
            <p className="mt-1 text-sm font-mono text-indigo-600">
              Mã: {rubric.code}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Phân loại
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Khung: {rubric.framework?.name || "—"}
              </span>
              <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-sm font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                Ngôn ngữ: {rubric.language?.name || "—"}
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Mô tả
            </p>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
              {rubric.description || "Không có mô tả"}
            </p>
          </div>
        </div>

        {/* NÚT UPDATE */}
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <Edit className="size-4" /> Chỉnh sửa thông tin
          </button>
        </div>
      </div>

      {/* DANH SÁCH PHIÊN BẢN (VERSIONS) */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:px-6">
          <h2 className="text-lg font-medium text-slate-950">
            Danh sách phiên bản (Versions)
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/school-admin/rubrics/${rubricId}/versions/import`)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            >
              <Upload className="size-4" /> Import Excel/CSV
            </button>
            {/* ĐÃ GẮN SỰ KIỆN MỞ MODAL THÊM VERSION VÀO NÚT NÀY */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              <Plus className="size-4" /> Tạo Version mới
            </button>
          </div>
        </div>

        {/* THANH TÌM KIẾM & LỌC TRẠNG THÁI VERSION */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:px-6">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="size-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo mã hoặc tên phiên bản..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div className="relative min-w-50">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Filter className="size-4 text-slate-400" />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>

        <RubricVersionTable
          versions={versions}
          isLoading={isVersionsLoading}
          isError={isVersionsError}
          onRetry={() => refetchVersions()}
          onViewCriteria={(version) =>
            navigate(`/school-admin/rubrics/${rubricId}/versions/${version.id}`)
          }
        />

        {!isVersionsLoading && !isVersionsError && versions.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            itemName="phiên bản"
            onPageChange={setPage}
          />
        )}
      </div>

      {/* RENDER MODAL CHỈNH SỬA RUBRIC */}
      <RubricFormDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={rubric}
        onSubmit={handleUpdateRubric}
        isPending={isUpdating}
      />

      {/* RENDER MODAL THÊM VERSION MỚI */}
      {isAddModalOpen && (
        <AddRubricVersionDialog
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddVersion}
          isPending={isAdding}
        />
      )}
    </section>
  );
}