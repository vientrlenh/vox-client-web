// src/features/assessment_policy_school/pages/SchoolAdminAssessmentPolicyTemplatesPage.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Filter, LibraryBig, RefreshCw } from 'lucide-react';

import { useAppSelector } from '@/app/store/hooks';
import { Pagination } from '@/shared/components/Pagination';

import {
  useSystemAssessmentPolicyTemplatesQuery,
  type SystemAssessmentPolicyTemplate,
} from '../api/useSystemAssessmentPolicyTemplatesQuery';
import {
  useCloneSystemAssessmentPolicyMutation,
  type CloneSystemAssessmentPolicyPayload,
} from '../api/useCloneSystemAssessmentPolicyMutation';
import { useLanguageOptionsQuery } from '../api/useFilterOptionsQuery';
import { SystemAssessmentPolicyTemplateTable } from '../components/SystemAssessmentPolicyTemplateTable';
import { CloneSystemAssessmentPolicyDialog } from '../components/CloneSystemAssessmentPolicyDialog';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function SchoolAdminAssessmentPolicyTemplatesPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  const { data: languages } = useLanguageOptionsQuery();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [cloningTemplate, setCloningTemplate] = useState<SystemAssessmentPolicyTemplate | null>(null);

  // Không có ô tìm kiếm như bên bộ tiêu chí mẫu: chính sách không có mã/tên do người dùng đặt để mà
  // tìm -- nó được nhận diện bằng Khối và Khung năng lực, vốn đã nằm hết trên một trang.
  const { data, isLoading, isError, refetch, isFetching } = useSystemAssessmentPolicyTemplatesQuery(
    selectedLanguageId || null,
    page,
    DEFAULT_PAGE_SIZE
  );

  const templates = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const { mutateAsync: clonePolicy, isPending: isCloning } =
    useCloneSystemAssessmentPolicyMutation(schoolId);

  const handleClone = async (payload: CloneSystemAssessmentPolicyPayload) => {
    // Không bắt lỗi ở đây: modal đang mở sẽ tự hiện lỗi ngay trong form, còn banner của trang thì
    // nằm sau lớp phủ nên không đọc được.
    const policyId = await clonePolicy(payload);
    setCloningTemplate(null);
    navigate(`/school-admin/assessment-policies/${policyId}`);
  };

  return (
    <section className="grid gap-6">
      {/* HEADER */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/school-admin/assessment-policies')}
              aria-label="Quay lại"
              className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex items-center gap-2.5 text-2xl font-black text-blue-950 sm:text-3xl">
              <LibraryBig className="size-6 text-indigo-600" /> Thư viện chính sách mẫu
            </h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Các chính sách chấm do hệ thống ban hành, mỗi khối một bản với bậc mục tiêu bám chuẩn đầu
            ra của chương trình. Sao một bản về trường để có ngay cả chính sách lẫn bộ tiêu chí đi
            kèm; bản sao là tài sản riêng của trường, sửa thoải mái mà không ảnh hưởng bản mẫu.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-70"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Filter className="size-4 text-slate-400" />
          </div>
          <select
            value={selectedLanguageId}
            onChange={(event) => {
              setSelectedLanguageId(event.target.value);
              setPage(1);
            }}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            <option value="">Tất cả Ngôn ngữ</option>
            {languages?.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <SystemAssessmentPolicyTemplateTable
          templates={templates}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onClone={setCloningTemplate}
        />
        {!isLoading && !isError && templates.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            itemName="chính sách mẫu"
            onPageChange={setPage}
          />
        )}
      </div>

      <CloneSystemAssessmentPolicyDialog
        isOpen={cloningTemplate !== null}
        template={cloningTemplate}
        schoolId={schoolId}
        onClose={() => setCloningTemplate(null)}
        onSubmit={handleClone}
        isPending={isCloning}
      />
    </section>
  );
}
