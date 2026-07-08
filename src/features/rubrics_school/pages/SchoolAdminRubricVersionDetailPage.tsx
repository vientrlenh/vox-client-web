// src/features/rubrics/pages/SchoolAdminRubricVersionDetailPage.tsx

import { useParams, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { ChevronLeft, GitMerge, RefreshCw, AlertTriangle, Edit, Plus, ListChecks, Layers, Calculator, Trash2, Search, Filter, FileSpreadsheet } from 'lucide-react';
import { useAppSelector } from '@/app/store/hooks';

import { useSchoolRubricQuery } from '../api/useSchoolRubricQuery';
import { useSchoolRubricVersionQuery } from '../api/useSchoolRubricVersionQuery';
import {
  useSearchSchoolRubricCriteriaQuery,
  type SearchRubricCriterionFilter,
} from '../api/useSearchSchoolRubricCriteriaQuery';
import {
  useSearchSchoolRubricResultBandsQuery,
  type SearchRubricResultBandFilter,
} from '../api/useSearchSchoolRubricResultBandsQuery';

import { useUpdateSchoolRubricVersionMutation, type UpdateRubricVersionPayload } from '../api/useUpdateSchoolRubricVersionMutation';
import { useDeleteSchoolRubricVersionMutation } from '../api/useDeleteSchoolRubricVersionMutation';
import { useChangeSchoolRubricVersionStatusMutation } from '../api/useChangeSchoolRubricVersionStatusMutation';
import { useAddSchoolRubricCriteriaMutation, type AddRubricCriteriaPayload } from '../api/useAddSchoolRubricCriteriaMutation';
import { useUpdateSchoolRubricCriterionMutation, type UpdateRubricCriterionPayload } from '../api/useUpdateSchoolRubricCriterionMutation';
import { useDeleteSchoolRubricCriterionMutation } from '../api/useDeleteSchoolRubricCriterionMutation';
import { useAddSchoolRubricResultBandsMutation, type AddRubricResultBandsPayload } from '../api/useAddSchoolRubricResultBandsMutation';
import { useUpdateSchoolRubricResultBandMutation, type UpdateRubricResultBandPayload } from '../api/useUpdateSchoolRubricResultBandMutation';
import { useDeleteSchoolRubricResultBandMutation } from '../api/useDeleteSchoolRubricResultBandMutation';

import { UpdateRubricVersionDialog } from '../components/UpdateRubricVersionDialog';
import { RubricVersionStatusMenu } from '../components/RubricVersionStatusMenu';
import { RubricCriterionTable } from '../components/RubricCriterionTable';
import { RubricResultBandTable } from '../components/RubricResultBandTable';
import { AddRubricCriterionDialog } from '../components/AddRubricCriterionDialog';
import { UpdateRubricCriterionDialog } from '../components/UpdateRubricCriterionDialog';
import { AddRubricResultBandDialog } from '../components/AddRubricResultBandDialog';
import { UpdateRubricResultBandDialog } from '../components/UpdateRubricResultBandDialog';
import { ViewRubricResultBandDialog } from '../components/ViewRubricResultBandDialog';
import { Pagination } from '@/shared/components/Pagination';
import type { RubricCriterion, RubricResultBand } from '../types';

export function SchoolAdminRubricVersionDetailPage() {
  const { rubricId, versionId } = useParams<{ rubricId: string; versionId: string }>();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);
  const schoolId = user?.schoolId;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'criteria' | 'bands'>('criteria');

  // State Phân trang + tìm kiếm cho từng Tab
  const [criteriaPage, setCriteriaPage] = useState(1);
  const [bandsPage, setBandsPage] = useState(1);

  const [criteriaKeyword, setCriteriaKeyword] = useState('');
  const [debouncedCriteriaKeyword, setDebouncedCriteriaKeyword] = useState('');
  const [criteriaIsRequired, setCriteriaIsRequired] = useState('');

  const [bandsKeyword, setBandsKeyword] = useState('');
  const [debouncedBandsKeyword, setDebouncedBandsKeyword] = useState('');

  // State các Modal Thêm/Sửa Tiêu chí & Thang điểm
  const [isAddCriterionModalOpen, setIsAddCriterionModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<RubricCriterion | null>(null);
  const [isAddResultBandModalOpen, setIsAddResultBandModalOpen] = useState(false);
  const [editingResultBand, setEditingResultBand] = useState<RubricResultBand | null>(null);
  const [viewingResultBandId, setViewingResultBandId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCriteriaKeyword(criteriaKeyword);
      setCriteriaPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [criteriaKeyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBandsKeyword(bandsKeyword);
      setBandsPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [bandsKeyword]);

  // --- 1. GỌI CÁC API QUERY (LẤY DỮ LIỆU) ---
  const { data: rubric } = useSchoolRubricQuery(schoolId, rubricId);

  const {
    data: version,
    isLoading: isVersionLoading,
    isError: isVersionError,
    refetch: refetchVersion
  } = useSchoolRubricVersionQuery(schoolId, versionId);

  const criteriaFilter: SearchRubricCriterionFilter = {
    keyword: debouncedCriteriaKeyword.trim() ? debouncedCriteriaKeyword : null,
    isRequired: criteriaIsRequired === '' ? null : criteriaIsRequired === 'true',
  };

  const {
    data: criteriaData,
    isLoading: criteriaLoading,
    isError: criteriaError,
    refetch: refetchCriteria
  } = useSearchSchoolRubricCriteriaQuery(schoolId, versionId, criteriaFilter, criteriaPage, 10);

  const bandsFilter: SearchRubricResultBandFilter = {
    keyword: debouncedBandsKeyword.trim() ? debouncedBandsKeyword : null,
  };

  const {
    data: bandsData,
    isLoading: bandsLoading,
    isError: bandsError,
    refetch: refetchBands
  } = useSearchSchoolRubricResultBandsQuery(schoolId, versionId, bandsFilter, bandsPage, 10);


  // --- 2. KHỞI TẠO CÁC API MUTATION (THÊM, SỬA, XÓA) ---
  const { mutateAsync: updateVersion, isPending: isUpdating } = useUpdateSchoolRubricVersionMutation(schoolId, versionId);
  const { mutateAsync: deleteVersion, isPending: isDeleting } = useDeleteSchoolRubricVersionMutation(schoolId);
  const { mutateAsync: changeVersionStatus, isPending: isChangingStatus } = useChangeSchoolRubricVersionStatusMutation(schoolId, versionId);

  const { mutateAsync: addCriteria, isPending: isAddingCriterion } = useAddSchoolRubricCriteriaMutation(schoolId, versionId);
  const { mutateAsync: updateCriterion, isPending: isUpdatingCriterion } = useUpdateSchoolRubricCriterionMutation(schoolId, editingCriterion?.id);
  const { mutateAsync: deleteCriterion } = useDeleteSchoolRubricCriterionMutation(schoolId, versionId);

  const { mutateAsync: addResultBands, isPending: isAddingResultBand } = useAddSchoolRubricResultBandsMutation(schoolId, versionId);
  const { mutateAsync: updateResultBand, isPending: isUpdatingResultBand } = useUpdateSchoolRubricResultBandMutation(schoolId, editingResultBand?.id);
  const { mutateAsync: deleteResultBand } = useDeleteSchoolRubricResultBandMutation(schoolId, versionId);


  // --- 3. CÁC HÀM XỬ LÝ SỰ KIỆN ---

  // Hàm xử lý Update Version
  const handleUpdateVersion = async (formData: UpdateRubricVersionPayload) => {
    try {
      await updateVersion(formData);
      setIsEditModalOpen(false);
    } catch (error) {
      const err = error as Error;
      console.error("Lỗi cập nhật Version:", err);
      alert(err.message || 'Có lỗi xảy ra khi cập nhật.');
    }
  };

  // Hàm xử lý Chuyển trạng thái Version (hiện chỉ hỗ trợ DRAFT -> PUBLISHED)
  const handlePublishVersion = async () => {
    try {
      await changeVersionStatus('PUBLISHED');
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi chuyển trạng thái phiên bản.');
    }
  };

  // Hàm xử lý Delete Version
  const handleDeleteVersion = async () => {
    const isConfirm = window.confirm("Bạn có chắc chắn muốn xóa/lưu trữ phiên bản này? Hành động này không thể hoàn tác!");
    if (!isConfirm || !versionId) return;

    try {
      await deleteVersion(versionId);
      // UX: Xóa thành công thì đá người dùng về trang chi tiết Rubric cha
      navigate(`/school-admin/rubrics/${rubricId}`);
    } catch (error) {
      const err = error as Error;
      console.error("Lỗi xóa Version:", err);
      alert(err.message || 'Có lỗi xảy ra khi xử lý phiên bản.');
    }
  };

  // Hàm xử lý Thêm Tiêu chí
  const handleAddCriterion = async (payload: AddRubricCriteriaPayload) => {
    try {
      await addCriteria(payload);
      setIsAddCriterionModalOpen(false);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi thêm tiêu chí.');
    }
  };

  // Hàm xử lý Sửa Tiêu chí
  const handleUpdateCriterion = async (payload: UpdateRubricCriterionPayload) => {
    try {
      await updateCriterion(payload);
      setEditingCriterion(null);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi cập nhật tiêu chí.');
    }
  };

  // Hàm xử lý Xóa Tiêu chí
  const handleDeleteCriterion = async (criterion: RubricCriterion) => {
    const isConfirm = window.confirm(`Bạn có chắc chắn muốn xóa tiêu chí "${criterion.name}"?`);
    if (!isConfirm) return;

    try {
      await deleteCriterion(criterion.id);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi xóa tiêu chí.');
    }
  };

  // Hàm xử lý Thêm Thang điểm
  const handleAddResultBand = async (payload: AddRubricResultBandsPayload) => {
    try {
      await addResultBands(payload);
      setIsAddResultBandModalOpen(false);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi thêm thang điểm.');
    }
  };

  // Hàm xử lý Sửa Thang điểm
  const handleUpdateResultBand = async (payload: UpdateRubricResultBandPayload) => {
    try {
      await updateResultBand(payload);
      setEditingResultBand(null);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi cập nhật thang điểm.');
    }
  };

  // Hàm xử lý Xóa Thang điểm
  const handleDeleteResultBand = async (band: RubricResultBand) => {
    const isConfirm = window.confirm(`Bạn có chắc chắn muốn xóa thang điểm "${band.name}"?`);
    if (!isConfirm) return;

    try {
      await deleteResultBand(band.id);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi xóa thang điểm.');
    }
  };


  // --- 4. RENDER UI LOADING & ERROR CHUNG ---
  if (isVersionLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-cyan-600" />
        <p className="text-sm text-slate-500">Đang tải thông tin Version...</p>
      </div>
    );
  }

  if (isVersionError || !version) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tìm thấy Version hoặc bạn không có quyền truy cập.</p>
        <button onClick={() => refetchVersion()} className="rounded-lg bg-cyan-600 px-4 py-2 font-bold text-white hover:bg-cyan-700">
          Thử lại
        </button>
      </div>
    );
  }


  // --- 5. RENDER UI CHÍNH ---
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
            onClick={() => navigate(`/school-admin/rubrics/${rubricId}`)}
            aria-label="Quay lại"
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex items-center gap-2.5 text-[32px] font-bold tracking-tight text-slate-950">
            <GitMerge className="size-[26px] text-indigo-600" /> Chi tiết Phiên bản
          </h1>
        </div>
      </div>

      {/* THÔNG TIN CHUNG CỦA VERSION */}
      <div className="rounded-[14px] border border-slate-200 bg-white p-6">
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tên Phiên Bản</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{version.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-600 ring-1 ring-inset ring-indigo-600/10">
                v{version.version}
              </span>
              <span className="inline-flex items-center font-mono rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/20">
                Mã Phiên bản: {version.code}
              </span>
              <RubricVersionStatusMenu isPending={isChangingStatus} onPublish={handlePublishVersion} status={version.status} />
            </div>
          </div>

          <div className="rounded-[10px] bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
             <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
               <Calculator className="size-4" /> Điểm số
             </p>
             <div className="mt-2 space-y-1 text-sm text-slate-700">
               <p><span className="font-medium">Thang:</span> {version.scoringScaleMin} - {version.scoringScaleMax}</p>
               <p><span className="font-medium">Cách tính:</span> {version.totalScoreMethod}</p>
             </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Thời gian áp dụng</p>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium">Từ:</span> {version.effectiveFrom ? new Date(version.effectiveFrom).toLocaleDateString('vi-VN') : '—'}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium">Đến:</span> {version.effectiveTo ? new Date(version.effectiveTo).toLocaleDateString('vi-VN') : '—'}
            </p>
          </div>
        </div>

        {/* KHU VỰC CÁC NÚT HÀNH ĐỘNG */}
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={handleDeleteVersion}
            disabled={isDeleting}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-5 text-sm font-medium text-red-500 transition hover:bg-red-100 disabled:opacity-50"
          >
            {isDeleting ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Xóa Version
          </button>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Edit className="size-4" /> Chỉnh sửa Version
          </button>
        </div>
      </div>

      {/* KHU VỰC TABS & BẢNG DANH SÁCH */}
      <div className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white">

        {/* TABS HEADER */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/50 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('criteria')}
            className={`flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-bold transition-colors ${activeTab === 'criteria' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <ListChecks className="size-4" /> Danh sách Tiêu chí
          </button>
          <button
            onClick={() => setActiveTab('bands')}
            className={`flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-bold transition-colors ${activeTab === 'bands' ? 'border-violet-500 text-violet-500' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <Layers className="size-4" /> Mức điểm / Bands
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:px-6">
          <h2 className="text-lg font-medium text-slate-950">
            {activeTab === 'criteria' ? 'Tiêu chí đánh giá' : 'Cấu hình Thang điểm (Result Bands)'}
          </h2>
          <div className="flex items-center gap-2">
            {activeTab === 'criteria' && (
              <button
                type="button"
                onClick={() => navigate(`/school-admin/rubrics/${rubricId}/versions/${versionId}/criteria/import`)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-indigo-600 transition hover:bg-slate-50"
              >
                <FileSpreadsheet className="size-4" /> Nhập từ Excel/CSV
              </button>
            )}
            {activeTab === 'bands' && (
              <button
                type="button"
                onClick={() => navigate(`/school-admin/rubrics/${rubricId}/versions/${versionId}/bands/import`)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-violet-500 transition hover:bg-slate-50"
              >
                <FileSpreadsheet className="size-4" /> Nhập từ Excel/CSV
              </button>
            )}
            <button
              type="button"
              onClick={() => activeTab === 'criteria' ? setIsAddCriterionModalOpen(true) : setIsAddResultBandModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-4 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus className="size-4" /> {activeTab === 'criteria' ? 'Thêm Tiêu chí' : 'Thêm Thang điểm'}
            </button>
          </div>
        </div>

        {/* THANH TÌM KIẾM & LỌC */}
        {activeTab === 'criteria' ? (
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:px-6">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className="size-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={criteriaKeyword}
                onChange={(e) => setCriteriaKeyword(e.target.value)}
                placeholder="Tìm theo mã hoặc tên tiêu chí..."
                className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div className="relative min-w-50">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Filter className="size-4 text-slate-400" />
              </div>
              <select
                value={criteriaIsRequired}
                onChange={(e) => { setCriteriaIsRequired(e.target.value); setCriteriaPage(1); }}
                className="w-full appearance-none rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">Tất cả</option>
                <option value="true">Bắt buộc</option>
                <option value="false">Tùy chọn</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:px-6">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className="size-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={bandsKeyword}
                onChange={(e) => setBandsKeyword(e.target.value)}
                placeholder="Tìm theo mã hoặc tên thang điểm..."
                className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>
        )}

        {/* RENDER BẢNG DỮ LIỆU TƯƠNG ỨNG */}
        {activeTab === 'criteria' ? (
          <div>
            <RubricCriterionTable
              criteria={criteriaData?.content || []}
              isLoading={criteriaLoading}
              isError={criteriaError}
              onRetry={() => refetchCriteria()}
              onViewDetails={(item) =>
                navigate(`/school-admin/rubrics/${rubricId}/versions/${versionId}/criteria/${item.id}`)
              }
              onEdit={(item) => setEditingCriterion(item)}
              onDelete={handleDeleteCriterion}
            />
            {criteriaData && criteriaData.content.length > 0 && (
              <Pagination
                currentPage={criteriaPage}
                totalPages={criteriaData.totalPages}
                totalElements={criteriaData.totalElements}
                itemName="tiêu chí"
                onPageChange={setCriteriaPage}
              />
            )}
          </div>
        ) : (
          <div>
            <RubricResultBandTable
              bands={bandsData?.content || []}
              isLoading={bandsLoading}
              isError={bandsError}
              onRetry={() => refetchBands()}
              onView={(item) => setViewingResultBandId(item.id)}
              onEdit={(item) => setEditingResultBand(item)}
              onDelete={handleDeleteResultBand}
            />
            {bandsData && bandsData.content.length > 0 && (
              <Pagination
                currentPage={bandsPage}
                totalPages={bandsData.totalPages}
                totalElements={bandsData.totalElements}
                itemName="thang điểm"
                onPageChange={setBandsPage}
              />
            )}
          </div>
        )}
      </div>

      {/* COMPONENT MODAL UPDATE VERSION */}
      {isEditModalOpen && version && (
        <UpdateRubricVersionDialog
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateVersion}
          isPending={isUpdating}
          initialData={version}
        />
      )}

      {/* MODAL THÊM / SỬA TIÊU CHÍ */}
      {isAddCriterionModalOpen && (
        <AddRubricCriterionDialog
          isOpen={isAddCriterionModalOpen}
          onClose={() => setIsAddCriterionModalOpen(false)}
          onSubmit={handleAddCriterion}
          isPending={isAddingCriterion}
          frameworkId={rubric?.frameworkId}
        />
      )}

      {editingCriterion && (
        <UpdateRubricCriterionDialog
          isOpen={Boolean(editingCriterion)}
          onClose={() => setEditingCriterion(null)}
          onSubmit={handleUpdateCriterion}
          isPending={isUpdatingCriterion}
          initialData={editingCriterion}
        />
      )}

      {/* MODAL THÊM / SỬA / XEM THANG ĐIỂM */}
      {isAddResultBandModalOpen && (
        <AddRubricResultBandDialog
          isOpen={isAddResultBandModalOpen}
          onClose={() => setIsAddResultBandModalOpen(false)}
          onSubmit={handleAddResultBand}
          isPending={isAddingResultBand}
        />
      )}

      {editingResultBand && (
        <UpdateRubricResultBandDialog
          isOpen={Boolean(editingResultBand)}
          onClose={() => setEditingResultBand(null)}
          onSubmit={handleUpdateResultBand}
          isPending={isUpdatingResultBand}
          initialData={editingResultBand}
        />
      )}

      <ViewRubricResultBandDialog
        isOpen={Boolean(viewingResultBandId)}
        onClose={() => setViewingResultBandId(null)}
        schoolId={schoolId}
        resultBandId={viewingResultBandId ?? undefined}
      />
    </section>
  );
}
