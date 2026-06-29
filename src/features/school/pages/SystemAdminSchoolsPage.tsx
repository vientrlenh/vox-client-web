// src/features/school/pages/SystemAdminSchoolsPage.tsx

import { useState } from "react";
import { Building2, RefreshCw, AlertTriangle } from "lucide-react";
import { useSchoolsQuery } from "../api/useSchoolsQuery";
import { useUpdateSchoolStatusMutation } from "../api/useUpdateSchoolStatusMutation";
import { SchoolTable } from "../components/SchoolTable";
import { SchoolDetailDialog } from "../components/SchoolDetailDialog";
import { Pagination } from "@/shared/components/Pagination"; 
import type { School } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function SystemAdminSchoolsPage() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const [viewingSchool, setViewingSchool] = useState<School | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useSchoolsQuery(
    page,
    pageSize,
  );
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useUpdateSchoolStatusMutation();

  const schools = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  async function handleChangeStatus(school: School) {
    const actionText = school.isActive ? "khóa" : "kích hoạt";
    const isConfirmed = window.confirm(
      `Bạn có chắc chắn muốn ${actionText} trường "${school.name || school.code}" không?`,
    );
    if (!isConfirmed) return;
    try {
      await updateStatus({ id: school.id, isActive: !school.isActive });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert("Có lỗi xảy ra khi cập nhật trạng thái.");
    }
  }

  return (
    <section className="grid gap-6 p-4 sm:p-6 rounded-2xl bg-linear-to-br from-blue-500 via-white to-blue-100/80 min-h-[calc(100vh-6rem)]">
      {/* Bọc toàn trang bằng gradient Xanh biển - Trắng mềm mại */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-blue-950 flex items-center gap-2">
          <Building2 className="size-6 text-blue-600" /> Quản lý trường học
        </h1>
        
        {/* Nút làm mới tone-sur-tone màu xanh */}
        <button
          onClick={() => refetch()}
          aria-label="Làm mới danh sách"
          title="Làm mới"
          className="inline-flex size-11 items-center justify-center rounded-lg border border-blue-500 bg-white text-blue-600 shadow-sm transition hover:bg-blue-50 hover:border-blue-300"
        >
          <RefreshCw className={`size-5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Khung Table pha nền trắng và xanh biển nhạt, đổ bóng xanh */}
      <div
        className={`rounded-xl border border-blue-100 bg-linear-to-b from-white to-blue-50/40 shadow-lg shadow-blue-900/5 overflow-hidden transition duration-300 ${isUpdatingStatus ? "opacity-60 pointer-events-none" : ""}`}
      >
        {isError ? (
          <div className="p-10 text-center text-red-600 flex flex-col items-center gap-2 bg-white">
            <AlertTriangle className="size-10" />
            <p>
              Không thể tải danh sách trường. Vui lòng kiểm tra lại kết nối.
            </p>
          </div>
        ) : (
          <>
            <SchoolTable
              schools={schools}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => refetch()}
              onChangeStatus={handleChangeStatus}
              onView={(school) => setViewingSchool(school)}
            />

            {!isLoading && !isError && schools.length > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalElements={totalElements}
                itemName="trường"
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      <SchoolDetailDialog
        isOpen={viewingSchool !== null}
        school={viewingSchool}
        onClose={() => setViewingSchool(null)}
      />
    </section>
  );
}