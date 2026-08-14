// src/features/rubrics/pages/SchoolAdminRubricVersionDetailPage.tsx

import { useParams, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { ChevronLeft, GitMerge, RefreshCw, AlertTriangle, Edit, Plus, ListChecks, Layers, Calculator, Trash2, Archive, Search, Filter, FileSpreadsheet } from 'lucide-react';
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
import { useArchiveSchoolRubricVersionMutation } from '../api/useArchiveSchoolRubricVersionMutation';
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
import {
  RUBRIC_ALLOCATION_TOTAL_PERCENT,
  isAllocationMethod,
  rubricTotalScoreMethodHint,
  rubricTotalScoreMethodLabel,
  weightToPercent,
} from '../types';
import { ErrorBanner } from '@/shared/ui/ErrorBanner';
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog';

export function SchoolAdminRubricVersionDetailPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmationDialog();
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

  // Danh sách đầy đủ (không phân trang) chỉ để loại các framework criterion đã được thêm rồi
  // khỏi dropdown "Framework Criterion" trong modal Thêm Tiêu chí, và để chống trùng order.
  const { data: allCriteriaData } = useSearchSchoolRubricCriteriaQuery(schoolId, versionId, {}, 1, 500);
  const usedFrameworkCriterionIds = allCriteriaData?.content.map((criterion) => criterion.frameworkCriterionId) ?? [];
  const allCriteriaOrders = allCriteriaData?.content.map((criterion) => criterion.order) ?? [];
  const siblingCriteriaOrders = allCriteriaData?.content
    .filter((criterion) => criterion.id !== editingCriterion?.id)
    .map((criterion) => criterion.order) ?? [];

  // Tổng phần trăm đã phân bổ. Backend lưu trọng số dưới dạng phân số nên phải quy đổi trước khi
  // cộng. Khi SỬA thì trừ chính tiêu chí đang sửa ra, nếu không nó tự tính mình là "đã dùng" và
  // người dùng không bao giờ còn chỗ để giữ nguyên trọng số cũ.
  const allocatedPercent = allCriteriaData?.content
    .reduce((sum, criterion) => sum + weightToPercent(criterion.weight), 0) ?? 0;
  const siblingAllocatedPercent = allCriteriaData?.content
    .filter((criterion) => criterion.id !== editingCriterion?.id)
    .reduce((sum, criterion) => sum + weightToPercent(criterion.weight), 0) ?? 0;

  const bandsFilter: SearchRubricResultBandFilter = {
    keyword: debouncedBandsKeyword.trim() ? debouncedBandsKeyword : null,
  };

  const {
    data: bandsData,
    isLoading: bandsLoading,
    isError: bandsError,
    refetch: refetchBands
  } = useSearchSchoolRubricResultBandsQuery(schoolId, versionId, bandsFilter, bandsPage, 10);

  // Danh sách đầy đủ (không phân trang) chỉ để chống trùng order khi thêm/sửa thang điểm.
  const { data: allBandsData } = useSearchSchoolRubricResultBandsQuery(schoolId, versionId, {}, 1, 500);
  const allBandsOrders = allBandsData?.content.map((band) => band.order) ?? [];
  const siblingBandsOrders = allBandsData?.content
    .filter((band) => band.id !== editingResultBand?.id)
    .map((band) => band.order) ?? [];


  // --- 2. KHỞI TẠO CÁC API MUTATION (THÊM, SỬA, XÓA) ---
  const { mutateAsync: updateVersion, isPending: isUpdating } = useUpdateSchoolRubricVersionMutation(schoolId, versionId);
  const { mutateAsync: deleteVersion, isPending: isDeleting } = useDeleteSchoolRubricVersionMutation(schoolId);
  const { mutateAsync: changeVersionStatus, isPending: isChangingStatus } = useChangeSchoolRubricVersionStatusMutation(schoolId, versionId);
  const { mutateAsync: archiveVersion, isPending: isArchiving } = useArchiveSchoolRubricVersionMutation(schoolId, versionId);

  const { mutateAsync: addCriteria, isPending: isAddingCriterion } = useAddSchoolRubricCriteriaMutation(schoolId, versionId);
  const { mutateAsync: updateCriterion, isPending: isUpdatingCriterion } = useUpdateSchoolRubricCriterionMutation(schoolId, editingCriterion?.id);
  const { mutateAsync: deleteCriterion } = useDeleteSchoolRubricCriterionMutation(schoolId, versionId);

  const { mutateAsync: addResultBands, isPending: isAddingResultBand } = useAddSchoolRubricResultBandsMutation(schoolId, versionId);
  const { mutateAsync: updateResultBand, isPending: isUpdatingResultBand } = useUpdateSchoolRubricResultBandMutation(schoolId, editingResultBand?.id);
  const { mutateAsync: deleteResultBand } = useDeleteSchoolRubricResultBandMutation(schoolId, versionId);


  // --- 3. CÁC HÀM XỬ LÝ SỰ KIỆN ---

  // Hàm xử lý Update Version
  const handleUpdateVersion = async (formData: UpdateRubricVersionPayload) => {
    setErrorMessage(null);
    try {
      await updateVersion(formData);
      setIsEditModalOpen(false);
    } catch (error) {
      const err = error as Error;
      console.error("Lỗi cập nhật Version:", err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi cập nhật.');
    }
  };

  // Hàm xử lý Chuyển trạng thái Version (hiện chỉ hỗ trợ DRAFT -> PUBLISHED)
  const handlePublishVersion = async () => {
    setErrorMessage(null);
    try {
      await changeVersionStatus('PUBLISHED');
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Có lỗi xảy ra khi chuyển trạng thái phiên bản.');
    }
  };

  // Hàm xử lý Delete Version (chỉ áp dụng khi DRAFT)
  const handleDeleteVersion = async () => {
    const isConfirmed = await confirm({
      confirmLabel: 'Xóa',
      message: "Bạn có chắc chắn muốn xóa vĩnh viễn phiên bản DRAFT này? Hành động này không thể hoàn tác!",
      title: 'Xác nhận xóa',
    });
    if (!isConfirmed || !versionId) return;

    setErrorMessage(null);

    try {
      await deleteVersion(versionId);
      // UX: Xóa thành công thì đá người dùng về trang chi tiết Rubric cha
      navigate(`/school-admin/rubrics/${rubricId}`);
    } catch (error) {
      const err = error as Error;
      console.error("Lỗi xóa Version:", err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi xóa phiên bản.');
    }
  };

  // Hàm xử lý Lưu trữ (ARCHIVE) Version (chỉ áp dụng khi PUBLISHED)
  const handleArchiveVersion = async () => {
    setErrorMessage(null);
    try {
      await archiveVersion();
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Có lỗi xảy ra khi lưu trữ phiên bản.');
    }
  };

  // Hàm xử lý Thêm Tiêu chí
  const handleAddCriterion = async (payload: AddRubricCriteriaPayload) => {
    setErrorMessage(null);
    try {
      await addCriteria(payload);
      setIsAddCriterionModalOpen(false);
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Có lỗi xảy ra khi thêm tiêu chí.');
    }
  };

  // Hàm xử lý Sửa Tiêu chí
  const handleUpdateCriterion = async (payload: UpdateRubricCriterionPayload) => {
    setErrorMessage(null);
    try {
      await updateCriterion(payload);
      setEditingCriterion(null);
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Có lỗi xảy ra khi cập nhật tiêu chí.');
    }
  };

  // Hàm xử lý Xóa Tiêu chí
  const handleDeleteCriterion = async (criterion: RubricCriterion) => {
    const isConfirmed = await confirm({
      confirmLabel: 'Xóa',
      message: `Bạn có chắc chắn muốn xóa tiêu chí "${criterion.name}"?`,
      title: 'Xác nhận xóa',
    });
    if (!isConfirmed) return;

    setErrorMessage(null);

    try {
      await deleteCriterion(criterion.id);
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Có lỗi xảy ra khi xóa tiêu chí.');
    }
  };

  // Hàm xử lý Thêm Thang điểm
  const handleAddResultBand = async (payload: AddRubricResultBandsPayload) => {
    setErrorMessage(null);
    try {
      await addResultBands(payload);
      setIsAddResultBandModalOpen(false);
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Có lỗi xảy ra khi thêm thang điểm.');
    }
  };

  // Hàm xử lý Sửa Thang điểm
  const handleUpdateResultBand = async (payload: UpdateRubricResultBandPayload) => {
    setErrorMessage(null);
    try {
      await updateResultBand(payload);
      setEditingResultBand(null);
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Có lỗi xảy ra khi cập nhật thang điểm.');
    }
  };

  // Hàm xử lý Xóa Thang điểm
  const handleDeleteResultBand = async (band: RubricResultBand) => {
    const isConfirmed = await confirm({
      confirmLabel: 'Xóa',
      message: `Bạn có chắc chắn muốn xóa thang điểm "${band.name}"?`,
      title: 'Xác nhận xóa',
    });
    if (!isConfirmed) return;

    setErrorMessage(null);

    try {
      await deleteResultBand(band.id);
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Có lỗi xảy ra khi xóa thang điểm.');
    }
  };


  // --- 4. RENDER UI LOADING & ERROR CHUNG ---
  if (isVersionLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải thông tin Version...</p>
      </div>
    );
  }

  if (isVersionError || !version) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tìm thấy Version hoặc bạn không có quyền truy cập.</p>
        <button onClick={() => refetchVersion()} className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700">
          Thử lại
        </button>
      </div>
    );
  }


  // --- 5. RENDER UI CHÍNH ---
  return (
    <section className="grid gap-6">
      {dialog}
      <ErrorBanner message={errorMessage} />

      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/school-admin/rubrics/${rubricId}`)}
            aria-label="Quay lại"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-blue-950 sm:text-3xl">
            <GitMerge className="size-6 text-indigo-600" /> Chi tiết Phiên bản
          </h1>
        </div>
      </div>

      {/* THÔNG TIN CHUNG CỦA VERSION */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
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
              <RubricVersionStatusMenu
                isPending={isChangingStatus || isArchiving}
                onPublish={handlePublishVersion}
                onArchive={handleArchiveVersion}
                status={version.status}
              />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
             <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
               <Calculator className="size-4" /> Điểm số
             </p>
             <div className="mt-2 space-y-1 text-sm text-slate-700">
               <p><span className="font-medium">Thang:</span> {version.scoringScaleMin} - {version.scoringScaleMax}</p>
               <p><span className="font-medium">Cách tính:</span> {rubricTotalScoreMethodLabel(version.totalScoreMethod)}</p>
               {isAllocationMethod(version.totalScoreMethod) && (
                 <p>
                   <span className="font-medium">Đã phân bổ:</span>{' '}
                   <span className={allocatedPercent === RUBRIC_ALLOCATION_TOTAL_PERCENT ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>
                     {allocatedPercent}% / {RUBRIC_ALLOCATION_TOTAL_PERCENT}%
                   </span>
                 </p>
               )}
               <p className="text-xs leading-5 text-slate-500">{rubricTotalScoreMethodHint(version.totalScoreMethod)}</p>
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

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ngày tạo</p>
            <p className="mt-2 text-sm text-slate-700">
              {version.createdAt ? new Date(version.createdAt).toLocaleDateString('vi-VN') : '—'}
            </p>
          </div>
        </div>

        {/* KHU VỰC CÁC NÚT HÀNH ĐỘNG */}
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
          {version.status === 'DRAFT' && (
            <button
              type="button"
              onClick={handleDeleteVersion}
              disabled={isDeleting}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Xóa Version
            </button>
          )}

          {version.status === 'PUBLISHED' && (
            <button
              type="button"
              onClick={handleArchiveVersion}
              disabled={isArchiving}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {isArchiving ? <RefreshCw className="size-4 animate-spin" /> : <Archive className="size-4" />}
              Lưu trữ Version
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <Edit className="size-4" /> Chỉnh sửa Version
          </button>
        </div>
      </div>

      {/* KHU VỰC TABS & BẢNG DANH SÁCH */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">

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
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
              >
                <FileSpreadsheet className="size-4" /> Nhập từ Excel/CSV
              </button>
            )}
            {activeTab === 'bands' && (
              <button
                type="button"
                onClick={() => navigate(`/school-admin/rubrics/${rubricId}/versions/${versionId}/bands/import`)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
              >
                <FileSpreadsheet className="size-4" /> Nhập từ Excel/CSV
              </button>
            )}
            <button
              type="button"
              onClick={() => activeTab === 'criteria' ? setIsAddCriterionModalOpen(true) : setIsAddResultBandModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
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
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div className="relative min-w-50">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Filter className="size-4 text-slate-400" />
              </div>
              <select
                value={criteriaIsRequired}
                onChange={(e) => { setCriteriaIsRequired(e.target.value); setCriteriaPage(1); }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
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
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
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
          scoringScaleMin={version.scoringScaleMin}
          scoringScaleMax={version.scoringScaleMax}
          usedFrameworkCriterionIds={usedFrameworkCriterionIds}
          existingOrders={allCriteriaOrders}
          totalScoreMethod={version.totalScoreMethod}
          allocatedPercent={allocatedPercent}
        />
      )}

      {editingCriterion && (
        <UpdateRubricCriterionDialog
          isOpen={Boolean(editingCriterion)}
          onClose={() => setEditingCriterion(null)}
          onSubmit={handleUpdateCriterion}
          isPending={isUpdatingCriterion}
          initialData={editingCriterion}
          scoringScaleMin={version.scoringScaleMin}
          scoringScaleMax={version.scoringScaleMax}
          existingOrders={siblingCriteriaOrders}
          totalScoreMethod={version.totalScoreMethod}
          allocatedPercent={siblingAllocatedPercent}
        />
      )}

      {/* MODAL THÊM / SỬA / XEM THANG ĐIỂM */}
      {isAddResultBandModalOpen && (
        <AddRubricResultBandDialog
          isOpen={isAddResultBandModalOpen}
          onClose={() => setIsAddResultBandModalOpen(false)}
          onSubmit={handleAddResultBand}
          isPending={isAddingResultBand}
          existingOrders={allBandsOrders}
        />
      )}

      {editingResultBand && (
        <UpdateRubricResultBandDialog
          isOpen={Boolean(editingResultBand)}
          onClose={() => setEditingResultBand(null)}
          onSubmit={handleUpdateResultBand}
          isPending={isUpdatingResultBand}
          initialData={editingResultBand}
          existingOrders={siblingBandsOrders}
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
