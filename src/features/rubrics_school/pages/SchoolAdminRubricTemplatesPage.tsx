// src/features/rubrics/pages/SchoolAdminRubricTemplatesPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Filter, LibraryBig, RefreshCw, Search } from 'lucide-react';

import { useAppSelector } from '@/app/store/hooks';
import { Pagination } from '@/shared/components/Pagination';

import {
  useSystemRubricTemplatesQuery,
  type SearchRubricTemplateFilter,
  type SystemRubricTemplate,
} from '../api/useSystemRubricTemplatesQuery';
import {
  useCloneSystemRubricMutation,
  type CloneSystemRubricPayload,
} from '../api/useCloneSystemRubricMutation';
import { useFrameworkOptionsQuery, useLanguageOptionsQuery } from '../api/useFilterOptionsQuery';
import { SystemRubricTemplateTable } from '../components/SystemRubricTemplateTable';
import { CloneSystemRubricDialog } from '../components/CloneSystemRubricDialog';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function SchoolAdminRubricTemplatesPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  const { data: frameworks } = useFrameworkOptionsQuery();
  const { data: languages } = useLanguageOptionsQuery();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedFrameworkId, setSelectedFrameworkId] = useState('');
  const [selectedLanguageId, setSelectedLanguageId] = useState('');

  const [cloningTemplate, setCloningTemplate] = useState<SystemRubricTemplate | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const filter: SearchRubricTemplateFilter = {
    keyword: debouncedKeyword.trim() ? debouncedKeyword : null,
    frameworkId: selectedFrameworkId || null,
    languageId: selectedLanguageId || null,
  };

  const { data, isLoading, isError, refetch, isFetching } = useSystemRubricTemplatesQuery(
    filter,
    page,
    DEFAULT_PAGE_SIZE
  );

  const templates = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const { mutateAsync: cloneRubric, isPending: isCloning } = useCloneSystemRubricMutation(schoolId);

  const handleClone = async (payload: CloneSystemRubricPayload) => {
    // Không bắt lỗi ở đây: modal đang mở sẽ tự hiện lỗi ngay trong form, còn banner của trang thì
    // nằm sau lớp phủ nên không đọc được.
    const { rubricId, versionId } = await cloneRubric(payload);
    setCloningTemplate(null);

    // Đá thẳng vào bản nháp vừa tạo để trường gắn chính sách đánh giá. Nếu không tra được rubric
    // cha thì bản sao vẫn nằm đó — chỉ là ta không có đủ đường đi, nên lui về danh sách.
    navigate(rubricId ? `/school-admin/rubrics/${rubricId}/versions/${versionId}` : '/school-admin/rubrics');
  };

  return (
    <section className="grid gap-6">
      {/* HEADER */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/school-admin/rubrics')}
              aria-label="Quay lại"
              className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex items-center gap-2.5 text-2xl font-black text-blue-950 sm:text-3xl">
              <LibraryBig className="size-6 text-indigo-600" /> Thư viện bộ tiêu chí mẫu
            </h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Các bộ tiêu chí do hệ thống ban hành. Sao một bản về trường để có ngay đầy đủ tiêu chí và
            thang xếp loại; bản sao là tài sản riêng của trường, sửa thoải mái mà không ảnh hưởng bản
            mẫu.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-70"
            disabled={isFetching}
            onClick={() => refetch()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="size-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo mã hoặc tên bản mẫu..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div className="relative min-w-50">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Filter className="size-4 text-slate-400" />
            </div>
            <select
              value={selectedFrameworkId}
              onChange={(event) => {
                setSelectedFrameworkId(event.target.value);
                setPage(1);
              }}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">Tất cả Khung năng lực</option>
              {frameworks?.map((framework) => (
                <option key={framework.id} value={framework.id}>
                  {framework.name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative min-w-50">
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
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <SystemRubricTemplateTable
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
            itemName="bản mẫu"
            onPageChange={setPage}
          />
        )}
      </div>

      <CloneSystemRubricDialog
        isOpen={cloningTemplate !== null}
        template={cloningTemplate}
        onClose={() => setCloningTemplate(null)}
        onSubmit={handleClone}
        isPending={isCloning}
      />
    </section>
  );
}
