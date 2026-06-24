// src/features/school/pages/SystemAdminSchoolsPage.tsx

import { useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useSchoolsQuery } from "../api/useSchoolsQuery";
import { useUpdateSchoolStatusMutation } from "../api/useUpdateSchoolStatusMutation";
import { SchoolTable } from "../components/SchoolTable";
import { SchoolDetailDialog } from "../components/SchoolDetailDialog";
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
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-blue-950 flex items-center gap-2">
          <Building2 className="size-6 text-indigo-600" /> Quản lý trường học
        </h1>
        <button
          onClick={() => refetch()}
          aria-label="Làm mới danh sách"
          title="Làm mới"
          className="inline-flex size-11 items-center justify-center rounded-lg border bg-white text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`size-5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div
        className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition ${isUpdatingStatus ? "opacity-60 pointer-events-none" : ""}`}
      >
        {isError ? (
          <div className="p-10 text-center text-red-600 flex flex-col items-center gap-2">
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
              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                <p className="text-xs font-medium text-slate-500">
                  Tổng{" "}
                  <span className="font-bold text-blue-950">
                    {totalElements}
                  </span>{" "}
                  trường
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Trang trước"
                    title="Trang trước"
                    className="inline-flex size-9 items-center justify-center rounded-lg border disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft aria-hidden="true" className="size-4" />
                  </button>
                  <span className="text-xs font-bold text-blue-950">
                    Trang {page} / {totalPages || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || totalPages === 0}
                    aria-label="Trang tiếp theo"
                    title="Trang tiếp theo"
                    className="inline-flex size-9 items-center justify-center rounded-lg border disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
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